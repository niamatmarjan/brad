import { afterEach, describe, expect, it, vi } from 'vitest'
import { qualityApi, request } from './api'
import { backend, defect } from './__tests__/backend'
import { snapshot, story } from './__tests__/fixtures'

afterEach(() => vi.unstubAllGlobals())

describe('DEV-01 server wire contract', () => {
  it('sends exact review, run, defect, patch and retest fields and versions', async () => {
    const api = backend()
    await qualityApi.review('story /1', { kind: 'code', decision: 'approved', body: 'Reviewed', expectedVersion: 3 })
    await qualityApi.testRun('s1', { name: 'Checkout', result: 'failed', cases: [{ name: 'Card payment', result: 'failed' }], notes: 'Expected receipt; actual error', expectedVersion: 4 })
    await qualityApi.defect('s1', { title: 'Payment error', description: 'Use valid card', severity: 'blocking', expectedVersion: 5 })
    await qualityApi.updateDefect('d1', 2, 'Fixed')
    await qualityApi.retest('d1', 3, 'passed', 'Verified receipt')
    await qualityApi.assign('s1', 8, 'dev-01')
    await qualityApi.transition('s1', 9, 'In QA')
    await qualityApi.comment('s1', 'Check history')
    expect(api.writes).toEqual([
      { path: '/api/work-items/story%20%2F1/reviews', method: 'POST', body: { kind: 'code', decision: 'approved', body: 'Reviewed', expectedVersion: 3 } },
      { path: '/api/work-items/s1/test-runs', method: 'POST', body: { name: 'Checkout', result: 'failed', cases: [{ name: 'Card payment', result: 'failed' }], notes: 'Expected receipt; actual error', expectedVersion: 4 } },
      { path: '/api/work-items/s1/defects', method: 'POST', body: { title: 'Payment error', description: 'Use valid card', severity: 'blocking', expectedVersion: 5 } },
      { path: '/api/defects/d1', method: 'PATCH', body: { expectedVersion: 2, status: 'Fixed' } },
      { path: '/api/defects/d1/retests', method: 'POST', body: { expectedVersion: 3, result: 'passed', notes: 'Verified receipt' } },
      { path: '/api/work-items/s1', method: 'PATCH', body: { expectedVersion: 8, assigneeId: 'dev-01' } },
      { path: '/api/work-items/s1/transitions', method: 'POST', body: { expectedVersion: 9, to: 'In QA' } },
      { path: '/api/work-items/s1/comments', method: 'POST', body: { body: 'Check history' } },
    ])
    expect(api.fetch.mock.calls.every(call => call[1].credentials === 'same-origin')).toBe(true)
  })

  it('loads relationships from dedicated GETs, including retests and transitions', async () => {
    const data = snapshot({ items: [story({ defects: [defect] })] })
    const api = backend(data)
    const controller = new AbortController()
    const result = await qualityApi.load('project /1', controller.signal)
    expect(result.items[0].defects?.[0].retests).toEqual([])
    expect(result.items[0].transitions).toEqual([])
    expect(result.readiness).toEqual(data.readiness)
    expect(api.fetch.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining([
      '/api/session', '/api/users', '/api/projects/project%20%2F1/work-items',
      '/api/projects/project%20%2F1/activity', '/api/projects/project%20%2F1/release-readiness',
      '/api/work-items/story-1/comments', '/api/work-items/story-1/reviews',
      '/api/work-items/story-1/test-runs', '/api/work-items/story-1/defects',
      '/api/work-items/story-1/transitions', '/api/defects/defect-1/retests',
    ]))
    expect(api.fetch.mock.calls.every(call => call[1].signal === controller.signal)).toBe(true)
  })

  it('never treats failed or malformed relationship reads as empty or embedded success', async () => {
    const api = backend()
    api.readOverrides.set('/api/work-items/story-1/test-runs', () => new Response('{"error":{"code":"UNAVAILABLE","message":"Evidence offline"}}', { status: 503 }))
    api.readOverrides.set('/api/work-items/story-1/comments', () => new Response('{"data":{}}'))
    const result = await qualityApi.load('project-1')
    expect(result.items[0].testRuns).toBeUndefined()
    expect(result.items[0].comments).toBeUndefined()
    expect(result.items[0].evidenceErrors?.testRuns).toContain('Evidence offline')
    expect(result.items[0].evidenceErrors?.comments).toContain('Expected an array')
    expect(result.items[0].reviews).toEqual([])
  })

  it('preserves unknown retests and propagates expired evidence sessions', async () => {
    const api = backend(snapshot({ items: [story({ defects: [defect] })] }))
    api.readOverrides.set('/api/defects/defect-1/retests', () => new Response('{"error":{"code":"NOT_FOUND","message":"Unavailable"}}', { status: 404 }))
    const result = await qualityApi.load('project-1')
    expect(result.items[0].defects?.[0].retests).toBeUndefined()
    expect(result.items[0].defects?.[0].retestError).toContain('Unavailable')
    api.readOverrides.set('/api/work-items/story-1/reviews', () => new Response('{"error":{"code":"UNAUTHENTICATED","message":"Expired"}}', { status: 401 }))
    await expect(qualityApi.load('project-1')).rejects.toMatchObject({ status: 401 })
  })

  it('rejects obsolete readiness blockers projections', async () => {
    const api = backend()
    api.readOverrides.set('/api/projects/project-1/release-readiness', () => new Response('{"data":{"ready":true,"blockers":[]}}'))
    await expect(qualityApi.load('project-1')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it.each([400, 401, 403, 404, 409, 500])('preserves server error envelopes (%i)', async status => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(
      '{"error":{"code":"DOMAIN_ERROR","message":"Action rejected","details":{"currentVersion":4}}}', { status },
    ))))
    await expect(request('/session')).rejects.toMatchObject({ status, code: 'DOMAIN_ERROR', message: 'Action rejected' })
  })

  it('rejects non-JSON, absent data and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => Promise.resolve(new Response('<html>Missing API</html>')))
      .mockImplementationOnce(() => Promise.resolve(new Response('{"items":[]}')))
      .mockRejectedValueOnce(new TypeError('Offline')))
    await expect(request('/session')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    await expect(request('/session')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    await expect(request('/session')).rejects.toThrow('Offline')
  })
})
