import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase } from '../src/db.mjs';
import { seed } from '../src/seed.mjs';
import { createApp } from '../src/server.mjs';
import { SLA_STATUS, ROLES } from '../src/types.mjs';

/**
 * Test helper creating an isolated in-memory/temp SQLite database instance,
 * seeding it, and mounting the Express app on an ephemeral port.
 */
async function withTestApp(fn) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'relaydesk-analytics-qa-test-'));
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

test('QA Security Boundary Check: ENGINEER and QA_ENGINEER cannot access GET /api/analytics/sla-summary (403 Forbidden)', async () => {
  await withTestApp(async ({ request }) => {
    // 1. Verify ENGINEER access is rejected with 403
    const engRes = await request('/api/analytics/sla-summary', {
      headers: {
        'x-user-id': 'USR-DEV-01',
        'x-role': ROLES.ENGINEER
      }
    });

    assert.equal(engRes.status, 403, 'RBAC enforced: ENGINEER role rejected with 403 Forbidden');
    assert.equal(engRes.data.ok, false);

    // 2. Verify QA_ENGINEER access is rejected with 403
    const qaRes = await request('/api/analytics/sla-summary', {
      headers: {
        'x-user-id': 'USR-QA-01',
        'x-role': ROLES.QA_ENGINEER
      }
    });

    assert.equal(qaRes.status, 403, 'RBAC enforced: QA_ENGINEER role rejected with 403 Forbidden');
    assert.equal(qaRes.data.ok, false);
  });
});

test('QA Edge Case Check: Whitespace-padded invalid target date is classified as NOT_CONFIGURED and excluded from topAtRisk', async () => {
  await withTestApp(async ({ request, db }) => {
    const now = Date.now();
    const pastDate = new Date(now - 12 * 3600 * 1000).toISOString();
    const futureDate = new Date(now + 48 * 3600 * 1000).toISOString();

    // Setup test records:
    // REQ-101: Whitespace-padded invalid date string ('   ')
    db.prepare('UPDATE requests SET target_completion_date = ? WHERE id = ?').run('   ', 'REQ-101');
    // REQ-102: Legitimate severely overdue request (12 hours past SLA target)
    db.prepare('UPDATE requests SET target_completion_date = ? WHERE id = ?').run(pastDate, 'REQ-102');
    // REQ-103: Legitimate active on-track request (24 hours remaining)
    db.prepare('UPDATE requests SET target_completion_date = ? WHERE id = ?').run(futureDate, 'REQ-103');

    const res = await request('/api/analytics/sla-summary', {
      headers: {
        'x-user-id': 'USR-ADM-01',
        'x-role': ROLES.ADMIN
      }
    });

    assert.equal(res.status, 200, 'Endpoint returned 200 OK for authorized admin');
    assert.equal(res.data.ok, true);

    const data = res.data.data;
    assert.ok(Array.isArray(data.topAtRisk));

    // REQ-101 with whitespace date must be classified as NOT_CONFIGURED in statusCounts
    // REQ-104 from seed has null target date, so 2 NOT_CONFIGURED total (REQ-101 and REQ-104)
    assert.equal(data.statusCounts.NOT_CONFIGURED, 2, 'Whitespace date correctly classified as NOT_CONFIGURED');
    assert.equal(data.statusCounts.OVERDUE, 1, 'REQ-102 counted as OVERDUE');
    assert.equal(data.statusCounts.ON_TRACK, 1, 'REQ-103 counted as ON_TRACK');

    // REQ-101 must NOT be admitted into topAtRisk
    const poisonedItem = data.topAtRisk.find(r => r.id === 'REQ-101');
    assert.equal(poisonedItem, undefined, 'Invalid whitespace date item REQ-101 excluded from topAtRisk');

    // Legitimate overdue ticket REQ-102 must be at index 0 without sort corruption
    assert.equal(data.topAtRisk.length, 2);
    assert.equal(data.topAtRisk[0].id, 'REQ-102', 'Overdue ticket REQ-102 correctly positioned at index 0');
    assert.equal(data.topAtRisk[1].id, 'REQ-103', 'On-track ticket REQ-103 correctly positioned at index 1');
  });
});
