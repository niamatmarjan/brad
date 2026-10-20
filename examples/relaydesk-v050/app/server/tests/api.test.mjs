import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase } from '../src/db.mjs';
import { seed } from '../src/seed.mjs';
import { createApp } from '../src/server.mjs';

async function withTestApp(fn) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'relaydesk-api-test-'));
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

test('GET /health returns 200 and healthy status', async () => {
  await withTestApp(async ({ request }) => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'healthy');
    assert.equal(res.data.version, '0.5.0');
  });
});

test('GET /api/users returns seeded users', async () => {
  await withTestApp(async ({ request }) => {
    const res = await request('/api/users');
    assert.equal(res.status, 200);
    assert.ok(res.data.data.length >= 7);
    const po = res.data.data.find(u => u.role === 'PRODUCT_OWNER');
    assert.ok(po);
  });
});

test('End-to-End SDLC Lifecycle: Create -> Criteria -> Submit -> Approve -> Assign -> In Progress -> Review -> QA -> Verify -> Complete', async () => {
  await withTestApp(async ({ request }) => {
    // 1. Create Request (PO)
    const createRes = await request('/api/requests', {
      method: 'POST',
      headers: { 'x-user-id': 'USR-PO-01' },
      body: {
        title: 'Realtime WebSocket Telemetry Bus',
        description: 'Provide pub/sub WebSocket channels for live event streaming across clusters.',
        category: 'APP_INTEGRATION',
        priority: 'HIGH'
      }
    });
    assert.equal(createRes.status, 201);
    const reqId = createRes.data.data.id;
    assert.equal(createRes.data.data.status, 'DRAFT');

    // 2. Submit without criteria fails (400)
    const failSubmit = await request(`/api/requests/${reqId}/submit`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-PO-01' }
    });
    assert.equal(failSubmit.status, 400);

    // 3. Add Acceptance Criteria
    const addCrit = await request(`/api/requests/${reqId}/requirements`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-PO-01' },
      body: {
        title: 'Authentication Handshake',
        acceptance_criteria: 'Client must present JWT on socket upgrade handshake'
      }
    });
    assert.equal(addCrit.status, 201);
    const reqCritId = addCrit.data.data.id;

    // 4. Submit for Approval
    const submitRes = await request(`/api/requests/${reqId}/submit`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-PO-01' }
    });
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.data.data.status, 'SUBMITTED');

    // 5. Unauthorized approval fails (Engineer cannot approve)
    const unauthApprove = await request(`/api/requests/${reqId}/approve`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-DEV-01' },
      body: { notes: 'Trying to approve myself' }
    });
    assert.equal(unauthApprove.status, 403);

    // 6. Authorized Approval (Approver)
    const approveRes = await request(`/api/requests/${reqId}/approve`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-APP-01' },
      body: { notes: 'Approved for staging rollout' }
    });
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.data.data.status, 'APPROVED');

    // 7. Assign to Engineer
    const assignRes = await request(`/api/requests/${reqId}/assign`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-PO-01' },
      body: { assignee_id: 'USR-DEV-01', qa_owner_id: 'USR-QA-01' }
    });
    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.data.data.status, 'ASSIGNED');

    // 8. Start fulfillment
    const startRes = await request(`/api/requests/${reqId}/start`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-DEV-01' }
    });
    assert.equal(startRes.status, 200);
    assert.equal(startRes.data.data.status, 'IN_PROGRESS');

    // 9. Flag blocker and unblock
    const blockRes = await request(`/api/requests/${reqId}/block`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-DEV-01' },
      body: { reason: 'Waiting on staging TLS certs' }
    });
    assert.equal(blockRes.status, 200);
    assert.equal(blockRes.data.data.is_blocked, 1);

    // Cannot request review while blocked
    const failReview = await request(`/api/requests/${reqId}/request-review`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-DEV-01' }
    });
    assert.equal(failReview.status, 400);

    // Unblock
    const unblockRes = await request(`/api/requests/${reqId}/unblock`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-DEV-01' }
    });
    assert.equal(unblockRes.status, 200);
    assert.equal(unblockRes.data.data.is_blocked, 0);

    // 10. Request Review
    const reviewRes = await request(`/api/requests/${reqId}/request-review`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-DEV-01' },
      body: { notes: 'Code ready on branch dev-intake' }
    });
    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.data.data.status, 'REVIEW_REQUESTED');

    // 11. Submit to QA
    const submitQaRes = await request(`/api/requests/${reqId}/submit-qa`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-DEV-01' },
      body: { notes: 'Peer review completed with approval' }
    });
    assert.equal(submitQaRes.status, 200);
    assert.equal(submitQaRes.data.data.status, 'QA_PENDING');

    // 12. QA tries to verify while criteria unmet -> fails (400)
    const failVerify = await request(`/api/requests/${reqId}/verify`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-QA-01' }
    });
    assert.equal(failVerify.status, 400);

    // 13. QA logs defect
    const defectRes = await request(`/api/requests/${reqId}/defects`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-QA-01' },
      body: {
        title: 'Connection drop on token refresh',
        severity: 'MAJOR',
        steps_to_reproduce: '1. Connect websocket. 2. Trigger token renewal.',
        expected_behavior: 'Session persists seamlessly.',
        actual_behavior: 'Socket closes with code 1006.'
      }
    });
    assert.equal(defectRes.status, 201);
    const defId = defectRes.data.data.id;

    // 14. Fix defect and retest pass
    await request(`/api/requests/${reqId}/defects/${defId}`, {
      method: 'PATCH',
      headers: { 'x-user-id': 'USR-DEV-01' },
      body: { status: 'FIXED', notes: 'Handled re-auth frame in ping handler' }
    });

    await request(`/api/requests/${reqId}/defects/${defId}`, {
      method: 'PATCH',
      headers: { 'x-user-id': 'USR-QA-01' },
      body: { status: 'RETEST_PASSED', notes: 'Verified fix under load' }
    });

    // 15. Mark acceptance criteria met
    const metRes = await request(`/api/requests/${reqId}/requirements/${reqCritId}`, {
      method: 'PATCH',
      headers: { 'x-user-id': 'USR-QA-01' },
      body: { is_met: 1 }
    });
    assert.equal(metRes.status, 200);

    // 16. QA verifies request
    const verifyRes = await request(`/api/requests/${reqId}/verify`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-QA-01' },
      body: { notes: 'All criteria passed and defect retested clean' }
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.data.data.status, 'VERIFIED');

    // 17. Complete request (PO)
    const completeRes = await request(`/api/requests/${reqId}/complete`, {
      method: 'POST',
      headers: { 'x-user-id': 'USR-PO-01' }
    });
    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.data.data.status, 'COMPLETED');

    // 18. Verify Audit Log
    const auditRes = await request(`/api/requests/${reqId}/audit`);
    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.data.data.length >= 10);
  });
});

test('Optimistic concurrency control rejects conflicting updates (409)', async () => {
  await withTestApp(async ({ request }) => {
    // Seeded REQ-101 has version 1
    const conflictRes = await request('/api/requests/REQ-101', {
      method: 'PUT',
      headers: { 'x-user-id': 'USR-PO-01' },
      body: {
        title: 'Conflicting Title Update',
        version: 999 // stale version!
      }
    });
    assert.equal(conflictRes.status, 409);
    assert.match(conflictRes.data.error, /Conflict/);
  });
});

test('GET /api/readiness reports system gate metrics accurately', async () => {
  await withTestApp(async ({ request }) => {
    const res = await request('/api/readiness');
    assert.equal(res.status, 200);
    assert.equal(typeof res.data.data.isReleaseReady, 'boolean');
    assert.ok(res.data.data.counts.totalRequests >= 4);
    assert.ok(res.data.data.gates.zeroOpenDefects !== undefined);
  });
});
