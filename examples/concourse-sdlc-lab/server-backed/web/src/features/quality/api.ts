import type {
  Activity, Comment, Defect, DefectInput, ReleaseReadiness, Retest, Review, ReviewInput,
  Snapshot, TestRun, TestRunInput, Transition, User, WorkItem,
} from './types'

export class QualityApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'QualityApiError'
    this.status = status
    this.code = code
  }
}

export async function request<T>(
  path: string, method = 'GET', body?: unknown, signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  })
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new QualityApiError(response.status, 'INVALID_RESPONSE', 'The API did not return JSON. Check the same-origin /api service.')
  }
  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } })?.error
    throw new QualityApiError(response.status, error?.code ?? 'REQUEST_FAILED', error?.message ?? `Request failed (${response.status}).`)
  }
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new QualityApiError(response.status, 'INVALID_RESPONSE', 'The API response is missing its data envelope.')
  }
  return (payload as { data: T }).data
}

const id = encodeURIComponent

async function collection<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const data = await request<T[]>(path, 'GET', undefined, signal)
  if (!Array.isArray(data)) throw new QualityApiError(200, 'INVALID_RESPONSE', `Expected an array from ${path}.`)
  return data
}

async function evidence(item: WorkItem, signal?: AbortSignal): Promise<WorkItem> {
  const result: WorkItem = { ...item, evidenceErrors: {} }
  // Evidence failures remain unknown while the queue and server gate stay usable.
  // Never accept embedded relationships from the project list as evidence.
  delete result.comments; delete result.reviews; delete result.testRuns
  delete result.defects; delete result.transitions
  await Promise.all([
    ['comments', 'comments'], ['reviews', 'reviews'], ['testRuns', 'test-runs'],
    ['defects', 'defects'], ['transitions', 'transitions'],
  ].map(async ([key, route]) => {
    try {
      const records = await collection<Comment | Review | TestRun | Defect | Transition>(`/work-items/${id(item.id)}/${route}`, signal)
      if (key === 'defects') {
        result.defects = await Promise.all((records as Defect[]).map(async defect => {
          try {
            return { ...defect, retests: await collection<Retest>(`/defects/${id(defect.id)}/retests`, signal) }
          } catch (error) {
            if (signal?.aborted || (error instanceof QualityApiError && error.status === 401)) throw error
            return { ...defect, retests: undefined, retestError: errorMessage(error) }
          }
        }))
      } else if (key === 'comments') result.comments = records as Comment[]
      else if (key === 'reviews') result.reviews = records as Review[]
      else if (key === 'testRuns') result.testRuns = records as TestRun[]
      else result.transitions = records as Transition[]
    } catch (error) {
      if (signal?.aborted || (error instanceof QualityApiError && error.status === 401)) throw error
      result.evidenceErrors![key as keyof NonNullable<WorkItem['evidenceErrors']>] = errorMessage(error)
    }
  }))
  return result
}

export const qualityApi = {
  async load(projectId: string, signal?: AbortSignal): Promise<Snapshot> {
    const [user, users, items, activity, readiness] = await Promise.all([
      request<User>('/session', 'GET', undefined, signal),
      request<User[]>('/users', 'GET', undefined, signal),
      request<WorkItem[]>(`/projects/${id(projectId)}/work-items`, 'GET', undefined, signal),
      request<Activity[]>(`/projects/${id(projectId)}/activity`, 'GET', undefined, signal),
      request<ReleaseReadiness>(`/projects/${id(projectId)}/release-readiness`, 'GET', undefined, signal),
    ])
    if (!user?.id || !Array.isArray(users) || !Array.isArray(items) || !Array.isArray(activity)
      || typeof readiness?.ready !== 'boolean' || !Array.isArray(readiness.reasons)
      || !readiness.reasons.every(reason => typeof reason === 'string')
      || !Number.isInteger(readiness.workItemCount) || !Number.isInteger(readiness.blockingDefectCount)) {
      throw new QualityApiError(200, 'INVALID_RESPONSE', 'The API read projection does not match the quality integration contract.')
    }
    return { user, users, items: await Promise.all(items.map(item => evidence(item, signal))), activity, readiness }
  },
  comment: (itemId: string, body: string) =>
    request(`/work-items/${id(itemId)}/comments`, 'POST', { body }),
  review: (itemId: string, input: ReviewInput) =>
    request(`/work-items/${id(itemId)}/reviews`, 'POST', input),
  testRun: (itemId: string, input: TestRunInput) =>
    request(`/work-items/${id(itemId)}/test-runs`, 'POST', input),
  defect: (itemId: string, input: DefectInput) =>
    request(`/work-items/${id(itemId)}/defects`, 'POST', input),
  updateDefect: (defectId: string, expectedVersion: number, status: 'In Progress' | 'Fixed' | 'Reopened') =>
    request(`/defects/${id(defectId)}`, 'PATCH', { expectedVersion, status }),
  retest: (defectId: string, expectedVersion: number, result: 'passed' | 'failed', notes: string) =>
    request(`/defects/${id(defectId)}/retests`, 'POST', { expectedVersion, result, notes }),
  assign: (itemId: string, expectedVersion: number, assigneeId: string | null) =>
    request(`/work-items/${id(itemId)}`, 'PATCH', { expectedVersion, assigneeId }),
  transition: (itemId: string, expectedVersion: number, to: string) =>
    request(`/work-items/${id(itemId)}/transitions`, 'POST', { expectedVersion, to }),
}

export function errorMessage(error: unknown): string {
  if (error instanceof QualityApiError) {
    if (error.status === 401) return 'Your session has expired. Sign in through the application shell, then retry.'
    if (error.status === 403) return `Your role cannot perform this action. ${error.message}`
    if (error.status === 409) return `Conflict: ${error.message} Refresh the latest records before retrying.`
    return `${error.code}: ${error.message}`
  }
  return error instanceof Error ? error.message : 'The request failed. Check your connection and retry.'
}
