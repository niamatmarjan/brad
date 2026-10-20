import { randomUUID } from 'node:crypto';
import { Store } from './database.js';
import { authorize, authorizeTransition, planners } from './authorization.js';
import { fail } from './errors.js';
import { statuses, type Input, type Project, type User, type WorkItem } from './model.js';
import { choice, estimate, fields, strings, text, version } from './validation.js';

type StoredItem = Omit<WorkItem, 'acceptanceCriteria' | 'dependencies'> & { acceptanceCriteria: string; dependencies: string };

export class Delivery {
  constructor(readonly store: Store) {}
  project(id: string): Project {
    return this.store.get<Project>('SELECT * FROM projects WHERE id = ?', id)
      ?? fail(404, 'NOT_FOUND', 'Project not found.');
  }
  projects(): Project[] { return this.store.all<Project>('SELECT * FROM projects ORDER BY createdAt, id'); }
  createProject(user: User, input: Input): Project {
    authorize(user, ['product-manager', 'delivery-manager']);
    fields(input, ['name', 'description']);
    const id = randomUUID(), now = new Date().toISOString();
    const name = text(input.name, 'name', 200), description = text(input.description ?? '', 'description', 10000, true);
    return this.store.transaction(() => {
      this.store.run('INSERT INTO projects (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', id, name, description, now, now);
      this.store.audit(user.id, 'project.created', id, { name }, id);
      return this.project(id);
    });
  }
  item(id: string): WorkItem {
    const row = this.store.get<StoredItem>('SELECT * FROM work_items WHERE id = ?', id);
    if (!row) fail(404, 'NOT_FOUND', 'Work item not found.');
    return { ...row, acceptanceCriteria: JSON.parse(row.acceptanceCriteria) as string[], dependencies: JSON.parse(row.dependencies) as string[] };
  }
  items(projectId: string): WorkItem[] {
    this.project(projectId);
    return this.store.all<{ id: string }>('SELECT id FROM work_items WHERE projectId = ? ORDER BY createdAt, id', projectId).map(row => this.item(row.id));
  }
  private validateRelations(item: WorkItem): void {
    if (item.assigneeId && !this.store.get('SELECT id FROM users WHERE id = ?', item.assigneeId)) {
      fail(400, 'INVALID_INPUT', 'assigneeId must identify a roster user.');
    }
    for (const dependency of item.dependencies) {
      if (dependency === item.id) fail(400, 'INVALID_INPUT', 'A work item cannot depend on itself.');
      const row = this.store.get<{ projectId: string }>('SELECT projectId FROM work_items WHERE id = ?', dependency);
      if (!row || row.projectId !== item.projectId) fail(400, 'INVALID_INPUT', 'Dependencies must exist in the same project.');
      const visited = new Set<string>();
      const visit = (id: string): void => {
        if (id === item.id) fail(400, 'DEPENDENCY_CYCLE', 'Dependencies must not contain a cycle.');
        if (visited.has(id)) return;
        visited.add(id);
        for (const next of this.item(id).dependencies) visit(next);
      };
      visit(dependency);
    }
  }
  private values(input: Input, existing: WorkItem): WorkItem {
    return {
      ...existing,
      type: input.type === undefined ? existing.type : choice(input.type, ['initiative', 'story', 'task'], 'type'),
      title: input.title === undefined ? existing.title : text(input.title, 'title', 300),
      description: input.description === undefined ? existing.description : text(input.description, 'description', 10000, true),
      acceptanceCriteria: input.acceptanceCriteria === undefined ? existing.acceptanceCriteria : strings(input.acceptanceCriteria, 'acceptanceCriteria'),
      priority: input.priority === undefined ? existing.priority : choice(input.priority, ['urgent', 'high', 'medium', 'low'], 'priority'),
      estimate: input.estimate === undefined ? existing.estimate : estimate(input.estimate),
      assigneeId: input.assigneeId === undefined ? existing.assigneeId : input.assigneeId === null ? null : text(input.assigneeId, 'assigneeId', 100),
      dependencies: input.dependencies === undefined ? existing.dependencies : strings(input.dependencies, 'dependencies'),
    };
  }
  createItem(user: User, projectId: string, input: Input): WorkItem {
    authorize(user, planners);
    fields(input, ['type', 'title', 'description', 'acceptanceCriteria', 'priority', 'estimate', 'assigneeId', 'dependencies']);
    const now = new Date().toISOString();
    const item = this.values(input, {
      id: randomUUID(), projectId, type: choice(input.type, ['initiative', 'story', 'task'], 'type'),
      title: text(input.title, 'title', 300), description: '', acceptanceCriteria: [], priority: 'medium',
      estimate: null, assigneeId: null, dependencies: [], status: 'Draft', version: 1,
      createdBy: user.id, createdAt: now, updatedAt: now,
    });
    return this.store.transaction(() => {
      this.project(projectId);
      this.validateRelations(item);
      this.store.run(`INSERT INTO work_items
        (id, projectId, type, title, description, acceptanceCriteria, priority, estimate, assigneeId, dependencies, status, createdBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id, projectId, item.type, item.title, item.description, JSON.stringify(item.acceptanceCriteria),
      item.priority, item.estimate, item.assigneeId, JSON.stringify(item.dependencies), item.status, user.id, now, now);
      this.store.audit(user.id, 'work-item.created', item.id, item, projectId, item.id);
      return this.item(item.id);
    });
  }
  updateItem(user: User, id: string, input: Input): WorkItem {
    authorize(user, planners);
    fields(input, ['title', 'description', 'acceptanceCriteria', 'priority', 'estimate', 'assigneeId', 'dependencies', 'expectedVersion']);
    return this.store.transaction(() => {
      const existing = this.item(id);
      version(input.expectedVersion, existing.version);
      if (!['Draft', 'Requirements Review', 'Ready', 'Changes Requested', 'Reopened', 'Blocked'].includes(existing.status)) {
        fail(409, 'ITEM_LOCKED', 'Return the item to planning before editing its scope.');
      }
      if (Object.keys(input).length === 1) fail(400, 'INVALID_INPUT', 'Provide at least one field to update.');
      const item = this.values(input, existing);
      this.validateRelations(item);
      if (item.status === 'Ready') this.checkRequirements(item);
      // Scope changes invalidate review evidence; Ready returns to requirements review.
      const scopeChanged = ['title', 'description', 'acceptanceCriteria', 'dependencies'].some(key => key in input);
      if (scopeChanged && item.status === 'Ready') item.status = 'Requirements Review';
      const result = this.store.run(`UPDATE work_items SET title = ?, description = ?, acceptanceCriteria = ?, priority = ?,
        estimate = ?, assigneeId = ?, dependencies = ?, status = ?, version = version + 1, updatedAt = ? WHERE id = ? AND version = ?`,
      item.title, item.description, JSON.stringify(item.acceptanceCriteria), item.priority, item.estimate,
      item.assigneeId, JSON.stringify(item.dependencies), item.status, new Date().toISOString(), id, existing.version);
      if (result.changes !== 1) fail(409, 'VERSION_CONFLICT', 'This record changed. Refresh and try again.');
      if (existing.status !== item.status) this.history(user, existing, item.status);
      this.store.audit(user.id, 'work-item.updated', id, { before: existing, after: this.item(id), scopeChanged }, item.projectId, id);
      return this.item(id);
    });
  }
  checkRequirements(item: WorkItem): void {
    if (!item.description.trim() || !item.acceptanceCriteria.length) {
      fail(409, 'REQUIREMENTS_INCOMPLETE', 'A description and at least one acceptance criterion are required.');
    }
  }
  hasBlockers(id: string): boolean {
    return !!this.store.get('SELECT id FROM defects WHERE workItemId = ? AND severity = ? AND status <> ? LIMIT 1', id, 'blocking', 'Closed');
  }
  qaPassed(id: string): boolean {
    const latest = this.store.get<{ result: string; itemVersion: number }>('SELECT result, itemVersion FROM test_runs WHERE workItemId = ? ORDER BY rowid DESC LIMIT 1', id);
    const item = this.item(id);
    const invalidation = this.store.get<{ version: number }>(`SELECT COALESCE(MAX(itemVersion), 0) AS version FROM transitions
      WHERE workItemId = ? AND toStatus IN ('In Development','In QA','Reopened','Changes Requested')`, id)!.version;
    const defectInvalidation = this.store.get<{ version: number }>(`SELECT COALESCE(MAX(json_extract(details, '$.version')), 0) AS version
      FROM activity WHERE workItemId = ? AND kind IN ('defect.created','defect.updated','defect.retested')`, id)!.version;
    return latest?.result === 'passed' && latest.itemVersion >= Math.max(invalidation, defectInvalidation) && item.version >= latest.itemVersion;
  }
  transition(user: User, id: string, input: Input): WorkItem {
    fields(input, ['to', 'expectedVersion']);
    const to = choice(input.to, statuses, 'to');
    return this.store.transaction(() => {
      const item = this.item(id);
      version(input.expectedVersion, item.version);
      authorizeTransition(user, item, to);
      if (['Requirements Review', 'Ready', 'In Development', 'Accepted', 'Done'].includes(to)) this.checkRequirements(item);
      if (to === 'In Development') {
        const approval = this.store.get<{ itemVersion: number; decision: string }>(
          "SELECT itemVersion, decision FROM reviews WHERE workItemId = ? AND kind = 'requirements' ORDER BY rowid DESC LIMIT 1", id);
        const scopeVersion = this.store.get<{ version: number }>(`SELECT COALESCE(MAX(json_extract(details, '$.after.version')), 0) AS version
          FROM activity WHERE workItemId = ? AND kind = 'work-item.updated' AND json_extract(details, '$.scopeChanged') = 1`, id)!.version;
        if (!approval || approval.decision !== 'approved' || approval.itemVersion < scopeVersion) {
          fail(409, 'REVIEW_REQUIRED', 'An approved review of the current requirements is required before development.');
        }
        if (!item.assigneeId) fail(409, 'ASSIGNEE_REQUIRED', 'Assign a developer before starting development.');
        const assignee = this.store.get<User>('SELECT * FROM users WHERE id = ?', item.assigneeId)!;
        if (!['developer', 'technical-lead'].includes(assignee.role)) fail(409, 'ASSIGNEE_REQUIRED', 'Delivery work must be assigned to a developer or technical lead.');
        if (item.dependencies.some(dep => this.item(dep).status !== 'Done')) fail(409, 'DEPENDENCIES_INCOMPLETE', 'Dependencies must be Done before development starts.');
      }
      if (to === 'Ready' || to === 'Ready for QA') {
        const kind = to === 'Ready' ? 'requirements' : 'code';
        const review = this.store.get<{ decision: string; itemVersion: number }>(
          'SELECT decision, itemVersion FROM reviews WHERE workItemId = ? AND kind = ? ORDER BY rowid DESC LIMIT 1', id, kind);
        if (!review || review.decision !== 'approved' || review.itemVersion !== item.version) {
          fail(409, 'REVIEW_REQUIRED', `A current approved ${kind} review is required.`);
        }
      }
      if (to === 'Accepted' || to === 'Done') {
        if (this.hasBlockers(id)) fail(409, 'BLOCKING_DEFECT', 'Close blocking defects through a passing retest before acceptance.');
        if (!this.qaPassed(id)) fail(409, 'QA_EVIDENCE_REQUIRED', 'A current passing QA run is required.');
      }
      this.store.run('UPDATE work_items SET status = ?, version = version + 1, updatedAt = ? WHERE id = ? AND version = ?',
        to, new Date().toISOString(), id, item.version);
      this.history(user, item, to);
      this.store.audit(user.id, 'work-item.transitioned', id, { from: item.status, to, version: item.version + 1 }, item.projectId, id);
      return this.item(id);
    });
  }
  private history(user: User, item: WorkItem, to: string): void {
    this.store.run('INSERT INTO transitions (id, workItemId, actorId, fromStatus, toStatus, itemVersion, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      randomUUID(), item.id, user.id, item.status, to, item.version + 1, new Date().toISOString());
  }
  bump(id: string): void {
    this.store.run('UPDATE work_items SET version = version + 1, updatedAt = ? WHERE id = ?', new Date().toISOString(), id);
  }
  invalidateForDefect(user: User, item: WorkItem): void {
    if (item.status === 'Accepted' || item.status === 'Done') {
      this.store.run("UPDATE work_items SET status = 'Reopened' WHERE id = ?", item.id);
      this.history(user, item, 'Reopened');
      this.store.audit(user.id, 'work-item.transitioned', item.id, { from: item.status, to: 'Reopened', reason: 'defect' }, item.projectId, item.id);
    }
    this.bump(item.id);
  }
  readiness(projectId: string): { ready: boolean; reasons: string[]; workItemCount: number; blockingDefectCount: number } {
    const items = this.items(projectId);
    const reasons: string[] = [];
    if (!items.length) reasons.push('The project has no work items.');
    let blockingDefectCount = 0;
    for (const item of items) {
      if (item.status !== 'Done') reasons.push(`${item.id}: status is ${item.status}, not Done.`);
      if (!item.acceptanceCriteria.length || !item.description.trim()) reasons.push(`${item.id}: requirements are incomplete.`);
      if (!this.qaPassed(item.id)) reasons.push(`${item.id}: current passing QA evidence is missing.`);
      blockingDefectCount += this.store.get<{ count: number }>('SELECT COUNT(*) AS count FROM defects WHERE workItemId = ? AND severity = ? AND status <> ?', item.id, 'blocking', 'Closed')!.count;
    }
    if (blockingDefectCount) reasons.push(`${blockingDefectCount} blocking defect(s) remain open.`);
    return { ready: reasons.length === 0, reasons, workItemCount: items.length, blockingDefectCount };
  }
  activity(projectId: string): Record<string, unknown>[] {
    this.project(projectId);
    return this.store.all<Record<string, unknown>>('SELECT * FROM activity WHERE projectId = ? ORDER BY sequence', projectId)
      .map(row => ({ ...row, details: JSON.parse(row.details as string) as unknown }));
  }
}
