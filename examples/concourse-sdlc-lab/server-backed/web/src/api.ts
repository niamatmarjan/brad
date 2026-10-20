export type Role = 'product-manager' | 'business-analyst' | 'delivery-manager' | 'solution-architect' | 'technical-lead' | 'developer' | 'functional-qa' | 'automation-qa'
export interface User { id: string; name: string; role: Role }
export interface Project { id: string; name: string; description: string; status: string }
export const statuses = ['Draft', 'Requirements Review', 'Ready', 'In Development', 'Code Review', 'Ready for QA', 'In QA', 'Accepted', 'Done', 'Blocked', 'Changes Requested', 'Reopened'] as const
export type Status = typeof statuses[number]
export const itemTypes = ['initiative', 'story', 'task'] as const
export type ItemType = typeof itemTypes[number]
export const priorities = ['urgent', 'high', 'medium', 'low'] as const
export type Priority = typeof priorities[number]
export interface WorkItem {
  id: string; projectId: string; type: ItemType; title: string; description: string
  acceptanceCriteria: string[]; priority: Priority; estimate: number | null
  assigneeId: string | null; dependencies: string[]; status: Status; version: number; updatedAt: string
}
export interface ItemInput {
  type: ItemType; title: string; description: string; acceptanceCriteria: string[]
  priority: Priority; estimate: number | null; assigneeId: string | null; dependencies: string[]
}
export type ItemUpdate = Partial<Omit<ItemInput, 'type'>>
const planningFields = ['title', 'description', 'acceptanceCriteria', 'priority', 'estimate', 'assigneeId', 'dependencies'] as const
function planningPayload(input: ItemUpdate) {
  return Object.fromEntries(planningFields.filter(key => input[key] !== undefined).map(key => [key, input[key]]))
}
export class ApiError extends Error {
  status: number
  code: string
  details: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}
export async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin', signal,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach Concourse. Check that the API service is running, then retry.')
  }
  const envelope = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, envelope?.error?.code ?? 'REQUEST_FAILED', envelope?.error?.message ?? `The request failed (${response.status}). Please retry.`, envelope?.error?.details)
  if (!envelope || !Object.hasOwn(envelope, 'data')) throw new ApiError(response.status, 'INVALID_RESPONSE', 'The API returned an unexpected response. Check the API contract before retrying.')
  return envelope.data as T
}
export const api = {
  session: () => request<User>('/session'),
  demoUsers: () => request<User[]>('/demo-users'),
  signIn: (userId: string) => request<User>('/session/demo', 'POST', { userId }),
  signOut: () => request<unknown>('/session/logout', 'POST'),
  users: () => request<User[]>('/users'),
  projects: () => request<Project[]>('/projects'),
  createProject: (input: { name: string; description: string }) => request<Project>('/projects', 'POST', input),
  items: (id: string, signal?: AbortSignal) => request<WorkItem[]>(`/projects/${encodeURIComponent(id)}/work-items`, 'GET', undefined, signal),
  createItem: (id: string, input: ItemInput) => request<WorkItem>(`/projects/${encodeURIComponent(id)}/work-items`, 'POST', { type: input.type, ...planningPayload(input) }),
  updateItem: (item: WorkItem, input: ItemUpdate) => request<WorkItem>(`/work-items/${encodeURIComponent(item.id)}`, 'PATCH', { ...planningPayload(input), expectedVersion: item.version }),
  transition: (item: WorkItem, to: Status) => request<WorkItem>(`/work-items/${encodeURIComponent(item.id)}/transitions`, 'POST', { to, expectedVersion: item.version }),
  activity: (id: string, signal?: AbortSignal) => request<unknown>(`/projects/${encodeURIComponent(id)}/activity`, 'GET', undefined, signal),
  readiness: (id: string, signal?: AbortSignal) => request<unknown>(`/projects/${encodeURIComponent(id)}/release-readiness`, 'GET', undefined, signal),
}
