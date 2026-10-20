import { randomUUID } from 'node:crypto';
import { authorize, deliveryActor, planners, qaRoles } from './authorization.js';
import { Delivery } from './delivery.js';
import { fail } from './errors.js';
import type { Defect, Input, User } from './model.js';
import { choice, fields, object, text, version } from './validation.js';

export class Quality {
  constructor(private readonly delivery: Delivery) {}
  private get store() { return this.delivery.store; }
  comments(id: string) {
    this.delivery.item(id);
    return this.store.all('SELECT * FROM comments WHERE workItemId = ? ORDER BY rowid', id);
  }
  comment(user: User, id: string, input: Input) {
    fields(input, ['body', 'expectedVersion']);
    const body = text(input.body, 'body', 10000);
    return this.store.transaction(() => {
      const item = this.delivery.item(id);
      if (input.expectedVersion !== undefined) version(input.expectedVersion, item.version);
      const commentId = randomUUID();
      this.store.run('INSERT INTO comments (id, workItemId, actorId, body, createdAt) VALUES (?, ?, ?, ?, ?)',
        commentId, id, user.id, body, new Date().toISOString());
      this.store.audit(user.id, 'comment.created', commentId, { body }, item.projectId, id);
      return this.store.get('SELECT * FROM comments WHERE id = ?', commentId)!;
    });
  }
  reviews(id: string) {
    this.delivery.item(id);
    return this.store.all('SELECT * FROM reviews WHERE workItemId = ? ORDER BY rowid', id);
  }
  review(user: User, id: string, input: Input) {
    fields(input, ['kind', 'decision', 'body', 'expectedVersion']);
    const kind = choice(input.kind, ['requirements', 'code'], 'kind');
    const decision = choice(input.decision, ['approved', 'changes-requested'], 'decision');
    const body = text(input.body ?? '', 'body', 10000, true);
    authorize(user, kind === 'code' ? ['technical-lead', 'solution-architect'] : planners);
    return this.store.transaction(() => {
      const item = this.delivery.item(id);
      version(input.expectedVersion, item.version);
      if (item.status !== (kind === 'code' ? 'Code Review' : 'Requirements Review')) {
        fail(409, 'INVALID_STATE', 'Reviews are only allowed in the matching review state.');
      }
      if (kind === 'code' && item.assigneeId === user.id) fail(403, 'SELF_REVIEW', 'Code review must be performed by someone other than the assignee.');
      if (decision === 'approved') this.delivery.checkRequirements(item);
      const reviewId = randomUUID();
      this.delivery.bump(id);
      this.store.run(`INSERT INTO reviews (id, workItemId, actorId, kind, decision, body, itemVersion, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, reviewId, id, user.id, kind, decision, body, item.version + 1, new Date().toISOString());
      this.store.audit(user.id, 'review.created', reviewId, { kind, decision, version: item.version + 1 }, item.projectId, id);
      return { ...this.store.get<Record<string, unknown>>('SELECT * FROM reviews WHERE id = ?', reviewId)!, workItemVersion: item.version + 1 };
    });
  }
  testRuns(id: string) {
    this.delivery.item(id);
    return this.store.all<Record<string, unknown>>('SELECT * FROM test_runs WHERE workItemId = ? ORDER BY rowid', id)
      .map(run => ({ ...run, cases: JSON.parse(run.cases as string) as unknown }));
  }
  testRun(user: User, id: string, input: Input) {
    authorize(user, qaRoles);
    fields(input, ['name', 'result', 'cases', 'notes', 'expectedVersion']);
    const name = text(input.name, 'name', 300);
    const result = choice(input.result, ['passed', 'failed', 'blocked'], 'result');
    const notes = text(input.notes ?? '', 'notes', 10000, true);
    if (!Array.isArray(input.cases) || !input.cases.length || input.cases.length > 200) {
      fail(400, 'INVALID_INPUT', 'cases must contain between 1 and 200 test cases.');
    }
    const cases = input.cases.map(value => {
      const entry = object(value);
      fields(entry, ['name', 'result']);
      return { name: text(entry.name, 'case.name', 300), result: choice(entry.result, ['passed', 'failed', 'blocked'], 'case.result') };
    });
    const actual = cases.some(entry => entry.result === 'failed') ? 'failed' : cases.some(entry => entry.result === 'blocked') ? 'blocked' : 'passed';
    if (actual !== result) fail(400, 'INVALID_INPUT', 'Run result must match the test case outcomes.');
    return this.store.transaction(() => {
      const item = this.delivery.item(id);
      version(input.expectedVersion, item.version);
      if (item.status !== 'In QA') fail(409, 'INVALID_STATE', 'Test runs require the In QA state.');
      const runId = randomUUID();
      this.delivery.bump(id);
      this.store.run(`INSERT INTO test_runs (id, workItemId, actorId, name, result, cases, notes, itemVersion, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, runId, id, user.id, name, result, JSON.stringify(cases), notes, item.version + 1, new Date().toISOString());
      this.store.audit(user.id, 'test-run.created', runId, { result, version: item.version + 1 }, item.projectId, id);
      return { ...this.store.get<Record<string, unknown>>('SELECT * FROM test_runs WHERE id = ?', runId)!, cases, workItemVersion: item.version + 1 };
    });
  }
  defect(id: string): Defect {
    return this.store.get<Defect>('SELECT * FROM defects WHERE id = ?', id) ?? fail(404, 'NOT_FOUND', 'Defect not found.');
  }
  defects(id: string): Defect[] {
    this.delivery.item(id);
    return this.store.all<Defect>('SELECT * FROM defects WHERE workItemId = ? ORDER BY rowid', id);
  }
  createDefect(user: User, id: string, input: Input): Defect {
    authorize(user, qaRoles);
    fields(input, ['title', 'description', 'severity', 'expectedVersion']);
    const title = text(input.title, 'title', 300);
    const description = text(input.description, 'description', 10000);
    const severity = choice(input.severity, ['blocking', 'critical', 'major', 'minor'], 'severity');
    return this.store.transaction(() => {
      const item = this.delivery.item(id);
      version(input.expectedVersion, item.version);
      if (!['Ready for QA', 'In QA', 'Accepted', 'Done', 'Reopened'].includes(item.status)) fail(409, 'INVALID_STATE', 'Defects require an item delivered for QA.');
      const defectId = randomUUID(), now = new Date().toISOString();
      this.store.run(`INSERT INTO defects (id, workItemId, title, description, severity, status, createdBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?)`, defectId, id, title, description, severity, user.id, now, now);
      this.delivery.invalidateForDefect(user, item);
      this.store.audit(user.id, 'defect.created', defectId, { severity, version: item.version + 1 }, item.projectId, id);
      return this.defect(defectId);
    });
  }
  updateDefect(user: User, id: string, input: Input): Defect {
    fields(input, ['status', 'title', 'description', 'severity', 'expectedVersion']);
    return this.store.transaction(() => {
      const existing = this.defect(id);
      const item = this.delivery.item(existing.workItemId);
      authorize(user, [...qaRoles, 'developer', 'technical-lead']);
      if (user.role === 'developer' || user.role === 'technical-lead') {
        deliveryActor(user, item);
        if (Object.keys(input).some(key => !['status', 'expectedVersion'].includes(key))) fail(403, 'FORBIDDEN', 'Only QA may change defect scope or severity.');
      }
      version(input.expectedVersion, existing.version);
      if (Object.keys(input).length === 1) fail(400, 'INVALID_INPUT', 'Provide at least one field to update.');
      const status = input.status === undefined ? existing.status
        : choice(input.status, ['Open', 'In Progress', 'Fixed', 'Closed', 'Reopened'], 'status');
      if (input.status !== undefined) {
        const allowed: Partial<Record<Defect['status'], readonly Defect['status'][]>> = {
          Open: ['In Progress', 'Fixed'], 'In Progress': ['Fixed'], Reopened: ['In Progress', 'Fixed'], Closed: ['Reopened'],
        };
        if (status === 'Closed') fail(409, 'RETEST_REQUIRED', 'Only a passing QA retest can close a defect.');
        if (!allowed[existing.status]?.includes(status)) fail(409, 'INVALID_TRANSITION', `Cannot move defect from ${existing.status} to ${status}.`);
        if (status === 'Reopened') authorize(user, qaRoles);
        else deliveryActor(user, item);
      }
      const title = input.title === undefined ? existing.title : text(input.title, 'title', 300);
      const description = input.description === undefined ? existing.description : text(input.description, 'description', 10000);
      const severity = input.severity === undefined ? existing.severity : choice(input.severity, ['blocking', 'critical', 'major', 'minor'], 'severity');
      if (existing.severity === 'blocking' && severity !== 'blocking' && existing.status !== 'Closed') {
        fail(409, 'RETEST_REQUIRED', 'An open blocking defect cannot be downgraded to bypass retesting.');
      }
      this.store.run(`UPDATE defects SET title = ?, description = ?, severity = ?, status = ?, version = version + 1,
        updatedAt = ? WHERE id = ? AND version = ?`, title, description, severity, status, new Date().toISOString(), id, existing.version);
      this.delivery.invalidateForDefect(user, item);
      const updated = this.defect(id);
      this.store.audit(user.id, 'defect.updated', id, { before: existing, after: updated, version: item.version + 1 }, item.projectId, item.id);
      return updated;
    });
  }
  retests(id: string) {
    this.defect(id);
    return this.store.all('SELECT * FROM retests WHERE defectId = ? ORDER BY rowid', id);
  }
  retest(user: User, id: string, input: Input) {
    authorize(user, qaRoles);
    fields(input, ['result', 'notes', 'expectedVersion']);
    const result = choice(input.result, ['passed', 'failed'], 'result');
    const notes = text(input.notes, 'notes', 10000);
    return this.store.transaction(() => {
      const defect = this.defect(id);
      version(input.expectedVersion, defect.version);
      if (defect.status !== 'Fixed') fail(409, 'INVALID_STATE', 'Only a Fixed defect can be retested.');
      const item = this.delivery.item(defect.workItemId);
      const retestId = randomUUID(), now = new Date().toISOString();
      this.store.run(`INSERT INTO retests (id, defectId, actorId, result, notes, defectVersion, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, retestId, id, user.id, result, notes, defect.version + 1, now);
      this.store.run('UPDATE defects SET status = ?, version = version + 1, updatedAt = ? WHERE id = ? AND version = ?',
        result === 'passed' ? 'Closed' : 'Reopened', now, id, defect.version);
      this.delivery.bump(item.id);
      this.store.audit(user.id, 'defect.retested', id, { result, version: item.version + 1 }, item.projectId, item.id);
      return { ...this.store.get<Record<string, unknown>>('SELECT * FROM retests WHERE id = ?', retestId)!, defect: this.defect(id), workItemVersion: item.version + 1 };
    });
  }
}
