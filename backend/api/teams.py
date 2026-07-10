import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel

from backend.database import db
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/teams", tags=["Teams"])
logger = logging.getLogger(__name__)

# ─── Pydantic Schemas for Local Validation ───────────────────────
class ProjectMemberAdd(BaseModel):
    email: str
    role: str = "QA_ENGINEER" # 'ADMIN', 'QA_LEAD', 'QA_ENGINEER', 'DEVELOPER'

class ProjectMemberUpdate(BaseModel):
    role: str

# ─── Helper: Check Admin/Owner Permissions ───────────────────────
async def check_project_admin(project_id: str, user_id: str) -> bool:
    try:
        p_uuid = uuid.UUID(project_id)
        u_uuid = uuid.UUID(user_id)
    except ValueError:
        return False
        
    # Check if user is the owner of the project
    owner = await db.fetchval("SELECT user_id FROM projects WHERE id = $1", p_uuid)
    if owner and owner == u_uuid:
        return True
        
    # Check if user has an ADMIN or QA_LEAD role in the project_members table
    member_role = await db.fetchval(
        "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
        p_uuid, u_uuid
    )
    if member_role in ["ADMIN", "QA_LEAD"]:
        return True
        
    return False

# ─────────────────────────────────────────────────────────────
# 1. LIST PROJECT MEMBERS
# ─────────────────────────────────────────────────────────────
@router.get("/project/{project_id}/members", response_model=dict)
async def list_project_members(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        p_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    # Check if current user is owner or member of this project
    is_owner = await db.fetchval("SELECT id FROM projects WHERE id = $1 AND user_id = $2", p_uuid, uuid.UUID(current_user["id"]))
    is_member = await db.fetchval("SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2", p_uuid, uuid.UUID(current_user["id"]))
    
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project.")

    # Fetch owner details
    owner_row = await db.fetchrow(
        """
        SELECT u.id, u.name, u.email, u.role as platform_role
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
        """,
        p_uuid
    )
    
    # Fetch members details
    member_rows = await db.fetch(
        """
        SELECT u.id, u.name, u.email, pm.role, pm.joined_at
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1
        ORDER BY pm.joined_at ASC
        """,
        p_uuid
    )

    members_list = []
    # Add owner as first member (ADMIN/Owner role)
    if owner_row:
        members_list.append({
            "id": str(owner_row["id"]),
            "name": owner_row["name"],
            "email": owner_row["email"],
            "role": "OWNER",
            "joined_at": None
        })

    for m in member_rows:
        members_list.append({
            "id": str(m["id"]),
            "name": m["name"],
            "email": m["email"],
            "role": m["role"],
            "joined_at": m["joined_at"].isoformat() if m["joined_at"] else None
        })

    return {"members": members_list}

# ─────────────────────────────────────────────────────────────
# 2. ADD / INVITE MEMBER TO PROJECT
# ─────────────────────────────────────────────────────────────
@router.post("/project/{project_id}/members", response_model=dict)
async def add_project_member(project_id: str, request: ProjectMemberAdd, current_user: dict = Depends(get_current_user)):
    # Verify permission
    has_permission = await check_project_admin(project_id, current_user["id"])
    if not has_permission:
        raise HTTPException(status_code=403, detail="Only project owners or administrators can invite team members.")

    try:
        p_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    # Find user by email
    invited_user = await db.fetchrow(
        "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)",
        request.email.strip()
    )
    if not invited_user:
        raise HTTPException(
            status_code=404, 
            detail=f"User with email '{request.email}' is not registered on the platform."
        )

    # Check if they are already the owner of the project
    is_owner = await db.fetchval("SELECT id FROM projects WHERE id = $1 AND user_id = $2", p_uuid, invited_user["id"])
    if is_owner:
        raise HTTPException(status_code=400, detail="This user is already the owner of the project.")

    # Insert or update role in project_members
    await db.execute(
        """
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
        """,
        p_uuid, invited_user["id"], request.role
    )

    return {
        "success": True,
        "message": f"Successfully invited {invited_user['name']} to the project.",
        "member": {
            "id": str(invited_user["id"]),
            "name": invited_user["name"],
            "email": invited_user["email"],
            "role": request.role
        }
    }

# ─────────────────────────────────────────────────────────────
# 3. UPDATE MEMBER ROLE
# ─────────────────────────────────────────────────────────────
@router.put("/project/{project_id}/members/{user_id}", response_model=dict)
async def update_project_member_role(project_id: str, user_id: str, request: ProjectMemberUpdate, current_user: dict = Depends(get_current_user)):
    # Verify permission
    has_permission = await check_project_admin(project_id, current_user["id"])
    if not has_permission:
        raise HTTPException(status_code=403, detail="Only project owners or administrators can edit team member roles.")

    try:
        p_uuid = uuid.UUID(project_id)
        u_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID formats.")

    # Check if user is a member
    member = await db.fetchrow(
        "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
        p_uuid, u_uuid
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in this project.")

    # Update role
    await db.execute(
        "UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3",
        request.role, p_uuid, u_uuid
    )

    return {"success": True, "message": "Member role updated successfully."}

# ─────────────────────────────────────────────────────────────
# 4. REMOVE MEMBER FROM PROJECT
# ─────────────────────────────────────────────────────────────
@router.delete("/project/{project_id}/members/{user_id}", response_model=dict)
async def remove_project_member(project_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    # Verify permission (A user can also remove themselves from a project)
    has_permission = await check_project_admin(project_id, current_user["id"])
    is_self = current_user["id"] == user_id
    
    if not has_permission and not is_self:
        raise HTTPException(status_code=403, detail="Only project owners, administrators, or the users themselves can remove members.")

    try:
        p_uuid = uuid.UUID(project_id)
        u_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID formats.")

    # Check if user is a member
    member = await db.fetchrow(
        "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
        p_uuid, u_uuid
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in this project.")

    # Delete membership
    await db.execute(
        "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2",
        p_uuid, u_uuid
    )

    return {"success": True, "message": "Member successfully removed from project."}

# ─────────────────────────────────────────────────────────────
# 5. SEARCH USERS
# ─────────────────────────────────────────────────────────────
@router.get("/users/search", response_model=dict)
async def search_users(q: str = "", current_user: dict = Depends(get_current_user)):
    """Search users by name or email to invite them to projects."""
    rows = await db.fetch(
        """
        SELECT id, name, email, role
        FROM users
        WHERE (LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1))
        AND id != $2
        LIMIT 10
        """,
        f"%{q}%", uuid.UUID(current_user["id"])
    )
    return {
        "users": [
            {"id": str(r["id"]), "name": r["name"], "email": r["email"], "role": r["role"]}
            for r in rows
        ]
    }
