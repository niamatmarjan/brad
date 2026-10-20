import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { request as httpRequest, type Server } from 'node:http';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createApp } from '../src/http.js';
import { Store } from '../src/database.js';
import type { WorkItem } from '../src/model.js';

interface Envelope {
  data: Record<string, unknown>;
  error: { code: string; message: string; details: unknown };
}
let store: Store, app: Server, base: string;
const scratch = resolve('.test-data', randomUUID());
before(async () => {
  mkdirSync(scratch, { recursive: true });
  writeFileSync(resolve(scratch, 'index.html'), '<!doctype html><title>Fixture app</title>');
  store = new Store(resolve(scratch, 'api.sqlite'));
  store.seed();
  app = createApp(store, { webRoot: scratch });
  await new Promise<void>(done => app.listen(0, '127.0.0.1', done));
  const address = app.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  await new Promise<void>((done, reject) => app.close(error => error ? reject(error) : done()));
  store.close();
  rmSync(scratch, { recursive: true, force: true });
});

async function call(path: string, method = 'GET', input?: unknown, cookie = '', origin = base) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  return { status: response.status, body: await response.json() as Envelope, cookie: response.headers.get('set-cookie'), headers: response.headers };
}
async function login(id: string) {
  const response = await call('/api/session/demo', 'POST', { userId: id });
  assert.equal(response.status, 201);
  assert.ok(response.cookie);
  return response.cookie.split(';')[0]!;
}
async function projectAndItem() {
  const pm = await login('pm-01'), dev = await login('dev-01'), qa = await login('qa-01'), lead = await login('tl-01');
  const project = await call('/api/projects', 'POST', { name: 'API project', description: 'Integration fixture' }, pm);
  assert.equal(project.status, 201);
  const projectId = project.body.data.id as string;
  const item = await call(`/api/projects/${projectId}/work-items`, 'POST', {
    type: 'story', title: 'API story', description: 'Complete the API journey',
    acceptanceCriteria: ['Journey succeeds'], assigneeId: 'dev-01', priority: 'high',
  }, pm);
  assert.equal(item.status, 201);
  return { pm, dev, qa, lead, projectId, id: item.body.data.id as string };
}

test('health, demo roster, cookies, opaque hashed tokens, expiry, switch revocation and logout', async () => {
  assert.equal((await call('/api/health')).body.data.status, 'ok');
  const roster = await call('/api/demo-users');
  assert.equal((roster.body.data as unknown as unknown[]).length, 10);
  assert.equal((await call('/api/session')).status, 401);
  const response = await call('/api/session/demo', 'POST', { userId: 'pm-01' });
  assert.match(response.cookie!, /HttpOnly/);
  assert.match(response.cookie!, /SameSite=Strict/);
  assert.match(response.cookie!, /Max-Age=28800/);
  const cookie = response.cookie!.split(';')[0]!;
  const token = cookie.split('=')[1]!;
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(store.get('SELECT * FROM sessions WHERE tokenHash = ?', token), undefined);
  assert.ok(store.get('SELECT * FROM sessions WHERE tokenHash = ?', createHash('sha256').update(token).digest('hex')));
  assert.equal((await call('/api/session', 'GET', undefined, cookie)).body.data.id, 'pm-01');
  assert.equal((await call('/api/users', 'GET', undefined, cookie)).status, 200);
  const switched = await call('/api/session/demo', 'POST', { userId: 'dev-01' }, cookie);
  assert.equal((await call('/api/session', 'GET', undefined, cookie)).status, 401);
  const secondCookie = switched.cookie!.split(';')[0]!;
  const logout = await call('/api/session/logout', 'POST', {}, secondCookie);
  assert.equal(logout.status, 200); assert.match(logout.cookie!, /Max-Age=0/);
  assert.equal((await call('/api/session', 'GET', undefined, secondCookie)).status, 401);
  const expiredCookie = await login('qa-01');
  store.run('UPDATE sessions SET expiresAt = ? WHERE tokenHash = ?', '2000-01-01T00:00:00.000Z',
    createHash('sha256').update(expiredCookie.split('=')[1]!).digest('hex'));
  assert.equal((await call('/api/session', 'GET', undefined, expiredCookie)).status, 401);
});

test('server denies missing authentication, wrong roles, cross-origin and missing Origin mutations', async () => {
  assert.equal((await call('/api/projects')).status, 401);
  assert.equal((await call('/api/projects', 'POST', { name: 'Unauthenticated' })).status, 401);
  const dev = await login('dev-01');
  const denied = await call('/api/projects', 'POST', { name: 'Forbidden' }, dev);
  assert.equal(denied.status, 403); assert.equal(denied.body.error.code, 'FORBIDDEN');
  const cross = await call('/api/session/demo', 'POST', { userId: 'pm-01' }, '', 'http://attacker.example');
  assert.equal(cross.status, 403); assert.equal(cross.body.error.code, 'ORIGIN_DENIED');
  const missingOrigin = await fetch(`${base}/api/session/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"userId":"pm-01"}' });
  assert.equal(missingOrigin.status, 403);
  const site = await fetch(`${base}/api/session/demo`, { method: 'POST', headers: { Origin: base, 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' }, body: '{"userId":"pm-01"}' });
  assert.equal(site.status, 403);
  assert.equal((await call('/api/session/demo', 'POST', { userId: 'missing' })).status, 400);
});

test('errors are readable JSON, bounded, structured and free of internal exception details', async () => {
  const cookie = await login('pm-01');
  const invalid = await fetch(`${base}/api/projects`, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json() as Envelope).error.code, 'INVALID_JSON');
  const nullBody = await call('/api/projects', 'POST', null, cookie);
  assert.equal(nullBody.status, 400); assert.ok(nullBody.body.error.message.length > 0);
  assert.equal((await call('/api/projects', 'POST', { name: 'x'.repeat(70000) }, cookie)).status, 400);
  const missing = await call('/api/projects/not-found', 'GET', undefined, cookie);
  assert.equal(missing.status, 404); assert.equal(missing.body.error.code, 'NOT_FOUND');
  assert.match(missing.headers.get('content-type')!, /^application\/json/);
  assert.equal(missing.headers.get('cache-control'), 'no-store');
  assert.equal((await call('/api/not-a-route', 'GET', undefined, cookie)).status, 404);
  const wrongType = await fetch(`${base}/api/projects`, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(wrongType.status, 400);
  store.db.exec(`CREATE TRIGGER api_failure BEFORE INSERT ON projects WHEN NEW.name = 'failure-fixture'
    BEGIN SELECT RAISE(ABORT, 'private database detail'); END;`);
  const failure = await call('/api/projects', 'POST', { name: 'failure-fixture' }, cookie);
  assert.equal(failure.status, 500);
  assert.equal(failure.body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(failure.body), /private database detail|sqlite|stack/i);
});

test('project/item read APIs and concurrent patches return one success and one VERSION_CONFLICT', async () => {
  const f = await projectAndItem();
  assert.equal((await call('/api/projects', 'GET', undefined, f.pm)).status, 200);
  assert.equal((await call(`/api/projects/${f.projectId}`, 'GET', undefined, f.pm)).body.data.name, 'API project');
  assert.equal((await call(`/api/projects/${f.projectId}/work-items`, 'GET', undefined, f.pm)).status, 200);
  const responses = await Promise.all(['First writer', 'Second writer'].map(title =>
    call(`/api/work-items/${f.id}`, 'PATCH', { title, expectedVersion: 1 }, f.pm)));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(responses.find(response => response.status === 409)!.body.error.code, 'VERSION_CONFLICT');
  assert.equal((await call(`/api/work-items/${f.id}`, 'GET', undefined, f.dev)).body.data.version, 2);
  const override = await call(`/api/work-items/${f.id}`, 'PATCH', { status: 'Done', expectedVersion: 2 }, f.pm);
  assert.equal(override.status, 400);
});

test('complete HTTP review/QA/defect/retest flow enforces gates, audit and optimistic versions', async () => {
  const f = await projectAndItem();
  const item = async () => (await call(`/api/work-items/${f.id}`, 'GET', undefined, f.pm)).body.data as unknown as WorkItem;
  const action = async (collection: string, cookie: string, input: Record<string, unknown>, status = 201) => {
    const response = await call(`/api/work-items/${f.id}/${collection}`, 'POST', { ...input, expectedVersion: (await item()).version }, cookie);
    assert.equal(response.status, status, JSON.stringify(response.body));
    return response.body.data;
  };
  const move = (to: string, cookie: string, status = 200) => action('transitions', cookie, { to }, status);
  await move('Requirements Review', f.pm);
  await action('reviews', f.pm, { kind: 'requirements', decision: 'approved' });
  await move('Ready', f.pm);
  await move('In Development', f.dev);
  await move('Code Review', f.dev);
  await action('reviews', f.lead, { kind: 'code', decision: 'approved' });
  await move('Ready for QA', f.lead); await move('In QA', f.qa);
  await action('comments', f.dev, { body: 'Ready for testing.' });
  const run = () => action('test-runs', f.qa, { name: 'Acceptance', result: 'passed', cases: [{ name: 'Journey', result: 'passed' }] });
  await run();
  const defect = await action('defects', f.qa, { title: 'Blocker', description: 'Observed failure', severity: 'blocking' });
  const blocked = await call(`/api/work-items/${f.id}/transitions`, 'POST', { to: 'Accepted', expectedVersion: (await item()).version }, f.qa);
  assert.equal(blocked.status, 409); assert.equal(blocked.body.error.code, 'BLOCKING_DEFECT');
  assert.equal((await call(`/api/projects/${f.projectId}/release-readiness`, 'GET', undefined, f.pm)).body.data.ready, false);
  const fixed = await call(`/api/defects/${defect.id as string}`, 'PATCH', { status: 'Fixed', expectedVersion: defect.version }, f.dev);
  assert.equal(fixed.status, 200);
  const retest = await call(`/api/defects/${defect.id as string}/retests`, 'POST', { result: 'passed', notes: 'Fix verified', expectedVersion: fixed.body.data.version }, f.qa);
  assert.equal(retest.status, 201);
  await run(); await move('Accepted', f.qa); await move('Done', f.pm);
  assert.equal((await call(`/api/projects/${f.projectId}/release-readiness`, 'GET', undefined, f.pm)).body.data.ready, true);
  for (const collection of ['comments', 'reviews', 'test-runs', 'defects', 'transitions']) {
    const response = await call(`/api/work-items/${f.id}/${collection}`, 'GET', undefined, f.pm);
    assert.equal(response.status, 200); assert.ok((response.body.data as unknown as unknown[]).length > 0);
  }
  assert.equal((await call(`/api/defects/${defect.id as string}/retests`, 'GET', undefined, f.qa)).status, 200);
  const activity = await call(`/api/projects/${f.projectId}/activity`, 'GET', undefined, f.pm);
  assert.ok((activity.body.data as unknown as { kind: string }[]).some(entry => entry.kind === 'defect.retested'));
});

test('production removes demo identity endpoints and requires a configured origin', async () => {
  const production = createApp(store, { production: true, origin: 'https://concourse.example' });
  await new Promise<void>(done => production.listen(0, '127.0.0.1', done));
  const address = production.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${url}/api/demo-users`)).status, 404);
    assert.equal((await fetch(`${url}/api/session/demo`, { method: 'POST', headers: { Origin: 'https://concourse.example', 'Content-Type': 'application/json' }, body: '{"userId":"pm-01"}' })).status, 404);
    const developmentCookie = await login('pm-01');
    assert.equal((await fetch(`${url}/api/session`, { headers: { Cookie: developmentCookie } })).status, 401);
  } finally { await new Promise<void>(done => production.close(() => done())); }
  const unconfigured = createApp(store, { production: true });
  await new Promise<void>(done => unconfigured.listen(0, '127.0.0.1', done));
  const secondAddress = unconfigured.address();
  assert.ok(secondAddress && typeof secondAddress !== 'string');
  const secondUrl = `http://127.0.0.1:${secondAddress.port}`;
  try {
    assert.equal((await fetch(`${secondUrl}/api/session/demo`, { method: 'POST', headers: { Origin: secondUrl, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  } finally { await new Promise<void>(done => unconfigured.close(() => done())); }
});

test('built client serving is optional and path traversal cannot expose files outside its root', async () => {
  const response = await fetch(`${base}/backlog`);
  assert.equal(response.status, 200); assert.match(await response.text(), /Fixture app/);
  // A raw request preserves the traversal spelling that URL clients normalize.
  const status = await new Promise<number>((done, reject) => {
    const req = httpRequest(`${base}/%5c..%5c..%5cpackage.json`, result => { result.resume(); done(result.statusCode!); });
    req.on('error', reject); req.end();
  });
  assert.equal(status, 404);
});

test('response schema is maintained when the database is unavailable', async () => {
  const closed = new Store(':memory:');
  const unhealthy = createApp(closed);
  closed.close();
  await new Promise<void>(done => unhealthy.listen(0, '127.0.0.1', done));
  const address = unhealthy.address();
  assert.ok(address && typeof address !== 'string');
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(response.status, 500);
    assert.equal((await response.json() as Envelope).error.code, 'INTERNAL_ERROR');
  } finally { await new Promise<void>(done => unhealthy.close(() => done())); }
});
