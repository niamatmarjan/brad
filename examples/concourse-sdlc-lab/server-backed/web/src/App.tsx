/* oxlint-disable react/set-state-in-effect -- Loading state follows external API synchronization, not derived application data. */
import { useEffect, useRef, useState } from 'react'
import { api, ApiError, itemTypes, statuses } from './api'
import type { Project, Status, User, WorkItem } from './api'
import { canCreateProject, canEdit, canPlan, canReview, demoIds, filterItems, isReview, lanes, roleName, transitionOptions } from './domain'
import { Badge, Empty, Icon, ItemForm, Modal, Notice, ProjectForm } from './components'
import { QualityWorkspace } from './features/quality'
import './App.css'

type View = 'overview' | 'board' | 'backlog' | 'work' | 'review' | 'quality'
const navigation: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'board', label: 'Delivery board' },
  { id: 'backlog', label: 'Backlog' }, { id: 'work', label: 'My work' }, { id: 'review', label: 'Reviews & QA' },
  { id: 'quality', label: 'Quality & collaboration' },
]

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<User[]>([])
  const [booting, setBooting] = useState(true)
  const [signingIn, setSigningIn] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState<WorkItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [sessionBusy, setSessionBusy] = useState(false)
  const loading = catalogLoading || itemsLoading || sessionBusy
  const [error, setError] = useState<unknown>(null)
  const [view, setView] = useState<View>('overview')
  const [revision, setRevision] = useState(0)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [assignee, setAssignee] = useState('')
  const [type, setType] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [modal, setModal] = useState<'project' | 'item' | 'edit' | null>(null)
  const [message, setMessage] = useState('')
  const [activity, setActivity] = useState<unknown>(null)
  const [readiness, setReadiness] = useState<unknown>(null)
  const [insightError, setInsightError] = useState<unknown>(null)
  const project = projects.find(value => value.id === projectId)
  const selected = items.find(value => value.id === selectedId)
  const identity = useRef(0)

  async function bootstrap() {
    setBooting(true); setError(null)
    try {
      const current = await api.session().catch(cause => {
        if (cause instanceof ApiError && cause.status === 401) return null
        throw cause
      })
      if (current) setUser(current)
      else setAccounts((await api.demoUsers()).filter(account => demoIds.includes(account.id)))
    } catch (cause) { setError(cause) }
    finally { setBooting(false) }
  }
  useEffect(() => { void bootstrap() }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    setCatalogLoading(true); setError(null)
    Promise.all([api.projects(), api.users()]).then(([nextProjects, nextUsers]) => {
      if (!active) return
      setProjects(nextProjects); setUsers(nextUsers)
      setProjectId(current => nextProjects.some(value => value.id === current) ? current : nextProjects[0]?.id ?? '')
    }).catch(cause => { if (active) setError(cause) }).finally(() => { if (active) setCatalogLoading(false) })
    return () => { active = false }
  }, [user, revision])

  useEffect(() => {
    if (!user || !projectId) { setItemsLoading(false); return }
    const controller = new AbortController()
    setItemsLoading(true); setError(null); setInsightError(null)
    setActivity(null); setReadiness(null)
    api.items(projectId, controller.signal).then(setItems).catch(cause => {
      if (!controller.signal.aborted) setError(cause)
    }).finally(() => { if (!controller.signal.aborted) setItemsLoading(false) })
    Promise.allSettled([api.activity(projectId, controller.signal), api.readiness(projectId, controller.signal)]).then(results => {
      if (controller.signal.aborted) return
      if (results[0].status === 'fulfilled') setActivity(results[0].value)
      if (results[1].status === 'fulfilled') setReadiness(results[1].value)
      const failure = results.find(result => result.status === 'rejected')
      if (failure?.status === 'rejected') setInsightError(failure.reason)
    })
    return () => controller.abort()
  }, [user, projectId, revision])

  async function signIn(account: User) {
    setSigningIn(account.id); setError(null)
    try {
      await api.signIn(account.id)
      const current = await api.session()
      identity.current++
      setUser(current); setMessage(`Signed in as ${current.name}. Development-only demo session.`)
    } catch (cause) { setError(cause) }
    finally { setSigningIn('') }
  }
  async function signOut() {
    setSessionBusy(true); setError(null)
    try {
      await api.signOut().catch(cause => {
        if (!(cause instanceof ApiError && cause.status === 401)) throw cause
      })
      identity.current++
      setUser(null); setProjects([]); setItems([]); setUsers([]); setProjectId(''); setSelectedId(''); setModal(null)
      setView('overview'); clearFilters(); setMessage('Demo session ended.')
      setAccounts((await api.demoUsers()).filter(account => demoIds.includes(account.id)))
    } catch (cause) { setError(cause) }
    finally { setSessionBusy(false) }
  }
  function clearFilters() { setQuery(''); setStatus(''); setAssignee(''); setType('') }
  function refresh() { setRevision(value => value + 1); setMessage('Refreshing shared workspace…') }
  function changeProject(id: string) {
    setProjectId(id); setItems([]); setSelectedId(''); setModal(null); clearFilters(); setMessage('')
  }
  function mergeItem(item: WorkItem) {
    setItems(current => current.some(value => value.id === item.id) ? current.map(value => value.id === item.id ? item : value) : [...current, item])
    setMessage('Work item saved to the shared workspace.'); setRevision(value => value + 1)
  }
  const visible = filterItems(items, query, status, assignee, type).filter(item => view === 'work' ? item.assigneeId === user?.id : view === 'review' ? isReview(item.status) : true)
  const nameOf = (id: string | null) => users.find(value => value.id === id)?.name ?? (id || 'Unassigned')

  if (booting) return <main className="boot" aria-busy="true"><Brand /><p role="status">Connecting to your workspace…</p></main>
  if (!user) return <main className="sign-in"><section className="welcome"><Brand /><div><h1>Good work happens<br />in good company.</h1><p>One shared place to shape requirements, move delivery forward, and know what’s ready.</p></div><p className="welcome-footer">Requirements. Delivery. Confidence.</p></section><section className="account-section" aria-labelledby="sign-in-title"><div className="demo-label">Development-only demo</div><h2 id="sign-in-title">Choose your seat.</h2><p>Use a fictional team account to explore Concourse. This is not production authentication. Your changes are shared and saved by the server.</p>{error != null && <Notice error={error} retry={() => void bootstrap()} />}<div className="accounts">{accounts.map(account => <button className="account" key={account.id} disabled={!!signingIn} onClick={() => void signIn(account)}><span className="avatar">{initials(account.name)}</span><span><strong>{account.name}</strong><small>{roleName(account.role)} · {account.id}</small></span><Icon name="arrow" />{signingIn === account.id && <span role="status">Connecting…</span>}</button>)}</div>{!accounts.length && error == null && <Empty title="Demo sign-in isn’t available">Demo accounts are disabled in production. Start the development API service and retry.</Empty>}</section></main>

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to main content</a>
    <aside className="sidebar"><Brand /><div className="workspace-label">TEAM WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(link => <button key={link.id} aria-current={view === link.id ? 'page' : undefined} className={view === link.id ? 'nav-item selected' : 'nav-item'} onClick={() => { setView(link.id); setSelectedId(''); clearFilters() }}><Icon name={link.id} />{link.label}{link.id === 'work' && <span className="nav-count">{items.filter(item => item.assigneeId === user.id).length}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="demo-label">Demo workspace</div><p>Server-backed. Team-shared.<br />Refresh to see the latest changes.</p><div className="person"><span className="avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{roleName(user.role)}</small></div></div><button className="switch-account" disabled={loading} onClick={() => void signOut()}>Sign out / switch account</button></div></aside>
    <div className="workspace"><header className="topbar"><label className="project-picker"><span>Project</span><select value={projectId} onChange={event => changeProject(event.target.value)} disabled={!projects.length}>{!projects.length && <option value="">No projects yet</option>}{projects.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label><div className="topbar-actions"><span className="live-label">Development demo</span><button aria-label="Refresh workspace" onClick={refresh} disabled={loading}><Icon name="refresh" /><span>Refresh</span></button></div></header>
      <main id="main" tabIndex={-1}>
        {view !== 'quality' && <div className="page-heading"><div><h1>{view === 'overview' ? 'A clear view of what’s next.' : navigation.find(link => link.id === view)?.label}</h1><p>{view === 'overview' ? project?.description || 'Bring your team’s next project into focus.' : view === 'work' ? 'Your assigned work, across every stage of delivery.' : view === 'review' ? 'Requirements, code reviews, and QA handoffs that need a closer look.' : 'Shared priorities. Visible progress. Nothing lost between handoffs.'}</p></div><div className="heading-actions">{canCreateProject(user.role) && <button onClick={() => setModal('project')}>New project</button>}{project && canPlan(user.role) && <button className="primary" onClick={() => setModal('item')}><Icon name="plus" />New work item</button>}</div></div>}
        <div className="announcer" role="status" aria-live="polite">{message}</div>
        {error != null && <Notice error={error} retry={refresh} />}
        {loading && <div className="loading" role="status">Loading the latest workspace data…</div>}
        {!projects.length && !loading && error == null && <Empty title="Make room for your next project">{canCreateProject(user.role) ? 'Create a project to start shaping the backlog together.' : 'Ask a Product Manager or Delivery Manager to create the first project.'}</Empty>}
        {project && !loading && error == null && <>
          {view === 'quality' ? <QualityWorkspace projectId={project.id} /> : view === 'overview' ? <Overview project={project} items={items} onOpen={setSelectedId} onView={setView} activity={activity} readiness={readiness} insightError={insightError} onRefresh={refresh} /> : <>
            <section className="filters" aria-label="Filter work items"><label className="search-field"><span>Search work items</span><input type="search" value={query} placeholder="Search title, ID, or description" onChange={event => setQuery(event.target.value)} /></label><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><label>Assignee<select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Everyone</option><option value="unassigned">Unassigned</option>{users.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label><label>Type<select value={type} onChange={event => setType(event.target.value)}><option value="">All types</option>{itemTypes.map(value => <option key={value}>{value}</option>)}</select></label>{(query || status || assignee || type) && <button onClick={clearFilters}>Clear filters</button>}</section>
            <div className="results-line"><p>{visible.length} {visible.length === 1 ? 'work item' : 'work items'}</p><p>{view === 'board' ? 'Select an item to update its status' : 'Changes are version-checked on save'}</p></div>
            {!visible.length ? <Empty title={items.length ? 'Nothing matches this view' : 'Your backlog starts here'}>{items.length ? 'Try clearing filters, changing views, or checking another project.' : 'Create an initiative, story, or task to give the team a shared starting point.'}</Empty> : view === 'board' ? <div className="board">{lanes.map(lane => <section className="lane" key={lane.name} aria-label={lane.name}><h2>{lane.name}<span>{visible.filter(item => lane.statuses.includes(item.status)).length}</span></h2><div className="lane-content">{visible.filter(item => lane.statuses.includes(item.status)).map(item => <button className="work-card" key={item.id} onClick={() => setSelectedId(item.id)}><div className="card-meta"><span>{item.type}</span><span>{item.priority}</span></div><h3>{item.title}</h3><Badge status={item.status}>{item.status}</Badge><div className="card-footer"><span>{nameOf(item.assigneeId)}</span><span>{item.estimate != null ? `${item.estimate} pts` : 'No estimate'}</span></div></button>)}{!visible.some(item => lane.statuses.includes(item.status)) && <p className="lane-empty">No work here yet</p>}</div></section>)}</div> : <section className="backlog">{(view === 'backlog' ? itemTypes : ['all']).map(group => <div key={group}>{group !== 'all' && <h2 className="group-heading">{group === 'story' ? 'Stories' : `${group.charAt(0).toUpperCase()}${group.slice(1)}s`}<span>{visible.filter(item => item.type === group).length}</span></h2>}{visible.filter(item => group === 'all' || item.type === group).map(item => <button className="item-row" key={item.id} onClick={() => setSelectedId(item.id)}><span className={`type-mark ${item.type}`} aria-hidden="true" /><span className="row-title"><small>{item.id} · {item.type}</small><strong>{item.title}</strong></span><Badge status={item.status}>{item.status}</Badge><span className="row-priority">{item.priority}</span><span className="row-assignee">{nameOf(item.assigneeId)}</span><Icon name="arrow" /></button>)}</div>)}</section>}
          </>}
        </>}
      </main><footer className="workspace-footer"><span>Concourse · Built for the work between teams.</span><span>Manual refresh · No real-time synchronization</span></footer>
    </div>
    {selected && !modal && <Modal title="Work item details" onClose={() => setSelectedId('')}><Details key={`${selected.id}-${selected.version}`} item={selected} user={user} nameOf={nameOf} items={items} onEdit={() => setModal('edit')} onTransition={async to => {
      const generation = identity.current
      const updated = await api.transition(selected, to)
      if (generation === identity.current) mergeItem(updated)
    }} onRefresh={refresh} /></Modal>}
    {modal === 'project' && <Modal title="Create a project" onClose={() => setModal(null)}><ProjectForm onSave={async input => { const created = await api.createProject(input); setProjects(current => [...current, created]); changeProject(created.id); setMessage('Project created. Add the first work item when you’re ready.') }} /></Modal>}
    {(modal === 'item' || modal === 'edit') && <Modal title={modal === 'edit' ? 'Edit work item' : 'Create work item'} onClose={() => setModal(null)}><ItemForm item={modal === 'edit' ? selected : undefined} users={users} items={items} onRefresh={refresh} onSave={async input => { const updated = modal === 'edit' && selected ? await api.updateItem(selected, input) : await api.createItem(projectId, input); mergeItem(updated); setModal(null); setSelectedId(updated.id) }} /></Modal>}
  </div>
}

function Brand() { return <div className="brand"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true"><path d="M5 9h12v5H5zM13 17h12v5H13z" fill="currentColor" /><path d="M18 6l7 5-7 5M12 14l-7 5 7 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg><span>concourse<span className="brand-dot">.</span></span></div> }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('') }

function Overview({ project, items, onOpen, onView, activity, readiness, insightError, onRefresh }: { project: Project; items: WorkItem[]; onOpen: (id: string) => void; onView: (view: View) => void; activity: unknown; readiness: unknown; insightError: unknown; onRefresh: () => void }) {
  const done = items.filter(item => ['Done', 'Accepted'].includes(item.status)).length
  const blocked = items.filter(item => ['Blocked', 'Changes Requested', 'Reopened'].includes(item.status))
  const review = items.filter(item => isReview(item.status))
  return <><section className="project-summary"><div><h2>{project.name}</h2><Badge>{project.status}</Badge></div><div className="delivery-summary"><span><strong>{items.length}</strong> total work items</span><span><strong>{done}</strong> accepted or done</span><span><strong>{review.length}</strong> in review & QA</span><span><strong>{blocked.length}</strong> need attention</span></div><label className="progress-label" htmlFor="delivery-progress">Delivery progress <span>{done} of {items.length} complete</span></label><progress id="delivery-progress" value={done} max={items.length || 1} /></section>
    <div className="overview-grid"><section className="attention"><header className="section-heading"><h2>Keep work moving</h2><button className="text-button" onClick={() => onView('board')}>Open board <Icon name="arrow" /></button></header>{!items.length ? <Empty title="A fresh start">Your team’s work will appear here once the first item is created.</Empty> : <>{(blocked.length ? blocked : review.length ? review : items).slice(0, 6).map(item => <button className="attention-row" key={item.id} onClick={() => onOpen(item.id)}><span><small>{item.type} · {item.priority}</small><strong>{item.title}</strong></span><Badge status={item.status}>{item.status}</Badge></button>)}</>}</section><section className="release-panel"><h2>Release confidence</h2><p>Readiness is evaluated by the server. An open blocking defect prevents acceptance and release readiness.</p>{readiness == null ? <p className="muted">{insightError ? 'Readiness could not be loaded.' : 'Checking release readiness…'}</p> : <ServerRecord value={readiness} />}<button onClick={() => onView('review')}>Review handoffs <Icon name="arrow" /></button></section></div>
    <section className="activity-panel"><header className="section-heading"><h2>Workspace activity</h2><span className="muted">Server audit trail</span></header>{insightError != null && <Notice error={insightError} retry={onRefresh} />}{activity == null ? <p className="muted">{insightError ? 'Activity is unavailable.' : 'Loading activity…'}</p> : Array.isArray(activity) && !activity.length ? <Empty title="No activity yet">Saved changes will create entries in the shared audit trail.</Empty> : <ServerRecord value={activity} />}</section></>
}
function ServerRecord({ value }: { value: unknown }) {
  if (value == null) return <span className="muted">Not provided</span>
  if (Array.isArray(value)) return <ul className="server-list">{value.map((entry, index) => <li key={index}><ServerRecord value={entry} /></li>)}</ul>
  if (typeof value === 'object') return <dl className="server-record">{Object.entries(value).map(([key, entry]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ')}</dt><dd><ServerRecord value={entry} /></dd></div>)}</dl>
  return <span>{typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</span>
}
function Details({ item, user, nameOf, items, onEdit, onTransition, onRefresh }: { item: WorkItem; user: User; nameOf: (id: string | null) => string; items: WorkItem[]; onEdit: () => void; onTransition: (to: Status) => Promise<void>; onRefresh: () => void }) {
  const [to, setTo] = useState<Status | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const options = transitionOptions(user.role, item, user.id)
  return <article className="details"><div className="detail-meta"><span>{item.id} · {item.type}</span><Badge status={item.status}>{item.status}</Badge></div><h3 className="detail-title">{item.title}</h3><p className="description">{item.description || 'No description provided.'}</p><dl className="detail-fields"><div><dt>Assignee</dt><dd>{nameOf(item.assigneeId)}</dd></div><div><dt>Priority</dt><dd>{item.priority}</dd></div><div><dt>Estimate</dt><dd>{item.estimate != null ? `${item.estimate} points` : 'Not estimated'}</dd></div><div><dt>Version</dt><dd>{item.version}</dd></div><div><dt>Last updated</dt><dd>{Number.isNaN(Date.parse(item.updatedAt)) ? item.updatedAt : new Date(item.updatedAt).toLocaleString()}</dd></div></dl><h4>Acceptance criteria</h4>{item.acceptanceCriteria.length ? <ul className="criteria-list">{item.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul> : <p className="muted">No acceptance criteria yet.</p>}<h4>Dependencies</h4>{item.dependencies.length ? <ul>{item.dependencies.map(id => <li key={id}>{items.find(value => value.id === id)?.title ?? id}</li>)}</ul> : <p className="muted">No dependencies.</p>}
    <section className="transition-panel"><h4>Move work forward</h4><p>Available actions reflect your role, assignment, and current status. The server also validates requirements, dependencies, review approvals, QA evidence, and version conflicts.</p>{canReview(user.role) && isReview(item.status) && <p className="review-note">Requirements and code approvals must be recorded before leaving their review states; acceptance requires passing QA evidence. Record that evidence through the collaboration controls before advancing the item.</p>}{error != null && <Notice error={error} retry={onRefresh} />}{options.length ? <form className="transition-form" onSubmit={async event => { event.preventDefault(); if (!to) return; setBusy(true); setError(null); try { await onTransition(to) } catch (cause) { setError(cause) } finally { setBusy(false) } }}><label>Next status<select value={to} onChange={event => setTo(event.target.value as Status)} required><option value="">Choose a status</option>{options.map(value => <option key={value}>{value}</option>)}</select></label><button className="primary" disabled={busy || !to}>{busy ? 'Updating…' : 'Update status'}</button></form> : <p className="muted">No status changes are available for your role and assignment in this state.</p>}</section><footer className="detail-footer">{canEdit(user.role, item) ? <button onClick={onEdit}>Edit details & assignment</button> : <p className="muted">Scope editing requires a planning role and a planning state. Developers cannot edit scope or assignment.</p>}<button onClick={onRefresh}>Refresh latest version</button></footer></article>
}
export default App
