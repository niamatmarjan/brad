import { canDeleteTask, canManageTask, filterTasks, getProgress, PRIORITY_LABELS, STATUSES, STATUS_LABELS, moveTask } from '../src/domain.mjs';

const storageKey = 'concourse-demo-v1';
const palette = ['#d9e9df', '#e9d9d1', '#dce8f2', '#eee2c9', '#e2dcef', '#d9e6e3', '#f0d8d5', '#dbe5cb', '#e8dfd5', '#d9e2ee'];
const seed = {
  users: [
    { id: 'pm-1', name: 'Avery Morgan', role: 'product-manager' },
    { id: 'ba-1', name: 'Jordan Lee', role: 'business-analyst' },
    { id: 'dm-1', name: 'Sam Rivera', role: 'delivery-manager' },
    { id: 'sa-1', name: 'Riley Chen', role: 'solution-architect' },
    { id: 'tl-1', name: 'Taylor Brooks', role: 'technical-lead' },
    { id: 'dev-1', name: 'Casey Patel', role: 'backend-developer' },
    { id: 'dev-2', name: 'Morgan Kim', role: 'frontend-developer' },
    { id: 'dev-3', name: 'Quinn Davis', role: 'fullstack-developer' },
    { id: 'qa-1', name: 'Robin Ellis', role: 'functional-qa' },
    { id: 'qa-2', name: 'Jamie Park', role: 'automation-qa' }
  ],
  projects: [
    { id: 'concourse', name: 'Concourse launch' },
    { id: 'platform', name: 'Platform reliability' },
    { id: 'design', name: 'Design system' }
  ],
  currentUserId: 'pm-1',
  tasks: [
    { id: 'CC-101', projectId: 'concourse', title: 'Agree the first-run workspace journey', description: 'Align onboarding outcomes and the smallest useful first session.', status: 'done', priority: 'high', assigneeId: 'pm-1', createdBy: 'pm-1', tags: ['discovery', 'experience'], comments: [{ id: 'c101', userId: 'ba-1', text: 'The first session should end with one visible team win.', at: '2026-10-16T11:30:00.000Z' }], activity: [{ id: 'a101', actorId: 'pm-1', kind: 'status', text: 'Accepted for sprint 02', at: '2026-10-16T10:00:00.000Z' }], updatedAt: '2026-10-16T11:30:00.000Z' },
    { id: 'CC-102', projectId: 'concourse', title: 'Define role-aware task ownership', description: 'Keep decision authority clear across product, delivery, engineering, and QA.', status: 'review', priority: 'high', assigneeId: 'ba-1', createdBy: 'pm-1', tags: ['permissions', 'rules'], comments: [{ id: 'c102', userId: 'tl-1', text: 'Role switching in this demo is illustrative only; the server has no identity layer.', at: '2026-10-19T08:00:00.000Z' }], activity: [{ id: 'a102', actorId: 'ba-1', kind: 'status', text: 'Moved to In review', at: '2026-10-19T08:00:00.000Z' }], updatedAt: '2026-10-19T08:00:00.000Z' },
    { id: 'CC-103', projectId: 'concourse', title: 'Ship the task state transition API', description: 'Validate allowed states and preserve an auditable change trail.', status: 'in-progress', priority: 'urgent', assigneeId: 'dev-1', createdBy: 'tl-1', tags: ['backend', 'audit'], comments: [], activity: [{ id: 'a103', actorId: 'dev-1', kind: 'status', text: 'Implementation underway', at: '2026-10-19T09:15:00.000Z' }], updatedAt: '2026-10-19T09:15:00.000Z' },
    { id: 'CC-104', projectId: 'concourse', title: 'Build the board and mobile lane layout', description: 'Keep task ownership and status visible at tablet and phone widths.', status: 'in-progress', priority: 'high', assigneeId: 'dev-2', createdBy: 'tl-1', tags: ['frontend', 'responsive'], comments: [], activity: [{ id: 'a104', actorId: 'dev-2', kind: 'status', text: 'Responsive pass started', at: '2026-10-19T10:05:00.000Z' }], updatedAt: '2026-10-19T10:05:00.000Z' },
    { id: 'CC-105', projectId: 'concourse', title: 'Cover task ownership rules with unit tests', description: 'Verify assignee access, elevated roles, and rejected state changes.', status: 'review', priority: 'medium', assigneeId: 'qa-2', createdBy: 'tl-1', tags: ['quality', 'automation'], comments: [{ id: 'c105', userId: 'qa-2', text: 'Please include a case for a contributor editing somebody else’s task.', at: '2026-10-19T12:45:00.000Z' }], activity: [{ id: 'a105', actorId: 'qa-1', kind: 'status', text: 'Functional scenarios reviewed', at: '2026-10-19T12:45:00.000Z' }], updatedAt: '2026-10-19T12:45:00.000Z' },
    { id: 'CC-106', projectId: 'concourse', title: 'Confirm accessible focus order on task details', description: 'Keyboard-only review for dialog open, form controls, and dismissal.', status: 'backlog', priority: 'medium', assigneeId: 'qa-1', createdBy: 'dm-1', tags: ['accessibility', 'qa'], comments: [], activity: [] },
    { id: 'CC-107', projectId: 'concourse', title: 'Join activity history to project pulse', description: 'Surface the latest team updates without turning the feed into a noisy event log.', status: 'backlog', priority: 'low', assigneeId: 'dev-3', createdBy: 'tl-1', tags: ['full-stack', 'activity'], comments: [], activity: [] },
    { id: 'PL-201', projectId: 'platform', title: 'Map the service ownership handoff', description: 'Identify on-call owners and escalation gaps for the next review.', status: 'review', priority: 'medium', assigneeId: 'sa-1', createdBy: 'dm-1', tags: ['architecture', 'handoff'], comments: [], activity: [] },
    { id: 'DS-301', projectId: 'design', title: 'Publish the shared status-color tokens', description: 'Keep task state distinguishable without relying on color alone.', status: 'done', priority: 'low', assigneeId: 'dev-2', createdBy: 'sa-1', tags: ['design-system', 'accessibility'], comments: [], activity: [] },
    { id: 'CC-108', projectId: 'concourse', title: 'Triage the cross-project filter edge case', description: 'Check that search, assignee, and priority filters compose consistently.', status: 'backlog', priority: 'urgent', assigneeId: 'dev-3', createdBy: 'tl-1', tags: ['filters', 'blocked'], comments: [{ id: 'c108', userId: 'dev-3', text: 'Waiting on the final project-switch behavior from Product.', at: '2026-10-19T13:00:00.000Z' }], activity: [] }
  ]
};

let state = loadState();
let activeDetailId = null;
let toastTimer;
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const person = id => state.users.find(user => user.id === id) || { id: '', name: 'Unassigned', role: '' };
const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const avatarTone = id => `avatar-tone-${Math.max(0, state.users.findIndex(user => user.id === id)) % palette.length}`;
const roleLabel = role => role.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const shortDate = value => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)) : '';

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(seed);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) throw new Error('Stored board data is incomplete.');
    return parsed;
  } catch (error) {
    localStorage.removeItem(storageKey);
    console.error('Concourse could not read saved board data; restored the sample board.', error);
    return structuredClone(seed);
  }
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error('Concourse could not persist the latest change in browser storage.', error);
    notify('Change is not saved. Check browser storage and try again.');
    throw error;
  }
}

function currentUser() {
  return person(state.currentUserId);
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

function selectOptions(items, selected, label = item => item.name) {
  return items.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(label(item))}</option>`).join('');
}

function renderSelectors() {
  $('#currentUser').innerHTML = selectOptions(state.users, state.currentUserId, user => `${user.name} · ${roleLabel(user.role)}`);
  $('#assigneeFilter').innerHTML = '<option value="all">Everyone</option>' + selectOptions(state.users, $('#assigneeFilter').value, user => user.name);
  $('#projectFilter').innerHTML = '<option value="all">All projects</option>' + selectOptions(state.projects, $('#projectFilter').value);
  $('#taskAssignee').innerHTML = '<option value="">Unassigned</option>' + selectOptions(state.users, currentUser().id, user => user.name);
  const selectedProject = $('#projectFilter').value === 'all' ? state.projects[0]?.id : $('#projectFilter').value;
  $('#taskProject').innerHTML = selectOptions(state.projects, selectedProject);
  $('#profileName').textContent = currentUser().name;
  $('#profileRole').textContent = roleLabel(currentUser().role);
  $('#profileAvatar').textContent = initials(currentUser().name);
  document.querySelectorAll('[data-project]').forEach(button => {
    const selected = button.dataset.project === $('#projectFilter').value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function taskCard(task) {
  const assignee = person(task.assigneeId);
  const commentCount = task.comments.length;
  const nextStatus = STATUSES[(STATUSES.indexOf(task.status) + 1) % STATUSES.length];
  return `<article class="task-card priority-${escapeHtml(task.priority)}">
    <div class="task-topline"><span class="task-key">${escapeHtml(task.id)}</span><span class="priority-label ${escapeHtml(task.priority)}">${escapeHtml(PRIORITY_LABELS[task.priority] || task.priority)}</span></div>
    <button class="task-title" type="button" data-open-task="${escapeHtml(task.id)}">${escapeHtml(task.title)}</button>
    <p class="task-description">${escapeHtml(task.description)}</p>
    <div class="task-tags">${task.tags.map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="task-footer"><span class="assignee"><span class="avatar ${avatarTone(assignee.id)}">${escapeHtml(initials(assignee.name))}</span>${escapeHtml(assignee.name.split(' ')[0])}</span>
      <span class="task-meta">${commentCount ? `<button type="button" data-open-task="${escapeHtml(task.id)}" aria-label="${commentCount} comments">▤ ${commentCount}</button>` : ''}<button type="button" data-move-task="${escapeHtml(task.id)}" data-next-status="${escapeHtml(nextStatus)}" aria-label="Move ${escapeHtml(task.id)} to ${escapeHtml(STATUS_LABELS[nextStatus])}">↗ ${escapeHtml(STATUS_LABELS[nextStatus])}</button></span>
    </div>
  </article>`;
}

function renderBoard() {
  const filters = {
    query: $('#searchInput').value,
    priority: $('#priorityFilter').value,
    assignee: $('#assigneeFilter').value,
    project: $('#projectFilter').value
  };
  const matching = filterTasks(state.tasks, filters);
  $('#boardCount').textContent = matching.length;
  const project = state.projects.find(item => item.id === filters.project);
  document.querySelector('.breadcrumbs strong').textContent = project?.name || 'All projects';
  document.querySelector('.page-heading h1').innerHTML = project
    ? `${escapeHtml(project.name.split(' ')[0])} <em>in motion.</em>`
    : 'Work in <em>motion.</em>';
  $('#boardColumns').innerHTML = STATUSES.map((status, index) => {
    const items = matching.filter(task => task.status === status);
    const lineClass = ['ready', 'progress', 'review', 'done'][index];
    return `<section class="board-column" aria-labelledby="heading-${status}">
      <h2 class="column-heading" id="heading-${status}">${escapeHtml(STATUS_LABELS[status].toUpperCase())}<span class="column-count">${items.length}</span><span class="column-line ${lineClass}"></span></h2>
      <div class="task-list">${items.map(taskCard).join('') || '<p class="empty-column">Nothing here yet</p>'}</div>
    </section>`;
  }).join('');
  const boardTasks = state.tasks.filter(task => filters.project === 'all' || task.projectId === filters.project);
  const progress = getProgress(boardTasks);
  $('#progressValue').textContent = progress;
  $('#progressBar').value = progress;
  $('#doneCount').textContent = boardTasks.filter(task => task.status === 'done').length;
  $('#totalCount').textContent = boardTasks.length;
  $('#activeCount').textContent = boardTasks.filter(task => ['in-progress', 'review'].includes(task.status)).length;
  $('#urgentCount').textContent = boardTasks.filter(task => task.priority === 'urgent' && task.status !== 'done').length;
  $('#teamCount').textContent = state.users.length;
  const visiblePeople = state.users.slice(0, 5).map(user => `<span class="avatar ${avatarTone(user.id)}" title="${escapeHtml(user.name)}">${escapeHtml(initials(user.name))}</span>`).join('');
  const remainingPeople = state.users.length > 5 ? `<span class="avatar-more" title="${state.users.length - 5} more roles">+${state.users.length - 5}</span>` : '';
  $('#teamAvatars').innerHTML = visiblePeople + remainingPeople;
  renderActivity();
  renderNotifications();
}

function renderActivity() {
  const entries = state.tasks.flatMap(task => task.activity.map(event => ({ ...event, task })))
    .sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 3);
  $('#activityFeed').innerHTML = entries.length ? entries.map(event => `<div class="pulse-item"><span class="pulse-dot"></span><span><strong>${escapeHtml(person(event.actorId).name.split(' ')[0])}</strong> ${escapeHtml(event.text.toLowerCase())} · ${escapeHtml(event.task.title)}</span><time>${escapeHtml(shortDate(event.at))}</time></div>`).join('') : '<div class="pulse-item">No updates yet. Move a task or add a note to start the team pulse.</div>';
}

function renderNotifications() {
  const count = state.tasks.flatMap(task => task.comments).filter(comment => comment.text.includes(`@${currentUser().name.split(' ')[0]}`)).length;
  const badge = $('#notificationCount');
  badge.textContent = count;
  badge.hidden = count === 0;
}

function render() {
  renderSelectors();
  renderBoard();
}

function openTask(taskId) {
  const task = taskId ? state.tasks.find(item => item.id === taskId) : null;
  const form = $('#taskForm');
  form.reset();
  $('#taskId').value = task?.id || '';
  $('#dialogTitle').textContent = task ? 'Update work item' : 'New work item';
  $('#taskTitle').value = task?.title || '';
  $('#taskDescription').value = task?.description || '';
  $('#taskAssignee').value = task?.assigneeId || currentUser().id;
  $('#taskPriority').value = task?.priority || 'medium';
  $('#taskStatus').value = task?.status || 'backlog';
  $('#taskProject').value = task?.projectId || state.projects[0]?.id;
  const canEdit = task ? canManageTask(currentUser(), task) : true;
  for (const control of form.querySelectorAll('input, textarea, select')) control.disabled = control.id === 'taskId' || !canEdit;
  $('#deleteTaskButton').hidden = !task || !canDeleteTask(currentUser(), task);
  $('#taskDialog').showModal();
}

function saveTask(event) {
  event.preventDefault();
  const id = $('#taskId').value;
  const existing = state.tasks.find(task => task.id === id);
  if (existing && !canManageTask(currentUser(), existing)) {
    notify('Only the assignee or a delivery lead can update this item.');
    return;
  }
  const now = new Date().toISOString();
  const fields = {
    title: $('#taskTitle').value.trim(),
    description: $('#taskDescription').value.trim(),
    assigneeId: $('#taskAssignee').value,
    priority: $('#taskPriority').value,
    status: $('#taskStatus').value,
    projectId: $('#taskProject').value
  };
  if (!fields.title) return;
  if (existing) {
    const changedStatus = existing.status !== fields.status;
    Object.assign(existing, fields, { updatedAt: now });
    if (changedStatus) existing.activity.unshift({ id: crypto.randomUUID(), actorId: currentUser().id, kind: 'status', text: `Moved to ${STATUS_LABELS[fields.status]}`, at: now });
    notify('Work item updated.');
  } else {
    const nextNumber = Math.max(100, ...state.tasks.filter(task => task.projectId === fields.projectId).map(task => Number(task.id.split('-').at(-1)) || 100)) + 1;
    state.tasks.unshift({ id: `${fields.projectId === 'concourse' ? 'CC' : fields.projectId.toUpperCase()}-${nextNumber}`, ...fields, createdBy: currentUser().id, tags: [], comments: [], activity: [{ id: crypto.randomUUID(), actorId: currentUser().id, kind: 'created', text: 'Created this work item', at: now }], updatedAt: now });
    notify('Work item created.');
  }
  persist();
  $('#taskDialog').close();
  $('#projectFilter').value = state.projects[0]?.id || 'all';
  render();
}

function openDetails(taskId) {
  activeDetailId = taskId;
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  $('#detailTitle').textContent = task.title;
  $('#detailDescription').textContent = task.description || 'No additional context yet.';
  $('#detailMeta').innerHTML = `<span class="detail-pill">${escapeHtml(task.id)}</span><span class="detail-pill">${escapeHtml(STATUS_LABELS[task.status])}</span><span class="detail-pill">${escapeHtml(PRIORITY_LABELS[task.priority])} priority</span><span class="detail-pill">Owner: ${escapeHtml(person(task.assigneeId).name)}</span>`;
  $('#commentCount').textContent = `(${task.comments.length})`;
  $('#commentList').innerHTML = task.comments.map(comment => `<article class="comment"><div class="comment-head"><span>${escapeHtml(person(comment.userId).name)}</span><time>${escapeHtml(shortDate(comment.at))}</time></div><p>${escapeHtml(comment.text)}</p></article>`).join('') || '<p class="task-description">No notes yet. Add context for the next person.</p>';
  $('#detailDialog').showModal();
}

function addComment(event) {
  event.preventDefault();
  const task = state.tasks.find(item => item.id === activeDetailId);
  const text = $('#commentInput').value.trim();
  if (!task || !text) return;
  const now = new Date().toISOString();
  task.comments.push({ id: crypto.randomUUID(), userId: currentUser().id, text, at: now });
  task.activity.unshift({ id: crypto.randomUUID(), actorId: currentUser().id, kind: 'comment', text: 'added a note', at: now });
  persist();
  $('#commentInput').value = '';
  openDetails(task.id);
  render();
  notify('Note added to the work item.');
}

function deleteTask() {
  const id = $('#taskId').value;
  const task = state.tasks.find(item => item.id === id);
  if (!task || !canDeleteTask(currentUser(), task)) {
    notify('You do not have permission to delete this item.');
    return;
  }
  state.tasks = state.tasks.filter(item => item.id !== id);
  persist();
  $('#taskDialog').close();
  render();
  notify('Work item deleted.');
}

$('#currentUser').addEventListener('change', event => {
  state.currentUserId = event.target.value;
  persist();
  render();
  notify(`Viewing as ${currentUser().name}. Role controls are for demonstration only.`);
});
$('#searchInput').addEventListener('input', renderBoard);
$('#priorityFilter').addEventListener('change', renderBoard);
$('#assigneeFilter').addEventListener('change', renderBoard);
$('#projectFilter').addEventListener('change', render);
$('#newTaskButton').addEventListener('click', () => openTask());
$('#taskForm').addEventListener('submit', saveTask);
$('#deleteTaskButton').addEventListener('click', deleteTask);
$('#commentForm').addEventListener('submit', addComment);
$('#boardColumns').addEventListener('click', event => {
  const open = event.target.closest('[data-open-task]');
  if (open) openDetails(open.dataset.openTask);
  const move = event.target.closest('[data-move-task]');
  if (move) {
    const task = state.tasks.find(item => item.id === move.dataset.moveTask);
    if (!task || !canManageTask(currentUser(), task)) {
      notify('Only the assignee or a delivery lead can move this item.');
      return;
    }
    state.tasks = moveTask(state.tasks, task.id, move.dataset.nextStatus, currentUser());
    persist();
    render();
    notify(`Moved to ${STATUS_LABELS[move.dataset.nextStatus]}.`);
  }
});
document.querySelector('.side-section').addEventListener('click', event => {
  const project = event.target.closest('[data-project]');
  if (!project) return;
  $('#projectFilter').value = project.dataset.project;
  render();
});
$('#resetButton').addEventListener('click', () => {
  state = structuredClone(seed);
  localStorage.removeItem(storageKey);
  $('#searchInput').value = '';
  $('#priorityFilter').value = 'all';
  $('#assigneeFilter').value = 'all';
  render();
  notify('Sample board restored in this browser.');
});
$('#listToggle').addEventListener('click', event => {
  const board = $('#boardColumns');
  const listMode = board.classList.toggle('list-view');
  event.currentTarget.classList.toggle('active', listMode);
  document.querySelector('.view-tab.active')?.classList.remove('active');
  event.currentTarget.classList.add('active');
  document.querySelector('.view-tab:not(#listToggle)')?.classList.toggle('active', !listMode);
});
$('#notificationsButton').addEventListener('click', () => {
  const mentions = state.tasks.flatMap(task => task.comments.map(comment => ({ task, comment })))
    .filter(({ comment }) => comment.text.includes(`@${currentUser().name.split(' ')[0]}`));
  if (!mentions.length) {
    notify('No mentions for this role yet.');
    return;
  }
  openDetails(mentions.at(-1).task.id);
});
$('#profileButton').addEventListener('click', () => $('#currentUser').focus());
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => $('#taskDialog').close()));
document.querySelector('.close-detail').addEventListener('click', () => $('#detailDialog').close());
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    $('#searchInput').focus();
  }
});

render();
