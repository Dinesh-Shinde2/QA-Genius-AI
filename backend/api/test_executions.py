from fastapi import APIRouter, Depends, HTTPException
from backend.database import db
from backend.api.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/test-executions", tags=["test_executions"])

class ExecutionCreate(BaseModel):
    project_id: str
    suite_name: str
    test_case_id: Optional[str] = None
    status: str

@router.get("/{project_id}")
async def get_executions(project_id: str, current_user: dict = Depends(get_current_user)):
    query = "SELECT * FROM test_executions WHERE project_id = $1 ORDER BY created_at DESC"
    records = await db.fetch(query, uuid.UUID(project_id))
    return [dict(r) for r in records]

@router.post("/")
async def create_execution(ex: ExecutionCreate, current_user: dict = Depends(get_current_user)):
    query = """
        INSERT INTO test_executions (project_id, suite_name, status, executed_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    """
    record = await db.fetchrow(query, uuid.UUID(ex.project_id), ex.suite_name, ex.status, uuid.UUID(current_user['id']))
    return dict(record)
