import { useEffect, useRef, useState } from 'react'
import type { ReactNode, SubmitEvent } from 'react'
import { errorMessage, qualityApi, QualityApiError } from './api'
import { CommentForm, DefectEditor, DefectForm, Field, ReviewForm, Roster, TestRunForm } from './QualityForms'
import type { Mutate } from './QualityForms'
import { PLANNING_ROLES, QA_ROLES, workflowTargets } from './policy'
import type { Snapshot, WorkItem } from './types'
import './quality.css'

const QUEUE_STATUSES = ['Ready for QA', 'In QA', 'Blocked', 'Reopened']

function Evidence({ records, error, children }: { records: unknown[] | undefined; error?: string; children: ReactNode }) {
  if (records === undefined) return <p className="quality-muted" role={error ? 'alert' : undefined}>Evidence unavailable — not verified. {error ?? 'Refresh to request the evidence endpoint.'}</p>
  if (!records.length) return <p className="quality-muted">No records yet.</p>
  return children
}

function ItemDetail({ item, snapshot, mutate, disabled }: {
  item: WorkItem; snapshot: Snapshot; mutate: Mutate; disabled: boolean
}) {
  const role = snapshot.user.role
  const canTest = QA_ROLES.includes(role)
  const canReview = (item.status === 'Requirements Review' && PLANNING_ROLES.includes(role))
    || (item.status === 'Code Review' && ['technical-lead', 'solution-architect'].includes(role) && item.assigneeId !== snapshot.user.id)
  const canAssign = PLANNING_ROLES.includes(role) && ['Draft', 'Requirements Review', 'Ready', 'Changes Requested', 'Reopened', 'Blocked'].includes(item.status)
  const blockers = item.defects?.filter(defect => defect.severity === 'blocking' && defect.status !== 'Closed')
  const targets = workflowTargets(item, snapshot.user)
  const [target, setTarget] = useState(targets[0] ?? '')
  async function assign(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const assigneeId = String(new FormData(event.currentTarget).get('assigneeId') ?? '') || null
    await mutate(() => qualityApi.assign(item.id, item.version, assigneeId), 'Assignment updated.')
  }
  async function transition(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    await mutate(() => qualityApi.transition(item.id, item.version, target), 'Workflow status updated.')
  }
  return <section className="quality-detail" aria-label="Selected work item">
    <header>
      <h2>{item.title}</h2>
      <p>{item.id} · {item.type} · {item.priority} priority · v{item.version}</p>
      <p className="quality-pre">{item.description}</p>
    </header>
    <section aria-label="Acceptance criteria">
      <h3>Acceptance criteria</h3>
      {item.acceptanceCriteria.length ? <ul>{item.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul> : <p>No acceptance criteria supplied.</p>}
    </section>
    <section aria-label="Workflow">
      <h3>Workflow and ownership</h3>
      <p>Current status: <strong>{item.status}</strong></p>
      {Boolean(blockers?.length) && <p className="quality-warning">Acceptance blocked by {blockers!.length} open blocking defect(s).</p>}
      <form onSubmit={assign} aria-label="Assign work item">
        <fieldset disabled={disabled || !canAssign}><legend>Assign work item</legend>
          <Field label="Work item assignee"><Roster users={snapshot.users} value={item.assigneeId} /></Field>
          <button type="submit">Save assignment</button>
        </fieldset>
      </form>
      {!canAssign && <p>Assignment is a planning-role edit available only in planning states.</p>}
      <form onSubmit={transition} aria-label="Change workflow status">
        <fieldset disabled={disabled || !targets.length}><legend>Change workflow status</legend>
          <Field label="Next status"><select value={target} onChange={e => setTarget(e.target.value as typeof target)}>
            {!targets.length && <option value="">No available transitions for this role</option>}
            {targets.map(status => <option key={status}>{status}</option>)}
          </select></Field>
          <button type="submit" disabled={target === item.status || (target === 'Accepted' && Boolean(blockers?.length))}>Apply status</button>
        </fieldset>
        <p className="quality-muted">The server validates role, transition, dependencies and blocking defects.</p>
      </form>
    </section>
    <section aria-label="Test records">
      <h3>Test cases and runs</h3>
      <Evidence records={item.testRuns} error={item.evidenceErrors?.testRuns}>
        {item.testRuns?.map(run => <article key={run.id} className="quality-record">
          <h4>{run.name} <span className={`quality-status quality-${run.result}`}>{run.result}</span></h4>
          <ul>{run.cases.map((testCase, index) => <li key={index}>{testCase.name} · {testCase.result}</li>)}</ul>
          <p className="quality-pre">{run.notes}</p>
          <time>{run.createdAt}</time>
        </article>)}
      </Evidence>
      {canTest ? <TestRunForm item={item} mutate={mutate} disabled={disabled} /> : <p>QA engineers record test outcomes.</p>}
    </section>
    <section aria-label="Defects">
      <h3>Defects and retests</h3>
      <Evidence records={item.defects} error={item.evidenceErrors?.defects}>
        {item.defects?.map(defect => <DefectEditor key={`${defect.id}:${defect.version}`} defect={defect}
          item={item} user={snapshot.user} mutate={mutate} disabled={disabled} />)}
      </Evidence>
      {canTest && <DefectForm item={item} mutate={mutate} disabled={disabled} />}
    </section>
    <section aria-label="Reviews">
      <h3>Reviews and approvals</h3>
      <Evidence records={item.reviews} error={item.evidenceErrors?.reviews}>
        {item.reviews?.map(review => <article key={review.id} className="quality-record">
          <h4>{review.kind} · {review.decision}</h4><p>{review.body}</p><time>{review.createdAt}</time>
        </article>)}
      </Evidence>
      {canReview ? <ReviewForm item={item} mutate={mutate} disabled={disabled} /> : <p>Review decisions are available to product, analysis, delivery and technical leadership roles.</p>}
      <p className="quality-muted">Approval records a decision; it does not bypass the story workflow or release gate.</p>
    </section>
    <section aria-label="Discussion">
      <h3>Discussion</h3>
      <Evidence records={item.comments} error={item.evidenceErrors?.comments}>
        {item.comments?.map(comment => <article key={comment.id} className="quality-record">
          <p className="quality-pre">{comment.body}</p>
          <p>{snapshot.users.find(user => user.id === comment.actorId)?.name ?? comment.actorId ?? 'Unknown author'} · <time>{comment.createdAt}</time></p>
        </article>)}
      </Evidence>
      <CommentForm item={item} mutate={mutate} disabled={disabled} />
    </section>
    <section aria-label="Transition history"><h3>Workflow history</h3>
      <Evidence records={item.transitions} error={item.evidenceErrors?.transitions}>
        <ol>{item.transitions?.map(transition => <li key={transition.id}>
          {transition.fromStatus} → {transition.toStatus} · v{transition.itemVersion} · <time>{transition.createdAt}</time>
        </li>)}</ol>
      </Evidence>
    </section>
  </section>
}

// Host integration: render <QualityWorkspace projectId={selectedProject.id} /> in
// the authenticated shell. Serve web and /api on the same origin (or proxy /api).
// This module neither starts demo sessions nor changes the application's routes.
export function QualityWorkspace({ projectId }: { projectId: string }) {
  return <ProjectQuality key={projectId} projectId={projectId} />
}

function ProjectQuality({ projectId }: { projectId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId.trim()))
  const [error, setError] = useState(projectId.trim() ? '' : 'Select a project in the application shell to open quality.')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [stale, setStale] = useState(false)
  const [reload, setReload] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [queueOnly, setQueueOnly] = useState(true)
  const [mineOnly, setMineOnly] = useState(false)
  const [query, setQuery] = useState('')
  const mounted = useRef(false)
  const locked = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (!projectId.trim()) {
      return () => controller.abort()
    }
    qualityApi.load(projectId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setSnapshot(data)
      setStale(false)
    }).catch(reason => {
      if (!controller.signal.aborted) { setError(errorMessage(reason)); setStale(true) }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [projectId, reload])

  const mutate: Mutate = async (action, message) => {
    if (locked.current || loading || stale) return false
    locked.current = true
    setBusy(true)
    setError('')
    setNotice('')
    let saved = false
    try {
      await action()
      saved = true
      if (!mounted.current) return true
      const fresh = await qualityApi.load(projectId)
      if (!mounted.current) return true
      setSnapshot(fresh)
      setNotice(message)
      return true
    } catch (reason) {
      if (!mounted.current) return saved
      const uncertain = !saved && (!(reason instanceof QualityApiError)
        || reason.status >= 500 || reason.code === 'INVALID_RESPONSE')
      setError(saved
        ? `Saved, but the latest records could not be loaded. Refresh before making more changes. ${errorMessage(reason)}`
        : uncertain
          ? `The save outcome could not be confirmed. Refresh and inspect history before retrying. ${errorMessage(reason)}`
          : errorMessage(reason))
      if (saved || uncertain || (reason instanceof QualityApiError && [401, 403, 404, 409].includes(reason.status))) setStale(true)
      return saved
    } finally {
      locked.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const selected = snapshot?.items.find(item => item.id === selectedId)
  const visible = snapshot?.items.filter(item =>
    (!queueOnly || QUEUE_STATUSES.includes(item.status))
    && (!mineOnly || item.assigneeId === snapshot.user.id)
    && `${item.id} ${item.title}`.toLowerCase().includes(query.trim().toLowerCase()),
  ) ?? []
  const disabled = busy || loading || stale

  return <div className="quality-workspace" aria-label="Quality workspace">
    <header className="quality-heading">
      <div><h1>Quality & collaboration</h1><p>Test evidence, review decisions and release blockers in one shared record.</p></div>
      <button type="button" disabled={busy || loading} onClick={() => {
        setLoading(Boolean(projectId.trim())); setError(''); setNotice(''); setReload(value => value + 1)
      }}>Refresh records</button>
    </header>
    {loading && <p role="status">Loading quality records…</p>}
    {busy && <p role="status">Saving and refreshing server records…</p>}
    {error && <div role="alert" className="quality-warning">{error}</div>}
    {notice && <p role="status">{notice}</p>}
    {snapshot && <>
      <p>Signed in as <strong>{snapshot.user.name}</strong> · {snapshot.user.role}</p>
      <section className="quality-release" aria-label="Release readiness">
        <h2>Release readiness</h2>
        <p className={snapshot.readiness.ready && !stale ? '' : 'quality-warning'}>
          {stale ? 'Readiness unverified — refresh required' : snapshot.readiness.ready ? 'Ready for release' : 'Not ready for release'}
        </p>
        <p>{snapshot.readiness.workItemCount} work item(s) · {snapshot.readiness.blockingDefectCount} open blocking defect(s)</p>
        <ul>{snapshot.readiness.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
        {!snapshot.readiness.ready && !snapshot.readiness.reasons.length && <p>The server has not supplied readiness reasons.</p>}
        <p className="quality-muted">Server-reported readiness. Missing test evidence must not be treated as a pass.</p>
      </section>
      <div className="quality-layout">
        <aside aria-label="QA queue">
          <h2>QA queue</h2>
          <Field label="Find a work item"><input type="search" value={query} onChange={e => setQuery(e.target.value)} /></Field>
          <label className="quality-check"><input type="checkbox" checked={queueOnly} onChange={e => setQueueOnly(e.target.checked)} />QA states only</label>
          <label className="quality-check"><input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />Assigned to me</label>
          <p>{visible.length} matching work item(s)</p>
          {!visible.length && <p>No work items match. Clear filters or refresh after stories are added.</p>}
          <ul className="quality-queue">{visible.map(item => <li key={item.id}>
            <button type="button" aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
              <strong>{item.title}</strong><span>{item.id} · {item.status}</span>
              <span>{snapshot.users.find(user => user.id === item.assigneeId)?.name ?? item.assigneeId ?? 'Unassigned'}</span>
            </button>
          </li>)}</ul>
        </aside>
        {selected
          ? <ItemDetail key={`${selected.id}:${selected.version}:${snapshot.user.id}`} item={selected} snapshot={snapshot} mutate={mutate} disabled={disabled} />
          : <section className="quality-detail"><h2>Work item evidence</h2><p>Select a work item to inspect tests, defects, reviews and discussion.</p></section>}
      </div>
      <section aria-label="Audit activity" className="quality-activity">
        <h2>Project activity & history</h2>
        {!snapshot.activity.length && <p>No activity recorded yet.</p>}
        <ol>{snapshot.activity.map(activity => <li key={activity.id}>
          <p><strong>{activity.kind}</strong> · {activity.entityId}</p>
          <pre className="quality-pre quality-audit-details">{JSON.stringify(activity.details, null, 2)}</pre>
          <p>{snapshot.users.find(user => user.id === activity.actorId)?.name ?? activity.actorId ?? 'System'}{activity.workItemId ? ` · ${activity.workItemId}` : ''} · <time>{activity.createdAt}</time></p>
        </li>)}</ol>
        <p className="quality-muted">Read-only server audit entries. Refresh to see changes from other sessions.</p>
      </section>
    </>}
  </div>
}
