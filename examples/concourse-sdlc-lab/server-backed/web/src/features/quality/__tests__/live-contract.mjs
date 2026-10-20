// Opt-in real HTTP verification. Pass a built DEV-01 server directory as argv[2].
// Uses an in-memory SQLite database and an ephemeral loopback port; no host data.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'

if (!process.argv[2]) throw new Error('Usage: node <live-contract.mjs> <built server directory>')
const serverRoot = resolve(process.argv[2])
const { Store } = await import(pathToFileURL(resolve(serverRoot, 'dist', 'src', 'database.js')).href)
const { createApp } = await import(pathToFileURL(resolve(serverRoot, 'dist', 'src', 'http.js')).href)
const source = await readFile(new URL('../api.ts', import.meta.url), 'utf8')
const compiled = stripTypeScriptTypes(source)
const { qualityApi, request } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const store = new Store(':memory:')
store.seed()
const app = createApp(store)
const nativeFetch = globalThis.fetch
let cookie = ''
try {
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.address().port}`
  globalThis.fetch = async (path, init = {}) => {
    const response = await nativeFetch(new URL(path, origin), {
      ...init, headers: { ...init.headers, Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) cookie = setCookie.split(';')[0]
    return response
  }
  const login = userId => request('/session/demo', 'POST', { userId })
  await assert.rejects(request('/session'), error => error.status === 401)
  await login('pm-01')
  const project = await request('/projects', 'POST', { name: 'Adapter contract verification', description: 'Isolated HTTP check' })
  let item = await request(`/projects/${project.id}/work-items`, 'POST', {
    type: 'story', title: 'Verify checkout', description: 'Customer receives a receipt',
    acceptanceCriteria: ['Receipt is visible'], assigneeId: 'dev-01',
  })
  const current = async () => { item = await request(`/work-items/${item.id}`); return item }
  const move = async to => { await current(); await qualityApi.transition(item.id, item.version, to) }
  await move('Requirements Review')
  await current()
  await qualityApi.review(item.id, { kind: 'requirements', decision: 'approved', body: 'Requirements checked', expectedVersion: item.version })
  await move('Ready')
  await login('dev-01')
  await move('In Development')
  await move('Code Review')
  await login('tl-01')
  await current()
  await qualityApi.review(item.id, { kind: 'code', decision: 'approved', body: 'Code checked', expectedVersion: item.version })
  await move('Ready for QA')
  await login('qa-01')
  await move('In QA')
  const run = async result => {
    await current()
    await qualityApi.testRun(item.id, {
      name: 'Payment verification', result, cases: [{ name: 'Valid card produces receipt', result }],
      notes: 'Submit valid card; expected receipt', expectedVersion: item.version,
    })
  }
  await run('failed')
  await current()
  let defect = await qualityApi.defect(item.id, {
    title: 'Receipt missing', description: 'Pay with valid card; receipt missing',
    severity: 'blocking', expectedVersion: item.version,
  })
  let snapshot = await qualityApi.load(project.id)
  assert.equal(snapshot.items[0].testRuns[0].result, 'failed')
  assert.equal(snapshot.items[0].defects[0].severity, 'blocking')
  assert.equal(snapshot.readiness.blockingDefectCount, 1)
  assert.equal(snapshot.readiness.ready, false)
  assert.ok(snapshot.readiness.reasons.length)
  await current()
  await assert.rejects(qualityApi.transition(item.id, item.version, 'Accepted'), error => error.code === 'BLOCKING_DEFECT')
  await assert.rejects(qualityApi.retest(defect.id, defect.version, 'passed', 'Too early'), error => error.code === 'INVALID_STATE')
  await login('dev-01')
  defect = await qualityApi.updateDefect(defect.id, defect.version, 'Fixed')
  await assert.rejects(qualityApi.updateDefect(defect.id, defect.version - 1, 'Fixed'), error => error.code === 'VERSION_CONFLICT')
  await login('qa-01')
  let retest = await qualityApi.retest(defect.id, defect.version, 'failed', 'Receipt still missing')
  assert.equal(retest.defect.status, 'Reopened')
  defect = retest.defect
  await login('dev-01')
  defect = await qualityApi.updateDefect(defect.id, defect.version, 'Fixed')
  await login('qa-01')
  retest = await qualityApi.retest(defect.id, defect.version, 'passed', 'Receipt verified')
  assert.equal(retest.defect.status, 'Closed')
  await run('passed')
  await qualityApi.comment(item.id, 'Retest verified')
  await move('Accepted')
  await login('pm-01')
  await move('Done')
  snapshot = await qualityApi.load(project.id)
  assert.equal(snapshot.readiness.ready, true)
  assert.deepEqual(snapshot.readiness.reasons, [])
  assert.equal(snapshot.items[0].defects[0].retests.length, 2)
  assert.equal(snapshot.items[0].reviews.length, 2)
  assert.equal(snapshot.items[0].testRuns.length, 2)
  assert.equal(snapshot.items[0].comments[0].body, 'Retest verified')
  assert.ok(snapshot.items[0].transitions.length)
  assert.ok(snapshot.activity.some(entry => entry.kind === 'defect.retested' && entry.details.result === 'passed'))
  console.log('PASS: real DEV-01 HTTP adapter lifecycle, separate evidence GETs, readiness, 401, stale versions, blocker and invalid retest errors')
} finally {
  globalThis.fetch = nativeFetch
  await new Promise(resolve => app.close(resolve))
  store.close()
}
