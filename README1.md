# QA Genius AI 🧠

> **Enterprise-grade, AI-powered Quality Assurance platform** that transforms your requirement documents and user stories into a complete QA workspace — test cases, bug templates, coverage matrices, and more — in seconds.

![Version](https://img.shields.io/badge/version-1.0.0-violet) ![Backend](https://img.shields.io/badge/backend-FastAPI%20%2B%20Python-green) ![Frontend](https://img.shields.io/badge/frontend-Next.js%2016%20%2B%20React%2019-blue) ![Database](https://img.shields.io/badge/database-PostgreSQL-blue) ![AI](https://img.shields.io/badge/AI-Groq%20%7C%20Ollama-orange)

---

## 📋 Table of Contents

- [What is QA Genius AI?](#what-is-qa-genius-ai)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [User Roles](#user-roles)
- [AI Engine Configuration](#ai-engine-configuration)
- [Azure DevOps Integration](#azure-devops-integration)
- [QA Copilot Chat](#qa-copilot-chat)

---

## 🤔 What is QA Genius AI?

QA Genius AI is a full-stack AI platform built for QA teams to automate the most time-consuming parts of manual testing. Instead of writing test cases and bug reports by hand, you upload your requirement documents (PDF, DOCX, TXT, screenshots) or paste raw user story text — and the AI generates everything instantly.

### Problems it solves:
- Writing test cases manually takes hours → AI generates them in seconds
- Bug reports are inconsistent across team members → AI standardizes format
- Tracking which requirements are covered → Auto-generated coverage matrix
- Switching between tools for bug tracking → Azure DevOps sync built-in
- New team members don't know what's in a project → Ask the QA Copilot

---

## ✨ Key Features

### 1. 🗂️ Multi-Project Workspace
- Create multiple QA projects, each with its own name, description, and tech stack
- Switch between projects instantly via the sidebar dropdown
- Domain-specific project templates: **Contact Center**, **CRM**, **Banking**, **SaaS**, **E-Commerce**

### 2. 📄 AI QA Package Generator (from Documents)
- Upload **PDF**, **DOCX**, **TXT**, **PNG**, **JPG** requirement documents
- Supports **OCR** for scanned images using Tesseract
- AI extracts: business rules, user roles, edge cases, API interactions, and modules
- Generates a full QA package: test cases + bug templates simultaneously
- Filter by validation type: **Positive**, **Negative**, **Boundary**, **Edge Case**

### 3. 🧪 Agile AI Test Case Builder (from Raw Text)
- Paste any user story, acceptance criteria, or raw requirement description
- AI generates detailed test cases with: scenario, preconditions, steps, test data, expected outcome
- **Triage Board**: Review generated cases in a split-pane UI
  - Left panel: Checkbox checklist to select/deselect individual cases
  - Right panel: Full detail preview of the selected case
  - Select All / Deselect All controls
  - Bulk commit only the cases you approve

### 4. 🐛 Advance Bug Triage Mode (Manual Bug Generator)
- Paste a problem description or screenshot context
- AI generates a complete, structured bug report:
  - Title, module, feature, description
  - Preconditions, steps to reproduce
  - Expected vs. actual results
  - Severity (Critical/High/Medium/Low) with rationale
  - Environment details, impact analysis
  - Root cause suggestion / code fix hint
- Two output formats: **Enterprise format**, **Developer JSON format**
- **Draft / Done** publication state control before saving

### 5. 📊 Coverage Matrix & Analytics Dashboard
- Visual dashboard with key metrics:
  - Total requirements, test cases, bugs, projects
  - Test Case Distribution by Module (bar chart)
  - Bug Severity Breakdown (pie chart)
- Coverage matrix showing which requirements have test coverage and how many cases per module
- Real-time project-scoped metrics

### 6. ✏️ Edit & Save Existing Records
- In-place editing for both **Bugs** and **Test Cases**
- All fields are editable: scenario, steps, priority, case type, status
- Save as **Draft** (work-in-progress) or **Done** (active/ready)
- Changes immediately reflected in the UI

### 7. 📤 Multi-Format Export
- Export test cases to **CSV**, **Excel (XLSX)**, or **PDF/HTML**
- Downloadable directly from the browser

### 8. 🔗 Azure DevOps Integration
- Connect any project to an Azure DevOps organization via **Personal Access Token (PAT)**
- Push bug reports as **Bug work items** to Azure DevOps Boards
- Push test cases as **Test Case** (or Task fallback) work items
- PAT tokens are obfuscated in the UI (`MockPAT***6789`)
- Synced items display a live blue **"Linked Board Work Item"** badge

### 9. 🤖 Interactive QA Copilot Chat
- Floating AI chat assistant available on every page (bottom-right corner)
- **Context-aware**: automatically reads project requirements, test cases, and bug logs
- Pre-loaded suggestion chips for common actions:
  - "Verify Login security rules"
  - "Analyze coverage hotspots"
  - "Suggest API validation steps"
  - "List critical draft bugs"
- Full conversation history with scrollable message thread
- Powered by Groq or local Ollama

### 10. 🔐 Authentication & Role-Based Access
- JWT-based secure authentication (Access Tokens)
- User registration with role selection
- Supported roles: `ADMIN`, `QA_LEAD`, `QA_ENGINEER`, `AUTOMATION_ENGINEER`, `DEVELOPER`, `PRODUCT_MANAGER`
- All API routes are protected by user-specific ownership checks

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.11+** | Core language |
| **FastAPI 0.111** | Async REST API framework |
| **Uvicorn** | ASGI production server |
| **asyncpg** | Async PostgreSQL database driver |
| **Pydantic v2** | Request/response schema validation |
| **python-jose** | JWT token generation and verification |
| **passlib[bcrypt]** | Password hashing |
| **pdfplumber** | PDF text extraction |
| **python-docx** | DOCX text extraction |
| **pytesseract** | OCR for image-based requirement files |
| **pandas + openpyxl** | Excel report generation |
| **httpx** | Async HTTP client (Groq API + Azure DevOps) |
| **Jinja2** | HTML report templating |
| **python-dotenv** | `.env` file environment loading |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** | Full-stack React framework with App Router |
| **React 19** | UI component library |
| **TypeScript 5** | Type-safe JavaScript |
| **Tailwind CSS v4** | Utility-first CSS framework |
| **Zustand 5** | Lightweight global state management |
| **Axios** | HTTP requests to backend API |
| **Recharts** | Bar charts and pie charts for dashboard |
| **Lucide React** | Icon library |
| **Framer Motion** | Animation library |

### Database
| Technology | Purpose |
|---|---|
| **PostgreSQL** | Primary relational database |
| **UUID primary keys** | All entities use `gen_random_uuid()` |
| **JSONB columns** | Flexible storage for extracted features, bug formats |
| **Custom ENUM types** | `user_role`, `priority_level`, `severity_level` |

### AI / ML
| Option | Details |
|---|---|
| **Groq Cloud API** | Cloud LLM inference via `llama-3.1-8b-instant` (free tier) |
| **Ollama (local)** | Local LLM inference (default: `qwen2.5` model) |
| **SentenceTransformers** | Optional local text embeddings for semantic deduplication |
| **HuggingFace Inference API** | Optional cloud text embeddings (zero memory) |

---

## 📁 Project Structure

```
QA-Genius-AI/
│
├── backend/                     # Python FastAPI backend
│   ├── main.py                  # App entry point, CORS, router registration, DB migrations
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables (not committed)
│   │
│   ├── api/                     # All REST API routers
│   │   ├── auth.py              # /api/auth - Login, register, JWT tokens
│   │   ├── projects.py          # /api/projects - CRUD for projects
│   │   ├── upload.py            # /api/upload - File upload and text extraction
│   │   ├── generator.py         # /api/ai - AI generation endpoints
│   │   ├── reports.py           # /api/reports - Coverage matrix, export (CSV/Excel/PDF)
│   │   └── integrations.py      # /api/integrations - Azure DevOps sync
│   │
│   ├── ai/                      # AI inference layer
│   │   ├── ai_service.py        # Ollama/Groq query router + response sanitizer
│   │   ├── prompts.py           # System and user prompt templates
│   │   └── embeddings.py        # Semantic embedding generation
│   │
│   ├── database/
│   │   └── db.py                # asyncpg connection pool management
│   │
│   ├── models/
│   │   └── schemas.py           # Pydantic response models
│   │
│   ├── services/
│   │   └── dedup_service.py     # Semantic deduplication for test cases & bugs
│   │
│   └── uploads/                 # Uploaded requirement files (temp storage)
│
├── frontend/                    # Next.js 16 frontend
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── page.tsx         # Login / Register page (route: /)
│   │   │   ├── dashboard/       # Main analytics dashboard (route: /dashboard)
│   │   │   ├── requirements/    # QA Package Generator (route: /requirements)
│   │   │   ├── testcases/       # Test Case Manager + Agile Builder (route: /testcases)
│   │   │   ├── bugs/            # Bug Log Manager + Manual Generator (route: /bugs)
│   │   │   ├── coverage/        # Coverage Matrix (route: /coverage)
│   │   │   └── globals.css      # Global styles, glassmorphism, neon glows
│   │   │
│   │   ├── components/
│   │   │   ├── sidebar.tsx      # Navigation sidebar with project selector
│   │   │   └── copilot.tsx      # Floating QA Copilot chat widget
│   │   │
│   │   └── store/
│   │       └── useAppStore.ts   # Zustand global state store (all API calls)
│   │
│   ├── package.json
│   └── .env.local               # Frontend environment variables
│
└── database/
    └── schema.sql               # Full PostgreSQL schema definition
```

---

## 🗄️ Database Schema

### Tables

| Table | Description |
|---|---|
| `users` | User accounts with role-based access |
| `projects` | QA workspace projects per user |
| `requirements` | Uploaded/pasted requirement documents |
| `test_cases` | AI-generated and manually created test cases |
| `bug_reports` | AI-generated and manually created bug templates |
| `bug_report_formats` | Multiple export formats per bug (Enterprise, JIRA, Developer JSON) |
| `coverage_reports` | Cached coverage matrix results per project |
| `integration_settings` | Azure DevOps connection credentials per project |
| `ai_requests` | Audit log of all AI LLM requests |
| `export_records` | Log of all report exports |

### Custom ENUMs

```sql
user_role:     ADMIN | QA_LEAD | QA_ENGINEER | AUTOMATION_ENGINEER | DEVELOPER | PRODUCT_MANAGER
priority_level: P1 | P2 | P3 | P4
severity_level: CRITICAL | HIGH | MEDIUM | LOW
```

---

## 🔌 API Reference

### Authentication (`/api/auth`)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/auth/me` | Get current user profile |

### Projects (`/api/projects`)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects for current user |
| `POST` | `/api/projects` | Create a new project |
| `PUT` | `/api/projects/{id}` | Update project details |
| `DELETE` | `/api/projects/{id}` | Delete a project |

### AI Generation (`/api/ai`)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ai/upload-requirement` | Upload file or paste text as a requirement |
| `POST` | `/api/ai/generate-package` | Generate full QA package (test cases + bugs) from a requirement |
| `GET` | `/api/ai/testcases` | List all test cases for a project |
| `PUT` | `/api/ai/test-cases/{id}` | Edit an existing test case |
| `GET` | `/api/ai/bugs` | List all bug reports for a project |
| `PUT` | `/api/ai/bugs/{id}` | Edit an existing bug report |
| `POST` | `/api/ai/generate-bug-manual` | Generate a bug from manual description (Advance Bug Triage) |
| `POST` | `/api/ai/save-bug-manual` | Save a manually drafted bug |
| `POST` | `/api/ai/generate-testcases-manual` | Generate test cases from raw text (Agile Builder) |
| `POST` | `/api/ai/save-testcases-manual` | Bulk-save selected test cases from Agile Builder |
| `POST` | `/api/ai/copilot-chat` | Send a message to the QA Copilot AI chat |

### Reports (`/api/reports`)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/reports/coverage/matrix` | Get the coverage matrix for a project |
| `GET` | `/api/reports/export` | Export test cases as CSV, Excel, or PDF |

### Integrations (`/api/integrations`)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/integrations/azure-devops/settings` | Save Azure DevOps connection (org, project, PAT) |
| `GET` | `/api/integrations/azure-devops/settings` | Retrieve Azure DevOps settings (PAT masked) |
| `POST` | `/api/integrations/azure-devops/sync-bug/{bug_id}` | Push a bug report to Azure DevOps Boards |
| `POST` | `/api/integrations/azure-devops/sync-testcase/{case_id}` | Push a test case to Azure DevOps Boards |

---

## ⚙️ Setup & Installation

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **npm**
- **PostgreSQL 14+** (local or cloud, e.g. Supabase free tier)
- **Tesseract OCR** (for image/scanned PDF support) — [Download](https://github.com/tesseract-ocr/tesseract)
- *(Optional)* **Ollama** — [Download](https://ollama.ai) for local AI inference

---

### Step 1: Database Setup

```sql
-- Connect to PostgreSQL and create the database
CREATE DATABASE qagenius;

-- Then apply the schema
psql -U postgres -d qagenius -f database/schema.sql
```

---

### Step 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Install Python dependencies
pip install -r requirements.txt
```

---

### Step 3: Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install Node dependencies
npm install
```

---

## 🔐 Environment Variables

### Backend — `backend/.env`

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/qagenius

# Local AI via Ollama (set USE_OLLAMA=false to use Groq instead)
USE_OLLAMA=false
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen2.5

# Cloud AI via Groq (FREE key from https://console.groq.com/)
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Embeddings (set false to use HuggingFace serverless API)
USE_LOCAL_EMBEDDINGS=false
HF_API_TOKEN=your_hf_token_here
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🚀 Running the Project

### Start Backend

```bash
cd backend
python main.py
# API runs on: http://localhost:8000
# API Docs available at: http://localhost:8000/docs
```

### Start Frontend

```bash
cd frontend
npm run dev
# App runs on: http://localhost:3000
```

---

## 👤 User Roles

| Role | Description |
|---|---|
| `ADMIN` | Full platform access, user management |
| `QA_LEAD` | Lead QA engineer, manages projects and reviews |
| `QA_ENGINEER` | Creates and manages test cases and bug reports |
| `AUTOMATION_ENGINEER` | Focuses on test automation scripts |
| `DEVELOPER` | Views bug reports and suggested fixes |
| `PRODUCT_MANAGER` | Views coverage metrics and project status |

---

## 🤖 AI Engine Configuration

QA Genius AI supports two AI backends — you can switch between them using the `.env` file:

### Option A: Groq Cloud (Recommended — Free, Fast)
1. Create a free account at [console.groq.com](https://console.groq.com)
2. Generate an API key
3. Set in `backend/.env`:
   ```env
   USE_OLLAMA=false
   GROQ_API_KEY=gsk_your_key_here
   GROQ_MODEL=llama-3.1-8b-instant
   ```

### Option B: Ollama (Local — Private, No API Key)
1. Download [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull qwen2.5`
3. Set in `backend/.env`:
   ```env
   USE_OLLAMA=true
   OLLAMA_URL=http://localhost:11434/api/chat
   OLLAMA_MODEL=qwen2.5
   ```

> **Note:** Ollama runs the AI model entirely on your local machine. No data leaves your system, but it requires a GPU or at least 8GB RAM.

---

## 🔗 Azure DevOps Integration

Connect your projects to Azure DevOps Boards to push bugs and test cases directly:

### Setup Steps:
1. Go to your Azure DevOps organization
2. Generate a **Personal Access Token (PAT)** with `Work Items: Read & Write` permission
3. In QA Genius AI, open the **Test Cases** page
4. Click **"ADO Connect"** in the page header
5. Enter:
   - **Organization Name** (e.g. `MyOrg`)
   - **Project Name** (e.g. `MyProject`)
   - **PAT Token**
6. Click **Save Connection**

### Usage:
- Open any Bug or Test Case detail view
- Click **"Push to ADO"** button
- A **Bug** or **Test Case** work item is created in your Azure DevOps Board
- A blue **"Linked Board Work Item"** badge appears with the ADO work item ID

---

## 🤖 QA Copilot Chat

The **QA Copilot** is a floating AI assistant available on every page of the platform.

### Features:
- Click **"Ask QA Copilot"** (bottom-right corner of any page)
- The copilot automatically loads context from your active project:
  - Requirements (titles, modules, descriptions)
  - Test cases (IDs, scenarios, priorities, types)
  - Bug reports (IDs, titles, severities)
- Ask it anything:
  - *"Do we have test cases covering login lockouts?"*
  - *"Summarize the critical bugs in this project"*
  - *"Draft a boundary test case for the payment module"*
  - *"What modules have no test coverage?"*

### Quick Suggestion Pills:
- "Verify Login security rules"
- "Analyze coverage hotspots"
- "Suggest API validation steps"
- "List critical draft bugs"

---

## 🎨 UI Design

The platform features a **premium dark-mode SaaS design**:

- **Glassmorphism cards** with inset highlights and backdrop blur
- **Neon ambient glows** in purple and cyan on page backgrounds
- **Stripe-style stats grid** with hover lift animations
- **Linear-style sidebar** with gradient active indicators
- **Color-coded priority badges**: Rose (P1), Orange (P2), Amber (P3)
- **Color-coded case type badges**: Emerald (Positive), Red (Negative), Cyan (Boundary), Indigo (Edge Case)
- **Micro-animations**: hover scale, translate-x slides, active scale clicks
- **Animated copilot chat** with slide-in message bubbles and typing loaders

---

## 📝 License

This project is built as a zero-cost MVP for QA teams and internal enterprise use.

---

*Built with ❤️ by the QA Genius AI team*
