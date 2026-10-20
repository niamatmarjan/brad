import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase } from '../src/db.mjs';
import { seed } from '../src/seed.mjs';
import { createApp } from '../src/server.mjs';
import { calculateSla } from '../src/api.mjs';
import { SLA_STATUS } from '../src/types.mjs';

test('calculateSla logic evaluates accurately', () => {
  // Not configured
  assert.equal(calculateSla(null, 'IN_PROGRESS').status, SLA_STATUS.NOT_CONFIGURED);

  // Future target (> 24h) -> ON_TRACK
  const future = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  assert.equal(calculateSla(future, 'IN_PROGRESS').status, SLA_STATUS.ON_TRACK);

  // Near future (< 24h) -> AT_RISK
  const nearFuture = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
  assert.equal(calculateSla(nearFuture, 'IN_PROGRESS').status, SLA_STATUS.AT_RISK);

  // Past target -> OVERDUE
  const past = new Date(Date.now() - 10 * 3600 * 1000).toISOString();
  assert.equal(calculateSla(past, 'IN_PROGRESS').status, SLA_STATUS.OVERDUE);

  // Completed on time
  assert.equal(calculateSla(future, 'COMPLETED', new Date(Date.now()).toISOString()).status, SLA_STATUS.COMPLETED_ON_TIME);

  // Completed late
  assert.equal(calculateSla(past, 'COMPLETED', new Date(Date.now()).toISOString()).status, SLA_STATUS.COMPLETED_LATE);
});

test('GET /api/requests/:id/sla returns SLA calculation via API', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'relaydesk-sla-test-'));
  const dbPath = join(tmpDir, 'test.sqlite');
  const db = createDatabase(dbPath);
  seed(db);
  const app = createApp(db);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const port = server.address().port;

  try {
    const targetDate = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    // Update REQ-101 with target date
    db.prepare('UPDATE requests SET target_completion_date = ? WHERE id = ?').run(targetDate, 'REQ-101');

    const res = await fetch(`http://127.0.0.1:${port}/api/requests/REQ-101/sla`);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.status, SLA_STATUS.ON_TRACK);
  } finally {
    await new Promise(res => server.close(res));
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
