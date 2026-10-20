import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { ItemInput, Project, User, WorkItem } from './api'
import { ApiError, itemTypes, priorities } from './api'
import { errorMessage, itemInput } from './domain'

export function Icon({ name }: { name: 'overview' | 'board' | 'backlog' | 'work' | 'review' | 'quality' | 'arrow' | 'plus' | 'refresh' | 'close' }) {
  const paths = {
    overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    board: 'M3 4h5v16H3z M10 4h5v11h-5z M17 4h5v8h-5z',
    backlog: 'M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01',
    work: 'M8 6V3h8v3 M3 6h18v14H3z M3 11h18 M10 11v3h4v-3',
    review: 'M9 11l3 3 8-8 M20 12v8H4V4h12',
    quality: 'M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    plus: 'M12 5v14 M5 12h14',
    refresh: 'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-2l2 3 M4 16l2 3a7 7 0 0 0 12-2',
    close: 'M6 6l12 12 M6 18L18 6',
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function Badge({ children, status = '' }: { children: ReactNode; status?: string }) {
  const tone = ['Done', 'Accepted'].includes(status) ? 'good' : ['Blocked', 'Changes Requested', 'Reopened'].includes(status) ? 'warning' : status === 'In Development' || status.includes('Review') || status.includes('QA') ? 'active' : ''
  return <span className={`badge ${tone}`}>{children}</span>
}
export function Notice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="notice" role="alert"><strong>{error instanceof ApiError ? error.code === 'VERSION_CONFLICT' ? 'This item changed in another session.' : error.status === 403 ? 'This action is not permitted.' : 'We couldn’t complete that request.' : 'We couldn’t complete that request.'}</strong><p>{errorMessage(error)}</p>{error instanceof ApiError && error.status === 409 && <p>Refresh the latest version, then review your changes before trying again. Your form is kept open.</p>}{retry && <button type="button" onClick={retry}>Retry</button>}</div>
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty"><h3>{title}</h3><p>{children}</p></div>
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => { dialog.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose() }}><header className="dialog-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></header>{children}</dialog>
}
export function ProjectForm({ onSave }: { onSave: (input: Pick<Project, 'name' | 'description'>) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true); setError(null)
    try { await onSave({ name: String(data.get('name')).trim(), description: String(data.get('description')).trim() }) }
    catch (cause) { setError(cause) }
    finally { setBusy(false) }
  }
  return <form className="editor" onSubmit={submit}>{error != null && <Notice error={error} />}<label>Project name<input name="name" required maxLength={160} autoFocus placeholder="e.g. Customer onboarding" /></label><label>Description<textarea name="description" rows={4} required placeholder="What will this team deliver?" /></label><footer><p>Saved to the shared workspace.</p><button className="primary" disabled={busy}>{busy ? 'Creating project…' : 'Create project'}</button></footer></form>
}
export function ItemForm({ item, users, items, onSave, onRefresh }: { item?: WorkItem; users: User[]; items: WorkItem[]; onSave: (input: ItemInput) => Promise<void>; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true); setError(null)
    try {
      await onSave(itemInput(data, item?.type))
    } catch (cause) { setError(cause) }
    finally { setBusy(false) }
  }
  return <form className="editor" onSubmit={submit}>
    {error != null && <Notice error={error} retry={error instanceof ApiError && error.status === 409 ? onRefresh : undefined} />}
    <label>Title<input name="title" defaultValue={item?.title} required maxLength={240} autoFocus /></label>
    <div className="form-grid"><label>Work item type<select name="type" disabled={!!item} defaultValue={item?.type ?? 'story'} aria-describedby={item ? 'immutable-type' : undefined}>{itemTypes.map(type => <option key={type} value={type}>{type}</option>)}</select>{item && <span className="muted" id="immutable-type">Type cannot be changed after creation.</span>}</label>
      <label>Priority<select name="priority" defaultValue={item?.priority ?? 'medium'}>{priorities.map(priority => <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>)}</select></label></div>
    <label>Description<textarea name="description" rows={3} defaultValue={item?.description} /></label>
    <label>Acceptance criteria<textarea name="criteria" rows={4} defaultValue={item?.acceptanceCriteria.join('\n')} aria-describedby="criteria-help" /></label><small id="criteria-help">One testable outcome per line.</small>
    <div className="form-grid"><label>Assignee<select name="assignee" defaultValue={item?.assigneeId ?? ''}><option value="">Unassigned</option>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label>Estimate<input name="estimate" type="number" min="0" max="10000" step="any" defaultValue={item?.estimate ?? ''} /></label></div>
    <fieldset><legend>Dependencies</legend>{items.filter(other => other.id !== item?.id).length ? <div className="dependency-list">{items.filter(other => other.id !== item?.id).map(other => <label className="checkbox" key={other.id}><input type="checkbox" name="dependencies" value={other.id} defaultChecked={item?.dependencies.includes(other.id)} />{other.title}</label>)}</div> : <p className="muted">No other work items yet.</p>}</fieldset>
    <footer><p>{item ? `Version ${item.version} · checked on save` : 'New items start in Draft.'}</p><button className="primary" disabled={busy}>{busy ? 'Saving…' : item ? 'Save changes' : 'Create work item'}</button></footer>
  </form>
}
