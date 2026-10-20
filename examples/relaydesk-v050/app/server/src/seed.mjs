import { getDb } from './db.mjs';
import { logAuditEvent } from './audit.mjs';

export function seed(db = getDb()) {
  // Clear existing tables in reverse dependency order
  db.exec('DELETE FROM audit_log;');
  db.exec('DELETE FROM defects;');
  db.exec('DELETE FROM requirements;');
  db.exec('DELETE FROM comments;');
  db.exec('DELETE FROM requests;');
  db.exec('DELETE FROM users;');

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, department)
    VALUES (?, ?, ?, ?, ?)
  `);

  const users = [
    ['USR-PO-01', 'Elena Vance', 'elena.vance@relaydesk.local', 'PRODUCT_OWNER', 'Product Management'],
    ['USR-APP-01', 'Marcus Sterling', 'marcus.sterling@relaydesk.local', 'APPROVER', 'Security & Governance'],
    ['USR-DEV-01', 'Devon Miller (Dev A)', 'devon.miller@relaydesk.local', 'ENGINEER', 'Intake Engineering'],
    ['USR-DEV-02', 'Priya Sharma (Dev B)', 'priya.sharma@relaydesk.local', 'ENGINEER', 'Fulfillment Engineering'],
    ['USR-DEV-03', 'Liam Chen (Dev C)', 'liam.chen@relaydesk.local', 'ENGINEER', 'Platform Engineering'],
    ['USR-QA-01', 'Chloe Bennett', 'chloe.bennett@relaydesk.local', 'QA_ENGINEER', 'Quality Engineering'],
    ['USR-ADM-01', 'Dev Admin', 'admin@relaydesk.local', 'ADMIN', 'Operations']
  ];

  for (const u of users) {
    insertUser.run(...u);
  }

  // Insert Sample Requests
  const insertReq = db.prepare(`
    INSERT INTO requests (
      id, title, description, category, priority, status, is_blocked, blocker_reason,
      requester_id, approver_id, assignee_id, qa_owner_id,
      approval_notes, fulfillment_notes, qa_notes, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now'))
  `);

  const requests = [
    [
      'REQ-101',
      'Automated OAuth Token Rotation for Service Accounts',
      'Implement scheduled 24-hour OAuth token rotation with zero-downtime refresh for automated background service accounts.',
      'SECURITY_ACCESS',
      'HIGH',
      'DRAFT',
      0,
      null,
      'USR-PO-01',
      null,
      null,
      null,
      null,
      null,
      null,
      1
    ],
    [
      'REQ-102',
      'Data Export Pipeline for Customer Analytics Mart',
      'Provide daily parquet extract of anonymized tenant usage metrics into the analytics bucket with partition keys by date.',
      'DATA_PIPELINE',
      'MEDIUM',
      'SUBMITTED',
      0,
      null,
      'USR-PO-01',
      null,
      null,
      null,
      null,
      null,
      null,
      1
    ],
    [
      'REQ-103',
      'Provision Ephemeral Redis Cluster for Staging',
      'Set up a 3-node Redis 7 cluster in the staging VPC with password authentication and TLS in transit.',
      'INFRASTRUCTURE',
      'HIGH',
      'APPROVED',
      0,
      null,
      'USR-PO-01',
      'USR-APP-01',
      null,
      null,
      'Approved: architectural review completed and budget allocated.',
      null,
      null,
      2
    ],
    [
      'REQ-104',
      'Webhook Notification Service Integration',
      'Expose outbound webhook event triggers for request approval and completion events with HMAC-SHA256 signature headers.',
      'APP_INTEGRATION',
      'CRITICAL',
      'IN_PROGRESS',
      0,
      null,
      'USR-PO-01',
      'USR-APP-01',
      'USR-DEV-02',
      'USR-QA-01',
      'Approved by SecOps for staging integration.',
      'Core webhook dispatcher drafted; configuring retries.',
      null,
      3
    ]
  ];

  for (const r of requests) {
    insertReq.run(...r);
  }

  // Insert Requirements & Acceptance Criteria
  const insertReqCriteria = db.prepare(`
    INSERT INTO requirements (id, request_id, title, acceptance_criteria, is_met, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  insertReqCriteria.run('REQ-101-C1', 'REQ-101', 'Secret Store Integration', 'Token rotated and saved into credential vault with backup key', 0);
  insertReqCriteria.run('REQ-101-C2', 'REQ-101', 'Grace Period Expiry', 'Previous token remains valid for 15 minutes during rotation', 0);

  insertReqCriteria.run('REQ-104-C1', 'REQ-104', 'HMAC Signature Header', 'Each payload includes X-RelayDesk-Signature header matching SHA256 hex', 1);
  insertReqCriteria.run('REQ-104-C2', 'REQ-104', 'Exponential Backoff Retry', 'Retry delivery 3 times on 5xx responses with jittered backoff', 0);

  // Initial Audit Logs
  logAuditEvent(db, {
    requestId: 'REQ-101',
    actorId: 'USR-PO-01',
    actorRole: 'PRODUCT_OWNER',
    action: 'CREATE_REQUEST',
    toStatus: 'DRAFT',
    details: { title: 'Automated OAuth Token Rotation for Service Accounts' }
  });

  logAuditEvent(db, {
    requestId: 'REQ-103',
    actorId: 'USR-APP-01',
    actorRole: 'APPROVER',
    action: 'APPROVE_REQUEST',
    fromStatus: 'SUBMITTED',
    toStatus: 'APPROVED',
    details: { notes: 'Approved: architectural review completed and budget allocated.' }
  });

  logAuditEvent(db, {
    requestId: 'REQ-104',
    actorId: 'USR-DEV-02',
    actorRole: 'ENGINEER',
    action: 'START_FULFILLMENT',
    fromStatus: 'ASSIGNED',
    toStatus: 'IN_PROGRESS',
    details: { notes: 'Assigned to Priya Sharma; development commenced.' }
  });

  return { usersCount: users.length, requestsCount: requests.length };
}

if (process.argv[1] && process.argv[1].endsWith('seed.mjs')) {
  const result = seed();
  console.log(`Seeded ${result.usersCount} users and ${result.requestsCount} requests successfully.`);
}
