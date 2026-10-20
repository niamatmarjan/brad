import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteTask, canManageTask, filterTasks, getProgress, moveTask } from '../src/domain.mjs';

const task = { id: 'T-1', title: 'Build board', description: 'Kanban', tags: ['ui'], priority: 'high', status: 'backlog', assigneeId: 'dev-1', createdBy: 'pm-1', activity: [] };
const users = {
  developer: { id: 'dev-1', role: 'backend-developer' },
  otherDeveloper: { id: 'dev-2', role: 'frontend-developer' },
  manager: { id: 'pm-1', role: 'product-manager' }
};

test('assignees and elevated roles can manage a task; other contributors cannot', () => {
  assert.equal(canManageTask(users.developer, task), true);
  assert.equal(canManageTask(users.otherDeveloper, task), false);
  assert.equal(canManageTask(users.manager, task), true);
});

test('delete access is narrower than edit access for a non-manager', () => {
  assert.equal(canDeleteTask(users.developer, task), false);
  assert.equal(canDeleteTask(users.manager, task), true);
});

test('moving a task records its state change and rejects unknown states', () => {
  const moved = moveTask([task], task.id, 'review', users.developer, '2026-10-19T10:00:00.000Z');
  assert.equal(moved[0].status, 'review');
  assert.equal(moved[0].activity[0].text, 'Moved to In review');
  assert.equal(moved[0].updatedAt, '2026-10-19T10:00:00.000Z');
  assert.throws(() => moveTask([task], task.id, 'deployed', users.developer), /Unknown task status/);
  assert.throws(() => moveTask([], task.id, 'done', users.developer), /Task not found/);
});

test('search and filters compose without mutating the task list', () => {
  const tasks = [task, { ...task, id: 'T-2', title: 'Write acceptance tests', priority: 'urgent', assigneeId: 'qa-1' }];
  assert.deepEqual(filterTasks(tasks, { query: 'acceptance', priority: 'urgent' }).map(item => item.id), ['T-2']);
  assert.deepEqual(filterTasks(tasks, { assignee: 'dev-1' }).map(item => item.id), ['T-1']);
  assert.equal(tasks.length, 2);
});

test('progress is rounded and empty projects are safe', () => {
  assert.equal(getProgress([]), 0);
  assert.equal(getProgress([{ status: 'done' }, { status: 'backlog' }, { status: 'done' }]), 67);
});
