export const migrations = [{
  version: 1,
  sql: `
    CREATE TABLE users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN (
        'product-manager','business-analyst','delivery-manager','solution-architect',
        'technical-lead','developer','functional-qa','automation-qa'))
    ) STRICT;
    CREATE TABLE sessions (
      tokenHash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id),
      createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL, revokedAt TEXT,
      version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0)
    ) STRICT;
    CREATE INDEX sessions_expiry ON sessions(expiresAt);
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Archived')),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE work_items (
      id TEXT PRIMARY KEY, projectId TEXT NOT NULL REFERENCES projects(id),
      type TEXT NOT NULL CHECK(type IN ('initiative','story','task')),
      title TEXT NOT NULL, description TEXT NOT NULL,
      acceptanceCriteria TEXT NOT NULL CHECK(json_valid(acceptanceCriteria)),
      priority TEXT NOT NULL CHECK(priority IN ('urgent','high','medium','low')),
      estimate REAL CHECK(estimate IS NULL OR estimate >= 0),
      assigneeId TEXT REFERENCES users(id),
      dependencies TEXT NOT NULL CHECK(json_valid(dependencies)),
      status TEXT NOT NULL CHECK(status IN (
        'Draft','Requirements Review','Ready','In Development','Code Review','Ready for QA',
        'In QA','Accepted','Done','Blocked','Changes Requested','Reopened')),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
      createdBy TEXT NOT NULL REFERENCES users(id), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    ) STRICT;
    CREATE INDEX items_project ON work_items(projectId);
    CREATE TABLE comments (
      id TEXT PRIMARY KEY, workItemId TEXT NOT NULL REFERENCES work_items(id),
      actorId TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, createdAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY, workItemId TEXT NOT NULL REFERENCES work_items(id),
      actorId TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK(kind IN ('requirements','code')),
      decision TEXT NOT NULL CHECK(decision IN ('approved','changes-requested')),
      body TEXT NOT NULL, itemVersion INTEGER NOT NULL, createdAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE test_runs (
      id TEXT PRIMARY KEY, workItemId TEXT NOT NULL REFERENCES work_items(id),
      actorId TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('passed','failed','blocked')),
      cases TEXT NOT NULL CHECK(json_valid(cases)), notes TEXT NOT NULL,
      itemVersion INTEGER NOT NULL, createdAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE defects (
      id TEXT PRIMARY KEY, workItemId TEXT NOT NULL REFERENCES work_items(id),
      title TEXT NOT NULL, description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('blocking','critical','major','minor')),
      status TEXT NOT NULL CHECK(status IN ('Open','In Progress','Fixed','Closed','Reopened')),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
      createdBy TEXT NOT NULL REFERENCES users(id), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    ) STRICT;
    CREATE INDEX defects_item ON defects(workItemId);
    CREATE TABLE retests (
      id TEXT PRIMARY KEY, defectId TEXT NOT NULL REFERENCES defects(id),
      actorId TEXT NOT NULL REFERENCES users(id),
      result TEXT NOT NULL CHECK(result IN ('passed','failed')), notes TEXT NOT NULL,
      defectVersion INTEGER NOT NULL, createdAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE transitions (
      id TEXT PRIMARY KEY, workItemId TEXT NOT NULL REFERENCES work_items(id),
      actorId TEXT NOT NULL REFERENCES users(id), fromStatus TEXT NOT NULL,
      toStatus TEXT NOT NULL, itemVersion INTEGER NOT NULL, createdAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE activity (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
      projectId TEXT REFERENCES projects(id), workItemId TEXT REFERENCES work_items(id),
      actorId TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
      entityId TEXT NOT NULL, details TEXT NOT NULL CHECK(json_valid(details)), createdAt TEXT NOT NULL
    ) STRICT;
    CREATE INDEX activity_project ON activity(projectId, sequence);
    ${['activity', 'transitions', 'comments', 'reviews', 'test_runs', 'retests'].map(table => `
      CREATE TRIGGER ${table}_no_update BEFORE UPDATE ON ${table}
        BEGIN SELECT RAISE(ABORT, 'immutable record'); END;
      CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table}
        BEGIN SELECT RAISE(ABORT, 'immutable record'); END;
    `).join('')}
  `,
}];
