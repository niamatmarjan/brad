import { describe, expect, it } from 'vitest'
import { workflowTargets } from './policy'
import { story } from './__tests__/fixtures'

describe('server role and transition presentation', () => {
  it('offers QA entry then acceptance, never skip-to-Done', () => {
    const qa = { id: 'qa-01', name: 'QA', role: 'functional-qa' }
    expect(workflowTargets(story(), qa)).toEqual(['In QA', 'Blocked'])
    expect(workflowTargets(story({ status: 'In QA' }), qa)).toEqual(['Accepted', 'Changes Requested', 'Blocked'])
    expect(workflowTargets(story({ status: 'Accepted' }), qa)).toEqual(['Reopened'])
  })
  it('limits development to assigned developers and completion to PM or delivery manager', () => {
    const dev = { id: 'dev-01', name: 'Dev', role: 'developer' }
    expect(workflowTargets(story({ status: 'Ready' }), dev)).toEqual([])
    expect(workflowTargets(story({ status: 'Ready', assigneeId: dev.id }), dev)).toEqual(['In Development', 'Blocked'])
    expect(workflowTargets(story({ status: 'Accepted' }), { ...dev, role: 'delivery-manager' })).toEqual(['Done', 'Reopened'])
  })
})
