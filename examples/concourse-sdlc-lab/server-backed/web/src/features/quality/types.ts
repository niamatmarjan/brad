export interface User { id: string; name: string; role: string }
export const STORY_STATUSES = [
  'Draft', 'Requirements Review', 'Ready', 'In Development', 'Code Review',
  'Ready for QA', 'In QA', 'Accepted', 'Done', 'Blocked', 'Changes Requested', 'Reopened',
] as const
export type StoryStatus = typeof STORY_STATUSES[number]
export type Outcome = 'passed' | 'failed' | 'blocked'
export type Severity = 'blocking' | 'critical' | 'major' | 'minor'
export type DefectStatus = 'Open' | 'In Progress' | 'Fixed' | 'Closed' | 'Reopened'
export interface TestCase { name: string; result: Outcome }
export interface TestRunInput {
  name: string
  result: Outcome
  cases: TestCase[]
  notes: string
  expectedVersion: number
}
export interface TestRun extends Omit<TestRunInput, 'expectedVersion'> {
  id: string; workItemId: string; actorId: string; itemVersion: number; createdAt: string
}
export interface Retest {
  id: string; defectId: string; actorId: string; result: 'passed' | 'failed'
  notes: string; defectVersion: number; createdAt: string
}
export interface DefectInput {
  title: string; description: string; severity: Severity; expectedVersion: number
}
export interface Defect extends Omit<DefectInput, 'expectedVersion'> {
  id: string; workItemId: string; status: DefectStatus; version: number
  createdBy: string; createdAt: string; updatedAt: string
  retests?: Retest[]
  retestError?: string
}
export interface ReviewInput {
  kind: 'requirements' | 'code'
  decision: 'approved' | 'changes-requested'
  body: string
  expectedVersion: number
}
export interface Review extends Omit<ReviewInput, 'expectedVersion'> {
  id: string; workItemId: string; actorId: string; itemVersion: number; createdAt: string
}
export interface Comment {
  id: string; workItemId: string; body: string; actorId: string; createdAt: string
}
export interface Transition {
  id: string; workItemId: string; actorId: string; fromStatus: StoryStatus
  toStatus: StoryStatus; itemVersion: number; createdAt: string
}
export interface WorkItem {
  id: string; projectId: string; type: string; title: string; description: string
  acceptanceCriteria: string[]; priority: string; estimate?: number | null
  assigneeId: string | null; dependencies: string[]; status: StoryStatus
  version: number; updatedAt: string
  // Client-composed evidence from dedicated GETs, never embedded server projections.
  testRuns?: TestRun[]
  defects?: Defect[]
  reviews?: Review[]
  comments?: Comment[]
  transitions?: Transition[]
  evidenceErrors?: Partial<Record<'testRuns' | 'defects' | 'reviews' | 'comments' | 'transitions', string>>
}
export interface Activity {
  id: string; sequence: number; projectId: string | null; workItemId: string | null
  actorId: string; kind: string; entityId: string; details: unknown; createdAt: string
}
export interface ReleaseReadiness {
  ready: boolean; reasons: string[]; workItemCount: number; blockingDefectCount: number
}
export interface Snapshot {
  user: User; users: User[]; items: WorkItem[]; activity: Activity[]; readiness: ReleaseReadiness
}
