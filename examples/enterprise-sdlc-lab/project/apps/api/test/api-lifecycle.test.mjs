import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';
import { makeRequest } from './helpers.mjs';

test('API Lifecycle: creates draft, submits, and completes approval flow', async () => {
  const app = createApp();
  const headers = {
    'X-Tenant-ID': 'tenant-acme',
    'X-User-ID': 'user-requester',
    'X-User-Role': 'EMPLOYEE',
    'Content-Type': 'application/json'
  };

  // 1. Create Draft
  const createRes = await makeRequest(app, {
    method: 'POST',
    url: '/api/v1/change-requests',
    headers,
    body: {
      title: 'Upgrade Redis Cache',
      description: 'Upgrade cluster to Redis 7',
      category: 'INFRASTRUCTURE',
      riskLevel: 'LOW',
      rollbackPlan: 'Failover to standby'
    }
  });

  assert.equal(createRes.status, 201);
  assert.ok(createRes.json.id);
  assert.equal(createRes.json.status, 'DRAFT');
  const crId = createRes.json.id;

  // 2. Submit Draft
  const submitRes = await makeRequest(app, {
    method: 'POST',
    url: `/api/v1/change-requests/${crId}/submit`,
    headers
  });

  assert.equal(submitRes.status, 200);
  assert.equal(submitRes.json.status, 'PENDING_APPROVAL');
  assert.equal(submitRes.json.stages.length, 1);

  // 3. Self-approval attempt by requester must fail
  const selfApproveRes = await makeRequest(app, {
    method: 'POST',
    url: `/api/v1/approvals/${crId}/approve`,
    headers, // still user-requester
    body: { comments: 'Self approval' }
  });

  assert.equal(selfApproveRes.status, 400);
  assert.equal(selfApproveRes.json.error, 'SELF_APPROVAL_VIOLATION');

  // 4. Authorized approval by Manager
  const managerHeaders = {
    'X-Tenant-ID': 'tenant-acme',
    'X-User-ID': 'user-manager',
    'X-User-Role': 'MANAGER',
    'Content-Type': 'application/json'
  };

  const approveRes = await makeRequest(app, {
    method: 'POST',
    url: `/api/v1/approvals/${crId}/approve`,
    headers: managerHeaders,
    body: { comments: 'Approved by team lead' }
  });

  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.json.status, 'APPROVED');

  // 5. Verify audit ledger captured all events
  const auditRes = await makeRequest(app, {
    method: 'GET',
    url: '/api/v1/audit/records',
    headers: { 'X-Tenant-ID': 'tenant-acme', 'X-User-Role': 'AUDITOR' }
  });

  assert.equal(auditRes.status, 200);
  assert.equal(auditRes.json.count, 3); // CR_CREATED, CR_SUBMITTED, STAGE_APPROVED
});
