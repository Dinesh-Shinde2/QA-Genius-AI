import sys
import os
import logging
import asyncio

if sys.platform == 'win32':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

# Add parent directory to sys.path to resolve 'backend' package imports under all run contexts
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.db import get_db_pool, close_db_pool
from backend.api import auth, projects, upload, generator, reports, integrations, locator
from backend.api import teams as teams_router
from backend.api import bugs_enterprise as bugs_enterprise_router
from backend.api import sprints, releases, test_executions, pipelines

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB Pool
    logger.info("Starting up FastAPI QA Genius AI Backend...")
    try:
        await get_db_pool()
        from backend.database import db

        # ── Legacy migrations ──────────────────────────────────────────────
        await db.execute("ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DONE';")
        await db.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DONE';")
        await db.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '';")
        await db.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';")
        await db.execute("ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS integration_settings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                provider VARCHAR(50) NOT NULL DEFAULT 'AZURE_DEVOPS',
                org_name VARCHAR(255) NOT NULL,
                project_name VARCHAR(255) NOT NULL,
                pat_token VARCHAR(512) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, provider)
            );
        """)

        # ── Enterprise Bug Module Tables ───────────────────────────────────

        # Main enterprise bugs table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS enterprise_bugs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                custom_id VARCHAR(50) NOT NULL,
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
                status VARCHAR(50) DEFAULT 'NEW',
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
        """)

        # Bug assignment history
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bug_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bug_id UUID NOT NULL REFERENCES enterprise_bugs(id) ON DELETE CASCADE,
                assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
                assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
                comment TEXT,
                assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Bug comments (threaded)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bug_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bug_id UUID NOT NULL REFERENCES enterprise_bugs(id) ON DELETE CASCADE,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                parent_comment_id UUID REFERENCES bug_comments(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Bug history / audit trail
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bug_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bug_id UUID NOT NULL REFERENCES enterprise_bugs(id) ON DELETE CASCADE,
                changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                old_value TEXT,
                new_value TEXT,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # In-app notifications
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bug_notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                bug_id UUID REFERENCES enterprise_bugs(id) ON DELETE CASCADE,
                bug_title VARCHAR(500),
                notification_type VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Teams
        await db.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                team_type VARCHAR(50) DEFAULT 'MIXED',
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Team members
        await db.execute("""
            CREATE TABLE IF NOT EXISTS team_members (
                team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role_in_team VARCHAR(100),
                joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (team_id, user_id)
            );
        """)

        # Project-Team mapping
        await db.execute("""
            CREATE TABLE IF NOT EXISTS project_teams (
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (project_id, team_id)
            );
        """)

        # Sprint Management
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sprints (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                goal TEXT,
                start_date TIMESTAMP WITH TIME ZONE,
                end_date TIMESTAMP WITH TIME ZONE,
                status VARCHAR(50) DEFAULT 'PLANNING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Release Readiness
        await db.execute("""
            CREATE TABLE IF NOT EXISTS releases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                version_name VARCHAR(100) NOT NULL,
                target_date TIMESTAMP WITH TIME ZONE,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Test Executions
        await db.execute("""
            CREATE TABLE IF NOT EXISTS test_executions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
                suite_name VARCHAR(255) DEFAULT 'Regression',
                status VARCHAR(50) DEFAULT 'NOT_EXECUTED',
                executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
                executed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ── SaaS Expansion Modules: Project Members, Test Runs, GitHub OAuth ──
        await db.execute("""
            CREATE TABLE IF NOT EXISTS project_members (
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'QA_ENGINEER',
                joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (project_id, user_id)
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_github_tokens (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                access_token VARCHAR(512) NOT NULL,
                github_username VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS test_runs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'IN_PROGRESS',
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP WITH TIME ZONE
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS test_run_results (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
                test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL,
                actual_result TEXT,
                bug_id UUID REFERENCES enterprise_bugs(id) ON DELETE SET NULL,
                executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(test_run_id, test_case_id)
            );
        """)

        # Performance indices
        await db.execute("CREATE INDEX IF NOT EXISTS idx_ebug_project ON enterprise_bugs(project_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_ebug_status ON enterprise_bugs(project_id, status);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_ebug_assigned ON enterprise_bugs(assigned_to);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_bug_history_bug ON bug_history(bug_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_bug_notif_user ON bug_notifications(user_id, is_read);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_releases_project ON releases(project_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_test_executions_project ON test_executions(project_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_test_runs_project ON test_runs(project_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_test_run_results_run ON test_run_results(test_run_id);")

        logger.info("Enterprise Bug & SaaS Modules: All tables and indices created/verified successfully.")

    except Exception as e:
        logger.error(f"Failed to initialize database during startup: {e}")
    yield
    # Shutdown: Close DB Pool
    logger.info("Shutting down FastAPI QA Genius AI Backend...")
    await close_db_pool()

app = FastAPI(
    title="QA Genius AI - API Backend",
    description="Asynchronous AI platform to generate manual test suites, bug templates, coverage matrices, and enterprise bug management.",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS for nextjs frontend local developer configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from backend.api import test_cases
from backend.api import test_runs
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(upload.router)
app.include_router(generator.router)
app.include_router(reports.router)
app.include_router(integrations.router)
app.include_router(teams_router.router)
app.include_router(bugs_enterprise_router.router)
app.include_router(sprints.router)
app.include_router(releases.router)
app.include_router(test_executions.router)
app.include_router(test_cases.router)
app.include_router(test_runs.router)
app.include_router(pipelines.router)
app.include_router(locator.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "QA Genius AI API Service",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
# Test reload comment
