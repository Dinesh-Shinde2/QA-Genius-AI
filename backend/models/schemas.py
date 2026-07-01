from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    QA_LEAD = "QA_LEAD"
    QA_ENGINEER = "QA_ENGINEER"
    AUTOMATION_ENGINEER = "AUTOMATION_ENGINEER"
    DEVELOPER = "DEVELOPER"
    PRODUCT_MANAGER = "PRODUCT_MANAGER"
    TECH_LEAD = "TECH_LEAD"

class PriorityLevel(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"

class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class BugStatus(str, Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    FIXED = "FIXED"
    READY_FOR_RETEST = "READY_FOR_RETEST"
    RETESTING = "RETESTING"
    REOPENED = "REOPENED"
    DEFERRED = "DEFERRED"
    REJECTED = "REJECTED"
    DUPLICATE = "DUPLICATE"
    CANNOT_REPRODUCE = "CANNOT_REPRODUCE"
    CLOSED = "CLOSED"

# Authentication Schemas
class UserRegister(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.QA_ENGINEER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

# Project Schemas
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    tech_stack: Optional[str] = None
    domain_template: Optional[str] = None # 'CRM', 'BANKING', 'CONTACT_CENTER', 'SAAS', 'ECOMMERCE'

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    tech_stack: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Requirement Schemas
class RequirementCreate(BaseModel):
    project_id: str
    title: str
    module: str
    description: str
    file_url: Optional[str] = None
    file_type: Optional[str] = None

class RequirementResponse(BaseModel):
    id: str
    project_id: str
    title: str
    module: str
    description: str
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    extracted_features: Optional[Dict[str, Any]] = None
    created_at: datetime

# Test Case Schemas
class TestCaseResponse(BaseModel):
    id: str
    custom_id: str
    project_id: str
    requirement_id: Optional[str] = None
    module: str
    feature: str
    scenario: str
    preconditions: Optional[str] = None
    steps: str # JSON array formatted as string
    test_data: Optional[str] = None
    expected_result: str
    priority: PriorityLevel
    case_type: str
    confidence_score: int
    created_at: datetime

# Bug Report Schemas (legacy)
class BugReportResponse(BaseModel):
    id: str
    custom_id: str
    project_id: str
    requirement_id: Optional[str] = None
    title: str
    module: str
    feature: str
    summary: str
    description: str
    preconditions: Optional[str] = None
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    severity: SeverityLevel
    priority: PriorityLevel
    severity_reason: Optional[str] = None
    environment: str
    attachment_url: Optional[str] = None
    impact_analysis: Optional[str] = None
    root_cause_suggestion: Optional[str] = None
    created_at: datetime

# Enterprise Bug Schemas
class EnterpriseBugCreate(BaseModel):
    project_id: str
    title: str
    module: str
    feature: str
    description: str
    preconditions: Optional[str] = None
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    severity: SeverityLevel = SeverityLevel.HIGH
    priority: PriorityLevel = PriorityLevel.P2
    environment: str = "QA"
    build_version: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    linked_test_case_id: Optional[str] = None
    linked_requirement_id: Optional[str] = None
    root_cause_suggestion: Optional[str] = None
    fix_details: Optional[str] = None
    impact_analysis: Optional[str] = None
    severity_reason: Optional[str] = None

class EnterpriseBugUpdate(BaseModel):
    title: Optional[str] = None
    module: Optional[str] = None
    feature: Optional[str] = None
    description: Optional[str] = None
    preconditions: Optional[str] = None
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    severity: Optional[SeverityLevel] = None
    priority: Optional[PriorityLevel] = None
    environment: Optional[str] = None
    build_version: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    root_cause_suggestion: Optional[str] = None
    fix_details: Optional[str] = None
    impact_analysis: Optional[str] = None
    severity_reason: Optional[str] = None

class BugStatusChange(BaseModel):
    status: BugStatus
    comment: Optional[str] = None  # Optional reason/note for the status change

class BugAssignRequest(BaseModel):
    assigned_to: str  # user id
    comment: Optional[str] = None

class BugCommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None  # for threaded replies

class AIBugGenerateRequest(BaseModel):
    project_id: str
    description: str  # raw problem description or user story text
    module: Optional[str] = None

# Team Schemas
class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    team_type: str = "MIXED"  # "QA", "DEVELOPER", "MIXED"

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    team_type: Optional[str] = None

class TeamMemberAdd(BaseModel):
    user_id: str
    role_in_team: Optional[str] = None  # Override role within this team

class TeamProjectAssign(BaseModel):
    project_id: str

# QA Package Generation Request
class QAPackageRequest(BaseModel):
    requirement_id: str
    selected_types: List[str] = ["Positive", "Negative", "Boundary", "Edge Case"]

# Coverage Report Row
class CoverageMatrixItem(BaseModel):
    module: str
    requirement_title: str
    test_case_count: int
    status: str # "COVERED" or "MISSING"
