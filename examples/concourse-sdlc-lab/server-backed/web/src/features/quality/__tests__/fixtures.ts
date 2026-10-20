import type { Snapshot, WorkItem } from '../types'

export function story(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'story-1', projectId: 'project-1', type: 'story', title: 'Verify checkout',
    description: 'A customer can complete checkout.', acceptanceCriteria: ['Payment is confirmed'],
    priority: 'High', assigneeId: 'qa-01', dependencies: [], status: 'Ready for QA',
    version: 3, updatedAt: '2026-10-19T10:00:00Z', testRuns: [], defects: [], reviews: [], comments: [], transitions: [],
    ...overrides,
  }
}

export function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    user: { id: 'qa-01', name: 'Morgan QA', role: 'functional-qa' },
    users: [
      { id: 'qa-01', name: 'Morgan QA', role: 'functional-qa' },
      { id: 'dev-01', name: 'Alex Dev', role: 'developer' },
    ],
    items: [story()],
    activity: [],
    readiness: { ready: false, reasons: ['story-1: current passing QA evidence is missing.'], workItemCount: 1, blockingDefectCount: 0 },
    ...overrides,
  }
}
