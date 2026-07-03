# QA Genius AI - Comprehensive Product Documentation 🧠

Welcome to the **QA Genius AI** Product Documentation. This document provides a highly detailed, end-to-end breakdown of the entire platform—encompassing the frontend architecture, backend REST APIs, PostgreSQL database schemas, AI core services (including prompt templates and fallback behaviors), integrations, and the complete set of system features.

---

## 📋 Table of Contents
1. [Product Overview](#1-product-overview)
2. [Key Features & Detailed Functionality](#2-key-features--detailed-functionality)
3. [Technical Architecture & Tech Stack](#3-technical-architecture--tech-stack)
4. [Database Schema & Entity Relationships](#4-database-schema--entity-relationships)
5. [Backend API Reference](#5-backend-api-reference)
6. [AI Core Service & Inference Layer](#6-ai-core-service--inference-layer)
7. [Frontend Architecture & Page Layouts](#7-frontend-architecture--page-layouts)
8. [Azure DevOps Integration & Pipelines](#8-azure-devops-integration--pipelines)
9. [Installation & Developer Setup Guide](#9-installation--developer-setup-guide)

---

## 1. Product Overview
**QA Genius AI** is an enterprise-grade, AI-powered Quality Assurance platform designed to automate and streamline the manual test lifecycle. Rather than QA engineers spending hours writing test cases, compiling requirement coverage matrices, and manually formatting bug templates, the platform leverages Large Language Models (LLMs) to perform these tasks instantly.

### Key Strengths:
- **Instant Requirement Parsing**: Parses requirements from PDF, Word documents, text files, and screenshot OCR.
- **Bi-Directional AI Generation**: Simultaneously creates full test case suites and edge-case bug report suggestions from raw requirements.
- **Enterprise-Grade Defect Lifecycle**: Features a complete bug triage system with assignments, status flows, threaded comments, and audit trails.
- **Test Executions & Cycles**: Groups test executions into cycles associated with specific Sprints and Releases, allowing users to track PASS/FAIL/SKIP metrics.
- **Context-Aware QA Copilot**: A floating chat assistant that continuously reads active project requirements, bug tickets, and test case data to assist the user.
- **Third-Party Synced Boards**: Pushes verified bugs and test cases directly to Azure DevOps Boards via Personal Access Tokens (PAT).

---

## 2. Key Features & Detailed Functionality

### 🗂️ 1. Multi-Project Workspace
- **Custom Workspaces**: Users can create multiple projects to isolate testing assets. Each project supports a name, description, and technical stack.
- **Domain-Specific Templates**: Quick start with industry-focused testing templates (Contact Center, CRM, Banking, SaaS, E-Commerce).
- **Zustand State Isolation**: Switching the active project in the sidebar instantly refetches and isolates test cases, bugs, requirements, and coverage metrics.

### 📄 2. AI QA Package Generator (Requirement Uploader)
- **Multi-Format Uploads**: Supports `.pdf`, `.docx`, `.txt`, `.png`, and `.jpg` files.
- **OCR Engine**: Utilizes Tesseract OCR for scanned PDF pages and screenshot files.
- **AI Extraction Layer**: Extracts key components from documents:
  - Business Rules
  - User Roles
  - User Workflows
  - API Endpoints
  - Target Modules
- **Dual Package Generation**: Runs LLM prompts to output a complete, deduplicated test suite (divided by types: Positive, Negative, Boundary, Edge Case) and a set of suspected/pre-compiled bug templates.

### 🧪 3. Agile AI Test Case Builder (Raw Text)
- **Free-Form Input**: Users can paste user stories or acceptance criteria directly into a text area.
- **Triage Board (Split-Pane UI)**: 
  - **Left Panel**: Checkbox list showing all AI-generated scenarios with priority and case types.
  - **Right Panel**: Live editor displaying preconditions, test data, steps, and expected results for the selected scenario.
- **Bulk Operations**: Users can check specific test cases, click "Select All" or "Deselect All", and click "Save Selected" to bulk-insert them into the active project database.

### 🐛 4. Advanced Bug Triage Mode (Manual Bug Generator)
- **Visual/Text Input**: Paste a bug description or upload an error screenshot.
- **AI Formatter**: AI performs OCR on the screenshot and formats the ticket with:
  - Title, Module, Feature, Description, Preconditions, Environment.
  - Steps to reproduce, Expected vs. Actual outcomes.
  - Severity/Priority with rationale.
  - Impact Analysis & Root Cause code fixes.
- **Draft/Done Control**: Save bugs as "Draft" while they are being reviewed, then publish them to "Done".

### 📊 5. Coverage Matrix & Real-Time Analytics
- **Live Stats Grid**: Displays total projects, requirements, test cases, and active bugs.
- **Recharts Visualizations**: Shows test case distribution by module (bar charts) and bug severity breakdown (pie charts).
- **Traceability Matrix**: A grid mapping requirement titles to their corresponding test case count, flagging modules as "COVERED" (test cases > 0) or "MISSING" (test cases = 0).

### 🐛 6. Enterprise Bug Lifecycle Module
- **Collaborative Bug Board**: Multi-user bug tracking with detailed filtering (status, severity, priority, module, assigned developer, text search).
- **Workflow State Engine**: Tracks states: `NEW` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `FIXED` ➔ `READY_FOR_RETEST` ➔ `RETESTING` ➔ `CLOSED` / `REOPENED`.
- **Threaded Comments**: Team members can discuss bugs inside the ticket sidebar. Support for threaded comments using `parent_comment_id` allows hierarchical replies.
- **Notifications Engine**: In-app notifications alert users when they are assigned a bug, when a bug needs retesting, or when a comment is added. A notification bell in the sidebar polls the backend every 30 seconds for live updates.
- **Audit Logs**: The `bug_history` table automatically captures history (who changed status, old value, new value, action type, description, and timestamp) for full traceability.
- **Test-Case-to-Bug Linkage**: Generate an AI bug report directly from a failed test case, auto-populating preconditions, steps, expected outcomes, and actual failure logs.

### 🏃‍♂️ 7. Test Executions & Cycles
- **Release & Sprint Linkage**: Create test cycles mapped to target environments, sprints, and releases.
- **Cycle Module Filters**: Scope cycles to specific functional modules using multi-select toggles when initializing a run.
- **Live Running Sheet**: Users can mark test executions as `PASS`, `FAIL`, `SKIP`, or `BLOCKED`, track elapsed time in milliseconds, write execution comments, and check historic comments.
- **Fail-to-Bug AI Integration**: If a test case fails during execution, clicking the Bug icon triggers an AI routine to auto-generate a structured enterprise bug from the test case scenario, steps, and execution remarks, saving it with a link to the failed test case (`linked_test_case_id`).

### 👥 8. Collaboration & Team Management
- **Teams**: Create multi-disciplinary teams (e.g. Mixed, QA, Dev, Automation).
- **Member Directory**: Search registered users by email or name, assign roles (Lead, Engineer, Developer), and add them to teams.
- **Workspace Access**: Assign teams to multiple projects to share QA access.

### 🔄 9. Version Control & GitHub Sync (GitHub Push)
- **Direct Pushes**: Push local workspace changes to the remote GitHub repository directly from the dashboard via one-click sync.
- **Sync Workflow Wizard**: Displays a visual 3-stage progress timeline:
  1. Staging changes (`git add .`)
  2. Committing changes (`git commit -m "message"`)
  3. Pushing to remote (`git push origin main`)
- **Commit Message Popup**: Prompt modal requests a custom message before execution.
- **Commit History Logs**: Displays recent commits parsed from `git log` showing the commit message, author name, short hash, and relative time (e.g., "5 mins ago").

### 🔗 10. Azure DevOps Integration
- **ADO Connection**: Enter Organization Name, Project Name, and Personal Access Token (PAT).
- **Obfuscated PAT Security**: Tokens are masked in the database and UI (`MockPAT***6789`).
- **Board Syncing**: Sync verified bugs and test cases to ADO Boards at the click of a button. Links are returned, and a blue "Linked Board Work Item" badge appears.

### 🤖 11. QA Copilot Chat
- **Floating Assistant**: Responsive chat panel available on every page.
- **Workspace-Aware**: Inject requirement specifications, active test cases, and bug logs into the prompt context.
- **Action Chips**: Quick prompts like "List critical draft bugs", "Analyze coverage hotspots", and "Suggest API validation steps".

---

## 3. Technical Architecture & Tech Stack

```mermaid
graph TD
    Client[Next.js 16 SPA / React 19 / Tailwind CSS v4] <-->|HTTP REST / JWT Auth| FastAPI[FastAPI Backend / Python 3.11]
    FastAPI <-->|asyncpg| PostgreSQL[(PostgreSQL Database)]
    FastAPI -->|HTTPX Client| Groq[Groq Cloud API / Llama 3]
    FastAPI -->|Local Port 11434| Ollama[Local Ollama / Qwen2.5]
    FastAPI -->|Inference API| HF[HuggingFace embeddings / BAAI]
    FastAPI -->|Subprocess| GitCLI[Git CLI Version Control]
    FastAPI -->|Tesseract| OCR[Tesseract OCR Engine]
```

### Backend Stack
- **FastAPI (0.111)**: Async REST framework with automated Swagger docs.
- **asyncpg**: High-performance asynchronous PostgreSQL database client.
- **Pydantic v2**: Strict schema serialization and validation.
- **pdfplumber & python-docx**: Document text extraction.
- **pytesseract**: Screen parsing and OCR for uploaded assets.
- **pandas & openpyxl**: Multi-format exports (Excel/CSV).
- **httpx**: Async HTTP operations.

### Frontend Stack
- **Next.js 16 (App Router)**: Fast rendering and file-based routing.
- **React 19**: Component lifecycle.
- **Tailwind CSS v4**: Theme utility styling.
- **Zustand 5**: Centralized global store managing all backend requests.
- **Recharts**: Data visualization.
- **Framer Motion**: Smooth dashboard animations.

---

## 4. Database Schema & Entity Relationships

The PostgreSQL database contains core tables for auth, project structures, AI outputs, and the enterprise-level collaboration models.

### Database Tables and Columns

```sql
-- Custom Enumerations
CREATE TYPE user_role AS ENUM ('ADMIN', 'QA_LEAD', 'QA_ENGINEER', 'AUTOMATION_ENGINEER', 'DEVELOPER', 'PRODUCT_MANAGER', 'TECH_LEAD');
CREATE TYPE priority_level AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE severity_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'QA_ENGINEER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tech_stack VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- 3. Requirements Table
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    file_url VARCHAR(512),
    file_type VARCHAR(50), -- PDF, DOCX, TXT, PNG, JPG
    extracted_features JSONB, -- JSON representation of parsed features
    embedding DOUBLE PRECISION[], -- SentenceTransformer vector embedding (size 384)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Test Cases Table
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_id VARCHAR(50) NOT NULL, -- TC-001
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
    module VARCHAR(255) NOT NULL,
    feature VARCHAR(255) NOT NULL,
    scenario TEXT NOT NULL,
    preconditions TEXT,
    steps TEXT NOT NULL, -- JSON array of steps
    test_data TEXT,
    expected_result TEXT NOT NULL,
    priority priority_level DEFAULT 'P3',
    case_type VARCHAR(100) NOT NULL, -- Positive, Negative, Boundary, Edge Case
    confidence_score INTEGER DEFAULT 90,
    status VARCHAR(50) DEFAULT 'DONE', -- DRAFT or DONE
    embedding DOUBLE PRECISION[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, custom_id)
);

-- 5. Test Case Version History Table
CREATE TABLE test_case_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changes_made JSONB NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Enterprise Bugs Table
CREATE TABLE enterprise_bugs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_id VARCHAR(50) NOT NULL, -- BUG-001
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    module VARCHAR(255) NOT NULL,
    feature VARCHAR(255) NOT NULL DEFAULT 'General',
    description TEXT NOT NULL,
    preconditions TEXT,
    steps_to_reproduce TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT NOT NULL,
    severity severity_level DEFAULT 'HIGH',
    priority priority_level DEFAULT 'P2',
    environment VARCHAR(255) DEFAULT 'QA',
    build_version VARCHAR(100),
    status VARCHAR(50) DEFAULT 'NEW', -- NEW, ASSIGNED, IN_PROGRESS, FIXED, etc.
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    tags TEXT[],
    linked_test_case_id UUID,
    linked_requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
    root_cause_suggestion TEXT,
    fix_details TEXT,
    impact_analysis TEXT,
    severity_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, custom_id)
);

-- 7. Classic Bug Reports Table (Fallback/AI package target)
CREATE TABLE bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_id VARCHAR(50) NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    feature VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    preconditions TEXT,
    steps_to_reproduce TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT NOT NULL,
    severity severity_level DEFAULT 'HIGH',
    priority priority_level DEFAULT 'P2',
    severity_reason TEXT,
    environment TEXT NOT NULL,
    attachment_url VARCHAR(512),
    impact_analysis TEXT,
    root_cause_suggestion TEXT,
    status VARCHAR(50) DEFAULT 'DONE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, custom_id)
);

-- 8. Bug Report Formats Table
CREATE TABLE bug_report_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_report_id UUID NOT NULL REFERENCES bug_reports(id) ON DELETE CASCADE,
    format_type VARCHAR(50) NOT NULL, -- ENTERPRISE, JIRA, DEVELOPER
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Bug Comments Table (Threaded)
CREATE TABLE bug_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id UUID NOT NULL REFERENCES enterprise_bugs(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES bug_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Bug History Table (Audit Trail)
CREATE TABLE bug_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_id UUID NOT NULL REFERENCES enterprise_bugs(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- STATUS_CHANGED, COMMENT_ADDED, UPDATED
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bug Notifications Table
CREATE TABLE bug_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bug_id UUID REFERENCES enterprise_bugs(id) ON DELETE CASCADE,
    bug_title VARCHAR(500),
    notification_type VARCHAR(100) NOT NULL, -- ASSIGNED, RETEST_REQUIRED, COMMENT_ADDED
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Sprints Table
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'PLANNING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Releases Table
CREATE TABLE releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_name VARCHAR(100) NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Test Cycles Table
CREATE TABLE test_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    environment VARCHAR(100) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Test Executions Table
CREATE TABLE test_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    test_cycle_id UUID REFERENCES test_cycles(id) ON DELETE CASCADE,
    suite_name VARCHAR(255) DEFAULT 'Regression',
    status VARCHAR(50) DEFAULT 'NOT_EXECUTED', -- PASS, FAIL, SKIP, BLOCKED, NOT_EXECUTED
    comments TEXT,
    execution_time_ms INTEGER,
    attachment_url VARCHAR(512),
    executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Execution Comments Table
CREATE TABLE execution_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Integration Settings Table
CREATE TABLE integration_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'AZURE_DEVOPS',
    org_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    pat_token VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, provider)
);

-- 18. Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_type VARCHAR(50) DEFAULT 'MIXED', -- MIXED, QA, DEV, AUTOMATION
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Team Members Table
CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_team VARCHAR(100),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

-- 20. Project Teams Mapping Table
CREATE TABLE project_teams (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, team_id)
);
```

---

## 5. Backend API Reference

### 🔐 1. Authentication Router (`/api/auth`)
- `POST /api/auth/register`: Create a new user account specifying email, full name, secure password, and role.
- `POST /api/auth/login`: Authenticate email and password, returning a JWT token and user metadata.
- `GET /api/auth/me`: Fetch profile details of the currently authenticated user.

### 🗂️ 2. Projects Router (`/api/projects`)
- `GET /api/projects`: List all workspaces owned by or assigned to the current user.
- `POST /api/projects`: Create a new project.
- `PUT /api/projects/{id}`: Modify workspace metadata.
- `DELETE /api/projects/{id}`: Delete a project and cascade delete all associated requirements, test cases, and bugs.

### 📁 3. Document Processing Router (`/api/upload`)
- `POST /api/upload`: Handles file uploads (`PDF`, `DOCX`, `TXT`, `PNG`, `JPG`).
  - Calls extraction utilities (using `pdfplumber` for PDF, `python-docx` for Word, and `pytesseract` for image OCR).
  - Invokes the AI extraction pipeline to compile modules, roles, business rules, and API endpoints.
  - Automatically saves the raw document contents and extracted JSON rules as a new `requirement` record.

### 🤖 4. AI Generation Router (`/api/ai`)
- `POST /api/ai/generate-package`: Generates a complete test suite and set of bugs from a requirement ID.
- `GET /api/ai/testcases`: Retrieve all test cases associated with a project.
- `GET /api/ai/bugs`: Retrieve all pre-suggested classic bug reports.
- `POST /api/ai/generate-bug-manual`: Generates a structured bug template from a manual description or screenshot.
- `POST /api/ai/save-bug-manual`: Saves the manual bug draft to the database.
- `PUT /api/ai/bugs/{bug_id}`: Updates a bug's fields.
- `PUT /api/ai/test-cases/{case_id}`: Updates a test case's fields.
- `POST /api/ai/generate-testcases-manual`: Agile AI test case generation from raw user stories.
- `POST /api/ai/save-testcases-manual`: Saves agile AI test cases to the database.
- `POST /api/ai/copilot-chat`: Context-aware chatbot endpoint.

### 🧪 5. Test Cases Router (`/api/test-cases`)
- `GET /api/test-cases/{project_id}`: List all test cases for a project (with filters for module, priority, case type, status, and search query).
- `POST /api/test-cases/`: Create a new test case and automatically log initial snapshot version `1` to the `test_case_versions` table.
- `DELETE /api/test-cases/{test_case_id}`: Delete a test case.
- `POST /api/test-cases/bulk-delete`: Delete multiple test cases in a single operation.
- `GET /api/test-cases/{test_case_id}/history`: Fetch edit history versions of a test case.

### 🐛 6. Enterprise Bug Router (`/api/bugs`)
- `GET /api/bugs`: Retrieve all enterprise bugs with query filters.
- `GET /api/bugs/dashboard`: Fetch status counts, severity metrics, priority distribution, and developer resolution rates.
- `POST /api/bugs`: Create a new enterprise bug.
- `GET /api/bugs/{bug_id}`: Retrieve a single bug details with comment threads, assignment records, and audit history.
- `PUT /api/bugs/{bug_id}`: Update bug details.
- `POST /api/bugs/{bug_id}/status`: Transition a bug's status. Includes automatic transition triggers.
- `POST /api/bugs/{bug_id}/assign`: Assign a developer to resolve the bug, triggering an in-app notification.
- `GET /api/bugs/{bug_id}/comments`: Fetch all comments for a bug.
- `POST /api/bugs/{bug_id}/comments`: Post a new comment.
- `DELETE /api/bugs/comments/{comment_id}`: Delete a comment (restricted to author).
- `POST /api/bugs/generate-ai`: Generate a structured bug from a description.
- `POST /api/bugs/generate-ai-from-test-case`: Generate a bug report from a failed test case context.
- `DELETE /api/bugs/{bug_id}`: Delete an enterprise bug.
- `GET /api/bugs/notifications/all`: Retrieve the last 50 notification cards.
- `PUT /api/bugs/notifications/read`: Mark all notifications as read.

### 📊 7. Reports Router (`/api/reports`)
- `GET /api/reports/coverage/matrix`: Compiles traceability metrics.
- `GET /api/reports/export`: Export test cases.
  - `CSV`: Standard CSV download.
  - `EXCEL`: Pre-styled spreadsheet.
  - `PDF`: Renders a clean print sheet that defaults to browser PDF rendering.

### 🔗 8. Integrations Router (`/api/integrations`)
- `POST /api/integrations/azure-devops/settings`: Save ADO connection details.
- `GET /api/integrations/azure-devops/settings`: Retrieve settings (PAT masked).
- `POST /api/integrations/azure-devops/sync-bug/{bug_id}`: Create a Bug work item in ADO.
- `POST /api/integrations/azure-devops/sync-testcase/{case_id}`: Create a Test Case or Task work item in ADO.

### 👥 9. Collaboration Router (`/api/teams`)
- `GET /api/teams`: List all teams the user created or is member of.
- `POST /api/teams`: Create a team.
- `GET /api/teams/{team_id}`: Retrieve team members and projects.
- `PUT /api/teams/{team_id}`: Edit team details.
- `DELETE /api/teams/{team_id}`: Delete a team.
- `POST /api/teams/{team_id}/members`: Add a member.
- `DELETE /api/teams/{team_id}/members/{user_id}`: Remove a member.
- `POST /api/teams/{team_id}/projects`: Link a team to a project.
- `GET /api/teams/users/search`: Search users by name or email.

### 🏃‍♂️ 10. Test Execution Router (`/api/test-executions`)
- `GET /api/test-executions/{project_id}/cycles`: Fetch test cycles with pass/fail/skip metrics.
- `GET /api/test-executions/cycle/{cycle_id}/executions`: Fetch test executions inside a cycle.
- `POST /api/test-executions/cycle`: Create a cycle, pulling all matching test cases.
- `PUT /api/test-executions/{execution_id}/status`: Set execution status (`PASS`, `FAIL`, `SKIP`, `BLOCKED`).
- `GET /api/test-executions/{execution_id}/comments`: Fetch execution logs.

### 🔄 11. Agile & Pipelines Routers
- **Sprints (`/api/sprints`)**:
  - `GET /api/sprints/{project_id}`: List all sprints for a project.
  - `POST /api/sprints`: Create a sprint.
- **Releases (`/api/releases`)**:
  - `GET /api/releases/{project_id}`: List all releases for a project.
  - `POST /api/releases`: Create a release.
- **Pipelines / GitHub Sync (`/api/pipelines`)**:
  - `POST /api/pipelines/trigger`: Git commit and push changes directly from the UI. Run shell commands:
    ```bash
    git add .
    git commit -m "{commit_message}"
    git push origin main
    ```
  - `GET /api/pipelines/history`: Get recent git commits via:
    ```bash
    git log --pretty=format:%h|%an|%s|%ar -n 15
    ```

---

## 6. AI Core Service & Inference Layer

### 🤖 1. LLM Client Router (`ai_service.py`)
The system routes LLM requests dynamically:
- **USE_OLLAMA=true**: Queries local Ollama API on port `11434` (defaults to `qwen2.5` model, temperature `0.2` for deterministic parsing).
- **Fallback / cloud configuration**: Falls back to Groq Cloud API using `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`.
- **System Prompts**: System instructions define strict outputs (e.g. JSON templates).

### 🏷️ 2. Vector Embedding Engine (`embeddings.py`)
- Standardizes semantic searches with **384-dimension** vector arrays.
- **BAAI/bge-small-en**: The default model used.
- **Multi-channel Extraction**:
  1. **Local Mode**: Runs embeddings using `sentence-transformers` locally.
  2. **Cloud Mode**: Queries Hugging Face serverless inference API.
  3. **Robust Fallback**: Generates a normalized, deterministic float array based on the SHA-256 hash of the input text to prevent db exceptions.

### 🧼 3. Semantic Deduplication (`dedup_service.py`)
- Prevents database bloating.
- Calculates **Cosine Distance** (`1.0 - Cosine Similarity`) using pure Python math functions (no external libraries required).
- Checks new test cases against existing project scenarios using a similarity threshold:
  - **DUPLICATE_THRESHOLD = 0.18** (equivalent to `~82%` similarity).
  - Matches under `0.18` are flagged as duplicates and skipped during bulk creation.

---

## 7. Frontend Architecture & Page Layouts

The frontend utilizes a premium dark-mode SaaS UI, incorporating glassmorphism layouts, glowing ambient backdrops, and active animated transitions.

### 🗺️ Main Platform Navigation
The sidebar navigation organizes links into three distinct functional sections:

#### **PROJECT GROUP**
- **Dashboard Hub (`/dashboard`)**: Displays core metrics (Total Projects, Requirements, Test Cases, Bugs), requirement list tables, and charts (severity breakdowns and module distributions).
- **Sprint Management (`/sprints`)**: Project planner to create sprints, track goal logs, and view sprint target timelines.
- **Teams Portal (`/teams`)**: Directory of collaborators, user search bar to invite members, role assignments, and team project configurations.
- **AI QA Package Generator (`/requirements`)**: Drop zone to upload requirement files. Includes visualizers for OCR extraction details.

#### **TESTING GROUP**
- **Test Case Manager (`/testcases`)**: Searchable list of test cases with filters (module, priority, type, status). Includes a modal to configure Azure DevOps settings and the **Agile AI Builder** to parse pasted user stories.
- **Test Execution Center (`/test-execution`)**: List of active and archived test cycles with progress bars and pass rates. Includes the **Run execution sheet** where testers set results (`PASS`, `FAIL`, `SKIP`, `BLOCKED`), add execution logs, and trigger **AI Bug Generation** from failed test cases.
- **Bug Tracker (`/bugs`)**: Comprehensive bug tracking interface with a list, status dropdown controls, assignment panels, threaded comments, and audit trails.

#### **DEVOPS & ANALYTICS GROUP**
- **Release Readiness (`/releases`)**: Tracks deployment release numbers and target release dates.
- **Traceability Matrix (`/coverage`)**: Traceability table mapping requirements to verification states (`COVERED` vs. `MISSING`).
- **GitHub Sync (`/pipelines`)**: One-click Git deployment sync button. Triggers a commit modal and displays a visual progress checklist of staging, committing, and pushing changes to GitHub. Shows a "Recent Commits" history feed.

---

## 8. Azure DevOps Integration & Pipelines

### Azure DevOps Syncing Sequence
```mermaid
sequenceDiagram
    participant UI as Next.js UI
    participant BE as FastAPI Backend
    participant DB as PostgreSQL
    participant ADO as Azure DevOps API
    
    UI->>BE: POST /api/integrations/azure-devops/sync-bug/{bug_id}
    BE->>DB: Fetch project's integration settings & PAT
    DB-->>BE: OrgName, ProjectName, PAT Token
    BE->>BE: Generate formatted HTML payload from bug details
    BE->>ADO: POST https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$Bug
    Note over BE,ADO: Basic Auth using Base64(:PAT)
    ADO-->>BE: 201 Created (Work Item ID & URL)
    BE->>DB: Update bug status (Link reference)
    BE-->>UI: Sync successful (ID & URL)
```

1. **Credentials Management**: Organizes OrgName, ProjectName, and PAT. Obfuscates tokens on retrieval.
2. **Work Item Mapping**:
   - **Bugs**: Maps custom details into HTML format, matching fields like `System.Title`, `System.Description`, and severity.
   - **Test Cases**: Format test steps as an HTML list. Attempts to create a `Test Case` work item, falling back to a `Task` if the ADO project configuration restricts the `Test Case` type.
3. **Sync Indicator**: Displays a blue badge linking directly to the ADO work item.

---

## 9. Installation & Developer Setup Guide

### 📋 Prerequisites
1. **Python 3.11+**
2. **Node.js 18+ & npm**
3. **PostgreSQL 14+**
4. **Tesseract OCR** (For text extraction from screenshots/scanned documents)

### Step 1: Database Setup
```sql
CREATE DATABASE qagenius;
-- Execute the schema sql file to create tables, indexes and custom enums
psql -U postgres -d qagenius -f database/schema.sql
```

### Step 2: Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/qagenius

# Choose Groq (Recommended) or Ollama
USE_OLLAMA=false
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

# Embeddings Config
USE_LOCAL_EMBEDDINGS=false
HF_API_TOKEN=your_hugging_face_token
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env.local` file inside the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 4: Run the Application
1. **Start Backend**:
   ```bash
   cd backend
   python main.py
   ```
   *Runs on `http://localhost:8000`. Swagger API docs are available at `http://localhost:8000/docs`.*

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs on `http://localhost:3000`.*

---

*QA Genius AI Product Documentation — 2026*
