from fastapi import APIRouter, Depends, HTTPException, Query
from backend.database import db
from backend.api.auth import get_current_user
from backend.models.schemas import TestCycleCreate
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter(prefix="/api/test-executions", tags=["test_executions"])

class ExecutionUpdate(BaseModel):
    status: str
    comments: Optional[str] = None
    execution_time_ms: Optional[int] = None
    attachment_url: Optional[str] = None

@router.get("/{project_id}/cycles")
async def get_test_cycles(project_id: str, current_user: dict = Depends(get_current_user)):
    query = """
        SELECT c.*, 
               (SELECT COUNT(*) FROM test_executions e WHERE e.test_cycle_id = c.id) as total_cases,
               (SELECT COUNT(*) FROM test_executions e WHERE e.test_cycle_id = c.id AND e.status = 'PASS') as passed_cases,
               (SELECT COUNT(*) FROM test_executions e WHERE e.test_cycle_id = c.id AND e.status = 'FAIL') as failed_cases,
               (SELECT COUNT(*) FROM test_executions e WHERE e.test_cycle_id = c.id AND e.status IN ('SKIP', 'BLOCKED')) as skipped_cases
        FROM test_cycles c
        WHERE c.project_id = $1
        ORDER BY c.created_at DESC
    """
    records = await db.fetch(query, uuid.UUID(project_id))
    return [dict(r) for r in records]

@router.get("/cycle/{cycle_id}/executions")
async def get_cycle_details(cycle_id: str, current_user: dict = Depends(get_current_user)):
    query = """
        SELECT e.id as execution_id, e.status, e.executed_at, e.comments, e.execution_time_ms, e.attachment_url,
               e.test_case_id,
               t.custom_id, t.title, t.module, t.feature, t.scenario, t.expected_result, t.priority, t.preconditions, t.steps,
               u.name as executed_by_name
        FROM test_executions e
        LEFT JOIN test_cases t ON e.test_case_id = t.id
        LEFT JOIN users u ON e.executed_by = u.id
        WHERE e.test_cycle_id = $1
        ORDER BY t.custom_id ASC
    """
    records = await db.fetch(query, uuid.UUID(cycle_id))
    return [dict(r) for r in records]

@router.post("/cycle")
async def create_test_cycle(cycle: TestCycleCreate, current_user: dict = Depends(get_current_user)):
    # Create cycle
    insert_cycle_query = """
        INSERT INTO test_cycles (project_id, name, description, release_id, sprint_id, environment, start_date, end_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    """
    cycle_id = await db.fetchval(
        insert_cycle_query, 
        uuid.UUID(cycle.project_id), cycle.name, cycle.description,
        uuid.UUID(cycle.release_id) if cycle.release_id else None,
        uuid.UUID(cycle.sprint_id) if cycle.sprint_id else None,
        cycle.environment, cycle.start_date, cycle.end_date, cycle.status.value
    )
    
    # Fetch test cases, filter by selected modules if provided
    if cycle.target_modules and len(cycle.target_modules) > 0:
        tc_query = "SELECT id FROM test_cases WHERE project_id = $1 AND module = ANY($2::text[])"
        test_cases = await db.fetch(tc_query, uuid.UUID(cycle.project_id), cycle.target_modules)
    else:
        tc_query = "SELECT id FROM test_cases WHERE project_id = $1"
        test_cases = await db.fetch(tc_query, uuid.UUID(cycle.project_id))
    
    insert_exec_query = """
        INSERT INTO test_executions (project_id, test_cycle_id, test_case_id, status)
        VALUES ($1, $2, $3, 'NOT_EXECUTED')
    """
    
    for tc in test_cases:
        await db.execute(insert_exec_query, uuid.UUID(cycle.project_id), cycle_id, tc['id'])
        
    return {"status": "success", "message": f"Test cycle '{cycle.name}' created with {len(test_cases)} test cases.", "cycle_id": cycle_id}

@router.put("/{execution_id}/status")
async def update_execution_status(execution_id: str, update: ExecutionUpdate, current_user: dict = Depends(get_current_user)):
    query = """
        UPDATE test_executions
        SET status = $1, 
            comments = COALESCE($2::text, comments),
            execution_time_ms = COALESCE($3::integer, execution_time_ms),
            attachment_url = COALESCE($4::text, attachment_url),
            executed_by = $5, 
            executed_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
    """
    record = await db.fetchrow(
        query, 
        update.status, update.comments, update.execution_time_ms, update.attachment_url,
        uuid.UUID(current_user['id']), uuid.UUID(execution_id)
    )
    if not record:
        raise HTTPException(status_code=404, detail="Test execution not found")
    
    # Save to execution_comments if a comment was explicitly added
    if update.comments:
        await db.execute("""
            INSERT INTO execution_comments (execution_id, author_id, content)
            VALUES ($1, $2, $3)
        """, uuid.UUID(execution_id), uuid.UUID(current_user['id']), update.comments)

    return dict(record)

@router.get("/{execution_id}/comments")
async def get_execution_comments(execution_id: str, current_user: dict = Depends(get_current_user)):
    query = """
        SELECT c.*, u.name as author_name
        FROM execution_comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.execution_id = $1
        ORDER BY c.created_at ASC
    """
    records = await db.fetch(query, uuid.UUID(execution_id))
    return [dict(r) for r in records]
