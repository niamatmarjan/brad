import assert from 'node:assert/strict'
import test from 'node:test'
import { itemTypes, priorities, statuses } from '../src/api.ts'
import { canCreateProject, canEdit, canPlan, demoIds, filterItems, isReview, itemInput, lanes, transitionOptions } from '../src/domain.ts'

const items = [
  { id: 's-1', title: 'Search customers', description: 'Find by email', status: 'Ready', type: 'story', assigneeId: 'dev-01' },
  { id: 's-2', title: 'Account settings', description: '', status: 'Blocked', type: 'task', assigneeId: null },
]
test('all contract identities are exact and unique', () => {
  assert.deepEqual(demoIds, ['pm-01', 'ba-01', 'dm-01', 'arch-01', 'tl-01', 'dev-01', 'dev-02', 'dev-03', 'qa-01', 'qa-02'])
})
test('every state has exactly one board lane', () => {
  assert.equal(lanes.flatMap(lane => lane.statuses).length, statuses.length)
  for (const status of statuses) assert.equal(lanes.filter(lane => lane.statuses.includes(status)).length, 1)
})
test('search is case insensitive and combines with filters', () => {
  assert.deepEqual(filterItems(items, ' EMAIL ', 'Ready', 'dev-01', 'story'), [items[0]])
  assert.deepEqual(filterItems(items, '', '', 'unassigned', ''), [items[1]])
  assert.deepEqual(filterItems(items, 's-2', 'Ready', '', ''), [])
})
test('planning and assignment permissions do not grant universal edits', () => {
  assert.equal(canCreateProject('developer'), false)
  assert.equal(canCreateProject('product-manager'), true)
  assert.equal(canPlan('business-analyst'), true)
  assert.equal(canEdit('developer', items[0]), false)
  assert.equal(canEdit('functional-qa', items[0]), false)
  for (const role of ['product-manager', 'business-analyst', 'delivery-manager', 'technical-lead', 'solution-architect']) {
    assert.equal(canPlan(role), true)
    assert.equal(canEdit(role, items[0]), true)
    for (const status of ['In Development', 'Code Review', 'Ready for QA', 'In QA', 'Accepted', 'Done']) {
      assert.equal(canEdit(role, { ...items[0], status }), false)
    }
  }
})
test('review and QA queues and role suggestions use contract states', () => {
  assert.equal(isReview('Code Review'), true)
  assert.equal(isReview('Done'), false)
  assert.deepEqual(transitionOptions('functional-qa', { ...items[0], status: 'In QA' }, 'qa-01'), ['Accepted', 'Changes Requested', 'Blocked'])
  assert.deepEqual(transitionOptions('developer', items[0], 'dev-01'), ['In Development', 'Blocked'])
  assert.deepEqual(transitionOptions('developer', items[0], 'dev-02'), [])
  assert.deepEqual(transitionOptions('technical-lead', { ...items[0], status: 'Code Review' }, 'tl-01'), ['Ready for QA', 'Changes Requested', 'Blocked'])
  assert.deepEqual(transitionOptions('business-analyst', { ...items[0], status: 'Accepted' }, 'ba-01'), [])
  assert.deepEqual(transitionOptions('product-manager', { ...items[0], status: 'Accepted' }, 'pm-01'), ['Done', 'Reopened'])
  for (const role of ['product-manager', 'developer', 'functional-qa', 'solution-architect', 'technical-lead']) {
    for (const current of statuses) for (const status of transitionOptions(role, { ...items[0], status: current }, 'dev-01')) assert.ok(statuses.includes(status))
  }
})
const form = (overrides = {}) => {
  const data = new FormData()
  for (const [key, value] of Object.entries({ type: 'story', title: ' A story ', description: ' Requirements ', criteria: ' First outcome \nSecond outcome', priority: 'medium', estimate: '', assignee: '', ...overrides })) data.set(key, value)
  return data
}
test('supported values exactly match delivery validation, not the original inferred contract', () => {
  assert.deepEqual(itemTypes, ['initiative', 'story', 'task'])
  assert.deepEqual(priorities, ['urgent', 'high', 'medium', 'low'])
  for (const type of itemTypes) for (const priority of priorities) {
    assert.equal(itemInput(form({ type, priority })).type, type)
    assert.equal(itemInput(form({ type, priority })).priority, priority)
  }
  for (const type of ['epic', 'Story', 'unknown']) assert.throws(() => itemInput(form({ type })), /Choose initiative, story, or task/)
  for (const priority of ['Medium', 'High', 'Critical', 'critical']) assert.throws(() => itemInput(form({ priority })), /priority/)
})
test('form serializes defaults, trimming, null clearing, assignment, and dependencies exactly', () => {
  assert.deepEqual(itemInput(form()), {
    type: 'story', title: 'A story', description: 'Requirements', acceptanceCriteria: ['First outcome', 'Second outcome'],
    priority: 'medium', estimate: null, assigneeId: null, dependencies: [],
  })
  const data = form({ estimate: '0.25', assignee: 'dev-02' })
  data.append('dependencies', 'item-1')
  assert.deepEqual(itemInput(data), { ...itemInput(form()), estimate: 0.25, assigneeId: 'dev-02', dependencies: ['item-1'] })
  data.delete('type')
  assert.equal(itemInput(data, 'task').type, 'task')
})
test('estimate accepts the server range including fractional values and rejects invalid values', () => {
  for (const value of ['0', '0.25', '10000']) assert.equal(itemInput(form({ estimate: value })).estimate, Number(value))
  for (const value of ['-1', '10000.1', 'NaN', 'Infinity']) assert.throws(() => itemInput(form({ estimate: value })), /Estimate/)
})
