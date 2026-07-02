from fastapi import APIRouter, Depends, HTTPException
from backend.database import db
from backend.api.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/sprints", tags=["sprints"])

class SprintCreate(BaseModel):
    project_id: str
    name: str
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@router.get("/{project_id}")
async def get_sprints(project_id: str, current_user: dict = Depends(get_current_user)):
    query = "SELECT * FROM sprints WHERE project_id = $1 ORDER BY created_at DESC"
    records = await db.fetch(query, uuid.UUID(project_id))
    return [dict(r) for r in records]

@router.post("/")
async def create_sprint(sprint: SprintCreate, current_user: dict = Depends(get_current_user)):
    query = """
        INSERT INTO sprints (project_id, name, goal, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    """
    record = await db.fetchrow(query, uuid.UUID(sprint.project_id), sprint.name, sprint.goal, None, None)
    return dict(record)
