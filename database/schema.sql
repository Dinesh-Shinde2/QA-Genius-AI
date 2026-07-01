-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'QA_LEAD', 'QA_ENGINEER', 'AUTOMATION_ENGINEER', 'DEVELOPER', 'PRODUCT_MANAGER');
CREATE TYPE priority_level AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE severity_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'QA_ENGINEER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tech_stack VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Requirements Table
CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    file_url VARCHAR(512),
    file_type VARCHAR(50), -- 'PDF', 'DOCX', 'TXT', 'PNG', 'JPG'
    extracted_features JSONB, -- Extracted Business Rules, User Roles, Edge Cases, APIs, Modules
    embedding DOUBLE PRECISION[], -- Standard float array for compatibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Test Cases Table
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_id VARCHAR(50) NOT NULL, -- e.g., TC-001
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
    case_type VARCHAR(100) NOT NULL, -- 'Positive', 'Negative', 'Boundary', 'Edge Case', 'Security', etc.
    confidence_score INTEGER DEFAULT 90, -- AI Confidence Score percentage (0-100)
    embedding DOUBLE PRECISION[], -- Standard float array for compatibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, custom_id)
);

-- Bug Reports Table
CREATE TABLE IF NOT EXISTS bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_id VARCHAR(50) NOT NULL, -- e.g., BUG-001
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, custom_id)
);

-- Bug Report Formats
CREATE TABLE IF NOT EXISTS bug_report_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_report_id UUID NOT NULL REFERENCES bug_reports(id) ON DELETE CASCADE,
    format_type VARCHAR(50) NOT NULL, -- 'ENTERPRISE', 'JIRA', 'DEVELOPER'
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Coverage Reports Cache
CREATE TABLE IF NOT EXISTS coverage_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    total_requirements INTEGER DEFAULT 0,
    covered_requirements INTEGER DEFAULT 0,
    module_coverage JSONB NOT NULL, -- e.g. {"Login": 95, "Campaign": 82}
    coverage_score NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Requests Audit Log
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_type VARCHAR(100) NOT NULL, -- 'PARSING', 'TC_GENERATION', 'BUG_ANALYSIS'
    model_used VARCHAR(100) NOT NULL,
    tokens_or_characters INTEGER DEFAULT 0,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exports Record Log
CREATE TABLE IF NOT EXISTS export_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    export_format VARCHAR(50) NOT NULL, -- 'EXCEL', 'CSV', 'PDF'
    file_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_tc_project_module ON test_cases(project_id, module);
CREATE INDEX IF NOT EXISTS idx_bug_project_module ON bug_reports(project_id, module);
CREATE INDEX IF NOT EXISTS idx_req_project ON requirements(project_id);
