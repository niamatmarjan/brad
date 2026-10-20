import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase } from '../src/db.mjs';
import { seed } from '../src/seed.mjs';
import { createApp } from '../src/server.mjs';

test('GET /api/requests/:id/export returns json and csv formats', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'relaydesk-export-test-'));
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

  try {
    // 1. JSON export
    const resJson = await fetch(`${baseUrl}/api/requests/REQ-101/export?format=json`);
    const dataJson = await resJson.json();
    assert.equal(resJson.status, 200);
    assert.equal(dataJson.ok, true);
    assert.ok(Array.isArray(dataJson.data));

    // 2. CSV export
    const resCsv = await fetch(`${baseUrl}/api/requests/REQ-101/export?format=csv`);
    const textCsv = await resCsv.text();
    assert.equal(resCsv.status, 200);
    assert.match(resCsv.headers.get('content-type'), /text\/csv/);
    assert.ok(textCsv.includes('id,request_id,actor_id'));
    assert.ok(textCsv.includes('REQ-101'));
  } finally {
    await new Promise(res => server.close(res));
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
