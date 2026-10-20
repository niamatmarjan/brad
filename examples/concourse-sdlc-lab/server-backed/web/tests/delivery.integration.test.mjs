import assert from 'node:assert/strict'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { api, itemTypes, priorities, request, statuses } from '../src/api.ts'
import { canEdit, itemInput, transitionOptions } from '../src/domain.ts'

const serverRoot = process.env.CONCOURSE_SERVER_ROOT
if (!serverRoot) throw new Error('Set CONCOURSE_SERVER_ROOT to the backend server package (build it first). This suite uses its real SQLite HTTP service, not fixtures.')
const backend = name => import(pathToFileURL(resolve(serverRoot, 'dist', 'src', `${name}.js`)).href)
const { Store, demoUsers } = await backend('database')
const { createApp } = await backend('http')
const { authorizeTransition } = await backend('authorization')
const nativeFetch = globalThis.fetch
let store, server, cookie = '', origin

test.before(async () => {
  store = new Store(':memory:')
  store.seed()
  server = createApp(store, { production: false, origin: 'http://127.0.0.1' })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  origin = `http://127.0.0.1:${server.address().port}`
  globalThis.fetch = async (path, init) => {
    const response = await nativeFetch(new URL(path, origin), {
      ...init, headers: { ...init?.headers, Origin: 'http://127.0.0.1', ...(cookie ? { Cookie: cookie } : {}) },
    })
    const nextCookie = response.headers.get('set-cookie')
    if (nextCookie) cookie = nextCookie.split(';')[0]
    return response
  }
})
test.after(async () => {
  globalThis.fetch = nativeFetch
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  store?.close()
})
const form = (type, priority) => {
  const data = new FormData()
  for (const [key, value] of Object.entries({ type, priority, title: 'Browser delivery payload', description: 'Real requirements', criteria: 'A visible outcome', estimate: '0.25', assignee: 'dev-01' })) data.set(key, value)
  return data
}
test('form payloads create all supported type/priority combinations against real SQLite HTTP', async () => {
  const user = await api.signIn('pm-01')
  assert.equal(user.id, 'pm-01')
  const project = await api.createProject({ name: 'Frontend serialization regression', description: '' })
  for (const type of itemTypes) for (const priority of priorities) {
    const input = itemInput(form(type, priority))
    const created = await api.createItem(project.id, input)
    assert.equal(created.type, type)
    assert.equal(created.priority, priority)
    assert.equal(created.estimate, 0.25)
    assert.equal(created.version, 1)
    const updated = await api.updateItem(created, { ...input, estimate: null, assigneeId: null })
    assert.equal(updated.type, type)
    assert.equal(updated.estimate, null)
    assert.equal(updated.assigneeId, null)
    assert.equal(updated.version, 2)
  }
  assert.equal((await api.items(project.id)).length, 12)
})
test('real API rejects the original epic/title-case/immutable-field payloads', async () => {
  const project = await api.createProject({ name: 'Validation negatives', description: '' })
  const valid = itemInput(form('story', 'medium'))
  for (const change of [{ type: 'epic' }, { priority: 'Medium' }, { priority: 'Critical' }, { estimate: 10001 }]) {
    await assert.rejects(request(`/projects/${project.id}/work-items`, 'POST', { ...valid, ...change }), { status: 400, code: 'INVALID_INPUT' })
  }
  const created = await api.createItem(project.id, valid)
  await assert.rejects(request(`/work-items/${created.id}`, 'PATCH', { ...valid, expectedVersion: created.version }), { status: 400, code: 'INVALID_INPUT' })
  const updated = await api.updateItem(created, { title: 'Safe patch without type' })
  await assert.rejects(api.updateItem(created, { title: 'Stale patch' }), { status: 409, code: 'VERSION_CONFLICT' })
  const blocked = await api.transition(updated, 'Blocked')
  assert.equal(blocked.status, 'Blocked')
  await api.signIn('dev-01')
  await assert.rejects(api.updateItem(blocked, { title: 'Developer scope edit' }), { status: 403, code: 'FORBIDDEN' })
  await api.signOut()
})
test('role/state/assignment options exactly match actual server authorization for every status', () => {
  for (const user of demoUsers) for (const status of statuses) for (const assigneeId of ['dev-01', 'dev-02', 'tl-01', null]) {
    const item = { status, assigneeId }
    const allowed = statuses.filter(to => {
      try { authorizeTransition(user, item, to); return true } catch { return false }
    })
    assert.deepEqual(new Set(transitionOptions(user.role, item, user.id)), new Set(allowed), `${user.id}, ${status}, ${assigneeId}`)
    const planningRole = ['product-manager', 'business-analyst', 'delivery-manager', 'solution-architect', 'technical-lead'].includes(user.role)
    assert.equal(canEdit(user.role, item), planningRole && ['Draft', 'Requirements Review', 'Ready', 'Changes Requested', 'Reopened', 'Blocked'].includes(status))
  }
})
