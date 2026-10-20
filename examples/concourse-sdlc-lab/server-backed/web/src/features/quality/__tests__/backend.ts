import { vi } from 'vitest'
import type { Defect, Snapshot } from '../types'
import { snapshot } from './fixtures'

export const defect: Defect = {
  id: 'defect-1', workItemId: 'story-1', title: 'Card rejected', severity: 'blocking',
  description: 'Use valid card; expected receipt; actual error.', status: 'Fixed', version: 8,
  createdBy: 'qa-01', createdAt: '2026-10-19', updatedAt: '2026-10-19', retests: [],
}

// Wire-shaped test transport: project lists deliberately omit all relationships.
export function backend(data: Snapshot = snapshot()) {
  const writes: { path: string; method: string; body: Record<string, unknown> }[] = []
  const readOverrides = new Map<string, () => Response>()
  let writeError: { status: number; code: string; message: string } | undefined
  let readFailure = false
  const fetch = vi.fn().mockImplementation(async (path: string, init: RequestInit) => {
    if (init.method !== 'GET') {
      writes.push({ path, method: init.method!, body: JSON.parse(init.body as string) })
      if (writeError) return new Response(JSON.stringify({ error: writeError }), { status: writeError.status })
      return new Response('{"data":{}}')
    }
    if (readFailure) throw new Error('Backend unavailable')
    if (readOverrides.has(path)) return readOverrides.get(path)!()
    let result: unknown
    const relation = /^\/api\/work-items\/([^/]+)\/(comments|reviews|test-runs|defects|transitions)$/.exec(path)
    const retests = /^\/api\/defects\/([^/]+)\/retests$/.exec(path)
    if (path === '/api/session') result = data.user
    else if (path === '/api/users') result = data.users
    else if (path.endsWith('/work-items')) result = data.items.map(item => ({
      ...item, comments: undefined, reviews: undefined, testRuns: undefined, defects: undefined, transitions: undefined,
    }))
    else if (path.endsWith('/activity')) result = data.activity
    else if (path.endsWith('/release-readiness')) result = data.readiness
    else if (relation) {
      const item = data.items.find(item => item.id === decodeURIComponent(relation[1]))
      const key = relation[2] === 'test-runs' ? 'testRuns' : relation[2] as 'comments' | 'reviews' | 'defects' | 'transitions'
      result = key === 'defects' ? item?.defects?.map(defect => ({ ...defect, retests: undefined })) : item?.[key]
    } else if (retests) {
      result = data.items.flatMap(item => item.defects ?? []).find(defect => defect.id === retests[1])?.retests
    }
    if (result === undefined) return new Response('{"error":{"code":"NOT_FOUND","message":"Evidence endpoint unavailable"}}', { status: 404 })
    return new Response(JSON.stringify({ data: result }))
  })
  vi.stubGlobal('fetch', fetch)
  return { data, writes, fetch, readOverrides, failWrite: (error: typeof writeError) => { writeError = error }, failReads: () => { readFailure = true } }
}
