from fastapi import APIRouter, Depends, HTTPException
from backend.database import db
from backend.api.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/api/releases", tags=["releases"])

class ReleaseCreate(BaseModel):
    project_id: str
    version_name: str
    target_date: Optional[str] = None

@router.get("/{project_id}")
async def get_releases(project_id: str, current_user: dict = Depends(get_current_user)):
    query = "SELECT * FROM releases WHERE project_id = $1 ORDER BY created_at DESC"
    records = await db.fetch(query, uuid.UUID(project_id))
    return [dict(r) for r in records]

@router.post("/")
async def create_release(release: ReleaseCreate, current_user: dict = Depends(get_current_user)):
    query = """
        INSERT INTO releases (project_id, version_name)
        VALUES ($1, $2)
        RETURNING *
    """
    record = await db.fetchrow(query, uuid.UUID(release.project_id), release.version_name)
    return dict(record)
