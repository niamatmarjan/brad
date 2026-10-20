import { useState } from 'react'
import type { ReactNode, SubmitEvent } from 'react'
import { qualityApi } from './api'
import type { Defect, Outcome, ReviewInput, Severity, User, WorkItem } from './types'

export type Mutate = (action: () => Promise<unknown>, message: string) => Promise<boolean>
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="quality-field"><span>{label}</span>{children}</label>
}
export function Roster({ users, value }: { users: User[]; value?: string | null }) {
  return <select name="assigneeId" defaultValue={value ?? ''}><option value="">Unassigned</option>
    {users.map(user => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
  </select>
}
function values(event: SubmitEvent<HTMLFormElement>) {
  event.preventDefault()
  const form = event.currentTarget
  const data = new FormData(form)
  return { form, text: (name: string) => String(data.get(name) ?? '').trim() }
}
export function TestRunForm({ item, mutate, disabled }: { item: WorkItem; mutate: Mutate; disabled: boolean }) {
  const [result, setResult] = useState<Outcome>('passed')
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    const { form, text } = values(event)
    if (await mutate(() => qualityApi.testRun(item.id, {
      name: text('name'), cases: [{ name: text('caseName'), result }], result,
      notes: text('notes'), expectedVersion: item.version,
    }), 'Test run recorded.')) { form.reset(); setResult('passed') }
  }
  return <form onSubmit={submit} aria-label="Record test run"><fieldset disabled={disabled || item.status !== 'In QA'}>
    <legend>Record a test case and run</legend>
    <p>Record one named case per run here. Include reproduction steps, expected and actual results in evidence notes.</p>
    <Field label="Run name"><input name="name" required maxLength={300} /></Field>
    <Field label="Test case name"><input name="caseName" required maxLength={300} /></Field>
    <Field label="Outcome"><select value={result} onChange={e => setResult(e.target.value as Outcome)}>
      <option value="passed">Passed</option><option value="failed">Failed</option><option value="blocked">Blocked</option>
    </select></Field>
    <Field label="Test evidence notes"><textarea name="notes" required maxLength={10000} /></Field>
    <button type="submit">Record test run</button>
  </fieldset>{item.status !== 'In QA' && <p>Move the story to In QA before recording a run.</p>}</form>
}
export function DefectForm({ item, mutate, disabled }: { item: WorkItem; mutate: Mutate; disabled: boolean }) {
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    const { form, text } = values(event)
    if (await mutate(() => qualityApi.defect(item.id, {
      title: text('title'), severity: text('severity') as Severity,
      description: text('description'), expectedVersion: item.version,
    }), 'Defect filed.')) form.reset()
  }
  const eligible = ['Ready for QA', 'In QA', 'Accepted', 'Done', 'Reopened'].includes(item.status)
  return <form onSubmit={submit} aria-label="File defect"><fieldset disabled={disabled || !eligible}><legend>File a defect</legend>
    <Field label="Defect title"><input name="title" required maxLength={300} /></Field>
    <Field label="Severity"><select name="severity" defaultValue="major">
      <option value="blocking">Blocking</option><option value="critical">Critical</option>
      <option value="major">Major</option><option value="minor">Minor</option>
    </select></Field>
    <Field label="Reproduction steps, expected and actual behavior"><textarea name="description" required maxLength={10000} /></Field>
    <p>Only Blocking severity gates acceptance and release. Defects have no separate assignee; ownership follows the work item.</p>
    <button type="submit">File defect</button>
  </fieldset>{!eligible && <p>Defects require an item delivered for QA.</p>}</form>
}
export function DefectEditor({ defect, item, user, mutate, disabled }: {
  defect: Defect; item: WorkItem; user: User; mutate: Mutate; disabled: boolean
}) {
  const qa = ['functional-qa', 'automation-qa'].includes(user.role)
  const developer = user.role === 'technical-lead' || (user.role === 'developer' && item.assigneeId === user.id)
  const statuses: ('In Progress' | 'Fixed' | 'Reopened')[] = defect.status === 'Closed'
    ? qa ? ['Reopened'] : []
    : developer && ['Open', 'Reopened'].includes(defect.status) ? ['In Progress', 'Fixed']
      : developer && defect.status === 'In Progress' ? ['Fixed'] : []
  async function update(event: SubmitEvent<HTMLFormElement>) {
    const { text } = values(event)
    await mutate(() => qualityApi.updateDefect(defect.id, defect.version, text('status') as typeof statuses[number]), 'Defect updated.')
  }
  async function retest(event: SubmitEvent<HTMLFormElement>) {
    const { form, text } = values(event)
    if (await mutate(() => qualityApi.retest(defect.id, defect.version, text('result') as 'passed' | 'failed', text('notes')), 'Retest recorded.')) form.reset()
  }
  return <article className="quality-record"><h4>{defect.title}</h4>
    <p><strong>{defect.severity}</strong> · {defect.status} · {defect.severity === 'blocking'
      ? defect.status === 'Closed' ? 'Resolved blocker' : 'Release blocker' : 'Non-blocking'} · v{defect.version}</p>
    <p className="quality-pre">{defect.description}</p>
    {statuses.length > 0 && <form onSubmit={update} aria-label={`Update ${defect.title}`}>
      <fieldset disabled={disabled}><legend>Defect lifecycle</legend>
        <Field label="Defect status"><select name="status">{statuses.map(status => <option key={status}>{status}</option>)}</select></Field>
        <button type="submit">Update defect</button>
      </fieldset>
    </form>}
    <p>Retest status: {defect.retests === undefined ? 'unavailable — not verified' : defect.retests.length ? `${defect.retests.length} recorded` : 'awaiting first retest'}</p>
    {defect.retestError && <p role="alert">{defect.retestError}</p>}
    {defect.retests?.map(retest => <p key={retest.id}>{retest.result} · {retest.notes} · <time>{retest.createdAt}</time></p>)}
    {qa && <form onSubmit={retest} aria-label={`Retest ${defect.title}`}><fieldset disabled={disabled || defect.status !== 'Fixed'}>
      <legend>Retest fixed defect</legend>
      <Field label="Retest outcome"><select name="result"><option value="passed">Passed</option><option value="failed">Failed</option></select></Field>
      <Field label="Retest evidence"><textarea name="notes" required maxLength={10000} /></Field>
      <button type="submit">Record retest</button>
    </fieldset><p>Only Fixed defects can be retested. Passing closes the defect; failing reopens it. A fresh passing run is then required.</p></form>}
  </article>
}
export function CommentForm({ item, mutate, disabled }: { item: WorkItem; mutate: Mutate; disabled: boolean }) {
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    const { form, text } = values(event)
    if (await mutate(() => qualityApi.comment(item.id, text('body')), 'Comment added.')) form.reset()
  }
  return <form onSubmit={submit} aria-label="Add comment"><fieldset disabled={disabled}><legend>Add comment</legend>
    <Field label="Comment"><textarea name="body" required maxLength={10000} /></Field><button type="submit">Add comment</button>
  </fieldset></form>
}
export function ReviewForm({ item, mutate, disabled }: { item: WorkItem; mutate: Mutate; disabled: boolean }) {
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    const { form, text } = values(event)
    if (await mutate(() => qualityApi.review(item.id, {
      kind: item.status === 'Code Review' ? 'code' : 'requirements',
      decision: text('decision') as ReviewInput['decision'], body: text('body'), expectedVersion: item.version,
    }), 'Review decision recorded.')) form.reset()
  }
  return <form onSubmit={submit} aria-label="Review decision"><fieldset disabled={disabled}><legend>Review decision</legend>
    <p>{item.status === 'Code Review' ? 'Code' : 'Requirements'} review · v{item.version}</p>
    <Field label="Decision"><select name="decision"><option value="approved">Approved</option><option value="changes-requested">Changes Requested</option></select></Field>
    <Field label="Review rationale"><textarea name="body" required maxLength={10000} /></Field><button type="submit">Submit review</button>
  </fieldset></form>
}
