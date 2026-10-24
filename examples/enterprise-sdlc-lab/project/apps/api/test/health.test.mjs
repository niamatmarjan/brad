import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';
import { makeRequest } from './helpers.mjs';

test('Health Endpoints: /health, /ready, and /metrics return valid diagnostic payloads', async () => {
  const app = createApp();

  const healthRes = await makeRequest(app, { method: 'GET', url: '/health' });
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.json.status, 'UP');

  const readyRes = await makeRequest(app, { method: 'GET', url: '/ready' });
  assert.equal(readyRes.status, 200);
  assert.equal(readyRes.json.status, 'READY');

  const metricsRes = await makeRequest(app, { method: 'GET', url: '/metrics' });
  assert.equal(metricsRes.status, 200);
  assert.ok(metricsRes.json.totalRequests >= 2);
  assert.ok(metricsRes.json.latency);
});
