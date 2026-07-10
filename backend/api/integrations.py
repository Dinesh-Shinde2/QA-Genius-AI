import base64
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from backend.database import db
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])
logger = logging.getLogger(__name__)

class ADOSettingsRequest(BaseModel):
    project_id: str
    org_name: str
    project_name: str
    pat_token: str

@router.post("/azure-devops/settings", response_model=dict)
async def save_ado_settings(request: ADOSettingsRequest, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        request.project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    await db.execute(
        """
        INSERT INTO integration_settings (project_id, provider, org_name, project_name, pat_token)
        VALUES ($1, 'AZURE_DEVOPS', $2, $3, $4)
        ON CONFLICT (project_id, provider) 
        DO UPDATE SET org_name = EXCLUDED.org_name, project_name = EXCLUDED.project_name, pat_token = EXCLUDED.pat_token
        """,
        request.project_id, request.org_name, request.project_name, request.pat_token
    )
    
    return {"success": True, "message": "Azure DevOps settings saved successfully"}

@router.get("/azure-devops/settings", response_model=dict)
async def get_ado_settings(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    settings = await db.fetchrow(
        "SELECT org_name, project_name, pat_token FROM integration_settings WHERE project_id = $1 AND provider = 'AZURE_DEVOPS'",
        project_id
    )
    if not settings:
        return {"configured": False}
        
    pat = settings["pat_token"]
    obfuscated_pat = pat[:4] + "*" * (len(pat) - 8) + pat[-4:] if len(pat) > 8 else "****"
    
    return {
        "configured": True,
        "org_name": settings["org_name"],
        "project_name": settings["project_name"],
        "pat_token": obfuscated_pat
    }

@router.post("/azure-devops/sync-bug/{bug_id}", response_model=dict)
async def sync_bug_to_ado(bug_id: str, current_user: dict = Depends(get_current_user)):
    bug = await db.fetchrow(
        """
        SELECT b.*, p.user_id 
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
        
    settings = await db.fetchrow(
        "SELECT org_name, project_name, pat_token FROM integration_settings WHERE project_id = $1 AND provider = 'AZURE_DEVOPS'",
        bug["project_id"]
    )
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Azure DevOps settings are not configured for this project."
        )
        
    org = settings["org_name"]
    project = settings["project_name"]
    pat = settings["pat_token"]
    
    steps_html = bug.get('steps_to_reproduce', '').replace('\n', '<br/>')
    description_html = f"""
    <div><b>Description:</b> {bug['description']}</div>
    <hr/>
    <div><b>Preconditions:</b> {bug.get('preconditions') or 'None'}</div>
    <div><b>Steps to Reproduce:</b><br/>{steps_html}</div>
    <hr/>
    <div><b>Expected Outcome:</b> {bug.get('expected_result')}</div>
    <div><b>Observed Symptom (Actual):</b> {bug.get('actual_result')}</div>
    <hr/>
    <div><b>Severity:</b> {bug.get('severity')} | <b>Priority:</b> {bug.get('priority')}</div>
    <div><b>Environment:</b> {bug.get('environment')}</div>
    <div><b>Proposed Code Fix Suggestion:</b> {bug.get('root_cause_suggestion') or 'None'}</div>
    """
    
    patch_document = [
        {"op": "add", "path": "/fields/System.Title", "value": f"[{bug['custom_id']}] {bug['title']}"},
        {"op": "add", "path": "/fields/System.Description", "value": description_html},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Severity", "value": bug.get("severity", "3 - Medium")},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": 2}
    ]
    
    auth_str = base64.b64encode(f":{pat}".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_str}",
        "Content-Type": "application/json-patch+json"
    }
    
    url = f"https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$Bug?api-version=7.1-preview.3"
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=patch_document, headers=headers, timeout=15.0)
            if res.status_code in [200, 201]:
                res_data = res.json()
                work_item_id = res_data.get("id")
                work_item_url = res_data.get("_links", {}).get("html", {}).get("href")
                
                await db.execute(
                    "UPDATE bug_reports SET summary = $1 WHERE id = $2",
                    f"Synced to ADO #{work_item_id}", bug_id
                )
                return {"success": True, "work_item_id": work_item_id, "url": work_item_url}
            else:
                logger.error(f"ADO bug sync failed: {res.status_code} - {res.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Azure DevOps API returned error: {res.text}"
                )
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to Azure DevOps API: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Failed to reach Azure DevOps Server: {str(e)}"
        )

@router.post("/azure-devops/sync-testcase/{case_id}", response_model=dict)
async def sync_testcase_to_ado(case_id: str, current_user: dict = Depends(get_current_user)):
    tc = await db.fetchrow(
        """
        SELECT t.*, p.user_id 
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
        
    settings = await db.fetchrow(
        "SELECT org_name, project_name, pat_token FROM integration_settings WHERE project_id = $1 AND provider = 'AZURE_DEVOPS'",
        tc["project_id"]
    )
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Azure DevOps settings are not configured for this project."
        )
        
    org = settings["org_name"]
    project = settings["project_name"]
    pat = settings["pat_token"]
    
    import json
    try:
        steps_list = json.loads(tc["steps"])
        steps_html = "<ol>" + "".join(f"<li>{s}</li>" for s in steps_list) + "</ol>"
    except Exception:
        steps_html = f"<pre>{tc['steps']}</pre>"
        
    description_html = f"""
    <div><b>Scenario:</b> {tc['scenario']}</div>
    <hr/>
    <div><b>Preconditions:</b> {tc.get('preconditions') or 'None'}</div>
    <div><b>Test Steps:</b><br/>{steps_html}</div>
    <hr/>
    <div><b>Expected Outcome:</b> {tc.get('expected_result')}</div>
    <div><b>Required Test Data:</b> {tc.get('test_data') or 'None'}</div>
    <hr/>
    <div><b>Case Type:</b> {tc.get('case_type')} | <b>Priority:</b> {tc.get('priority')}</div>
    """
    
    patch_document = [
        {"op": "add", "path": "/fields/System.Title", "value": f"[{tc['custom_id']}] {tc['scenario'][:120]}"},
        {"op": "add", "path": "/fields/System.Description", "value": description_html},
        {"op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": 3}
    ]
    
    auth_str = base64.b64encode(f":{pat}".encode("utf-8")).decode("utf-8")
    headers = {
        "Authorization": f"Basic {auth_str}",
        "Content-Type": "application/json-patch+json"
    }
    
    async def create_work_item(w_type: str) -> httpx.Response:
        url = f"https://dev.azure.com/{org}/{project}/_apis/wit/workitems/${w_type}?api-version=7.1-preview.3"
        async with httpx.AsyncClient() as client:
            return await client.post(url, json=patch_document, headers=headers, timeout=15.0)

    try:
        res = await create_work_item("Test Case")
        if res.status_code not in [200, 201]:
            logger.info("Test Case creation unsupported or failed, falling back to Task work item creation...")
            res = await create_work_item("Task")
            
        if res.status_code in [200, 201]:
            res_data = res.json()
            work_item_id = res_data.get("id")
            work_item_url = res_data.get("_links", {}).get("html", {}).get("href")
            
            await db.execute(
                "UPDATE test_cases SET test_data = $1 WHERE id = $2",
                f"Synced to ADO #{work_item_id}", case_id
            )
            return {"success": True, "work_item_id": work_item_id, "url": work_item_url}
        else:
            logger.error(f"ADO testcase sync failed: {res.status_code} - {res.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Azure DevOps API returned error: {res.text}"
            )
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to Azure DevOps API: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Failed to reach Azure DevOps Server: {str(e)}"
        )
