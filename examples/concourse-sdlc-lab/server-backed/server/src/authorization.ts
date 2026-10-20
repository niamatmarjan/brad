import { fail } from './errors.js';
import type { Role, Status, User, WorkItem } from './model.js';

export const planners: readonly Role[] = ['product-manager', 'business-analyst', 'delivery-manager', 'technical-lead', 'solution-architect'];
export const qaRoles: readonly Role[] = ['functional-qa', 'automation-qa'];
export function authorize(user: User, allowed: readonly Role[]): void {
  if (!allowed.includes(user.role)) fail(403, 'FORBIDDEN', 'Your role does not allow this action.');
}
export function deliveryActor(user: User, item: WorkItem): void {
  authorize(user, ['developer', 'technical-lead']);
  if (user.role === 'developer' && item.assigneeId !== user.id) {
    fail(403, 'FORBIDDEN', 'Only the assigned developer or technical lead may change delivery state.');
  }
}

export const transitions: Readonly<Partial<Record<Status, readonly Status[]>>> = {
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
};

export function authorizeTransition(user: User, item: WorkItem, to: Status): void {
  if (to === 'Blocked') {
    authorize(user, [...planners, 'developer', ...qaRoles]);
    if (user.role === 'developer') deliveryActor(user, item);
  } else if (to === 'Reopened') {
    authorize(user, ['product-manager', 'delivery-manager', 'technical-lead', ...qaRoles]);
  } else if (to === 'Draft' || to === 'Requirements Review' || to === 'Ready' || to === 'Done') {
    authorize(user, to === 'Done' ? ['product-manager', 'delivery-manager'] : planners);
  } else if (to === 'In Development' || to === 'Code Review') {
    deliveryActor(user, item);
  } else if (to === 'Ready for QA') {
    authorize(user, ['technical-lead', 'solution-architect']);
  } else if (to === 'In QA' || to === 'Accepted') {
    authorize(user, qaRoles);
  } else if (to === 'Changes Requested') {
    authorize(user, item.status === 'In QA' ? qaRoles
      : item.status === 'Code Review' ? ['technical-lead', 'solution-architect'] : planners);
  }
  if (!transitions[item.status]?.includes(to)) {
    fail(409, 'INVALID_TRANSITION', `Cannot move from ${item.status} to ${to}.`, { from: item.status, to });
  }
}
