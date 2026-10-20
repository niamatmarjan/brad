import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Store, databasePath, demoUsers } from '../src/database.js';
import { denied, fixture } from './helpers.js';

const stores: Store[] = [];
const setup = () => { const f = fixture(); stores.push(f.store); return f; };
afterEach(() => { for (const store of stores.splice(0)) store.close(); });

test('migrations are repeatable, seed has exactly the ten contract identities, paths are isolated', () => {
  const root = resolve('.test-data', randomUUID());
  mkdirSync(root, { recursive: true });
  const path = resolve(root, 'persist.sqlite');
  try {
    let store = new Store(path);
    store.seed(); store.seed();
    assert.equal(store.get<{ count: number }>('SELECT COUNT(*) AS count FROM users')!.count, 10);
    assert.deepEqual(store.all('SELECT * FROM users ORDER BY id'), [...demoUsers].sort((a, b) => a.id.localeCompare(b.id)).map(user => Object.assign(Object.create(null) as object, user)));
    store.close();
    store = new Store(path);
    assert.equal(store.all('SELECT * FROM schema_migrations').length, 1);
    assert.equal(store.get<{ journal_mode: string }>('PRAGMA journal_mode')!.journal_mode, 'wal');
    store.close();
    assert.equal(databasePath({ CONCOURSE_DB: path }), path);
    assert.equal(databasePath({ CONCOURSE_WORKTREE: root }), resolve(root, 'server', 'data', 'concourse.sqlite'));
    assert.equal(databasePath({}), fileURLToPath(new URL('../../data/concourse.sqlite', import.meta.url)));
    assert.notEqual(databasePath({ CONCOURSE_WORKTREE: resolve(root, 'a') }), databasePath({ CONCOURSE_WORKTREE: resolve(root, 'b') }));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('project/work-item models enforce roles and malformed input without mutations', () => {
  const f = setup();
  for (const id of ['ba-01', 'arch-01', 'tl-01', 'dev-01', 'dev-02', 'dev-03', 'qa-01', 'qa-02']) {
    denied(() => f.delivery.createProject(f.user(id), { name: 'Denied' }), 403, 'FORBIDDEN');
  }
  for (const id of ['dev-01', 'dev-02', 'dev-03', 'qa-01', 'qa-02']) {
    denied(() => f.delivery.createItem(f.user(id), f.project.id, { type: 'story', title: 'Denied' }), 403, 'FORBIDDEN');
  }
  denied(() => f.delivery.createItem(f.ba, f.project.id, { type: 'unknown', title: 'Invalid' }), 400, 'INVALID_INPUT');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { expectedVersion: 1, version: 900 }), 400, 'INVALID_INPUT');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { expectedVersion: 1, estimate: -1 }), 400, 'INVALID_INPUT');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { expectedVersion: 1, assigneeId: 'missing' }), 400, 'INVALID_INPUT');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { expectedVersion: 1, acceptanceCriteria: [''] }), 400, 'INVALID_INPUT');
  assert.equal(f.current().version, 1);
});

test('patches reject stale or missing versions and preserve the first writer', () => {
  const f = setup();
  f.delivery.updateItem(f.ba, f.item.id, { title: 'First write', expectedVersion: 1 });
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { title: 'Stale write', expectedVersion: 1 }), 409, 'VERSION_CONFLICT');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { title: 'No version' }), 400, 'INVALID_INPUT');
  assert.equal(f.current().title, 'First write');
  assert.equal(f.current().version, 2);
});

test('cross-project, missing, self and cyclic dependencies are rejected', () => {
  const f = setup();
  const second = f.delivery.createItem(f.ba, f.project.id, { type: 'task', title: 'Second', dependencies: [f.item.id] });
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { expectedVersion: 1, dependencies: [second.id] }), 400, 'DEPENDENCY_CYCLE');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { expectedVersion: 1, dependencies: [f.item.id] }), 400, 'INVALID_INPUT');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { expectedVersion: 1, dependencies: ['missing'] }), 400, 'INVALID_INPUT');
  const other = f.delivery.createProject(f.pm, { name: 'Other' });
  denied(() => f.delivery.createItem(f.ba, other.id, { type: 'story', title: 'Cross project', dependencies: [f.item.id] }), 400, 'INVALID_INPUT');
});

test('readiness requires acceptance criteria, approvals, assigned developer and completed dependencies', () => {
  const f = setup();
  f.delivery.updateItem(f.ba, f.item.id, { acceptanceCriteria: [], expectedVersion: 1 });
  denied(() => f.move(f.ba, 'Requirements Review'), 409, 'REQUIREMENTS_INCOMPLETE');
  f.delivery.updateItem(f.ba, f.item.id, { acceptanceCriteria: ['A real criterion'], expectedVersion: f.current().version });
  f.move(f.ba, 'Requirements Review');
  denied(() => f.move(f.ba, 'Ready'), 409, 'REVIEW_REQUIRED');
  f.review(f.pm, 'requirements');
  f.move(f.ba, 'Ready');
  f.delivery.updateItem(f.ba, f.item.id, { assigneeId: null, expectedVersion: f.current().version });
  denied(() => f.move(f.lead, 'In Development'), 409, 'ASSIGNEE_REQUIRED');
  f.delivery.updateItem(f.ba, f.item.id, { assigneeId: f.dev.id, expectedVersion: f.current().version });
  f.move(f.dev, 'In Development');
  denied(() => f.delivery.updateItem(f.ba, f.item.id, { title: 'Scope drift', expectedVersion: f.current().version }), 409, 'ITEM_LOCKED');
});

test('dependencies block starting development even after requirements approval', () => {
  const f = setup();
  const dependency = f.delivery.createItem(f.ba, f.project.id, { type: 'story', title: 'Dependency' });
  f.delivery.updateItem(f.ba, f.item.id, { dependencies: [dependency.id], expectedVersion: 1 });
  f.move(f.ba, 'Requirements Review'); f.review(f.pm, 'requirements'); f.move(f.ba, 'Ready');
  denied(() => f.move(f.dev, 'In Development'), 409, 'DEPENDENCIES_INCOMPLETE');
});

test('role, assignee, self-review, invalid state and stale transitions are enforced', () => {
  const f = setup();
  denied(() => f.move(f.qa, 'In Development'), 403, 'FORBIDDEN');
  denied(() => f.move(f.dev, 'Code Review'), 409, 'INVALID_TRANSITION');
  f.move(f.ba, 'Requirements Review');
  denied(() => f.quality.review(f.dev, f.item.id, { kind: 'requirements', decision: 'approved', expectedVersion: f.current().version }), 403, 'FORBIDDEN');
  f.review(f.pm, 'requirements'); f.move(f.ba, 'Ready');
  denied(() => f.move(f.user('dev-02'), 'In Development'), 403, 'FORBIDDEN');
  f.move(f.dev, 'In Development');
  denied(() => f.delivery.transition(f.dev, f.item.id, { to: 'Code Review', expectedVersion: 1 }), 409, 'VERSION_CONFLICT');
  f.move(f.dev, 'Code Review');
  denied(() => f.move(f.lead, 'Ready for QA'), 409, 'REVIEW_REQUIRED');
  denied(() => f.quality.review(f.dev, f.item.id, { kind: 'code', decision: 'approved', expectedVersion: f.current().version }), 403, 'FORBIDDEN');
});

test('all ten roster accounts have the intended planning/read/comment boundary', () => {
  const f = setup();
  const planningIds = ['pm-01', 'ba-01', 'dm-01', 'arch-01', 'tl-01'];
  for (const account of demoUsers) {
    assert.equal(f.delivery.items(f.project.id).length >= 1, true);
    f.quality.comment(account, f.item.id, { body: `${account.id} comment` });
    if (planningIds.includes(account.id)) {
      assert.equal(f.delivery.createItem(account, f.project.id, { type: 'task', title: `${account.id} planned` }).status, 'Draft');
    } else {
      denied(() => f.delivery.updateItem(account, f.item.id, { title: 'Forbidden edit', expectedVersion: f.current().version }), 403, 'FORBIDDEN');
    }
  }
  assert.equal(f.quality.comments(f.item.id).length, 10);
  assert.equal(f.delivery.createProject(f.user('dm-01'), { name: 'Delivery managed' }).status, 'Active');
});

test('a technical lead cannot approve their own assigned code', () => {
  const f = setup();
  f.delivery.updateItem(f.ba, f.item.id, { assigneeId: f.lead.id, expectedVersion: 1 });
  f.move(f.ba, 'Requirements Review'); f.review(f.pm, 'requirements'); f.move(f.ba, 'Ready');
  f.move(f.lead, 'In Development'); f.move(f.lead, 'Code Review');
  denied(() => f.review(f.lead, 'code'), 403, 'SELF_REVIEW');
  f.review(f.user('arch-01'), 'code');
  f.move(f.lead, 'Ready for QA');
});

test('Blocked/Reopened and Changes Requested cannot bypass requirements review', () => {
  const f = setup();
  f.move(f.ba, 'Blocked'); f.move(f.qa, 'Reopened');
  denied(() => f.move(f.dev, 'In Development'), 409, 'REVIEW_REQUIRED');
  const g = setup();
  g.move(g.ba, 'Requirements Review'); g.review(g.pm, 'requirements', 'changes-requested');
  g.move(g.ba, 'Changes Requested');
  denied(() => g.move(g.dev, 'In Development'), 409, 'REVIEW_REQUIRED');
});

test('a scope edit invalidates requirements approval and records the automatic transition', () => {
  const f = setup();
  f.move(f.ba, 'Requirements Review'); f.review(f.pm, 'requirements'); f.move(f.ba, 'Ready');
  f.delivery.updateItem(f.ba, f.item.id, { title: 'New scope', expectedVersion: f.current().version });
  assert.equal(f.current().status, 'Requirements Review');
  denied(() => f.move(f.ba, 'Ready'), 409, 'REVIEW_REQUIRED');
  f.review(f.pm, 'requirements'); f.move(f.ba, 'Ready'); f.move(f.dev, 'In Development');
});

test('full lifecycle, comment, reviews and current passing evidence make a project release-ready', () => {
  const f = setup();
  assert.equal(f.delivery.readiness(f.project.id).ready, false);
  f.quality.comment(f.dev, f.item.id, { body: 'Discussion is available to every signed-in role.' });
  assert.equal(f.current().version, 1);
  f.inQa();
  denied(() => f.move(f.qa, 'Accepted'), 409, 'QA_EVIDENCE_REQUIRED');
  f.run();
  denied(() => f.move(f.dev, 'Accepted'), 403, 'FORBIDDEN');
  f.move(f.qa, 'Accepted'); f.move(f.pm, 'Done');
  assert.equal(f.delivery.readiness(f.project.id).ready, true);
  assert.equal(f.quality.comments(f.item.id).length, 1);
  assert.equal(f.quality.reviews(f.item.id).length, 2);
  assert.equal(f.delivery.activity(f.project.id).length, 14);
});

test('blocking defects prevent acceptance; only a passing retest closes them and fresh QA restores readiness', () => {
  const f = setup();
  f.inQa(); f.run();
  let defect = f.quality.createDefect(f.qa, f.item.id, { title: 'Blocker', description: 'Journey fails', severity: 'blocking', expectedVersion: f.current().version });
  denied(() => f.move(f.qa, 'Accepted'), 409, 'BLOCKING_DEFECT');
  assert.equal(f.delivery.readiness(f.project.id).blockingDefectCount, 1);
  denied(() => f.quality.updateDefect(f.qa, defect.id, { status: 'Closed', expectedVersion: defect.version }), 409, 'RETEST_REQUIRED');
  denied(() => f.quality.updateDefect(f.qa, defect.id, { severity: 'minor', expectedVersion: defect.version }), 409, 'RETEST_REQUIRED');
  denied(() => f.quality.retest(f.qa, defect.id, { result: 'passed', notes: 'Not fixed', expectedVersion: defect.version }), 409, 'INVALID_STATE');
  denied(() => f.quality.updateDefect(f.user('dev-02'), defect.id, { status: 'Fixed', expectedVersion: defect.version }), 403, 'FORBIDDEN');
  defect = f.quality.updateDefect(f.dev, defect.id, { status: 'Fixed', expectedVersion: defect.version });
  denied(() => f.quality.updateDefect(f.dev, defect.id, { status: 'In Progress', expectedVersion: 1 }), 409, 'VERSION_CONFLICT');
  denied(() => f.quality.retest(f.dev, defect.id, { result: 'passed', notes: 'Self verification', expectedVersion: defect.version }), 403, 'FORBIDDEN');
  f.quality.retest(f.qa, defect.id, { result: 'failed', notes: 'Still failing', expectedVersion: defect.version });
  defect = f.quality.defect(defect.id);
  assert.equal(defect.status, 'Reopened');
  defect = f.quality.updateDefect(f.dev, defect.id, { status: 'Fixed', expectedVersion: defect.version });
  f.quality.retest(f.user('qa-02'), defect.id, { result: 'passed', notes: 'Regression verified', expectedVersion: defect.version });
  assert.equal(f.quality.defect(defect.id).status, 'Closed');
  denied(() => f.quality.retest(f.qa, defect.id, { result: 'passed', notes: 'Stale duplicate', expectedVersion: defect.version }), 409, 'VERSION_CONFLICT');
  denied(() => f.move(f.qa, 'Accepted'), 409, 'QA_EVIDENCE_REQUIRED');
  f.run(); f.move(f.qa, 'Accepted'); f.move(f.pm, 'Done');
  assert.equal(f.delivery.readiness(f.project.id).ready, true);
  assert.equal(f.quality.retests(defect.id).length, 2);
});

test('append evidence rejects stale parent versions and QA mutations reject planning/delivery roles', () => {
  const f = setup();
  f.move(f.ba, 'Requirements Review');
  denied(() => f.quality.review(f.pm, f.item.id, { kind: 'requirements', decision: 'approved', expectedVersion: 1 }), 409, 'VERSION_CONFLICT');
  denied(() => f.quality.comment(f.dev, f.item.id, { body: 'Outdated', expectedVersion: 1 }), 409, 'VERSION_CONFLICT');
  f.review(f.pm, 'requirements'); f.move(f.ba, 'Ready'); f.move(f.dev, 'In Development'); f.move(f.dev, 'Code Review');
  f.review(f.lead, 'code'); f.move(f.lead, 'Ready for QA'); f.move(f.qa, 'In QA');
  denied(() => f.quality.testRun(f.qa, f.item.id, { name: 'Old run', result: 'passed', cases: [{ name: 'Case', result: 'passed' }], expectedVersion: 1 }), 409, 'VERSION_CONFLICT');
  denied(() => f.quality.createDefect(f.qa, f.item.id, { title: 'Stale', description: 'Evidence', severity: 'blocking', expectedVersion: 1 }), 409, 'VERSION_CONFLICT');
  for (const id of ['pm-01', 'ba-01', 'dm-01', 'arch-01', 'tl-01', 'dev-01', 'dev-02', 'dev-03']) {
    denied(() => f.quality.createDefect(f.user(id), f.item.id, {}), 403, 'FORBIDDEN');
  }
});

test('new post-acceptance defects reopen work and invalidate release evidence', () => {
  const f = setup();
  f.inQa(); f.run(); f.move(f.qa, 'Accepted'); f.move(f.pm, 'Done');
  f.quality.createDefect(f.qa, f.item.id, { title: 'Late blocker', description: 'Regression', severity: 'blocking', expectedVersion: f.current().version });
  assert.equal(f.current().status, 'Reopened');
  assert.equal(f.delivery.readiness(f.project.id).ready, false);
  assert.equal(f.delivery.qaPassed(f.item.id), false);
});

test('reopened work needs a new QA run and inconsistent run results are denied', () => {
  const f = setup();
  f.inQa();
  denied(() => f.quality.testRun(f.dev, f.item.id, {}), 403, 'FORBIDDEN');
  denied(() => f.quality.testRun(f.qa, f.item.id, { name: 'False pass', result: 'passed', cases: [{ name: 'Failure', result: 'failed' }], expectedVersion: f.current().version }), 400, 'INVALID_INPUT');
  f.run('failed');
  denied(() => f.move(f.qa, 'Accepted'), 409, 'QA_EVIDENCE_REQUIRED');
  f.run(); f.move(f.qa, 'Accepted'); f.move(f.pm, 'Done'); f.move(f.qa, 'Reopened');
  assert.equal(f.delivery.qaPassed(f.item.id), false);
});

test('audit failure rolls back domain writes; append-only history cannot be altered or deleted', () => {
  const f = setup();
  f.store.db.exec(`CREATE TRIGGER reject_audit BEFORE INSERT ON activity WHEN NEW.kind = 'work-item.updated'
    BEGIN SELECT RAISE(ABORT, 'injected audit failure'); END;`);
  assert.throws(() => f.delivery.updateItem(f.ba, f.item.id, { title: 'Must rollback', expectedVersion: 1 }), /injected audit failure/);
  assert.equal(f.current().title, f.item.title);
  assert.equal(f.current().version, 1);
  for (const table of ['activity', 'transitions', 'comments', 'reviews', 'test_runs', 'retests']) {
    assert.equal(f.store.all(`SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ?`, table).length >= 2, true);
  }
  f.quality.comment(f.qa, f.item.id, { body: 'Immutable' });
  assert.throws(() => f.store.run('DELETE FROM comments'), /immutable record/);
  assert.throws(() => f.store.run("UPDATE activity SET kind = 'forged'"), /immutable record/);
});

test('two independent database connections observe durable versions and reject stale writes', () => {
  const root = resolve('.test-data', randomUUID());
  mkdirSync(root, { recursive: true });
  const path = resolve(root, 'shared.sqlite');
  const f = fixture(path);
  const second = new Store(path);
  try {
    f.delivery.updateItem(f.ba, f.item.id, { title: 'Durable', expectedVersion: 1 });
    assert.equal(second.get<{ title: string }>('SELECT title FROM work_items WHERE id = ?', f.item.id)!.title, 'Durable');
    assert.equal(second.run('UPDATE work_items SET title = ? WHERE id = ? AND version = ?', 'Stale', f.item.id, 1).changes, 0);
  } finally {
    second.close(); f.store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('a restarted store retains projects, work items, sessions and immutable activity', () => {
  const root = resolve('.test-data', randomUUID());
  mkdirSync(root, { recursive: true });
  const path = resolve(root, 'restart.sqlite');
  const f = fixture(path);
  const id = f.item.id, projectId = f.project.id;
  f.quality.comment(f.qa, id, { body: 'Persist this evidence' });
  f.store.run('INSERT INTO sessions (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
    'restart-fixture-hash', f.pm.id, new Date().toISOString(), '2099-01-01T00:00:00.000Z');
  f.store.close();
  const restarted = new Store(path);
  try {
    assert.equal(restarted.get<{ title: string }>('SELECT title FROM work_items WHERE id = ?', id)!.title, 'Deliver the story');
    assert.equal(restarted.get<{ name: string }>('SELECT name FROM projects WHERE id = ?', projectId)!.name, 'Test project');
    assert.equal(restarted.all('SELECT * FROM sessions').length, 1);
    assert.equal(restarted.all('SELECT * FROM comments').length, 1);
    assert.equal(restarted.all('SELECT * FROM activity').length, 3);
  } finally { restarted.close(); rmSync(root, { recursive: true, force: true }); }
});
