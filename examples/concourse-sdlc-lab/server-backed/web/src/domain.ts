import { itemTypes, priorities } from './api.ts'
import type { ItemInput, ItemType, Priority, Role, Status, WorkItem } from './api.ts'

export const demoIds = ['pm-01', 'ba-01', 'dm-01', 'arch-01', 'tl-01', 'dev-01', 'dev-02', 'dev-03', 'qa-01', 'qa-02']
export const roleName = (role: string) => role.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
export const canPlan = (role: Role) => ['product-manager', 'business-analyst', 'delivery-manager', 'solution-architect', 'technical-lead'].includes(role)
export const canCreateProject = (role: Role) => ['product-manager', 'delivery-manager'].includes(role)
export const canReview = (role: Role) => canPlan(role) || ['functional-qa', 'automation-qa'].includes(role)
export const isReview = (status: Status) => ['Requirements Review', 'Code Review', 'Ready for QA', 'In QA', 'Changes Requested'].includes(status)
export function canEdit(role: Role, item: WorkItem) {
  return canPlan(role) && ['Draft', 'Requirements Review', 'Ready', 'Changes Requested', 'Reopened', 'Blocked'].includes(item.status)
}
const transitions: Record<Status, Status[]> = {
  Draft: ['Requirements Review', 'Blocked'],
  'Requirements Review': ['Ready', 'Changes Requested', 'Blocked'],
  Ready: ['In Development', 'Draft', 'Blocked'],
  'In Development': ['Code Review', 'Blocked'],
  'Code Review': ['Ready for QA', 'Changes Requested', 'Blocked'],
  'Ready for QA': ['In QA', 'Blocked'],
  'In QA': ['Accepted', 'Changes Requested', 'Blocked'],
  Accepted: ['Done', 'Reopened'],
  Done: ['Reopened'],
  Blocked: ['Draft', 'Reopened'],
  'Changes Requested': ['Draft', 'In Development'],
  Reopened: ['In Development', 'Blocked'],
}
export function transitionOptions(role: Role, item: WorkItem, userId: string): Status[] {
  const qa = ['functional-qa', 'automation-qa'].includes(role)
  const delivery = role === 'technical-lead' || (role === 'developer' && item.assigneeId === userId)
  return transitions[item.status].filter(to => {
    if (to === 'Blocked') return canPlan(role) || qa || delivery
    if (to === 'Reopened') return ['product-manager', 'delivery-manager', 'technical-lead'].includes(role) || qa
    if (to === 'Done') return canCreateProject(role)
    if (['Draft', 'Requirements Review', 'Ready'].includes(to)) return canPlan(role)
    if (['In Development', 'Code Review'].includes(to)) return delivery
    if (to === 'Ready for QA') return ['technical-lead', 'solution-architect'].includes(role)
    if (to === 'In QA' || to === 'Accepted') return qa
    if (to === 'Changes Requested') return item.status === 'In QA' ? qa
      : item.status === 'Code Review' ? ['technical-lead', 'solution-architect'].includes(role) : canPlan(role)
    return false
  })
}
export function itemInput(data: FormData, existingType?: ItemType): ItemInput {
  const type = existingType ?? String(data.get('type')) as ItemType
  const priority = String(data.get('priority')) as Priority
  if (!itemTypes.includes(type)) throw new Error('Choose initiative, story, or task.')
  if (!priorities.includes(priority)) throw new Error('Choose urgent, high, medium, or low priority.')
  const title = String(data.get('title') ?? '').trim()
  const description = String(data.get('description') ?? '').trim()
  if (!title) throw new Error('Enter a work item title.')
  const acceptanceCriteria = String(data.get('criteria') ?? '').split('\n').map(line => line.trim()).filter(Boolean)
  const dependencies = data.getAll('dependencies').map(String)
  const rawEstimate = String(data.get('estimate') ?? '').trim()
  const estimate = rawEstimate === '' ? null : Number(rawEstimate)
  if (estimate !== null && (!Number.isFinite(estimate) || estimate < 0 || estimate > 10000)) throw new Error('Estimate must be empty or a number between 0 and 10000.')
  return { type, title, description, acceptanceCriteria, priority, estimate, assigneeId: String(data.get('assignee') ?? '') || null, dependencies }
}
export const lanes: { name: string; statuses: Status[] }[] = [
  { name: 'To prepare', statuses: ['Draft', 'Requirements Review', 'Ready'] },
  { name: 'In progress', statuses: ['In Development', 'Reopened'] },
  { name: 'Review & QA', statuses: ['Code Review', 'Ready for QA', 'In QA'] },
  { name: 'Needs attention', statuses: ['Blocked', 'Changes Requested'] },
  { name: 'Complete', statuses: ['Accepted', 'Done'] },
]
export function filterItems(items: WorkItem[], query: string, status: string, assignee: string, type: string) {
  const search = query.trim().toLowerCase()
  return items.filter(item => (!search || `${item.title} ${item.id} ${item.description}`.toLowerCase().includes(search))
    && (!status || item.status === status) && (!assignee || (assignee === 'unassigned' ? !item.assigneeId : item.assigneeId === assignee))
    && (!type || item.type === type))
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please retry.'
}
