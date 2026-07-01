import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from backend.database import db
from backend.api.auth import get_current_user
from backend.models.schemas import TeamCreate, TeamUpdate, TeamMemberAdd, TeamProjectAssign

router = APIRouter(prefix="/api/teams", tags=["Teams"])
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# LIST TEAMS
# ─────────────────────────────────────────────
@router.get("", response_model=dict)
async def list_teams(current_user: dict = Depends(get_current_user)):
    """List all teams the current user belongs to or created."""
    rows = await db.fetch(
        """
        SELECT t.id, t.name, t.description, t.team_type, t.created_by, t.created_at,
               COUNT(tm.user_id) as member_count
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.created_by = $1 OR tm.user_id = $1
        GROUP BY t.id
        ORDER BY t.created_at DESC
        """,
        current_user["id"]
    )
    teams = []
    for row in rows:
        team_dict = dict(row)
        team_dict["id"] = str(team_dict["id"])
        team_dict["created_by"] = str(team_dict["created_by"])
        team_dict["member_count"] = int(team_dict.get("member_count", 0))
        teams.append(team_dict)
    return {"teams": teams}


# ─────────────────────────────────────────────
# CREATE TEAM
# ─────────────────────────────────────────────
@router.post("", response_model=dict)
async def create_team(request: TeamCreate, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        """
        INSERT INTO teams (name, description, team_type, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, team_type, created_by, created_at
        """,
        request.name, request.description, request.team_type, current_user["id"]
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create team")

    # Auto-add creator as member
    await db.execute(
        "INSERT INTO team_members (team_id, user_id, role_in_team) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        str(row["id"]), current_user["id"], current_user.get("role", "QA_LEAD")
    )

    return {
        "id": str(row["id"]),
        "name": row["name"],
        "description": row["description"],
        "team_type": row["team_type"],
        "created_by": str(row["created_by"]),
        "created_at": row["created_at"].isoformat()
    }


# ─────────────────────────────────────────────
# GET SINGLE TEAM
# ─────────────────────────────────────────────
@router.get("/{team_id}", response_model=dict)
async def get_team(team_id: str, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        """
        SELECT t.id, t.name, t.description, t.team_type, t.created_by, t.created_at
        FROM teams t
        WHERE t.id = $1
        """,
        team_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get members
    members = await db.fetch(
        """
        SELECT u.id, u.name, u.email, u.role, tm.role_in_team, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.joined_at ASC
        """,
        team_id
    )

    # Get linked projects
    projects = await db.fetch(
        """
        SELECT p.id, p.name, p.description
        FROM project_teams pt
        JOIN projects p ON pt.project_id = p.id
        WHERE pt.team_id = $1
        """,
        team_id
    )

    return {
        "id": str(row["id"]),
        "name": row["name"],
        "description": row["description"],
        "team_type": row["team_type"],
        "created_by": str(row["created_by"]),
        "created_at": row["created_at"].isoformat(),
        "members": [
            {
                "id": str(m["id"]),
                "name": m["name"],
                "email": m["email"],
                "role": m["role"],
                "role_in_team": m["role_in_team"],
                "joined_at": m["joined_at"].isoformat() if m["joined_at"] else None
            }
            for m in members
        ],
        "projects": [
            {"id": str(p["id"]), "name": p["name"], "description": p["description"]}
            for p in projects
        ]
    }


# ─────────────────────────────────────────────
# UPDATE TEAM
# ─────────────────────────────────────────────
@router.put("/{team_id}", response_model=dict)
async def update_team(team_id: str, request: TeamUpdate, current_user: dict = Depends(get_current_user)):
    team = await db.fetchrow(
        "SELECT id, created_by FROM teams WHERE id = $1",
        team_id
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team["created_by"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team creator can edit this team")

    updates = []
    params = []
    idx = 1
    if request.name is not None:
        updates.append(f"name = ${idx}"); params.append(request.name); idx += 1
    if request.description is not None:
        updates.append(f"description = ${idx}"); params.append(request.description); idx += 1
    if request.team_type is not None:
        updates.append(f"team_type = ${idx}"); params.append(request.team_type); idx += 1

    if not updates:
        return {"success": True, "message": "No changes"}

    params.append(team_id)
    await db.execute(
        f"UPDATE teams SET {', '.join(updates)}, updated_at = NOW() WHERE id = ${idx}",
        *params
    )
    return {"success": True, "message": "Team updated"}


# ─────────────────────────────────────────────
# DELETE TEAM
# ─────────────────────────────────────────────
@router.delete("/{team_id}", response_model=dict)
async def delete_team(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.fetchrow(
        "SELECT id, created_by FROM teams WHERE id = $1",
        team_id
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team["created_by"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team creator can delete this team")

    await db.execute("DELETE FROM teams WHERE id = $1", team_id)
    return {"success": True, "message": "Team deleted"}


# ─────────────────────────────────────────────
# LIST TEAM MEMBERS
# ─────────────────────────────────────────────
@router.get("/{team_id}/members", response_model=dict)
async def list_team_members(team_id: str, current_user: dict = Depends(get_current_user)):
    members = await db.fetch(
        """
        SELECT u.id, u.name, u.email, u.role, tm.role_in_team, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.joined_at ASC
        """,
        team_id
    )
    return {
        "members": [
            {
                "id": str(m["id"]),
                "name": m["name"],
                "email": m["email"],
                "role": m["role"],
                "role_in_team": m["role_in_team"],
                "joined_at": m["joined_at"].isoformat() if m["joined_at"] else None
            }
            for m in members
        ]
    }


# ─────────────────────────────────────────────
# ADD MEMBER TO TEAM
# ─────────────────────────────────────────────
@router.post("/{team_id}/members", response_model=dict)
async def add_team_member(team_id: str, request: TeamMemberAdd, current_user: dict = Depends(get_current_user)):
    team = await db.fetchrow("SELECT id FROM teams WHERE id = $1", team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Verify user exists
    user = await db.fetchrow("SELECT id, name, email, role FROM users WHERE id = $1", request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.execute(
        """
        INSERT INTO team_members (team_id, user_id, role_in_team)
        VALUES ($1, $2, $3)
        ON CONFLICT (team_id, user_id) DO UPDATE SET role_in_team = EXCLUDED.role_in_team
        """,
        team_id, request.user_id, request.role_in_team or user["role"]
    )
    return {
        "success": True,
        "member": {
            "id": str(user["id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "role_in_team": request.role_in_team or user["role"]
        }
    }


# ─────────────────────────────────────────────
# REMOVE MEMBER FROM TEAM
# ─────────────────────────────────────────────
@router.delete("/{team_id}/members/{user_id}", response_model=dict)
async def remove_team_member(team_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.fetchrow(
        "SELECT id, created_by FROM teams WHERE id = $1",
        team_id
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if str(team["created_by"]) != current_user["id"] and user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the team creator can remove members")

    await db.execute(
        "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
        team_id, user_id
    )
    return {"success": True, "message": "Member removed from team"}


# ─────────────────────────────────────────────
# ASSIGN TEAM TO PROJECT
# ─────────────────────────────────────────────
@router.post("/{team_id}/projects", response_model=dict)
async def assign_team_to_project(team_id: str, request: TeamProjectAssign, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        request.project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    team = await db.fetchrow("SELECT id FROM teams WHERE id = $1", team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    await db.execute(
        """
        INSERT INTO project_teams (project_id, team_id)
        VALUES ($1, $2)
        ON CONFLICT (project_id, team_id) DO NOTHING
        """,
        request.project_id, team_id
    )
    return {"success": True, "message": "Team assigned to project"}


# ─────────────────────────────────────────────
# GET TEAMS FOR A PROJECT
# ─────────────────────────────────────────────
@router.get("/project/{project_id}", response_model=dict)
async def get_project_teams(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    rows = await db.fetch(
        """
        SELECT t.id, t.name, t.description, t.team_type,
               COUNT(tm.user_id) as member_count
        FROM project_teams pt
        JOIN teams t ON pt.team_id = t.id
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE pt.project_id = $1
        GROUP BY t.id
        """,
        project_id
    )
    return {
        "teams": [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "description": r["description"],
                "team_type": r["team_type"],
                "member_count": int(r.get("member_count", 0))
            }
            for r in rows
        ]
    }


# ─────────────────────────────────────────────
# SEARCH USERS (to add to team)
# ─────────────────────────────────────────────
@router.get("/users/search", response_model=dict)
async def search_users(q: str = "", current_user: dict = Depends(get_current_user)):
    """Search platform users by email or name for adding to a team."""
    rows = await db.fetch(
        """
        SELECT id, name, email, role
        FROM users
        WHERE (LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1))
        AND id != $2
        LIMIT 20
        """,
        f"%{q}%", current_user["id"]
    )
    return {
        "users": [
            {"id": str(r["id"]), "name": r["name"], "email": r["email"], "role": r["role"]}
            for r in rows
        ]
    }
