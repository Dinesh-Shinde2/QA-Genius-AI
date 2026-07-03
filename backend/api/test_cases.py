from fastapi import APIRouter, Depends, HTTPException, Query
from backend.database import db
from backend.api.auth import get_current_user
from backend.models.schemas import TestCaseCreate
from typing import Optional, List
import uuid
import json

router = APIRouter(prefix="/api/test-cases", tags=["test_cases"])

@router.get("/{project_id}")
async def get_test_cases(
    project_id: str, 
    module: Optional[str] = None,
    priority: Optional[str] = None,
    case_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = "SELECT * FROM test_cases WHERE project_id = $1"
    args = [uuid.UUID(project_id)]
    
    if module:
        args.append(module)
        query += f" AND module = ${len(args)}"
    if priority:
        args.append(priority)
        query += f" AND priority = ${len(args)}"
    if case_type:
        args.append(case_type)
        query += f" AND case_type = ${len(args)}"
    if status:
        args.append(status)
        query += f" AND status = ${len(args)}"
    if search:
        args.append(f"%{search}%")
        query += f" AND (title ILIKE ${len(args)} OR custom_id ILIKE ${len(args)} OR scenario ILIKE ${len(args)})"
        
    query += " ORDER BY created_at DESC"
    records = await db.fetch(query, *args)
    return [dict(r) for r in records]

@router.post("/")
async def create_test_case(tc: TestCaseCreate, current_user: dict = Depends(get_current_user)):
    custom_id = tc.custom_id
    if not custom_id:
        # Generate custom id
        count = await db.fetchval("SELECT COUNT(*) FROM test_cases WHERE project_id = $1", uuid.UUID(tc.project_id))
        custom_id = f"TC-{count+1:04d}"
        
    # Extract title from scenario if not provided
    title = tc.title if hasattr(tc, 'title') and tc.title else tc.scenario[:50]
    
    query = """
        INSERT INTO test_cases (
            custom_id, project_id, requirement_id, title, module, feature, 
            scenario, preconditions, steps, test_data, expected_result, 
            priority, case_type, status, tags, attachments, confidence_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
    """
    record = await db.fetchrow(
        query, 
        custom_id,
        uuid.UUID(tc.project_id),
        uuid.UUID(tc.requirement_id) if tc.requirement_id else None,
        title, tc.module, tc.feature, tc.scenario, tc.preconditions,
        tc.steps, tc.test_data, tc.expected_result, tc.priority.value,
        tc.case_type, tc.status.value, tc.tags, tc.attachments, 100
    )
    
    # Save version 1
    await db.execute("""
        INSERT INTO test_case_versions (test_case_id, version_number, changed_by, changes_made, snapshot)
        VALUES ($1, $2, $3, $4, $5)
    """, record['id'], 1, uuid.UUID(current_user['id']), json.dumps({"reason": "Initial Creation"}), json.dumps(dict(record), default=str))
    
    return dict(record)

@router.delete("/{test_case_id}")
async def delete_test_case(test_case_id: str, current_user: dict = Depends(get_current_user)):
    await db.execute("DELETE FROM test_cases WHERE id = $1", uuid.UUID(test_case_id))
    return {"status": "success", "message": "Test case deleted"}

@router.post("/bulk-delete")
async def bulk_delete_test_cases(payload: dict, current_user: dict = Depends(get_current_user)):
    ids = payload.get("ids", [])
    if not ids: return {"status": "success"}
    id_list = [uuid.UUID(i) for i in ids]
    await db.execute("DELETE FROM test_cases WHERE id = ANY($1::uuid[])", id_list)
    return {"status": "success"}

@router.get("/{test_case_id}/history")
async def get_test_case_history(test_case_id: str, current_user: dict = Depends(get_current_user)):
    query = """
        SELECT v.*, u.name as changed_by_name 
        FROM test_case_versions v
        LEFT JOIN users u ON v.changed_by = u.id
        WHERE v.test_case_id = $1
        ORDER BY v.version_number DESC
    """
    records = await db.fetch(query, uuid.UUID(test_case_id))
    return [dict(r) for r in records]
