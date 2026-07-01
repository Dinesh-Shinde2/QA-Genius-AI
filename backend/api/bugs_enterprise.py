import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional

from backend.database import db
from backend.api.auth import get_current_user
from backend.ai.ai_service import query_llm
from backend.models.schemas import (
    EnterpriseBugCreate, EnterpriseBugUpdate, BugStatusChange,
    BugAssignRequest, BugCommentCreate, AIBugGenerateRequest, BugStatus
)

router = APIRouter(prefix="/api/bugs", tags=["Enterprise Bugs"])
logger = logging.getLogger(__name__)


# ─── helpers ─────────────────────────────────────────────────────────────────

def _bug_row_to_dict(row) -> dict:
    d = dict(row)
    for k, v in d.items():
        if hasattr(v, 'isoformat'):
            d[k] = v.isoformat()
        elif hasattr(v, '__str__') and type(v).__name__ == 'UUID':
            d[k] = str(v)
    # Tags is a postgres array or None
    if d.get("tags") is None:
        d["tags"] = []
    return d


async def _log_history(bug_id: str, user_id: str, action: str, old_value: str = None, new_value: str = None, description: str = None):
    await db.execute(
        """
        INSERT INTO bug_history (bug_id, changed_by, action, old_value, new_value, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        bug_id, user_id, action, old_value, new_value, description
    )


async def _create_notification(user_id: str, bug_id: str, bug_title: str, notif_type: str, message: str):
    try:
        await db.execute(
            """
            INSERT INTO bug_notifications (user_id, bug_id, bug_title, notification_type, message)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id, bug_id, bug_title, notif_type, message
        )
    except Exception as e:
        logger.warning(f"Failed to create notification: {e}")


# ─── LIST BUGS ───────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
async def list_bugs(
    project_id: str,
    bug_status: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    priority: Optional[str] = None,
    module: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all enterprise bugs for a project with optional filters."""
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    conditions = ["b.project_id = $1"]
    params = [project_id]
    idx = 2

    if bug_status:
        conditions.append(f"b.status = ${idx}"); params.append(bug_status); idx += 1
    if severity:
        conditions.append(f"b.severity = ${idx}"); params.append(severity); idx += 1
    if priority:
        conditions.append(f"b.priority = ${idx}"); params.append(priority); idx += 1
    if module:
        conditions.append(f"b.module = ${idx}"); params.append(module); idx += 1
    if assigned_to:
        conditions.append(f"b.assigned_to::text = ${idx}"); params.append(assigned_to); idx += 1
    if search:
        conditions.append(f"(LOWER(b.title) LIKE LOWER(${idx}) OR LOWER(b.custom_id) LIKE LOWER(${idx}))")
        params.append(f"%{search}%"); idx += 1

    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"""
        SELECT b.*,
               u_created.name as created_by_name,
               u_assigned.name as assigned_to_name,
               u_assigned.email as assigned_to_email,
               u_assigned.role as assigned_to_role
        FROM enterprise_bugs b
        LEFT JOIN users u_created ON b.created_by = u_created.id
        LEFT JOIN users u_assigned ON b.assigned_to = u_assigned.id
        WHERE {where}
        ORDER BY
            CASE b.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
            b.created_at DESC
        """,
        *params
    )

    bugs = [_bug_row_to_dict(r) for r in rows]
    return {"bugs": bugs, "total": len(bugs)}


# ─── DASHBOARD METRICS ───────────────────────────────────────────────────────

@router.get("/dashboard", response_model=dict)
async def get_bug_dashboard(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get dashboard metrics for the bug management module."""
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    # Status counts
    status_rows = await db.fetch(
        "SELECT status, COUNT(*) as cnt FROM enterprise_bugs WHERE project_id = $1 GROUP BY status",
        project_id
    )
    status_map = {r["status"]: int(r["cnt"]) for r in status_rows}

    # Severity distribution
    sev_rows = await db.fetch(
        "SELECT severity, COUNT(*) as cnt FROM enterprise_bugs WHERE project_id = $1 GROUP BY severity",
        project_id
    )
    severity_dist = [{"name": r["severity"], "value": int(r["cnt"])} for r in sev_rows]

    # Priority distribution
    pri_rows = await db.fetch(
        "SELECT priority, COUNT(*) as cnt FROM enterprise_bugs WHERE project_id = $1 GROUP BY priority",
        project_id
    )
    priority_dist = [{"name": r["priority"], "value": int(r["cnt"])} for r in pri_rows]

    # Module-wise bug count
    module_rows = await db.fetch(
        "SELECT module, COUNT(*) as cnt FROM enterprise_bugs WHERE project_id = $1 GROUP BY module ORDER BY cnt DESC",
        project_id
    )
    module_dist = [{"module": r["module"], "count": int(r["cnt"])} for r in module_rows]

    # Developer performance (bugs assigned and resolved)
    dev_rows = await db.fetch(
        """
        SELECT u.name, u.id,
               COUNT(b.id) as total_assigned,
               COUNT(CASE WHEN b.status IN ('FIXED','CLOSED') THEN 1 END) as resolved,
               COUNT(CASE WHEN b.status = 'REOPENED' THEN 1 END) as reopened
        FROM enterprise_bugs b
        JOIN users u ON b.assigned_to = u.id
        WHERE b.project_id = $1
        GROUP BY u.id, u.name
        ORDER BY resolved DESC
        """,
        project_id
    )
    dev_perf = [
        {"name": r["name"], "total_assigned": int(r["total_assigned"]),
         "resolved": int(r["resolved"]), "reopened": int(r["reopened"])}
        for r in dev_rows
    ]

    # Average resolution time (CLOSED bugs)
    avg_row = await db.fetchrow(
        """
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
        FROM enterprise_bugs
        WHERE project_id = $1 AND status = 'CLOSED'
        """,
        project_id
    )
    avg_hours = round(float(avg_row["avg_hours"]), 1) if avg_row and avg_row["avg_hours"] else 0

    total = sum(status_map.values())

    return {
        "total": total,
        "by_status": status_map,
        "open": status_map.get("OPEN", 0) + status_map.get("NEW", 0),
        "assigned": status_map.get("ASSIGNED", 0),
        "in_progress": status_map.get("IN_PROGRESS", 0),
        "ready_for_retest": status_map.get("READY_FOR_RETEST", 0),
        "retesting": status_map.get("RETESTING", 0),
        "closed": status_map.get("CLOSED", 0),
        "reopened": status_map.get("REOPENED", 0),
        "critical": sum(1 for r in await db.fetch(
            "SELECT id FROM enterprise_bugs WHERE project_id = $1 AND severity = 'CRITICAL'", project_id
        )),
        "severity_distribution": severity_dist,
        "priority_distribution": priority_dist,
        "module_distribution": module_dist,
        "developer_performance": dev_perf,
        "avg_resolution_hours": avg_hours
    }


# ─── CREATE BUG ──────────────────────────────────────────────────────────────

@router.post("", response_model=dict)
async def create_bug(request: EnterpriseBugCreate, current_user: dict = Depends(get_current_user)):
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        request.project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    # Get current bug count for custom ID
    count = await db.fetchval(
        "SELECT COUNT(*) FROM enterprise_bugs WHERE project_id = $1", request.project_id
    )
    custom_id = f"BUG-{str(int(count) + 1).zfill(3)}"

    initial_status = "ASSIGNED" if request.assigned_to else "NEW"

    row = await db.fetchrow(
        """
        INSERT INTO enterprise_bugs (
            custom_id, project_id, title, module, feature, description,
            preconditions, steps_to_reproduce, expected_result, actual_result,
            severity, priority, environment, build_version, status,
            created_by, assigned_to, tags, linked_test_case_id, linked_requirement_id,
            root_cause_suggestion, fix_details, impact_analysis, severity_reason
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11::severity_level, $12::priority_level, $13, $14, $15,
            $16, $17, $18, $19, $20,
            $21, $22, $23, $24
        )
        RETURNING *
        """,
        custom_id, request.project_id, request.title, request.module, request.feature,
        request.description, request.preconditions, request.steps_to_reproduce,
        request.expected_result, request.actual_result,
        request.severity.value, request.priority.value, request.environment,
        request.build_version, initial_status,
        current_user["id"], request.assigned_to,
        request.tags or [], request.linked_test_case_id, request.linked_requirement_id,
        request.root_cause_suggestion, request.fix_details, request.impact_analysis,
        request.severity_reason
    )

    bug_id = str(row["id"])

    # Log creation history
    await _log_history(bug_id, current_user["id"], "CREATED", None, initial_status,
                       f"Bug created by {current_user['name']}")

    # If assigned, log assignment and notify
    if request.assigned_to:
        await _log_history(bug_id, current_user["id"], "ASSIGNED",
                           None, request.assigned_to,
                           f"Assigned to developer on creation")
        await _create_notification(
            request.assigned_to, bug_id, request.title,
            "ASSIGNED", f"You have been assigned bug {custom_id}: {request.title}"
        )

    return _bug_row_to_dict(row)


# ─── GET SINGLE BUG ──────────────────────────────────────────────────────────

@router.get("/{bug_id}", response_model=dict)
async def get_bug(bug_id: str, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        """
        SELECT b.*,
               u_created.name as created_by_name, u_created.email as created_by_email,
               u_assigned.name as assigned_to_name, u_assigned.email as assigned_to_email,
               u_assigned.role as assigned_to_role
        FROM enterprise_bugs b
        LEFT JOIN users u_created ON b.created_by = u_created.id
        LEFT JOIN users u_assigned ON b.assigned_to = u_assigned.id
        WHERE b.id = $1
        """,
        bug_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bug not found")

    # Verify project access
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        str(row["project_id"]), current_user["id"]
    )
    if not project:
        raise HTTPException(status_code=403, detail="Unauthorized")

    bug = _bug_row_to_dict(row)

    # Get comments
    comments = await db.fetch(
        """
        SELECT c.*, u.name as author_name, u.email as author_email, u.role as author_role
        FROM bug_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.bug_id = $1
        ORDER BY c.created_at ASC
        """,
        bug_id
    )
    bug["comments"] = [_bug_row_to_dict(c) for c in comments]

    # Get history/timeline
    history = await db.fetch(
        """
        SELECT h.*, u.name as changed_by_name
        FROM bug_history h
        LEFT JOIN users u ON h.changed_by = u.id
        WHERE h.bug_id = $1
        ORDER BY h.created_at ASC
        """,
        bug_id
    )
    bug["history"] = [_bug_row_to_dict(h) for h in history]

    # Get assignment history
    assignments = await db.fetch(
        """
        SELECT a.*, 
               u_by.name as assigned_by_name,
               u_to.name as assigned_to_name
        FROM bug_assignments a
        LEFT JOIN users u_by ON a.assigned_by = u_by.id
        LEFT JOIN users u_to ON a.assigned_to = u_to.id
        WHERE a.bug_id = $1
        ORDER BY a.assigned_at ASC
        """,
        bug_id
    )
    bug["assignment_history"] = [_bug_row_to_dict(a) for a in assignments]

    return bug


# ─── UPDATE BUG ──────────────────────────────────────────────────────────────

@router.put("/{bug_id}", response_model=dict)
async def update_bug(bug_id: str, request: EnterpriseBugUpdate, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        "SELECT b.*, p.user_id FROM enterprise_bugs b JOIN projects p ON b.project_id = p.id WHERE b.id = $1",
        bug_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bug not found")
    if str(row["user_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    updates = []
    params = []
    idx = 1

    fields = {
        "title": request.title, "module": request.module, "feature": request.feature,
        "description": request.description, "preconditions": request.preconditions,
        "steps_to_reproduce": request.steps_to_reproduce, "expected_result": request.expected_result,
        "actual_result": request.actual_result, "environment": request.environment,
        "build_version": request.build_version, "root_cause_suggestion": request.root_cause_suggestion,
        "fix_details": request.fix_details, "impact_analysis": request.impact_analysis,
        "severity_reason": request.severity_reason
    }

    for field, val in fields.items():
        if val is not None:
            updates.append(f"{field} = ${idx}"); params.append(val); idx += 1

    if request.severity is not None:
        updates.append(f"severity = ${idx}::severity_level"); params.append(request.severity.value); idx += 1
    if request.priority is not None:
        updates.append(f"priority = ${idx}::priority_level"); params.append(request.priority.value); idx += 1
    if request.tags is not None:
        updates.append(f"tags = ${idx}"); params.append(request.tags); idx += 1

    if updates:
        updates.append(f"updated_at = NOW()")
        params.append(bug_id)
        updated_row = await db.fetchrow(
            f"UPDATE enterprise_bugs SET {', '.join(updates)} WHERE id = ${idx} RETURNING *",
            *params
        )
        await _log_history(bug_id, current_user["id"], "UPDATED", None, None, f"Bug fields updated by {current_user['name']}")
        return _bug_row_to_dict(updated_row)

    return _bug_row_to_dict(row)


# ─── CHANGE STATUS ───────────────────────────────────────────────────────────

@router.post("/{bug_id}/status", response_model=dict)
async def change_bug_status(bug_id: str, request: BugStatusChange, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        "SELECT b.*, p.user_id FROM enterprise_bugs b JOIN projects p ON b.project_id = p.id WHERE b.id = $1",
        bug_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bug not found")
    if str(row["user_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    old_status = row["status"]
    new_status = request.status.value

    updated = await db.fetchrow(
        "UPDATE enterprise_bugs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        new_status, bug_id
    )

    description = request.comment or f"Status changed from {old_status} to {new_status}"
    await _log_history(bug_id, current_user["id"], "STATUS_CHANGED", old_status, new_status, description)

    # Auto-suggest: when FIXED, if there's an original reporter, notify for retest
    if new_status == "FIXED" and row["created_by"]:
        await _create_notification(
            str(row["created_by"]), bug_id, row["title"],
            "RETEST_REQUIRED",
            f"Bug {row['custom_id']} has been marked FIXED. Please retest."
        )
        # Auto-set to READY_FOR_RETEST
        await db.execute(
            "UPDATE enterprise_bugs SET status = 'READY_FOR_RETEST', updated_at = NOW() WHERE id = $1",
            bug_id
        )
        await _log_history(bug_id, current_user["id"], "STATUS_CHANGED", "FIXED", "READY_FOR_RETEST",
                           "Auto-transitioned to READY_FOR_RETEST after fix")
        updated = await db.fetchrow("SELECT * FROM enterprise_bugs WHERE id = $1", bug_id)

    # Notify on REOPENED
    if new_status == "REOPENED" and row["assigned_to"]:
        await _create_notification(
            str(row["assigned_to"]), bug_id, row["title"],
            "REOPENED",
            f"Bug {row['custom_id']} has been REOPENED after retest failure. Please fix again."
        )

    # Notify on CLOSED
    if new_status == "CLOSED" and row["assigned_to"]:
        await _create_notification(
            str(row["assigned_to"]), bug_id, row["title"],
            "CLOSED",
            f"Bug {row['custom_id']} has been verified and CLOSED by QA."
        )

    return _bug_row_to_dict(updated)


# ─── ASSIGN BUG ──────────────────────────────────────────────────────────────

@router.post("/{bug_id}/assign", response_model=dict)
async def assign_bug(bug_id: str, request: BugAssignRequest, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        "SELECT b.*, p.user_id FROM enterprise_bugs b JOIN projects p ON b.project_id = p.id WHERE b.id = $1",
        bug_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bug not found")
    if str(row["user_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    assignee = await db.fetchrow("SELECT id, name, email, role FROM users WHERE id = $1", request.assigned_to)
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")

    old_assigned = str(row["assigned_to"]) if row["assigned_to"] else None
    new_status = "ASSIGNED"

    updated = await db.fetchrow(
        "UPDATE enterprise_bugs SET assigned_to = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
        request.assigned_to, new_status, bug_id
    )

    # Log assignment record
    await db.execute(
        """
        INSERT INTO bug_assignments (bug_id, assigned_by, assigned_to, comment)
        VALUES ($1, $2, $3, $4)
        """,
        bug_id, current_user["id"], request.assigned_to, request.comment
    )

    await _log_history(bug_id, current_user["id"], "ASSIGNED", old_assigned, request.assigned_to,
                       request.comment or f"Bug assigned to {assignee['name']}")

    # Notify assignee
    await _create_notification(
        request.assigned_to, bug_id, row["title"],
        "ASSIGNED",
        f"Bug {row['custom_id']} has been assigned to you by {current_user['name']}"
    )

    return _bug_row_to_dict(updated)


# ─── GET HISTORY / TIMELINE ──────────────────────────────────────────────────

@router.get("/{bug_id}/history", response_model=dict)
async def get_bug_history(bug_id: str, current_user: dict = Depends(get_current_user)):
    history = await db.fetch(
        """
        SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
        FROM bug_history h
        LEFT JOIN users u ON h.changed_by = u.id
        WHERE h.bug_id = $1
        ORDER BY h.created_at ASC
        """,
        bug_id
    )
    return {"history": [_bug_row_to_dict(h) for h in history]}


# ─── COMMENTS ────────────────────────────────────────────────────────────────

@router.get("/{bug_id}/comments", response_model=dict)
async def get_comments(bug_id: str, current_user: dict = Depends(get_current_user)):
    rows = await db.fetch(
        """
        SELECT c.*, u.name as author_name, u.email as author_email, u.role as author_role
        FROM bug_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.bug_id = $1
        ORDER BY c.created_at ASC
        """,
        bug_id
    )
    return {"comments": [_bug_row_to_dict(r) for r in rows]}


@router.post("/{bug_id}/comments", response_model=dict)
async def add_comment(bug_id: str, request: BugCommentCreate, current_user: dict = Depends(get_current_user)):
    bug = await db.fetchrow(
        "SELECT b.*, p.user_id FROM enterprise_bugs b JOIN projects p ON b.project_id = p.id WHERE b.id = $1",
        bug_id
    )
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
    if str(bug["user_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    row = await db.fetchrow(
        """
        INSERT INTO bug_comments (bug_id, author_id, content, parent_comment_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        bug_id, current_user["id"], request.content, request.parent_comment_id
    )

    await _log_history(bug_id, current_user["id"], "COMMENT_ADDED", None, None,
                       f"Comment added by {current_user['name']}")

    # Notify assigned developer if commenter is not the assignee
    if bug["assigned_to"] and str(bug["assigned_to"]) != current_user["id"]:
        await _create_notification(
            str(bug["assigned_to"]), bug_id, bug["title"],
            "COMMENT_ADDED",
            f"{current_user['name']} commented on bug {bug['custom_id']}"
        )

    comment = _bug_row_to_dict(row)
    comment["author_name"] = current_user["name"]
    comment["author_role"] = current_user.get("role", "")
    return comment


@router.delete("/comments/{comment_id}", response_model=dict)
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        "SELECT id, author_id FROM bug_comments WHERE id = $1", comment_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(row["author_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    await db.execute("DELETE FROM bug_comments WHERE id = $1", comment_id)
    return {"success": True}


# ─── AI GENERATE BUG ─────────────────────────────────────────────────────────

@router.post("/generate-ai", response_model=dict)
async def generate_ai_bug(request: AIBugGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Use AI to generate a structured bug report from a plain text description."""
    project = await db.fetchrow(
        "SELECT id, name FROM projects WHERE id = $1 AND user_id = $2",
        request.project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    system_prompt = """You are an expert QA engineer. Given a problem description, generate a detailed, professional bug report in strict JSON format.

Return ONLY a valid JSON object with these exact keys:
{
  "title": "Concise bug title (max 80 chars)",
  "module": "Affected module name",
  "feature": "Specific feature name",
  "description": "Detailed description of the bug",
  "preconditions": "What must be true before reproducing",
  "steps_to_reproduce": "1. Step one\\n2. Step two\\n3. Step three",
  "expected_result": "What should happen",
  "actual_result": "What actually happens",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "priority": "P1|P2|P3|P4",
  "environment": "Browser/OS/Version details",
  "root_cause_suggestion": "Likely technical root cause",
  "impact_analysis": "Business and user impact",
  "severity_reason": "Why this severity was chosen",
  "tags": ["tag1", "tag2"]
}

Be specific, professional, and thorough."""

    user_prompt = f"""Project: {project['name']}
Module context: {request.module or 'General'}

Problem Description:
{request.description}

Generate a complete enterprise bug report for this issue."""

    try:
        raw = await query_llm(system_prompt, user_prompt)
        # Parse JSON from response
        raw = raw.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        bug_data = json.loads(raw)

        # Validate and sanitize
        valid_severities = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        valid_priorities = {"P1", "P2", "P3", "P4"}

        return {
            "title": str(bug_data.get("title", "AI Generated Bug"))[:200],
            "module": str(bug_data.get("module", request.module or "General")),
            "feature": str(bug_data.get("feature", "General")),
            "description": str(bug_data.get("description", "")),
            "preconditions": str(bug_data.get("preconditions", "")),
            "steps_to_reproduce": str(bug_data.get("steps_to_reproduce", "")),
            "expected_result": str(bug_data.get("expected_result", "")),
            "actual_result": str(bug_data.get("actual_result", "")),
            "severity": bug_data.get("severity", "HIGH") if bug_data.get("severity") in valid_severities else "HIGH",
            "priority": bug_data.get("priority", "P2") if bug_data.get("priority") in valid_priorities else "P2",
            "environment": str(bug_data.get("environment", "QA Environment")),
            "root_cause_suggestion": str(bug_data.get("root_cause_suggestion", "")),
            "impact_analysis": str(bug_data.get("impact_analysis", "")),
            "severity_reason": str(bug_data.get("severity_reason", "")),
            "tags": bug_data.get("tags", []) if isinstance(bug_data.get("tags"), list) else [],
            "project_id": request.project_id
        }
    except json.JSONDecodeError as e:
        logger.error(f"AI bug generate: JSON parse failed: {e}\nRaw: {raw}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Please try again.")
    except Exception as e:
        logger.error(f"AI bug generate error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ─── DELETE BUG ──────────────────────────────────────────────────────────────

@router.delete("/{bug_id}", response_model=dict)
async def delete_bug(bug_id: str, current_user: dict = Depends(get_current_user)):
    row = await db.fetchrow(
        "SELECT b.id, p.user_id FROM enterprise_bugs b JOIN projects p ON b.project_id = p.id WHERE b.id = $1",
        bug_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bug not found")
    if str(row["user_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    await db.execute("DELETE FROM enterprise_bugs WHERE id = $1", bug_id)
    return {"success": True, "message": "Bug deleted"}


# ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

@router.get("/notifications/all", response_model=dict)
async def get_notifications(current_user: dict = Depends(get_current_user)):
    rows = await db.fetch(
        """
        SELECT * FROM bug_notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
        """,
        current_user["id"]
    )
    return {
        "notifications": [_bug_row_to_dict(r) for r in rows],
        "unread_count": sum(1 for r in rows if not r["is_read"])
    }


@router.put("/notifications/read", response_model=dict)
async def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.execute(
        "UPDATE bug_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
        current_user["id"]
    )
    return {"success": True}
