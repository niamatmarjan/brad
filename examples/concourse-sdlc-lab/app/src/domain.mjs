export const STATUSES = ['backlog', 'in-progress', 'review', 'done'];

export const STATUS_LABELS = {
  backlog: 'Ready',
  'in-progress': 'In progress',
  review: 'In review',
  done: 'Done'
};

export const PRIORITY_LABELS = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

const elevatedRoles = new Set([
  'product-manager',
  'delivery-manager',
  'technical-lead',
  'solution-architect'
]);

export function canManageTask(user, task) {
  return elevatedRoles.has(user.role) || user.id === task.assigneeId;
}

export function canDeleteTask(user, task) {
  return elevatedRoles.has(user.role) || user.id === task.createdBy;
}

export function moveTask(tasks, taskId, status, actor, now = new Date().toISOString()) {
  if (!STATUSES.includes(status)) throw new Error(`Unknown task status: ${status}`);
  const task = tasks.find(item => item.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status === status) return tasks;
  return tasks.map(item => item.id === taskId
    ? {
        ...item,
        status,
        updatedAt: now,
        activity: [{ id: crypto.randomUUID(), actorId: actor.id, kind: 'status', text: `Moved to ${STATUS_LABELS[status]}`, at: now }, ...item.activity]
      }
    : item);
}

export function filterTasks(tasks, { query = '', priority = 'all', assignee = 'all', project = 'all' } = {}) {
  const normalized = query.trim().toLocaleLowerCase();
  return tasks.filter(task => {
    const matchesText = !normalized || `${task.title} ${task.description} ${task.tags.join(' ')}`.toLocaleLowerCase().includes(normalized);
    return matchesText
      && (priority === 'all' || task.priority === priority)
      && (assignee === 'all' || task.assigneeId === assignee)
      && (project === 'all' || task.projectId === project);
  });
}

export function getProgress(tasks) {
  if (!tasks.length) return 0;
  return Math.round(tasks.filter(task => task.status === 'done').length / tasks.length * 100);
}
