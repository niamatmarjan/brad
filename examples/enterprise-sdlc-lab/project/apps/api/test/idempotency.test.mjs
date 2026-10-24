import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';
import { makeRequest } from './helpers.mjs';

test('Idempotency Middleware: replaying identical request returns cached response without duplicate side effects', async () => {
  const app = createApp();
  const headers = {
    'X-Tenant-ID': 'tenant-idemp',
    'X-User-ID': 'user-1',
    'X-User-Role': 'EMPLOYEE',
    'Content-Type': 'application/json',
    'Idempotency-Key': 'IDEMP-KEY-999'
  };

  const payload = {
    title: 'Migrate Kafka Cluster',
    description: 'Upgrade broker 01',
    category: 'INFRASTRUCTURE',
    riskLevel: 'LOW',
    rollbackPlan: 'Switch to broker 02'
  };

  // First call: executes creation
  const res1 = await makeRequest(app, {
    method: 'POST',
    url: '/api/v1/change-requests',
    headers,
    body: payload
  });

  assert.equal(res1.status, 201);
  const createdId = res1.json.id;

  // Second call with same key and same payload: returns cached response
  const res2 = await makeRequest(app, {
    method: 'POST',
    url: '/api/v1/change-requests',
    headers,
    body: payload
  });

  assert.equal(res2.status, 201);
  assert.equal(res2.json.id, createdId);
  assert.equal(res2.headers['x-idempotent-replay'], 'true');

  // Verify only 1 record was written to repository
  const listRes = await makeRequest(app, {
    method: 'GET',
    url: '/api/v1/change-requests',
    headers: { 'X-Tenant-ID': 'tenant-idemp' }
  });

  assert.equal(listRes.json.total, 1, 'Only one entity must exist in the database');
});

test('Idempotency Middleware: replaying with same key but different payload returns 422', async () => {
  const app = createApp();
  const headers = {
    'X-Tenant-ID': 'tenant-idemp',
    'X-User-ID': 'user-1',
    'Content-Type': 'application/json',
    'Idempotency-Key': 'KEY-CONFLICT-1'
  };

  await makeRequest(app, {
    method: 'POST',
    url: '/api/v1/change-requests',
    headers,
    body: { title: 'First Attempt', description: 'Desc', rollbackPlan: 'Plan' }
  });

  // Second attempt with differing body
  const res2 = await makeRequest(app, {
    method: 'POST',
    url: '/api/v1/change-requests',
    headers,
    body: { title: 'TAMPERED Second Attempt', description: 'Desc', rollbackPlan: 'Plan' }
  });

  assert.equal(res2.status, 422);
  assert.equal(res2.json.error, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
});
