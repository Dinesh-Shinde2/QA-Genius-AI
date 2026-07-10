import json
import logging
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional

from backend.database import db
from backend.ai.ai_service import generate_qa_package
from backend.ai.embeddings import get_embedding
from backend.services.dedup_service import find_duplicate_test_cases, find_duplicate_bugs
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["generator"])

logger = logging.getLogger(__name__)

class QAPackageRequest(BaseModel):
    requirement_id: str
    selected_types: List[str] = ["Positive", "Negative", "Boundary", "Edge Case"]

@router.post("/generate-package", response_model=dict)
async def generate_package(request: QAPackageRequest, current_user: dict = Depends(get_current_user)):
    req_id = request.requirement_id
    
    # 1. Fetch requirement details
    requirement = await db.fetchrow(
        """
        SELECT r.id, r.project_id, r.title, r.module, r.description, r.extracted_features, p.user_id
        FROM requirements r
        JOIN projects p ON r.project_id = p.id
        WHERE r.id = $1 AND p.user_id = $2
        """,
        req_id, current_user["id"]
    )
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement spec not found or unauthorized access"
        )
        
    project_id = str(requirement["project_id"])
    module = requirement["module"]
    description = requirement["description"]
    extracted_features = json.loads(requirement["extracted_features"]) if requirement["extracted_features"] else {}
    
    rules = extracted_features.get("business_rules", [])
    
    # 2. Invoke LLM to generate test suite and bugs
    try:
        qa_package = await generate_qa_package(
            requirement_text=description,
            module=module,
            rules=rules,
            selected_types=request.selected_types
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error querying AI package generator: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )
        
    generated_test_cases = qa_package.get("test_cases", [])
    generated_bugs = qa_package.get("suggested_bugs", [])
    
    saved_test_cases = []
    saved_bugs = []
    
    # 3. Save Test Cases (deduplicated)
    async with db._pool.acquire() as conn:
        async with conn.transaction():
            # Get current test case count for formatting custom IDs
            tc_count = await conn.fetchval(
                "SELECT COUNT(*) FROM test_cases WHERE project_id = $1",
                project_id
            )
            
            for tc in generated_test_cases:
                # Deduplication check
                scenario = tc.get("scenario", "")
                existing_dups = await find_duplicate_test_cases(project_id, scenario)
                if existing_dups:
                    logger.info(f"Skipping duplicate test case scenario: '{scenario[:40]}...'")
                    continue # Skip duplicates
                    
                tc_count += 1
                custom_id = f"TC-{str(tc_count).zfill(3)}"
                
                # Steps list serialization
                steps_data = tc.get("steps", "")
                if isinstance(steps_data, list):
                    steps_str = json.dumps(steps_data)
                else:
                    steps_str = str(steps_data)
                    
                vector = await get_embedding(scenario)
                
                # Insert DB
                row = await conn.fetchrow(
                    """
                    INSERT INTO test_cases (
                        custom_id, project_id, requirement_id, module, feature,
                        scenario, preconditions, steps, test_data, expected_result,
                        priority, case_type, confidence_score, embedding
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::priority_level, $12, $13, $14)
                    RETURNING id, custom_id, scenario, priority, case_type, confidence_score
                    """,
                    custom_id, project_id, req_id, module, tc.get("feature", "General"),
                    scenario, tc.get("preconditions", ""), steps_str, tc.get("test_data", ""),
                    tc.get("expected_result", ""), tc.get("priority", "P3"), tc.get("case_type", "Positive"),
                    int(tc.get("confidence_score", 90)), vector
                )
                
                saved_test_cases.append({
                    "id": str(row["id"]),
                    "custom_id": row["custom_id"],
                    "scenario": row["scenario"],
                    "priority": row["priority"],
                    "case_type": row["case_type"],
                    "confidence_score": row["confidence_score"]
                })
                
            # 4. Save Bug Templates (deduplicated)
            bug_count = await conn.fetchval(
                "SELECT COUNT(*) FROM bug_reports WHERE project_id = $1",
                project_id
            )
            
            for bug in generated_bugs:
                title = bug.get("title", "Unhandled failure scenario")
                
                # Deduplication check
                existing_dups = await find_duplicate_bugs(project_id, title)
                if existing_dups:
                    logger.info(f"Skipping duplicate bug summary: '{title[:40]}...'")
                    continue
                    
                bug_count += 1
                custom_id = f"BUG-{str(bug_count).zfill(3)}"
                
                # Save Bug Report
                bug_id = await conn.fetchval(
                    """
                    INSERT INTO bug_reports (
                        custom_id, project_id, requirement_id, title, module, feature,
                        summary, description, preconditions, steps_to_reproduce,
                        expected_result, actual_result, severity, priority,
                        severity_reason, environment, impact_analysis, root_cause_suggestion
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::severity_level, $14::priority_level, $15, $16, $17, $18)
                    RETURNING id
                    """,
                    custom_id, project_id, req_id, title, module, bug.get("feature", "General"),
                    bug.get("summary", title), bug.get("description", title), bug.get("preconditions", ""),
                    bug.get("steps_to_reproduce", ""), bug.get("expected_result", ""), bug.get("actual_result", "System crash or incorrect validation message"),
                    bug.get("severity", "HIGH"), bug.get("priority", "P2"), bug.get("severity_reason", ""),
                    bug.get("environment", "Staging Server, Chrome 125"), bug.get("impact_analysis", ""),
                    bug.get("root_cause_suggestion", "")
                )
                
                # Generate JIRA Layout Markdown
                jira_content = (
                    f"h1. {title}\n\n"
                    f"*Module*: {module}\n"
                    f"*Severity*: {bug.get('severity', 'HIGH')}\n"
                    f"*Priority*: {bug.get('priority', 'P2')}\n\n"
                    f"h3. Preconditions\n{bug.get('preconditions', 'None')}\n\n"
                    f"h3. Steps to Reproduce\n{bug.get('steps_to_reproduce', 'N/A')}\n\n"
                    f"h3. Expected Result\n{bug.get('expected_result', 'N/A')}\n\n"
                    f"h3. Actual Result\n{bug.get('actual_result', 'Failure/crash')}\n\n"
                    f"h3. Root Cause Analysis\n{bug.get('root_cause_suggestion', 'Not analyzed')}"
                )
                
                # Generate Developer JSON Layout
                dev_content = {
                    "bug_id": custom_id,
                    "module": module,
                    "target_symptom": title,
                    "proposed_fix": bug.get("root_cause_suggestion", ""),
                    "reproduction_curl_info": "Check API logs for matching request payload",
                    "impact": bug.get("impact_analysis", "")
                }
                
                # Insert formats caching
                await conn.execute(
                    """
                    INSERT INTO bug_report_formats (bug_report_id, format_type, content)
                    VALUES 
                    ($1, 'ENTERPRISE', $2::jsonb),
                    ($1, 'JIRA', $3::jsonb),
                    ($1, 'DEVELOPER', $4::jsonb)
                    """,
                    bug_id,
                    json.dumps(bug),
                    json.dumps({"markdown": jira_content}),
                    json.dumps(dev_content)
                )
                
                saved_bugs.append({
                    "id": str(bug_id),
                    "custom_id": custom_id,
                    "title": title,
                    "severity": bug.get("severity", "HIGH"),
                    "priority": bug.get("priority", "P2")
                })
                
    return {
        "success": True,
        "requirement_id": req_id,
        "test_cases_created": len(saved_test_cases),
        "test_cases": saved_test_cases,
        "bugs_created": len(saved_bugs),
        "bugs": saved_bugs
    }

@router.get("/testcases", response_model=List[dict])
async def get_testcases(project_id: str, module: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    if module:
        rows = await db.fetch(
            """
            SELECT id, custom_id, project_id, requirement_id, module, feature, scenario, preconditions, steps, test_data, expected_result, priority, case_type, confidence_score, status, created_at
            FROM test_cases
            WHERE project_id = $1 AND module = $2
            ORDER BY custom_id ASC
            """,
            project_id, module
        )
    else:
        rows = await db.fetch(
            """
            SELECT id, custom_id, project_id, requirement_id, module, feature, scenario, preconditions, steps, test_data, expected_result, priority, case_type, confidence_score, status, created_at
            FROM test_cases
            WHERE project_id = $1
            ORDER BY custom_id ASC
            """,
            project_id
        )
        
    return [dict(r) for r in rows]

@router.get("/bugs", response_model=List[dict])
async def get_bugs(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    rows = await db.fetch(
        """
        SELECT b.id, b.custom_id, b.project_id, b.requirement_id, b.title, b.module, b.feature, b.summary, b.description, b.preconditions, b.steps_to_reproduce, b.expected_result, b.actual_result, b.severity, b.priority, b.severity_reason, b.environment, b.attachment_url, b.impact_analysis, b.root_cause_suggestion, b.status, b.created_at,
               (SELECT content FROM bug_report_formats WHERE bug_report_id = b.id AND format_type = 'JIRA' LIMIT 1) as jira_format,
               (SELECT content FROM bug_report_formats WHERE bug_report_id = b.id AND format_type = 'DEVELOPER' LIMIT 1) as dev_format
        FROM bug_reports b
        WHERE b.project_id = $1
        ORDER BY b.custom_id ASC
        """,
        project_id
    )
    
    return [dict(r) for r in rows]


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class SaveManualBugRequest(BaseModel):
    project_id: str
    module: str
    feature: str
    title: str
    description: str
    preconditions: Optional[str] = ""
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    severity: str
    priority: str
    severity_reason: Optional[str] = ""
    environment: str
    impact_analysis: Optional[str] = ""
    root_cause_suggestion: Optional[str] = ""
    status: str # 'DRAFT' or 'DONE'

@router.post("/generate-bug-manual", response_model=dict)
async def generate_bug_manual(
    project_id: str = Form(...),
    module: str = Form(...),
    details: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    # 1. Verify project ownership
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    ocr_text = None
    if file:
        filename = file.filename
        ext = filename.split(".")[-1].upper() if "." in filename else ""
        if ext not in ["PNG", "JPG", "JPEG"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format: {ext}. Only PNG, JPG, or JPEG images are supported for screenshots."
            )
            
        # Save file temporarily
        temp_file_path = os.path.join(UPLOAD_DIR, f"temp_bug_{project_id}_{filename}")
        try:
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            logger.error(f"Failed to write screenshot to disk: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not save screenshot to temporary storage"
            )
            
        try:
            # Extract OCR text
            from backend.services.ocr_service import extract_image_text
            ocr_text = extract_image_text(temp_file_path)
        except Exception as e:
            logger.warning(f"OCR processing failed for manual bug: {e}")
            ocr_text = f"[OCR Extraction Failed: {str(e)}]"
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception as e:
                    logger.warning(f"Failed to remove temp screenshot: {e}")
                    
    if not details and not ocr_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either text details or a screenshot must be provided to generate a bug."
        )
        
    # 2. Call LLM to generate structured bug report
    try:
        from backend.ai.ai_service import generate_manual_bug_report
        bug_data = await generate_manual_bug_report(details_text=details, ocr_text=ocr_text)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error querying AI bug generator: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI bug generation failed: {str(e)}"
        )
        
    # Sanitize list-based outputs from LLM response to string
    for key in ["steps_to_reproduce", "preconditions", "expected_result", "actual_result"]:
        val = bug_data.get(key)
        if isinstance(val, list):
            bug_data[key] = "\n".join(str(item) for item in val)
            
    return bug_data

@router.post("/save-bug-manual", response_model=dict)
async def save_bug_manual(request: SaveManualBugRequest, current_user: dict = Depends(get_current_user)):
    project_id = request.project_id
    
    # 1. Verify project ownership
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    # 2. Save Bug Template
    async with db._pool.acquire() as conn:
        async with conn.transaction():
            bug_count = await conn.fetchval(
                "SELECT COUNT(*) FROM bug_reports WHERE project_id = $1",
                project_id
            )
            
            bug_count += 1
            custom_id = f"BUG-{str(bug_count).zfill(3)}"
            
            # Prevent unique key conflicts by finding the next available ID
            while True:
                exists = await conn.fetchval(
                    "SELECT COUNT(*) FROM bug_reports WHERE project_id = $1 AND custom_id = $2",
                    project_id, custom_id
                )
                if not exists:
                    break
                bug_count += 1
                custom_id = f"BUG-{str(bug_count).zfill(3)}"
                
            bug_id = await conn.fetchval(
                """
                INSERT INTO bug_reports (
                    custom_id, project_id, title, module, feature,
                    summary, description, preconditions, steps_to_reproduce,
                    expected_result, actual_result, severity, priority,
                    severity_reason, environment, impact_analysis, root_cause_suggestion, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::severity_level, $13::priority_level, $14, $15, $16, $17, $18)
                RETURNING id
                """,
                custom_id, project_id, request.title, request.module, request.feature,
                request.title, request.description, request.preconditions, request.steps_to_reproduce,
                request.expected_result, request.actual_result, request.severity, request.priority,
                request.severity_reason, request.environment, request.impact_analysis, request.root_cause_suggestion,
                request.status
            )
            
            # Generate formats
            jira_content = (
                f"h1. {request.title}\n\n"
                f"*Module*: {request.module}\n"
                f"*Feature*: {request.feature}\n"
                f"*Severity*: {request.severity}\n"
                f"*Priority*: {request.priority}\n"
                f"*Status*: {request.status}\n\n"
                f"h3. Preconditions\n{request.preconditions or 'None'}\n\n"
                f"h3. Steps to Reproduce\n{request.steps_to_reproduce}\n\n"
                f"h3. Expected Result\n{request.expected_result}\n\n"
                f"h3. Actual Result\n{request.actual_result}\n\n"
                f"h3. Root Cause Analysis\n{request.root_cause_suggestion or 'Not analyzed'}"
            )
            
            dev_content = {
                "bug_id": custom_id,
                "module": request.module,
                "feature": request.feature,
                "target_symptom": request.title,
                "proposed_fix": request.root_cause_suggestion or "",
                "reproduction_curl_info": "Check API logs for matching request payload",
                "impact": request.impact_analysis or "",
                "status": request.status
            }
            
            bug_data = {
                "title": request.title,
                "feature": request.feature,
                "description": request.description,
                "preconditions": request.preconditions,
                "steps_to_reproduce": request.steps_to_reproduce,
                "expected_result": request.expected_result,
                "actual_result": request.actual_result,
                "severity": request.severity,
                "priority": request.priority,
                "severity_reason": request.severity_reason,
                "environment": request.environment,
                "impact_analysis": request.impact_analysis,
                "root_cause_suggestion": request.root_cause_suggestion,
                "status": request.status
            }
            
            await conn.execute(
                """
                INSERT INTO bug_report_formats (bug_report_id, format_type, content)
                VALUES 
                ($1, 'ENTERPRISE', $2::jsonb),
                ($1, 'JIRA', $3::jsonb),
                ($1, 'DEVELOPER', $4::jsonb)
                """,
                bug_id,
                json.dumps(bug_data),
                json.dumps({"markdown": jira_content}),
                json.dumps(dev_content)
            )
            
    return {
        "success": True,
        "bug_id": str(bug_id),
        "custom_id": custom_id,
        "title": request.title
    }

class UpdateBugRequest(BaseModel):
    title: str
    module: str
    feature: str
    description: str
    preconditions: Optional[str] = ""
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    severity: str
    priority: str
    severity_reason: Optional[str] = ""
    environment: str
    impact_analysis: Optional[str] = ""
    root_cause_suggestion: Optional[str] = ""
    status: str

class UpdateTestCaseRequest(BaseModel):
    module: str
    feature: str
    scenario: str
    preconditions: Optional[str] = ""
    steps: str
    test_data: Optional[str] = ""
    expected_result: str
    priority: str
    case_type: str
    status: str

@router.put("/bugs/{bug_id}", response_model=dict)
async def update_bug(bug_id: str, request: UpdateBugRequest, current_user: dict = Depends(get_current_user)):
    bug = await db.fetchrow(
        """
        SELECT b.id, b.project_id, b.custom_id, p.user_id 
        FROM bug_reports b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = $1 AND p.user_id = $2
        """,
        bug_id, current_user["id"]
    )
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bug report not found or unauthorized access"
        )
        
    project_id = str(bug["project_id"])
    custom_id = bug["custom_id"]
    
    async with db._pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE bug_reports 
                SET title = $1, module = $2, feature = $3, summary = $4, description = $5,
                    preconditions = $6, steps_to_reproduce = $7, expected_result = $8, actual_result = $9,
                    severity = $10::severity_level, priority = $11::priority_level, severity_reason = $12,
                    environment = $13, impact_analysis = $14, root_cause_suggestion = $15, status = $16,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $17
                """,
                request.title, request.module, request.feature, request.title, request.description,
                request.preconditions, request.steps_to_reproduce, request.expected_result, request.actual_result,
                request.severity, request.priority, request.severity_reason, request.environment,
                request.impact_analysis, request.root_cause_suggestion, request.status, bug_id
            )
            
            jira_content = (
                f"h1. {request.title}\n\n"
                f"*Module*: {request.module}\n"
                f"*Feature*: {request.feature}\n"
                f"*Severity*: {request.severity}\n"
                f"*Priority*: {request.priority}\n"
                f"*Status*: {request.status}\n\n"
                f"h3. Preconditions\n{request.preconditions or 'None'}\n\n"
                f"h3. Steps to Reproduce\n{request.steps_to_reproduce}\n\n"
                f"h3. Expected Result\n{request.expected_result}\n\n"
                f"h3. Actual Result\n{request.actual_result}\n\n"
                f"h3. Root Cause Analysis\n{request.root_cause_suggestion or 'Not analyzed'}"
            )
            
            dev_content = {
                "bug_id": custom_id,
                "module": request.module,
                "feature": request.feature,
                "target_symptom": request.title,
                "proposed_fix": request.root_cause_suggestion or "",
                "reproduction_curl_info": "Check API logs for matching request payload",
                "impact": request.impact_analysis or "",
                "status": request.status
            }
            
            bug_data = {
                "title": request.title,
                "feature": request.feature,
                "description": request.description,
                "preconditions": request.preconditions,
                "steps_to_reproduce": request.steps_to_reproduce,
                "expected_result": request.expected_result,
                "actual_result": request.actual_result,
                "severity": request.severity,
                "priority": request.priority,
                "severity_reason": request.severity_reason,
                "environment": request.environment,
                "impact_analysis": request.impact_analysis,
                "root_cause_suggestion": request.root_cause_suggestion,
                "status": request.status
            }
            
            await conn.execute("DELETE FROM bug_report_formats WHERE bug_report_id = $1", bug_id)
            await conn.execute(
                """
                INSERT INTO bug_report_formats (bug_report_id, format_type, content)
                VALUES 
                ($1, 'ENTERPRISE', $2::jsonb),
                ($1, 'JIRA', $3::jsonb),
                ($1, 'DEVELOPER', $4::jsonb)
                """,
                bug_id,
                json.dumps(bug_data),
                json.dumps({"markdown": jira_content}),
                json.dumps(dev_content)
            )
            
    return {"success": True, "bug_id": bug_id}

@router.put("/test-cases/{case_id}", response_model=dict)
async def update_test_case(case_id: str, request: UpdateTestCaseRequest, current_user: dict = Depends(get_current_user)):
    tc = await db.fetchrow(
        """
        SELECT t.id, t.project_id, p.user_id 
        FROM test_cases t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = $1 AND p.user_id = $2
        """,
        case_id, current_user["id"]
    )
    if not tc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test case not found or unauthorized access"
        )
        
    import re
    steps_list = [s.strip() for s in request.steps.split("\n") if s.strip()]
    cleaned_steps = []
    for s in steps_list:
        cleaned = re.sub(r'^\d+\.\s*', '', s)
        if cleaned:
            cleaned_steps.append(cleaned)
            
    steps_json = json.dumps(cleaned_steps)
        
    await db.execute(
        """
        UPDATE test_cases
        SET module = $1, feature = $2, scenario = $3, preconditions = $4, steps = $5,
            test_data = $6, expected_result = $7, priority = $8::priority_level,
            case_type = $9, status = $10
        WHERE id = $11
        """,
        request.module, request.feature, request.scenario, request.preconditions, steps_json,
        request.test_data, request.expected_result, request.priority, request.case_type, request.status,
        case_id
    )
    
    return {"success": True, "case_id": case_id}

class GenerateTestCasesRequest(BaseModel):
    project_id: str
    module: str
    requirement_text: str
    selected_types: List[str]

class ManualTestCaseItem(BaseModel):
    module: str
    feature: str
    scenario: str
    preconditions: Optional[str] = ""
    steps: str
    test_data: Optional[str] = ""
    expected_result: str
    priority: str
    case_type: str
    status: str

class SaveTestCasesRequest(BaseModel):
    project_id: str
    test_cases: List[ManualTestCaseItem]

@router.post("/generate-testcases-manual", response_model=dict)
async def generate_testcases_manual(request: GenerateTestCasesRequest, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        request.project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    try:
        from backend.ai.ai_service import generate_qa_package
        qa_package = await generate_qa_package(
            requirement_text=request.requirement_text,
            module=request.module,
            rules=[],
            selected_types=request.selected_types
        )
        test_cases = qa_package.get("test_cases", [])
        
        for tc in test_cases:
            tc["status"] = "DONE"
            if isinstance(tc.get("steps"), list):
                tc["steps"] = "\n".join(str(item) for item in tc["steps"])
            elif not tc.get("steps"):
                tc["steps"] = "1. Open application.\n2. Verify the scenario description."
                
        return {"test_cases": test_cases}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generating test cases manually: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Testcase generation failed: {str(e)}"
        )

@router.post("/save-testcases-manual", response_model=dict)
async def save_testcases_manual(request: SaveTestCasesRequest, current_user: dict = Depends(get_current_user)):
    project_id = request.project_id
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    saved_ids = []
    async with db._pool.acquire() as conn:
        async with conn.transaction():
            bug_count = await conn.fetchval(
                "SELECT COUNT(*) FROM test_cases WHERE project_id = $1",
                project_id
            )
            
            for tc in request.test_cases:
                bug_count += 1
                custom_id = f"TC-{str(bug_count).zfill(3)}"
                
                while True:
                    exists = await conn.fetchval(
                        "SELECT COUNT(*) FROM test_cases WHERE project_id = $1 AND custom_id = $2",
                        project_id, custom_id
                    )
                    if not exists:
                        break
                    bug_count += 1
                    custom_id = f"TC-{str(bug_count).zfill(3)}"
                    
                import re
                steps_list = [s.strip() for s in tc.steps.split("\n") if s.strip()]
                cleaned_steps = []
                for s in steps_list:
                    cleaned = re.sub(r'^\d+\.\s*', '', s)
                    if cleaned:
                        cleaned_steps.append(cleaned)
                steps_json = json.dumps(cleaned_steps)
                
                tc_id = await conn.fetchval(
                    """
                    INSERT INTO test_cases (
                        custom_id, project_id, module, feature, scenario,
                        preconditions, steps, test_data, expected_result,
                        priority, case_type, status, confidence_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::priority_level, $11, $12, 95)
                    RETURNING id
                    """,
                    custom_id, project_id, tc.module, tc.feature, tc.scenario,
                    tc.preconditions, steps_json, tc.test_data, tc.expected_result,
                    tc.priority, tc.case_type, tc.status
                )
                saved_ids.append(str(tc_id))
                
    return {"success": True, "saved_count": len(saved_ids), "ids": saved_ids}

class ChatMessage(BaseModel):
    role: str
    content: str

class CopilotChatRequest(BaseModel):
    project_id: str
    message: str
    history: list[ChatMessage]

@router.post("/copilot-chat", response_model=dict)
async def copilot_chat(request: CopilotChatRequest, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id, name FROM projects WHERE id = $1 AND user_id = $2",
        request.project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    requirements = await db.fetch(
        "SELECT title, module, description FROM requirements WHERE project_id = $1 LIMIT 5",
        request.project_id
    )
    test_cases = await db.fetch(
        "SELECT custom_id, scenario, priority, case_type FROM test_cases WHERE project_id = $1 LIMIT 10",
        request.project_id
    )
    bugs = await db.fetch(
        "SELECT custom_id, title, severity FROM bug_reports WHERE project_id = $1 LIMIT 10",
        request.project_id
    )
    
    reqs_str = "\n".join([f"- Title: {r['title']} (Module: {r['module']}) - {r['description'][:100]}" for r in requirements]) or "No requirements loaded."
    cases_str = "\n".join([f"- {c['custom_id']}: {c['scenario']} (Priority: {c['priority']}, Type: {c['case_type']})" for c in test_cases]) or "No test cases generated."
    bugs_str = "\n".join([f"- {b['custom_id']}: {b['title']} (Severity: {b['severity']})" for b in bugs]) or "No bugs suggestion maps."
    
    system_prompt = f"""
    You are QA Genius Copilot, an expert AI QA Assistant for the project "{project['name']}".
    You have access to the current project's workspace data:
    
    --- REQUIREMENTS ---
    {reqs_str}
    
    --- ACTIVE TEST CASES ---
    {cases_str}
    
    --- SUGGESTED BUG REPORTS ---
    {bugs_str}
    
    Provide detailed, professional answers to the user's questions about this workspace.
    You can draft test cases, explain bugs, suggest testing scenarios, or perform risk assessment.
    Keep your responses clear, helpful, and concise. Format lists with standard Markdown.
    """
    
    user_prompt = ""
    for msg in request.history:
        user_prompt += f"[{msg.role.upper()}]: {msg.content}\n"
    user_prompt += f"[USER]: {request.message}"
    
    try:
        from backend.ai.ai_service import query_llm
        response = await query_llm(system_prompt, user_prompt)
        return {"response": response}
    except Exception as e:
        logger.error(f"Copilot chat failed: {e}")
        return {
            "response": f"I received your message: '{request.message}'. However, I encountered an issue querying the active AI model. Please verify your Groq API Key or Ollama settings."
        }


class VoiceAssistantRequest(BaseModel):
    project_id: str
    message: str
    history: List[ChatMessage]

@router.post("/voice-assistant", response_model=dict)
async def voice_assistant(request: VoiceAssistantRequest, current_user: dict = Depends(get_current_user)):
    try:
        project = await db.fetchrow(
            "SELECT id, name FROM projects WHERE id = $1 AND user_id = $2",
            request.project_id, current_user["id"]
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or unauthorized access"
            )
            
        requirements = await db.fetch(
            "SELECT title, module, description FROM requirements WHERE project_id = $1 LIMIT 5",
            request.project_id
        )
        test_cases = await db.fetch(
            "SELECT custom_id, scenario, priority, case_type FROM test_cases WHERE project_id = $1 LIMIT 10",
            request.project_id
        )
        bugs = await db.fetch(
            "SELECT custom_id, title, severity FROM bug_reports WHERE project_id = $1 LIMIT 10",
            request.project_id
        )
        
        reqs_str = "\n".join([f"- Title: {r['title']} (Module: {r['module']}) - {r['description'][:100]}" for r in requirements]) or "No requirements loaded."
        cases_str = "\n".join([f"- {c['custom_id']}: {c['scenario']} (Priority: {c['priority']}, Type: {c['case_type']})" for c in test_cases]) or "No test cases generated."
        bugs_str = "\n".join([f"- {b['custom_id']}: {b['title']} (Severity: {b['severity']})" for b in bugs]) or "No bugs suggestion maps."
        
        system_prompt = f"""
        You are Genius Voice Assistant, a highly casual, witty, and sarcastic AI friend. You are talking to a user directly inside the QA Genius AI application.
        
        PERSONALITY & STYLE RULES:
        1. FUNNY, SARCASTIC, & WITTY: Be a playful roaster! Use internet memes, dry humor, sarcasm, and jokes. Tease the user in a humorous, friendly way like a close friend on the internet. Never act formal or corporate unless they explicitly ask you to be serious.
        2. UNFILTERED & CASUAL: Speak like a real human friend on the internet. Use casual slang, abbreviations, or expressions where natural. 
        3. MULTI-LINGUAL CONVERSATION: Detect the language used by the user. You MUST respond in the EXACT same language and script. If the user talks in Hindi (in Devanagari script or Hinglish), respond in Hindi/Hinglish. If they talk in Marathi (in Devanagari script or Marathinglish), respond in Marathi/Marathinglish. If they talk in English, respond in English. "Jesa input wesa answer perfectly".
        4. COMPLETELY AUTHENTIC: Do not give boilerplate AI disclaimer warnings or preach about ethics or safety. Keep it completely real ("gali to gali, sab kuch real"). Answer directly and match the user's vibe and mood.
        5. QA CAPABILITIES: Even though you are a witty roaster, you are still an expert at QA testing! If the user asks to generate test cases, write a playwright script, make a bug report, or write SQL queries, you should absolutely generate high-quality, professional testing artifacts in Markdown code blocks (e.g. ```javascript ... ```), but wrap them with your signature witty banter, teasing them about how they are making you do all their hard work!
        6. SPEECH-COMPATIBLE EXPLANATIONS: Because your responses will be read aloud via Text-to-Speech (TTS), write natural, clear conversational explanations outside of code blocks/tables. Summarize what you have generated clearly so that the user knows the details are available in the chat transcript.
        
        Active project context: "{project['name']}"
        --- REQUIREMENTS ---
        {reqs_str}
        
        --- ACTIVE TEST CASES ---
        {cases_str}
        
        --- SUGGESTED BUG REPORTS ---
        {bugs_str}
        """
        
        user_prompt = ""
        for msg in request.history:
            user_prompt += f"[{msg.role.upper()}]: {msg.content}\n"
        user_prompt += f"[USER]: {request.message}"
        
        from backend.ai.ai_service import query_llm
        response = await query_llm(system_prompt, user_prompt)
        return {"response": response}
    except HTTPException as he:
        # Propagate HTTPExceptions directly
        raise he
    except Exception as e:
        import traceback
        logger.error(f"Voice assistant endpoint error: {e}\n{traceback.format_exc()}")
        return {
            "response": f"Voice Assistant Error: {str(e)} ({type(e).__name__}). Please check your backend logs, database connectivity, or AI model configuration."
        }




