-- RelayDesk SQLite Schema
-- Fictional Cross-Team Service Request Platform

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('PRODUCT_OWNER', 'APPROVER', 'ENGINEER', 'QA_ENGINEER', 'ADMIN')),
    department TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('INFRASTRUCTURE', 'SECURITY_ACCESS', 'DATA_PIPELINE', 'APP_INTEGRATION')),
    priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW_REQUESTED', 'QA_PENDING', 'VERIFIED', 'COMPLETED')),
    is_blocked INTEGER NOT NULL DEFAULT 0,
    blocker_reason TEXT,
    requester_id TEXT NOT NULL REFERENCES users(id),
    approver_id TEXT REFERENCES users(id),
    assignee_id TEXT REFERENCES users(id),
    qa_owner_id TEXT REFERENCES users(id),
    approval_notes TEXT,
    fulfillment_notes TEXT,
    qa_notes TEXT,
    target_completion_date TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    is_met INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS defects (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'MAJOR', 'MINOR')),
    steps_to_reproduce TEXT NOT NULL,
    expected_behavior TEXT NOT NULL,
    actual_behavior TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('OPEN', 'FIXED', 'RETEST_PASSED', 'RETEST_FAILED', 'CLOSED')),
    reported_by TEXT NOT NULL REFERENCES users(id),
    resolved_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    comment_type TEXT NOT NULL CHECK(comment_type IN ('GENERAL', 'REQUIREMENT_CLARIFICATION', 'APPROVAL_DECISION', 'REVIEW_FEEDBACK', 'QA_FINDING')),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    details TEXT,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_assignee ON requests(assignee_id);
CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_defects_request ON defects(request_id);
