import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QualityWorkspace } from './QualityWorkspace'
import { snapshot, story } from './__tests__/fixtures'
import { backend, defect } from './__tests__/backend'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
async function openStory() {
  await userEvent.click(await screen.findByRole('button', { name: /Verify checkout/ }))
}
function inQA() { return snapshot({ items: [story({ status: 'In QA' })] }) }
async function comment() {
  await userEvent.type(screen.getByLabelText('Comment'), 'Check latest evidence')
  await userEvent.click(screen.getByRole('button', { name: 'Add comment' }))
}
describe('server-shaped quality read states', () => {
  it('announces loading without invented records', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<QualityWorkspace projectId="project-1" />)
    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(screen.queryByText('Ready for release')).toBeNull()
  })
  it('renders empty queues and actual readiness reasons/counts', async () => {
    backend(snapshot({ items: [], readiness: { ready: false, reasons: ['The project has no work items.'], workItemCount: 0, blockingDefectCount: 0 } }))
    render(<QualityWorkspace projectId="project-1" />)
    expect(await screen.findByText('The project has no work items.')).toBeTruthy()
    expect(screen.getByText('0 work item(s) · 0 open blocking defect(s)')).toBeTruthy()
    expect(screen.getByText(/No work items match/)).toBeTruthy()
    expect(screen.getByText('No activity recorded yet.')).toBeTruthy()
  })
  it('uses server readiness instead of manufacturing readiness from evidence', async () => {
    backend(snapshot({ items: [], readiness: { ready: true, reasons: [], workItemCount: 2, blockingDefectCount: 0 } }))
    render(<QualityWorkspace projectId="project-1" />)
    expect(await screen.findByText('Ready for release')).toBeTruthy()
  })
  it('shows unknown relationship errors while preserving the queue', async () => {
    const api = backend()
    api.readOverrides.set('/api/work-items/story-1/test-runs', () => new Response('{"error":{"code":"UNAVAILABLE","message":"Evidence offline"}}', { status: 503 }))
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    const tests = within(screen.getByRole('region', { name: 'Test records' }))
    expect(tests.getByRole('alert').textContent).toContain('Evidence unavailable — not verified')
    expect(tests.getByRole('alert').textContent).toContain('Evidence offline')
    expect(tests.queryByText('No records yet.')).toBeNull()
    expect(screen.getByText('Not ready for release')).toBeTruthy()
  })
  it('renders real result/cases, audit details, transition history and review bodies', async () => {
    backend(snapshot({
      items: [story({
        testRuns: [{ id: 'r1', workItemId: 'story-1', actorId: 'qa-01', name: 'Payment run', result: 'failed',
          cases: [{ name: 'Valid card', result: 'failed' }, { name: 'Invalid card', result: 'blocked' }],
          notes: 'Expected receipt; actual error', itemVersion: 3, createdAt: '2026-10-19' }],
        reviews: [{ id: 'rv1', workItemId: 'story-1', actorId: 'tl-01', kind: 'code', decision: 'changes-requested',
          body: 'Cover invalid cards', itemVersion: 2, createdAt: '2026-10-18' }],
        comments: [{ id: 'c1', workItemId: 'story-1', actorId: 'qa-01', body: 'Please retest', createdAt: '2026-10-19' }],
        transitions: [{ id: 't1', workItemId: 'story-1', actorId: 'qa-01', fromStatus: 'Ready for QA', toStatus: 'In QA', itemVersion: 3, createdAt: '2026-10-19' }],
      })],
      activity: [{ id: 'a1', sequence: 1, projectId: 'project-1', workItemId: 'story-1', actorId: 'qa-01',
        kind: 'test-run.created', entityId: 'r1', details: { result: 'failed', version: 3 }, createdAt: '2026-10-19' }],
    }))
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    expect(screen.getByText('Payment run')).toBeTruthy()
    expect(screen.getByText('Valid card · failed')).toBeTruthy()
    expect(screen.getByText('Invalid card · blocked')).toBeTruthy()
    expect(screen.getByText('Expected receipt; actual error')).toBeTruthy()
    expect(screen.getByText('Cover invalid cards')).toBeTruthy()
    expect(screen.getByText('Please retest')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Transition history' }).textContent).toContain('Ready for QA → In QA')
    expect(screen.getByRole('region', { name: 'Audit activity' }).textContent).toContain('"result": "failed"')
  })
  it('keeps unknown retests distinct from zero retests and blocks acceptance on blocking severity', async () => {
    const api = backend(snapshot({ items: [story({ status: 'In QA', defects: [defect] })] }))
    api.readOverrides.set('/api/defects/defect-1/retests', () => new Response('{"data":{}}'))
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    expect(screen.getByText('Retest status: unavailable — not verified')).toBeTruthy()
    expect(screen.getByText(/Acceptance blocked by 1/)).toBeTruthy()
    await userEvent.selectOptions(screen.getByLabelText('Next status'), 'Accepted')
    expect(screen.getByRole('button', { name: 'Apply status' }).matches(':disabled')).toBe(true)
    expect(screen.queryByRole('form', { name: 'Update Card rejected' })).toBeNull()
  })
  it('shows sign-in recovery for session failure', async () => {
    const api = backend()
    api.readOverrides.set('/api/session', () => new Response('{"error":{"code":"UNAUTHENTICATED","message":"Expired"}}', { status: 401 }))
    render(<QualityWorkspace projectId="project-1" />)
    expect((await screen.findByRole('alert')).textContent).toContain('Sign in through the application shell')
    expect(screen.queryByRole('region', { name: 'Release readiness' })).toBeNull()
  })
  it('retries network errors and resets selection across projects', async () => {
    const api = backend()
    api.fetch.mockRejectedValueOnce(new TypeError('Connection lost'))
    const { rerender } = render(<QualityWorkspace projectId="project-1" />)
    expect((await screen.findByRole('alert')).textContent).toContain('Connection lost')
    await userEvent.click(screen.getByRole('button', { name: 'Refresh records' }))
    await openStory()
    api.data.items = []
    rerender(<QualityWorkspace projectId="project-2" />)
    await screen.findByText(/No work items match/)
    expect(screen.queryByRole('region', { name: 'Selected work item' })).toBeNull()
  })
  it('does not request APIs without a host project', () => {
    const api = backend()
    render(<QualityWorkspace projectId="" />)
    expect(screen.getByRole('alert').textContent).toContain('Select a project')
    expect(api.fetch).not.toHaveBeenCalled()
  })
})

describe('server-shaped quality writes', () => {
  it.each(['passed', 'failed', 'blocked'] as const)('records %s case/run with matching aggregate and parent version', async result => {
    const api = backend(inQA())
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    const form = screen.getByRole('form', { name: 'Record test run' })
    await userEvent.type(within(form).getByLabelText('Run name'), 'Checkout')
    await userEvent.type(within(form).getByLabelText('Test case name'), 'Valid card')
    await userEvent.selectOptions(within(form).getByLabelText('Outcome'), result)
    await userEvent.type(within(form).getByLabelText('Test evidence notes'), 'Steps: pay; expected receipt; actual response')
    await userEvent.click(within(form).getByRole('button', { name: 'Record test run' }))
    await screen.findByText('Test run recorded.')
    expect(api.writes[0].body).toEqual({ name: 'Checkout', result, cases: [{ name: 'Valid card', result }],
      notes: 'Steps: pay; expected receipt; actual response', expectedVersion: 3 })
    expect(api.writes).toHaveLength(1)
  })
  it('disables runs outside In QA and assignment for QA roles', async () => {
    backend()
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    expect(screen.getByRole('button', { name: 'Record test run' }).matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Save assignment' }).matches(':disabled')).toBe(true)
  })
  it('creates blocking defects with description and parent version, without fictitious assignment', async () => {
    const api = backend()
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    const form = screen.getByRole('form', { name: 'File defect' })
    await userEvent.type(within(form).getByLabelText('Defect title'), 'Payment error')
    await userEvent.selectOptions(within(form).getByLabelText('Severity'), 'blocking')
    await userEvent.type(within(form).getByLabelText('Reproduction steps, expected and actual behavior'), 'Pay with card; expected receipt; error')
    await userEvent.click(within(form).getByRole('button', { name: 'File defect' }))
    await screen.findByText('Defect filed.')
    expect(api.writes[0].body).toEqual({ title: 'Payment error', severity: 'blocking', description: 'Pay with card; expected receipt; error', expectedVersion: 3 })
    expect(within(form).queryByLabelText('Assign defect')).toBeNull()
  })
  it.each(['passed', 'failed'] as const)('retests fixed defects with %s and the defect version', async result => {
    const api = backend(snapshot({ items: [story({ defects: [defect] })] }))
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    await userEvent.selectOptions(screen.getByLabelText('Retest outcome'), result)
    await userEvent.type(screen.getByLabelText('Retest evidence'), 'Verified build 12')
    await userEvent.click(screen.getByRole('button', { name: 'Record retest' }))
    await screen.findByText('Retest recorded.')
    expect(api.writes[0]).toEqual({ path: '/api/defects/defect-1/retests', method: 'POST',
      body: { result, notes: 'Verified build 12', expectedVersion: 8 } })
  })
  it('lets assigned developers mark defects Fixed but never directly Closed or assign defects', async () => {
    const api = backend(snapshot({ user: { id: 'dev-01', name: 'Alex Dev', role: 'developer' },
      items: [story({ assigneeId: 'dev-01', defects: [{ ...defect, status: 'Open' }] })] }))
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    const form = screen.getByRole('form', { name: 'Update Card rejected' })
    expect(within(form).queryByRole('option', { name: 'Closed' })).toBeNull()
    expect(within(form).queryByLabelText('Assign defect')).toBeNull()
    expect(screen.queryByRole('form', { name: 'Retest Card rejected' })).toBeNull()
    await userEvent.selectOptions(within(form).getByLabelText('Defect status'), 'Fixed')
    await userEvent.click(within(form).getByRole('button', { name: 'Update defect' }))
    await screen.findByText('Defect updated.')
    expect(api.writes[0].body).toEqual({ expectedVersion: 8, status: 'Fixed' })
  })
  it('allows QA to reopen Closed defects, but not mark Open defects Fixed', async () => {
    backend(snapshot({ items: [story({ defects: [{ ...defect, status: 'Closed' }] })] }))
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    const form = screen.getByRole('form', { name: 'Update Card rejected' })
    expect(within(form).getAllByRole('option').map(option => option.textContent)).toEqual(['Reopened'])
  })
  it.each([
    ['Requirements Review', 'product-manager', 'requirements', 'approved'],
    ['Code Review', 'technical-lead', 'code', 'changes-requested'],
  ] as const)('submits exact %s review contract', async (status, role, kind, decision) => {
    const api = backend(snapshot({ user: { id: 'reviewer', name: 'Reviewer', role }, items: [story({ status })] }))
    render(<QualityWorkspace projectId="project-1" />)
    await screen.findByText('0 matching work item(s)')
    await userEvent.click(screen.getByLabelText('QA states only'))
    await openStory()
    await userEvent.selectOptions(screen.getByLabelText('Decision'), decision)
    await userEvent.type(screen.getByLabelText('Review rationale'), 'Criteria checked')
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    await screen.findByText('Review decision recorded.')
    expect(api.writes).toEqual([{ path: '/api/work-items/story-1/reviews', method: 'POST',
      body: { kind, decision, body: 'Criteria checked', expectedVersion: 3 } }])
  })
  it('does not offer code self-review', async () => {
    backend(snapshot({ user: { id: 'tl-01', name: 'Lead', role: 'technical-lead' },
      items: [story({ status: 'Code Review', assigneeId: 'tl-01' })] }))
    render(<QualityWorkspace projectId="project-1" />)
    await screen.findByText('0 matching work item(s)')
    await userEvent.click(screen.getByLabelText('QA states only'))
    await openStory()
    expect(screen.queryByRole('form', { name: 'Review decision' })).toBeNull()
  })
  it.each([400, 403, 409])('retains failed comment drafts and reports %i errors', async status => {
    const api = backend()
    api.failWrite({ status, code: status === 409 ? 'VERSION_CONFLICT' : 'FORBIDDEN', message: 'Rejected by server' })
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    await comment()
    expect((await screen.findByRole('alert')).textContent).toContain('Rejected by server')
    expect((screen.getByLabelText('Comment') as HTMLTextAreaElement).value).toBe('Check latest evidence')
    expect(screen.queryByText('Comment added.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add comment' }).matches(':disabled')).toBe(status !== 400)
  })
  it('refetches parent and defect versions after a mutation and uses the new version', async () => {
    const api = backend(snapshot({ items: [story({ defects: [defect] })] }))
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    api.data.items[0].version = 4
    api.data.items[0].defects![0].version = 9
    await comment()
    await screen.findByText('Comment added.')
    await userEvent.type(screen.getByLabelText('Retest evidence'), 'Verified current build')
    await userEvent.click(screen.getByRole('button', { name: 'Record retest' }))
    await screen.findByText('Retest recorded.')
    expect(api.writes[1].body.expectedVersion).toBe(9)
    await userEvent.selectOptions(screen.getByLabelText('Next status'), 'In QA')
    await userEvent.click(screen.getByRole('button', { name: 'Apply status' }))
    await screen.findByText('Workflow status updated.')
    expect(api.writes[2].body.expectedVersion).toBe(4)
  })
  it('locks uncertain saves and failed post-save refreshes without inventing success', async () => {
    const api = backend()
    render(<QualityWorkspace projectId="project-1" />)
    await openStory()
    api.fetch.mockRejectedValueOnce(new TypeError('Connection lost'))
    await comment()
    expect((await screen.findByRole('alert')).textContent).toContain('save outcome could not be confirmed')
    await userEvent.click(screen.getByRole('button', { name: 'Refresh records' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add comment' }).matches(':disabled')).toBe(false))
    api.failReads()
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Saved, but')
    expect(screen.getByText('Readiness unverified — refresh required')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add comment' }).matches(':disabled')).toBe(true)
  })
})
