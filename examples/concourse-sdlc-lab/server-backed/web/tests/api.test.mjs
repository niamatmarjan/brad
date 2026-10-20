import assert from 'node:assert/strict'
import test from 'node:test'
import { api, ApiError, request } from '../src/api.ts'
import { itemInput } from '../src/domain.ts'

const originalFetch = globalThis.fetch
test.afterEach(() => { globalThis.fetch = originalFetch })
test('requests unwrap data and use same-origin cookies', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/projects')
    assert.equal(init.credentials, 'same-origin')
    assert.equal(init.method, 'GET')
    return Response.json({ data: [{ id: 'p-1' }] })
  }
  assert.deepEqual(await api.projects(), [{ id: 'p-1' }])
})
test('transitions encode IDs and preserve optimistic version', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/work-items/story%2F1/transitions')
    assert.equal(init.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(init.body), { to: 'Code Review', expectedVersion: 7 })
    return Response.json({ data: { version: 8 } })
  }
  assert.deepEqual(await api.transition({ id: 'story/1', version: 7 }, 'Code Review'), { version: 8 })
})
test('edits send expectedVersion and demo sign-in sends exact userId', async () => {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: JSON.parse(init.body) })
    return Response.json({ data: {} })
  }
  await api.updateItem({ id: 's-1', version: 3 }, { title: 'Updated' })
  await api.signIn('dev-02')
  assert.deepEqual(calls, [
    { url: '/api/work-items/s-1', method: 'PATCH', body: { title: 'Updated', expectedVersion: 3 } },
    { url: '/api/session/demo', method: 'POST', body: { userId: 'dev-02' } },
  ])
})
test('server failures retain code, status, and details', async () => {
  for (const status of [400, 401, 403, 404, 409]) {
    globalThis.fetch = async () => Response.json({ error: { code: 'VERSION_CONFLICT', message: 'Changed', details: { version: 4 } } }, { status })
    await assert.rejects(api.projects(), error => error instanceof ApiError && error.status === status && error.code === 'VERSION_CONFLICT' && error.details.version === 4)
  }
})
test('malformed success, non-JSON errors, and network failures are actionable', async () => {
  globalThis.fetch = async () => Response.json({ projects: [] })
  await assert.rejects(api.projects(), { code: 'INVALID_RESPONSE' })
  globalThis.fetch = async () => new Response('offline', { status: 503 })
  await assert.rejects(api.projects(), { code: 'REQUEST_FAILED', status: 503 })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.projects(), { code: 'NETWORK_ERROR', status: 0 })
})
test('abort is preserved so canceled project requests do not report failures', async () => {
  globalThis.fetch = async () => { throw new DOMException('Canceled', 'AbortError') }
  await assert.rejects(request('/projects', 'GET', undefined, new AbortController().signal), { name: 'AbortError' })
})
test('create and update serialize exact delivery fields, excluding immutable type from PATCH', async () => {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: JSON.parse(init.body) })
    return Response.json({ data: {} })
  }
  const data = new FormData()
  for (const [key, value] of Object.entries({ type: 'task', title: ' Implement checkout ', description: ' Delivery scope ', criteria: ' Works with keyboard \nVisible errors', priority: 'urgent', estimate: '', assignee: 'dev-01' })) data.set(key, value)
  data.append('dependencies', 'dependency-1')
  const input = itemInput(data)
  const fields = { title: 'Implement checkout', description: 'Delivery scope', acceptanceCriteria: ['Works with keyboard', 'Visible errors'], priority: 'urgent', estimate: null, assigneeId: 'dev-01', dependencies: ['dependency-1'] }
  await api.createItem('project/1', input)
  await api.updateItem({ id: 'item/1', version: 4 }, { ...input, status: 'Done', projectId: 'other-project', version: 99 })
  assert.deepEqual(calls, [
    { url: '/api/projects/project%2F1/work-items', method: 'POST', body: { type: 'task', ...fields } },
    { url: '/api/work-items/item%2F1', method: 'PATCH', body: { ...fields, expectedVersion: 4 } },
  ])
})
