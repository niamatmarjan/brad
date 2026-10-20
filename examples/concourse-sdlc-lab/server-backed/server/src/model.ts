export const roles = [
  'product-manager', 'business-analyst', 'delivery-manager', 'solution-architect',
  'technical-lead', 'developer', 'functional-qa', 'automation-qa',
] as const;
export type Role = typeof roles[number];
export interface User { id: string; name: string; role: Role }
export const statuses = [
  'Draft', 'Requirements Review', 'Ready', 'In Development', 'Code Review',
  'Ready for QA', 'In QA', 'Accepted', 'Done', 'Blocked', 'Changes Requested', 'Reopened',
] as const;
export type Status = typeof statuses[number];
export interface Project {
  id: string; name: string; description: string; status: string; version: number;
  createdAt: string; updatedAt: string;
}
export interface WorkItem {
  id: string; projectId: string; type: 'initiative' | 'story' | 'task'; title: string;
  description: string; acceptanceCriteria: string[]; priority: 'urgent' | 'high' | 'medium' | 'low';
  estimate: number | null; assigneeId: string | null; dependencies: string[];
  status: Status; version: number; createdBy: string; createdAt: string; updatedAt: string;
}
export interface Defect {
  id: string; workItemId: string; title: string; description: string;
  severity: 'blocking' | 'critical' | 'major' | 'minor'; status: 'Open' | 'In Progress' | 'Fixed' | 'Closed' | 'Reopened';
  version: number; createdBy: string; createdAt: string; updatedAt: string;
}
export type Input = Record<string, unknown>;
