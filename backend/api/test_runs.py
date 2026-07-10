import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.database import db
from backend.api.auth import get_current_user
from backend.api.projects import is_project_member

router = APIRouter(prefix="/api/test-runs", tags=["Test Runs"])
logger = logging.getLogger(__name__)

# ─── Pydantic Request Schemas ─────────────────────────────────────────
class TestRunCreate(BaseModel):
    project_id: str
    name: str

class TestRunResultLog(BaseModel):
    test_case_id: str
    status: str # 'PASSED', 'FAILED', 'BLOCKED'
    actual_result: Optional[str] = None
    bug_id: Optional[str] = None

# ──────────────────────────────────────────────────────────────────────
# 1. START A NEW TEST RUN
# ──────────────────────────────────────────────────────────────────────
@router.post("", response_model=dict)
async def start_test_run(request: TestRunCreate, current_user: dict = Depends(get_current_user)):
    try:
        p_uuid = uuid.UUID(request.project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    # Check project membership
    is_member = await is_project_member(request.project_id, current_user["id"])
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project.")

    # Create test run record
    run_id = await db.fetchval(
        """
        INSERT INTO test_runs (project_id, name, status, created_by)
        VALUES ($1, $2, 'IN_PROGRESS', $3)
        RETURNING id
        """,
        p_uuid, request.name.strip(), uuid.UUID(current_user["id"])
    )

    return {
        "success": True,
        "message": "Test execution run started successfully.",
        "test_run_id": str(run_id)
    }

# ──────────────────────────────────────────────────────────────────────
# 2. LIST ALL TEST RUNS IN A PROJECT
# ──────────────────────────────────────────────────────────────────────
@router.get("/project/{project_id}", response_model=dict)
async def list_project_test_runs(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        p_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    is_member = await is_project_member(project_id, current_user["id"])
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project.")

    rows = await db.fetch(
        """
        SELECT tr.id, tr.name, tr.status, tr.created_at, tr.completed_at, u.name as tester_name,
               (SELECT COUNT(*) FROM test_cases WHERE project_id = tr.project_id) as total_cases,
               (SELECT COUNT(*) FROM test_run_results WHERE test_run_id = tr.id) as executed_cases,
               (SELECT COUNT(*) FROM test_run_results WHERE test_run_id = tr.id AND status = 'PASSED') as passed_cases,
               (SELECT COUNT(*) FROM test_run_results WHERE test_run_id = tr.id AND status = 'FAILED') as failed_cases
        FROM test_runs tr
        LEFT JOIN users u ON tr.created_by = u.id
        WHERE tr.project_id = $1
        ORDER BY tr.created_at DESC
        """,
        p_uuid
    )

    test_runs = []
    for r in rows:
        test_runs.append({
            "id": str(r["id"]),
            "name": r["name"],
            "status": r["status"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
            "tester_name": r["tester_name"] or "Unknown Tester",
            "stats": {
                "total": int(r["total_cases"] or 0),
                "executed": int(r["executed_cases"] or 0),
                "passed": int(r["passed_cases"] or 0),
                "failed": int(r["failed_cases"] or 0)
            }
        })

    return {"test_runs": test_runs}

# ──────────────────────────────────────────────────────────────────────
# 3. GET SINGLE TEST RUN DETAILS & RESULTS list
# ──────────────────────────────────────────────────────────────────────
@router.get("/{run_id}", response_model=dict)
async def get_test_run(run_id: str, current_user: dict = Depends(get_current_user)):
    try:
        r_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run ID format.")

    # Fetch run details
    run = await db.fetchrow(
        "SELECT id, project_id, name, status, created_at, completed_at FROM test_runs WHERE id = $1",
        r_uuid
    )
    if not run:
        raise HTTPException(status_code=404, detail="Test execution run not found.")

    # Check project membership
    is_member = await is_project_member(str(run["project_id"]), current_user["id"])
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project.")

    # Fetch all test cases with their status in this execution run
    cases = await db.fetch(
        """
        SELECT tc.id, tc.custom_id, tc.title, tc.module, tc.feature, tc.scenario, 
               tc.preconditions, tc.steps, tc.test_data, tc.expected_result, tc.priority,
               trr.status as run_status, trr.actual_result, trr.bug_id, trr.executed_at,
               u.name as executed_by_name
        FROM test_cases tc
        LEFT JOIN test_run_results trr ON tc.id = trr.test_case_id AND trr.test_run_id = $1
        WHERE tc.project_id = $2
        ORDER BY tc.custom_id ASC
        """,
        r_uuid, run["project_id"]
    )

    cases_list = []
    for c in cases:
        cases_list.append({
            "id": str(c["id"]),
            "custom_id": c["custom_id"],
            "title": c["title"] or c["feature"] or c["scenario"][:50],
            "module": c["module"],
            "feature": c["feature"],
            "scenario": c["scenario"],
            "preconditions": c["preconditions"],
            "steps": c["steps"],
            "test_data": c["test_data"],
            "expected_result": c["expected_result"],
            "priority": c["priority"],
            "status": c["run_status"] or "UNEXECUTED",
            "actual_result": c["actual_result"],
            "bug_id": str(c["bug_id"]) if c["bug_id"] else None,
            "executed_at": c["executed_at"].isoformat() if c["executed_at"] else None,
            "executed_by": c["executed_by_name"]
        })

    return {
        "id": str(run["id"]),
        "project_id": str(run["project_id"]),
        "name": run["name"],
        "status": run["status"],
        "created_at": run["created_at"].isoformat() if run["created_at"] else None,
        "completed_at": run["completed_at"].isoformat() if run["completed_at"] else None,
        "results": cases_list
    }

# ──────────────────────────────────────────────────────────────────────
# 4. LOG / UPDATE TEST CASE RESULT
# ──────────────────────────────────────────────────────────────────────
@router.post("/{run_id}/results", response_model=dict)
async def log_test_case_result(run_id: str, request: TestRunResultLog, current_user: dict = Depends(get_current_user)):
    try:
        r_uuid = uuid.UUID(run_id)
        tc_uuid = uuid.UUID(request.test_case_id)
        b_uuid = uuid.UUID(request.bug_id) if request.bug_id else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID formats.")

    # Fetch run details to confirm access
    run = await db.fetchrow("SELECT project_id, status FROM test_runs WHERE id = $1", r_uuid)
    if not run:
        raise HTTPException(status_code=404, detail="Test execution run not found.")
    if run["status"] == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot log results for a completed test run.")

    # Check project membership
    is_member = await is_project_member(str(run["project_id"]), current_user["id"])
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project.")

    # Log/Upsert execution result
    await db.execute(
        """
        INSERT INTO test_run_results (test_run_id, test_case_id, status, actual_result, bug_id, executed_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (test_run_id, test_case_id)
        DO UPDATE SET status = EXCLUDED.status, 
                      actual_result = EXCLUDED.actual_result,
                      bug_id = COALESCE(EXCLUDED.bug_id, test_run_results.bug_id),
                      executed_by = EXCLUDED.executed_by,
                      executed_at = CURRENT_TIMESTAMP
        """,
        r_uuid, tc_uuid, request.status, request.actual_result, b_uuid, uuid.UUID(current_user["id"])
    )

    return {"success": True, "message": "Result logged successfully."}

# ──────────────────────────────────────────────────────────────────────
# 5. COMPLETE A TEST RUN
# ──────────────────────────────────────────────────────────────────────
@router.post("/{run_id}/complete", response_model=dict)
async def complete_test_run(run_id: str, current_user: dict = Depends(get_current_user)):
    try:
        r_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run ID format.")

    run = await db.fetchrow("SELECT project_id FROM test_runs WHERE id = $1", r_uuid)
    if not run:
        raise HTTPException(status_code=404, detail="Test execution run not found.")

    is_member = await is_project_member(str(run["project_id"]), current_user["id"])
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project.")

    # Update status to completed
    await db.execute(
        "UPDATE test_runs SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = $1",
        r_uuid
    )

    return {"success": True, "message": "Test execution run completed successfully."}
