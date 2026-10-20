import assert from 'node:assert/strict';
import { Store } from '../src/database.js';
import { Delivery } from '../src/delivery.js';
import { Quality } from '../src/quality.js';
import { ApiError } from '../src/errors.js';
import type { Status, User } from '../src/model.js';

export function fixture(path = ':memory:') {
  const store = new Store(path);
  store.seed();
  const delivery = new Delivery(store), quality = new Quality(delivery);
  const user = (id: string) => store.get<User>('SELECT * FROM users WHERE id = ?', id)!;
  const pm = user('pm-01'), ba = user('ba-01'), dev = user('dev-01'), lead = user('tl-01'), qa = user('qa-01');
  const project = delivery.createProject(pm, { name: 'Test project', description: 'A persisted project' });
  const item = delivery.createItem(ba, project.id, {
    type: 'story', title: 'Deliver the story', description: 'A testable outcome',
    acceptanceCriteria: ['A user can complete the journey'], priority: 'high', assigneeId: dev.id,
  });
  const current = () => delivery.item(item.id);
  const move = (actor: User, to: Status) => delivery.transition(actor, item.id, { to, expectedVersion: current().version });
  const review = (actor: User, kind: 'requirements' | 'code', decision = 'approved') =>
    quality.review(actor, item.id, { kind, decision, expectedVersion: current().version });
  const inQa = () => {
    move(ba, 'Requirements Review');
    review(pm, 'requirements');
    move(ba, 'Ready');
    move(dev, 'In Development');
    move(dev, 'Code Review');
    review(lead, 'code');
    move(lead, 'Ready for QA');
    move(qa, 'In QA');
  };
  const run = (result: 'passed' | 'failed' | 'blocked' = 'passed') => quality.testRun(qa, item.id, {
    name: 'Acceptance suite', result, cases: [{ name: 'Journey', result }], expectedVersion: current().version,
  });
  return { store, delivery, quality, user, pm, ba, dev, lead, qa, project, item, current, move, review, inQa, run };
}

export function denied(fn: () => unknown, status: number, code: string): void {
  assert.throws(fn, error => error instanceof ApiError && error.status === status && error.code === code);
}
