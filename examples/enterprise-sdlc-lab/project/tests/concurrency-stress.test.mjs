import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../apps/api/src/server.mjs';
import { makeRequest } from '../apps/api/test/helpers.mjs';

test('Concurrency Stress: simultaneous approval attempts arbitrate safely via optimistic locking', async () => {
  const app = createApp();
  const headers = {
    'X-Tenant-ID': 'tenant-stress',
    'X-User-ID': 'requester-1',
    'X-User-Role': 'EMPLOYEE',
    'Content-Type': 'application/json'
  };

  // Create & Submit
  const crRes = await makeRequest(app, {
    method: 'POST',
    url: '/api/v1/change-requests',
    headers,
    body: { title: 'Concurrent Race Test', description: 'Stress test', rollbackPlan: 'Revert' }
  });
  const crId = crRes.json.id;

  await makeRequest(app, {
    method: 'POST',
    url: `/api/v1/change-requests/${crId}/submit`,
    headers
  });

  // Launch 10 concurrent approval requests simultaneously
  const concurrentApprovers = Array.from({ length: 10 }, (_, i) => ({
    id: `manager-${i + 1}`,
    role: 'MANAGER'
  }));

  const promises = concurrentApprovers.map(approver => makeRequest(app, {
    method: 'POST',
    url: `/api/v1/approvals/${crId}/approve`,
    headers: {
      'X-Tenant-ID': 'tenant-stress',
      'X-User-ID': approver.id,
      'X-User-Role': approver.role,
      'Content-Type': 'application/json'
    },
    body: { comments: `Approval by ${approver.id}` }
  }));

  const results = await Promise.all(promises);

  // Exactly one request must succeed (200), and others must be cleanly rejected or conflicted
  const successCount = results.filter(r => r.status === 200).length;
  const conflictCount = results.filter(r => r.status === 409 || r.status === 400).length;

  assert.equal(successCount, 1, 'Exactly one concurrent approval must commit the state transition');
  assert.equal(conflictCount, 9, 'All other 9 concurrent attempts must be rejected without corrupted state');

  // Verify final entity state
  const finalRes = await makeRequest(app, {
    method: 'GET',
    url: `/api/v1/change-requests/${crId}`,
    headers: { 'X-Tenant-ID': 'tenant-stress' }
  });

  assert.equal(finalRes.json.status, 'APPROVED');
  assert.equal(finalRes.json.version, 3, 'Version must be incremented exactly to 3 (create=1, submit=2, approve=3)');
});
