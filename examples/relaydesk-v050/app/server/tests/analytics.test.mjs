import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase } from '../src/db.mjs';
import { seed } from '../src/seed.mjs';
import { createApp } from '../src/server.mjs';
import { SLA_STATUS, ROLES } from '../src/types.mjs';

async function withTestApp(fn) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'relaydesk-analytics-test-'));
  const dbPath = join(tmpDir, 'test.sqlite');
  const db = createDatabase(dbPath);
  seed(db);
  const app = createApp(db);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    const res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data: json };
  }

  try {
    return await fn({ request, db });
  } finally {
    await new Promise(res => server.close(res));
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

test('GET /api/analytics/sla-summary returns 200 and expected schema on seeded dataset', async () => {
  await withTestApp(async ({ request }) => {
    const res = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-ADM-01', 'x-role': ROLES.ADMIN }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);

    const data = res.data.data;
    assert.ok(data);
    assert.equal(typeof data.totalRequests, 'number');
    assert.equal(typeof data.activeRequestsCount, 'number');
    assert.equal(data.totalRequests, 4);
    assert.equal(data.activeRequestsCount, 4);

    // Verify SLA status counts structure
    assert.ok(data.statusCounts);
    assert.equal(typeof data.statusCounts.ON_TRACK, 'number');
    assert.equal(typeof data.statusCounts.AT_RISK, 'number');
    assert.equal(typeof data.statusCounts.OVERDUE, 'number');
    assert.equal(typeof data.statusCounts.MET_COMPLETED, 'number');
    assert.equal(typeof data.statusCounts.BREACHED_COMPLETED, 'number');
    assert.equal(data.statusCounts.NOT_CONFIGURED, 4);

    // Verify breakdown by category and priority
    assert.ok(data.byCategory);
    assert.equal(data.byCategory.SECURITY_ACCESS, 1);
    assert.equal(data.byCategory.DATA_PIPELINE, 1);
    assert.equal(data.byCategory.INFRASTRUCTURE, 1);
    assert.equal(data.byCategory.APP_INTEGRATION, 1);

    assert.ok(data.byPriority);
    assert.equal(data.byPriority.HIGH, 2);
    assert.equal(data.byPriority.MEDIUM, 1);
    assert.equal(data.byPriority.CRITICAL, 1);

    // Verify top at risk array
    assert.ok(Array.isArray(data.topAtRisk));
    assert.equal(data.topAtRisk.length, 0); // No target dates set initially
  });
});

test('GET /api/analytics/sla-summary accurately calculates status counts and surfaces breach risks', async () => {
  await withTestApp(async ({ request, db }) => {
    const now = Date.now();
    const futureDate = new Date(now + 48 * 3600 * 1000).toISOString();
    const nearDate = new Date(now + 6 * 3600 * 1000).toISOString();
    const pastDate = new Date(now - 12 * 3600 * 1000).toISOString();
    const completionTarget = new Date(now - 24 * 3600 * 1000).toISOString();
    const onTimeCompletion = new Date(now - 30 * 3600 * 1000).toISOString();
    const lateCompletion = new Date(now - 10 * 3600 * 1000).toISOString();

    // 1. REQ-101: Active, target in 48h -> ON_TRACK
    db.prepare('UPDATE requests SET target_completion_date = ? WHERE id = ?').run(futureDate, 'REQ-101');

    // 2. REQ-102: Active, target in 6h -> AT_RISK
    db.prepare('UPDATE requests SET target_completion_date = ? WHERE id = ?').run(nearDate, 'REQ-102');

    // 3. REQ-103: Active, target 12h ago -> OVERDUE
    db.prepare('UPDATE requests SET target_completion_date = ? WHERE id = ?').run(pastDate, 'REQ-103');

    // 4. REQ-104: Set as COMPLETED on time -> MET_COMPLETED
    db.prepare(`
      UPDATE requests 
      SET status = 'COMPLETED', target_completion_date = ?, updated_at = ?
      WHERE id = ?
    `).run(completionTarget, onTimeCompletion, 'REQ-104');

    // 5. Insert an additional completed late request -> BREACHED_COMPLETED
    db.prepare(`
      INSERT INTO requests (
        id, title, description, category, priority, status, is_blocked,
        target_completion_date, requester_id, version, created_at, updated_at
      ) VALUES (
        'REQ-105', 'Late Database Migration', 'Migrate legacy schema', 'INFRASTRUCTURE', 'HIGH',
        'COMPLETED', 0, ?, 'USR-PO-01', 1, datetime('now', '-3 days'), ?
      )
    `).run(completionTarget, lateCompletion);

    const res = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-ADM-01', 'x-role': ROLES.ADMIN }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);

    const data = res.data.data;
    assert.equal(data.totalRequests, 5);
    assert.equal(data.activeRequestsCount, 3); // REQ-101, REQ-102, REQ-103

    // Verify SLA counts
    assert.equal(data.statusCounts.ON_TRACK, 1);
    assert.equal(data.statusCounts.AT_RISK, 1);
    assert.equal(data.statusCounts.OVERDUE, 1);
    assert.equal(data.statusCounts.MET_COMPLETED, 1);
    assert.equal(data.statusCounts.BREACHED_COMPLETED, 1);
    assert.equal(data.statusCounts.NOT_CONFIGURED, 0);

    // Verify top active requests closest to breach (or already breached)
    assert.equal(data.topAtRisk.length, 3);
    // REQ-103 is overdue (past deadline), so it must be first
    assert.equal(data.topAtRisk[0].id, 'REQ-103');
    assert.equal(data.topAtRisk[0].sla.status, SLA_STATUS.OVERDUE);

    // REQ-102 is nearest to breach (<24h), so it is second
    assert.equal(data.topAtRisk[1].id, 'REQ-102');
    assert.equal(data.topAtRisk[1].sla.status, SLA_STATUS.AT_RISK);

    // REQ-101 has 48h remaining, so it is third
    assert.equal(data.topAtRisk[2].id, 'REQ-101');
    assert.equal(data.topAtRisk[2].sla.status, SLA_STATUS.ON_TRACK);
  });
});

test('GET /api/analytics/sla-summary enforces RBAC (403 for ENGINEER/QA_ENGINEER, 200 for ADMIN/PRODUCT_OWNER/APPROVER)', async () => {
  await withTestApp(async ({ request }) => {
    // Rejected as ENGINEER -> 403
    const engRes = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-DEV-01', 'x-role': ROLES.ENGINEER }
    });
    assert.equal(engRes.status, 403);
    assert.equal(engRes.data.ok, false);

    // Rejected as QA_ENGINEER -> 403
    const qaRes = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-QA-01', 'x-role': ROLES.QA_ENGINEER }
    });
    assert.equal(qaRes.status, 403);
    assert.equal(qaRes.data.ok, false);

    // Allowed as ADMIN -> 200
    const adminRes = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-ADM-01', 'x-role': ROLES.ADMIN }
    });
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.data.ok, true);

    // Allowed as PRODUCT_OWNER -> 200
    const poRes = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-PO-01', 'x-role': ROLES.PRODUCT_OWNER }
    });
    assert.equal(poRes.status, 200);
    assert.equal(poRes.data.ok, true);

    // Allowed as APPROVER -> 200
    const appRes = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-APP-01', 'x-role': ROLES.APPROVER }
    });
    assert.equal(appRes.status, 200);
    assert.equal(appRes.data.ok, true);
  });
});
