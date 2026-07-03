from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.database import db
from backend.models.schemas import ProjectCreate, ProjectResponse
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])

# ─── Helper: check if user can access a project (owner OR team member) ────────
async def is_project_member(project_id: str, user_id: str) -> bool:
    """Returns True if user is the project owner OR a team member assigned to it."""
    row = await db.fetchrow(
        """
        SELECT p.id FROM projects p
        WHERE p.id = $1 AND (
            p.user_id = $2
            OR EXISTS (
                SELECT 1 FROM project_teams pt
                JOIN team_members tm ON pt.team_id = tm.team_id
                WHERE pt.project_id = p.id AND tm.user_id = $2
            )
        )
        """,
        project_id, user_id
    )
    return row is not None

# Mock template loader helper
async def preload_domain_template(project_id: str, domain: str):
    domain = domain.upper()
    
    templates = {
        "CONTACT_CENTER": [
            {
                "title": "IVR Route Management System",
                "module": "IVR Designer",
                "description": "System should allow a QA administrator to select DTMF inputs (0-9, *, #) and map them to target endpoints (ACD Queue, External Number, Hangup, Voicemail). Key mapping must be unique per menu level. If user presses invalid digit or times out after 5 seconds, play error message and repeat menu.",
                "test_cases": [
                    {
                        "custom_id": "TC-IVR-001",
                        "feature": "DTMF Input Routing",
                        "scenario": "Map DTMF key '1' to ACD Support Queue and verify successful call routing.",
                        "preconditions": "ACD Support Queue is active and online.",
                        "steps": "1. Dial inbound route.\n2. In IVR menu, press '1'.\n3. Check active call logs for destination queue destination.",
                        "test_data": "Inbound DTMF: '1'",
                        "expected_result": "Inbound call is bridged to the ACD Support Queue agent pool.",
                        "priority": "P1",
                        "case_type": "Positive",
                        "confidence_score": 98
                    },
                    {
                        "custom_id": "TC-IVR-002",
                        "feature": "Duplicate DTMF Mapping Validation",
                        "scenario": "Attempt to map DTMF key '1' to both ACD Queue and external SIP trunk in the same menu level.",
                        "preconditions": "DTMF key '1' is already mapped to ACD Support Queue.",
                        "steps": "1. Navigate to IVR Designer workspace.\n2. Attempt to add a routing block mapping DTMF '1' to '+18005550199'.\n3. Click Save.",
                        "test_data": "DTMF Input: '1', Target: External Number",
                        "expected_result": "Save operation fails. Screen displays error: 'Digit 1 is already mapped to ACD Support Queue.'",
                        "priority": "P2",
                        "case_type": "Negative",
                        "confidence_score": 94
                    },
                    {
                        "custom_id": "TC-IVR-003",
                        "feature": "IVR Input Timeout Handling",
                        "scenario": "Verify IVR menu replay and audio prompt announcement on dtmf input timeout.",
                        "preconditions": "IVR Menu timeout is configured for 5 seconds.",
                        "steps": "1. Initiate inbound call.\n2. Wait for main IVR menu prompt to finish.\n3. Do not press any digit for 6 seconds.\n4. Listen to prompt feedback.",
                        "test_data": "No DTMF input",
                        "expected_result": "Call is not disconnected. System announces 'We did not receive any input' and plays the menu options again.",
                        "priority": "P3",
                        "case_type": "Edge Case",
                        "confidence_score": 92
                    }
                ]
            },
            {
                "title": "Agent Dashboard Queue Widget",
                "module": "Agent Desktop",
                "description": "Agent Console widget must display active queue wait times and status count (Idle, On Call, Break) in real-time. If there are no agents logged in or the queue is empty, the widget must display 0 to indicate inactive state. Active state indicators must flash cyan on queue updates.",
                "test_cases": [
                    {
                        "custom_id": "TC-QD-001",
                        "feature": "Real-time Metrics Display",
                        "scenario": "Verify queue wait status card displays 0 when no calls are queuing and no agents are active.",
                        "preconditions": "Queue is empty. 0 agents are online.",
                        "steps": "1. Log in to agent dashboard console.\n2. View the 'Queue Status' card.\n3. Observe values.",
                        "test_data": "Queue ID: 1002 (empty)",
                        "expected_result": "Widget renders '0' for active calls, active agents, and average wait time.",
                        "priority": "P1",
                        "case_type": "Positive",
                        "confidence_score": 95
                    }
                ]
            },
            {
                "title": "SIP Trunk Audio Failover",
                "module": "SIP Trunking",
                "description": "System should monitor primary SIP trunk heartbeat ping. If ping packet loss exceeds 20% or response latency is over 500ms, route outbound calls automatically through the secondary failover carrier trunk within 250 milliseconds.",
                "test_cases": [] # Missing test case to show coverage matrix functionality!
            }
        ],
        "CRM": [
            {
                "title": "Outbound Lead Automation Rules",
                "module": "Lead Funnel",
                "description": "System must automatically update the lead stage from 'New' to 'Contacted' when an outbound email template is successfully sent from the contact profile. If email delivery fails, the stage should revert to 'New' and flag a notification alert.",
                "test_cases": [
                    {
                        "custom_id": "TC-CRM-001",
                        "feature": "Lead Stage Transition",
                        "scenario": "Verify Lead Status shifts to 'Contacted' on email send.",
                        "preconditions": "Lead exists in status 'New' with a valid email address.",
                        "steps": "1. Open lead profile.\n2. Click Email.\n3. Send template 'Introductory Call'.\n4. Confirm SMTP delivery receipt.\n5. Verify Lead Stage field.",
                        "test_data": "Lead Email: lead@test.com",
                        "expected_result": "Lead Stage is updated to 'Contacted' and entry is logged in active CRM feed.",
                        "priority": "P2",
                        "case_type": "Positive",
                        "confidence_score": 96
                    }
                ]
            }
        ],
        "BANKING": [
            {
                "title": "Cross-Border Transaction Safeguards",
                "module": "Funds Transfer",
                "description": "Validates account balance for transfer amount + 1.5% international conversion fee. Reject transactions immediately if daily cumulative amount exceeds $5,000 USD or account flag is marked restricted.",
                "test_cases": [
                    {
                        "custom_id": "TC-BNK-001",
                        "feature": "Limit Safeguard Checks",
                        "scenario": "Attempt transfer of $5,001 USD in a single day and confirm refusal.",
                        "preconditions": "Account balance contains $10,000 USD.",
                        "steps": "1. Navigate to Transfer Portal.\n2. Set recipient bank as 'Europe Central'.\n3. Input amount $5,001.\n4. Click Submit.",
                        "test_data": "Transfer: $5,001 USD",
                        "expected_result": "Transfer is rejected. UI displays error: 'Transaction exceeds daily transfer limit of $5,000.'",
                        "priority": "P1",
                        "case_type": "Boundary",
                        "confidence_score": 97
                    }
                ]
            }
        ],
        "SAAS": [
            {
                "title": "API Rate-Limiting Protection",
                "module": "Gateway",
                "description": "Enforce maximum of 60 requests per minute per API key. Returns HTTP Status 429 (Too Many Requests) with Retry-After header once the limit is breached.",
                "test_cases": [
                    {
                        "custom_id": "TC-SAS-001",
                        "feature": "API Rate Limiting",
                        "scenario": "Execute 61 requests in 10 seconds and verify 429 status code on the 61st call.",
                        "preconditions": "Valid developer API key.",
                        "steps": "1. Fire 60 requests sequentially.\n2. Verify each yields HTTP 200.\n3. Fire 61st request.\n4. Inspect HTTP header responses.",
                        "test_data": "61 client queries, API Key: 'abc123xyz'",
                        "expected_result": "61st request returns HTTP 429 with 'Retry-After: 50' in header.",
                        "priority": "P1",
                        "case_type": "Positive",
                        "confidence_score": 95
                    }
                ]
            }
        ],
        "ECOMMERCE": [
            {
                "title": "Coupon Stack Exclusion",
                "module": "Checkout Cart",
                "description": "Shopping cart checkout must block coupon code stacking by default. Users cannot enter a second discount coupon unless the first coupon is explicitly flagged as 'Stackable' in the inventory rules database.",
                "test_cases": [
                    {
                        "custom_id": "TC-ECO-001",
                        "feature": "Coupon Stacking Block",
                        "scenario": "Verify non-stackable coupons cannot be combined in cart.",
                        "preconditions": "Cart contains products. Coupon 'SALE10' (non-stackable) is active.",
                        "steps": "1. Add item to cart.\n2. Apply coupon 'SALE10'.\n3. Attempt to apply coupon 'WELCOME5' (non-stackable).\n4. View UI feedback.",
                        "test_data": "Coupons: 'SALE10', 'WELCOME5'",
                        "expected_result": "WELCOME5 coupon is rejected. Alert shows 'Coupon cannot be combined with existing promotions.'",
                        "priority": "P2",
                        "case_type": "Negative",
                        "confidence_score": 93
                    }
                ]
            }
        ]
    }
    
    if domain not in templates:
        return
        
    for req in templates[domain]:
        # Insert Requirement
        req_id = await db.fetchval(
            """
            INSERT INTO requirements (project_id, title, module, description, file_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """,
            project_id, req["title"], req["module"], req["description"], "TXT"
        )
        
        # Insert corresponding test cases
        for tc in req["test_cases"]:
            await db.execute(
                """
                INSERT INTO test_cases (custom_id, project_id, requirement_id, title, module, feature, scenario, preconditions, steps, test_data, expected_result, priority, case_type, confidence_score, status, tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                """,
                tc["custom_id"], project_id, req_id, req["module"], tc["feature"], tc["scenario"],
                tc["preconditions"], tc["steps"], tc["test_data"], tc["expected_result"],
                tc["priority"], tc["case_type"], tc["confidence_score"]
            )

@router.post("", response_model=dict)
async def create_project(project: ProjectCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Check duplicate
    existing = await db.fetchrow(
        "SELECT id FROM projects WHERE user_id = $1 AND name = $2",
        user_id, project.name
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project with this name already exists"
        )
    
    # Save project
    project_id = await db.fetchval(
        """
        INSERT INTO projects (user_id, name, description, tech_stack)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        """,
        user_id, project.name, project.description, project.tech_stack
    )
    
    # Pre-populate domain template if specified
    if project.domain_template:
        await preload_domain_template(str(project_id), project.domain_template)
        
    return {"success": True, "project_id": str(project_id), "message": "Project created successfully"}

@router.get("", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """
    Returns all projects the current user can access:
    1. Projects they own (user_id = current user)
    2. Projects assigned to a team they are a member of
    """
    rows = await db.fetch(
        """
        SELECT DISTINCT p.id, p.user_id, p.name, p.description, p.tech_stack, p.created_at, p.updated_at
        FROM projects p
        WHERE
            p.user_id = $1
            OR EXISTS (
                SELECT 1 FROM project_teams pt
                JOIN team_members tm ON pt.team_id = tm.team_id
                WHERE pt.project_id = p.id AND tm.user_id = $1
            )
        ORDER BY p.name ASC
        """,
        current_user["id"]
    )
    return [
        ProjectResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            name=row["name"],
            description=row["description"],
            tech_stack=row["tech_stack"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        ) for row in rows
    ]

@router.delete("/{project_id}", response_model=dict)
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    # Check project ownership
    project = await db.fetchrow(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        project_id, current_user["id"]
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )
        
    await db.execute("DELETE FROM projects WHERE id = $1", project_id)
    return {"success": True, "message": "Project deleted successfully"}
