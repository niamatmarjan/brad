import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../apps/api/src/server.mjs';
import { makeRequest } from '../apps/api/test/helpers.mjs';

test('E2E Lifecycle: end-to-end multi-stage finance approval with audit export', async () => {
  const app = createApp();

  // 1. Employee creates high-budget finance change request
  const createRes = await makeRequest(app, {
    method: 'POST',
    url: '/api/v1/change-requests',
    headers: {
      'X-Tenant-ID': 'tenant-acme',
      'X-User-ID': 'elena-requester',
      'X-User-Role': 'EMPLOYEE',
      'Content-Type': 'application/json'
    },
    body: {
      title: 'Upgrade Global Payment Gateway API',
      description: 'Switch to v3 endpoints',
      category: 'FINANCE',
      riskLevel: 'HIGH',
      budgetImpact: 250000,
      rollbackPlan: 'Toggle feature flag back to v2'
    }
  });

  assert.equal(createRes.status, 201);
  const crId = createRes.json.id;

  // 2. Submit
  const submitRes = await makeRequest(app, {
    method: 'POST',
    url: `/api/v1/change-requests/${crId}/submit`,
    headers: {
      'X-Tenant-ID': 'tenant-acme',
      'X-User-ID': 'elena-requester',
      'X-User-Role': 'EMPLOYEE'
    }
  });
  assert.equal(submitRes.status, 200);
  assert.equal(submitRes.json.status, 'PENDING_APPROVAL');
  assert.equal(submitRes.json.stages.length, 2);

  // 3. Stage 1: Team Manager approves
  const stage1Res = await makeRequest(app, {
    method: 'POST',
    url: `/api/v1/approvals/${crId}/approve`,
    headers: {
      'X-Tenant-ID': 'tenant-acme',
      'X-User-ID': 'carlos-manager',
      'X-User-Role': 'MANAGER',
      'Content-Type': 'application/json'
    },
    body: { comments: 'Operational impact reviewed and accepted' }
  });
  assert.equal(stage1Res.status, 200);
  assert.equal(stage1Res.json.status, 'PENDING_APPROVAL');
  assert.equal(stage1Res.json.activeStageIndex, 1);

  // 4. Stage 2: Finance Director approves
  const stage2Res = await makeRequest(app, {
    method: 'POST',
    url: `/api/v1/approvals/${crId}/approve`,
    headers: {
      'X-Tenant-ID': 'tenant-acme',
      'X-User-ID': 'diana-finance-director',
      'X-User-Role': 'APPROVER',
      'Content-Type': 'application/json'
    },
    body: { comments: 'Capital expenditure authorized' }
  });
  assert.equal(stage2Res.status, 200);
  assert.equal(stage2Res.json.status, 'APPROVED');

  // 5. Auditor verifies cryptographic audit chain
  const verifyRes = await makeRequest(app, {
    method: 'GET',
    url: '/api/v1/audit/verify',
    headers: {
      'X-Tenant-ID': 'tenant-acme',
      'X-User-Role': 'AUDITOR'
    }
  });
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.json.valid, true);
  assert.equal(verifyRes.json.totalRecords, 4);

  // 6. Auditor exports CSV report
  const exportRes = await makeRequest(app, {
    method: 'GET',
    url: '/api/v1/audit/export?format=csv',
    headers: {
      'X-Tenant-ID': 'tenant-acme',
      'X-User-Role': 'AUDITOR'
    }
  });
  assert.equal(exportRes.status, 200);
  assert.equal(exportRes.headers['content-type'], 'text/csv');
  assert.match(exportRes.body, /"CR_CREATED"/);
  assert.match(exportRes.body, /"STAGE_APPROVED"/);
});
