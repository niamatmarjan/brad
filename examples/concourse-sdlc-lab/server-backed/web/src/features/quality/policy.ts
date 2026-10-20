import type { StoryStatus, User, WorkItem } from './types'

export const QA_ROLES = ['functional-qa', 'automation-qa']
export const PLANNING_ROLES = ['product-manager', 'business-analyst', 'delivery-manager', 'solution-architect', 'technical-lead']
const edges: Partial<Record<StoryStatus, StoryStatus[]>> = {
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

// Presentation mirrors DEV-01 authorization.ts, not its domain gates.
// Requirements, approvals, dependencies and current QA evidence stay server-owned.
export function workflowTargets(item: WorkItem, user: User): StoryStatus[] {
  const planner = PLANNING_ROLES.includes(user.role)
  const qa = QA_ROLES.includes(user.role)
  const delivery = user.role === 'technical-lead' || (user.role === 'developer' && item.assigneeId === user.id)
  const codeReviewer = ['technical-lead', 'solution-architect'].includes(user.role)
  return (edges[item.status] ?? []).filter(to => {
    if (to === 'Blocked') return planner || qa || delivery
    if (to === 'Reopened') return ['product-manager', 'delivery-manager', 'technical-lead'].includes(user.role) || qa
    if (to === 'Done') return ['product-manager', 'delivery-manager'].includes(user.role)
    if (['Draft', 'Requirements Review', 'Ready'].includes(to)) return planner
    if (to === 'In Development' || to === 'Code Review') return delivery
    if (to === 'Ready for QA') return codeReviewer
    if (to === 'In QA' || to === 'Accepted') return qa
    if (to === 'Changes Requested') return item.status === 'In QA' ? qa : item.status === 'Code Review' ? codeReviewer : planner
    return false
  })
}
