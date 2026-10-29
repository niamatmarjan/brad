/** Optional BRAD handoff checkpoints. Native BMAD owns tickets and approval evidence. */
import { readFileSync, writeFileSync, lstatSync, mkdirSync, renameSync, unlinkSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const TASK_STAGES = Object.freeze(Object.fromEntries([
  'INITIALIZED', 'IN_DEVELOPMENT', 'QA_PENDING', 'QA_DEFECT_IDENTIFIED', 'REVIEW_PENDING',
  'REVIEW_REMEDIATION_REQUIRED', 'ACCEPTED', 'REJECTED', 'INTERRUPTED'
].map(name => [name, name])));
export const ROLES = Object.freeze(Object.fromEntries(['DEVELOPER', 'QA', 'REVIEWER', 'OPERATOR'].map(name => [name, name])));
export const EXECUTION_MODES = Object.freeze(Object.fromEntries([
  'HOST_NATIVE_SKILL_INVOKED', 'INLINE_WORKFLOW_INLINE', 'SPECIALIST_DISPATCHED', 'HELPER_SCRIPTS_ONLY', 'NOT_VERIFIED'
].map(name => [name, name])));

const owners = { INITIALIZED: 'DEVELOPER', IN_DEVELOPMENT: 'DEVELOPER', QA_PENDING: 'QA',
  QA_DEFECT_IDENTIFIED: 'DEVELOPER', REVIEW_PENDING: 'REVIEWER',
  REVIEW_REMEDIATION_REQUIRED: 'DEVELOPER', ACCEPTED: 'OPERATOR', REJECTED: 'OPERATOR' };
const now = () => new Date().toISOString();
const sha256 = content => createHash('sha256').update(content).digest('hex');
const terminal = state => ['ACCEPTED', 'REJECTED'].includes(state.stage);

function validId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,159}$/i.test(id) || id.endsWith('.') ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(id)) throw new Error('Invalid taskId: use a portable filename with letters, digits, dots, underscores or hyphens');
  return id;
}
function validPath(path) {
  if (typeof path !== 'string' || !path || /^(?:[a-z]:|[\\/])/i.test(path) ||
    path.includes('\0') || path.split(/[\\/]/).some(part => !part || part === '..' || part === '.')) throw new Error('Invalid deliverable path: expected a relative project file');
  return path.replace(/\\/g, '/');
}
function validate(state) {
  if (!state || typeof state !== 'object') throw new Error('Invalid task state');
  validId(state.taskId);
  if (!Object.values(TASK_STAGES).includes(state.stage) || !Object.values(ROLES).includes(state.currentRole) ||
    (state.stage !== 'INTERRUPTED' && owners[state.stage] !== state.currentRole)) throw new Error('Invalid task state stage or role');
  if (!Object.values(EXECUTION_MODES).includes(state.executionMode)) throw new Error('Invalid execution mode');
  for (const key of ['title', 'intent', 'branch', 'baseBranch']) {
    if (typeof state[key] !== 'string' || !state[key]) throw new Error(`Invalid task state ${key}`);
  }
  if (state.interruptedStage != null && (!Object.hasOwn(owners, state.interruptedStage) ||
    owners[state.interruptedStage] !== state.currentRole)) throw new Error('Invalid interrupted stage or role');
  if (!Number.isSafeInteger(state.revision ?? 0) || (state.revision ?? 0) < 0) throw new Error('Invalid state revision');
  for (const key of ['deliverables', 'blockers', 'defects', 'reviewDecisions', 'history']) {
    if (!Array.isArray(state[key])) throw new Error(`Invalid task state: ${key} must be an array`);
  }
  if (!state.blockers.every(b => typeof b === 'string') || !state.history.every(h => h && typeof h.action === 'string')) throw new Error('Invalid task state blockers or history');
  for (const d of state.deliverables) {
    validPath(d?.path);
    if (d.sha256 !== 'UNKNOWN' && !/^[a-f0-9]{64}$/i.test(d.sha256 ?? '')) throw new Error('Invalid deliverable digest');
  }
  if (!state.defects.every(d => d && typeof d.defectId === 'string' && ['OPEN', 'RESOLVED'].includes(d.status)) ||
    new Set(state.defects.map(d => d.defectId)).size !== state.defects.length) throw new Error('Invalid or duplicate defect');
  if (!state.reviewDecisions.every(r => r && ['APPROVED', 'REMEDIATION_REQUIRED'].includes(r.status))) throw new Error('Invalid review decision');
  return state;
}
function requireStage(state, role, stages, operation) {
  validate(state);
  if (state.currentRole !== role) throw new Error(`Cannot ${operation}: current role is ${state.currentRole}, expected ${role}`);
  if (!stages.includes(state.stage)) throw new Error(`Cannot ${operation} at stage ${state.stage}`);
}
function record(state, changes, role, action, note, detail = {}) {
  return { ...state, ...changes, history: [...state.history,
    { timestamp: now(), role, action, stage: changes.stage ?? state.stage, note, ...detail }] };
}
function fileRecords(files) {
  if (!Array.isArray(files) || !files.length) throw new Error('Developer submission must include at least one deliverable file');
  const records = files.map(f => {
    const path = validPath(f?.path);
    const digest = f.content !== undefined ? sha256(f.content) : f.sha256;
    if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/i.test(digest)) throw new Error('Deliverable requires content or a SHA-256 digest');
    return { path, sha256: digest.toLowerCase(), description: f.description || 'Source file deliverable' };
  });
  if (new Set(records.map(f => f.path)).size !== records.length) throw new Error('Duplicate deliverable path');
  return records;
}
function requireClear(state) {
  const open = state.defects.filter(d => d.status === 'OPEN');
  if (open.length) throw new Error(`QA cannot accept deliverable while open defects exist: ${open.map(d => d.defectId).join(', ')}`);
  if (state.blockers.length) throw new Error('Cannot accept deliverable with unresolved blockers');
  if (!state.deliverables.length) throw new Error('Cannot accept an empty deliverable');
  if (state.deliverables.some(d => d.sha256 === 'UNKNOWN')) throw new Error('Cannot accept an unverified deliverable digest; resubmit its bytes');
}

export function createTaskState(options = {}) {
  const taskId = validId(typeof options.taskId === 'string' ? options.taskId.trim() : options.taskId);
  return validate({ taskId, title: options.title || `Task ${taskId}`, intent: options.intent || 'BUILD_WORK_UNIT',
    currentRole: 'DEVELOPER', stage: 'INITIALIZED', executionMode: options.executionMode || 'NOT_VERIFIED',
    branch: options.branch || `feat/${taskId.toLowerCase()}`, baseBranch: options.baseBranch || 'main',
    revision: 0, deliverables: [], blockers: [], defects: [], reviewDecisions: [],
    history: [{ timestamp: now(), role: 'OPERATOR', action: 'TASK_INITIALIZED', stage: 'INITIALIZED', note: `Task ${taskId} initialized` }] });
}

export function developerSubmitDeliverable(state, payload = {}) {
  requireStage(state, 'DEVELOPER', ['INITIALIZED', 'IN_DEVELOPMENT', 'QA_DEFECT_IDENTIFIED', 'REVIEW_REMEDIATION_REQUIRED'], 'submit deliverable');
  const deliverables = fileRecords(payload.files);
  return record(state, { deliverables, commitSha: payload.commitSha || state.commitSha || null,
    currentRole: 'QA', stage: 'QA_PENDING' }, 'DEVELOPER', 'DELIVERABLE_SUBMITTED',
  payload.notes || `Submitted ${deliverables.length} deliverable file(s)`, { deliverablesSummary: deliverables.map(d => d.path) });
}

export function qaIdentifyDefect(state, payload = {}) {
  requireStage(state, 'QA', ['QA_PENDING'], 'record defect');
  const defectId = payload.defectId || `DEFECT-${state.taskId}-${state.defects.length + 1}`;
  if (typeof defectId !== 'string' || state.defects.some(d => d.defectId === defectId)) throw new Error('Invalid or duplicate defectId');
  const description = payload.description || 'QA acceptance check failure';
  const defect = { defectId, reportedBy: 'QA', severity: payload.severity || 'HIGH', description,
    failingChecks: payload.failingChecks || [], reportedAt: now(), status: 'OPEN' };
  return record(state, { defects: [...state.defects, defect], blockers: [...state.blockers, `Defect ${defectId}: ${description}`],
    currentRole: 'DEVELOPER', stage: 'QA_DEFECT_IDENTIFIED' }, 'QA', 'DEFECT_IDENTIFIED', description, { defectId });
}

export function qaAcceptDeliverable(state, payload = {}) {
  requireStage(state, 'QA', ['QA_PENDING'], 'accept deliverable');
  requireClear(state);
  return record(state, { currentRole: 'REVIEWER', stage: 'REVIEW_PENDING' }, 'QA', 'QA_VERIFIED_PASS',
    payload.notes || 'QA acceptance reported; submitted for peer review');
}

export function reviewerAssess(state, payload = {}) {
  requireStage(state, 'REVIEWER', ['REVIEW_PENDING'], 'assess review');
  const { status } = payload;
  if (!['APPROVED', 'REMEDIATION_REQUIRED'].includes(status)) throw new Error('Review decision status must be APPROVED or REMEDIATION_REQUIRED');
  if (status === 'APPROVED') requireClear(state);
  const decisionId = `REV-${state.taskId}-${state.reviewDecisions.length + 1}`;
  const decision = { decisionId, reviewer: 'REVIEWER', status, comments: payload.comments || status, timestamp: now() };
  const approved = status === 'APPROVED';
  return record(state, { reviewDecisions: [...state.reviewDecisions, decision],
    blockers: approved ? state.blockers : [...state.blockers, `Reviewer Remediation (${decisionId}): ${decision.comments}`],
    currentRole: approved ? 'OPERATOR' : 'DEVELOPER', stage: approved ? 'ACCEPTED' : 'REVIEW_REMEDIATION_REQUIRED' },
  'REVIEWER', approved ? 'REVIEW_APPROVED' : 'REVIEW_REMEDIATION_REQUIRED', decision.comments, { decisionId });
}

export function developerApplyCorrection(state, payload = {}) {
  requireStage(state, 'DEVELOPER', ['QA_DEFECT_IDENTIFIED', 'REVIEW_REMEDIATION_REQUIRED'], 'apply correction');
  if (payload.resolvedDefectIds !== undefined && !Array.isArray(payload.resolvedDefectIds)) throw new Error('resolvedDefectIds must be an array');
  const resolved = new Set(payload.resolvedDefectIds || []);
  for (const id of resolved) if (!state.defects.some(d => d.defectId === id && d.status === 'OPEN')) throw new Error(`Unknown or closed defect: ${id}`);
  const defects = state.defects.map(d => resolved.has(d.defectId) ? { ...d, status: 'RESOLVED', resolvedAt: now() } : d);
  const blockers = state.blockers.filter(b => ![...resolved].some(id => b.startsWith(`Defect ${id}: `)) &&
    !(payload.clearReviewBlockers && b.startsWith('Reviewer Remediation (')));
  const deliverables = new Map(state.deliverables.map(d => [d.path, d]));
  if (payload.files !== undefined) for (const file of fileRecords(payload.files)) deliverables.set(file.path, file);
  return record(state, { deliverables: [...deliverables.values()], defects, blockers,
    commitSha: payload.commitSha || state.commitSha || null, currentRole: 'QA', stage: 'QA_PENDING' },
  'DEVELOPER', 'CORRECTION_APPLIED', payload.explanation || `Applied correction for ${resolved.size} defect(s)`, { resolvedDefectIds: [...resolved] });
}

export function interruptTask(state, reason = 'Host session paused or interrupted') {
  validate(state);
  if (terminal(state)) throw new Error('Cannot interrupt a terminal task');
  return record(state, { stage: 'INTERRUPTED', interruptedAt: now(), interruptionReason: reason,
    interruptedStage: state.interruptedStage || state.stage }, 'OPERATOR', 'TASK_INTERRUPTED', reason);
}

export function resumeTask(state) {
  validate(state);
  if (state.stage !== 'INTERRUPTED') throw new Error('Only an interrupted task can resume');
  // Older checkpoints recorded the original stage in history, not in a field.
  const stage = state.interruptedStage || [...state.history].reverse().find(h => h.stage && h.stage !== 'INTERRUPTED')?.stage;
  if (!Object.hasOwn(owners, stage) || ['ACCEPTED', 'REJECTED'].includes(stage)) throw new Error('Cannot recover interrupted stage; inspect native state');
  return record(state, { stage, currentRole: owners[stage], interruptedStage: null, resumedAt: now() }, 'OPERATOR', 'TASK_RESUMED', `Resumed ${state.taskId} at ${stage}`);
}

function stat(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function statePath(taskId, projectRoot) {
  validId(taskId);
  let path = resolve(projectRoot || '.');
  for (const part of ['.brad', 'state', `${taskId.toLowerCase()}.json`]) {
    path = join(path, part);
    if (stat(path)?.isSymbolicLink()) throw new Error(`Refusing symlinked state path: ${path}`);
  }
  return path;
}

export function loadTaskState(taskId, projectRoot) {
  const path = statePath(taskId, projectRoot);
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  let state;
  try { state = validate(JSON.parse(raw)); } catch (error) { throw new Error(`Invalid saved task state: ${error.message}`); }
  if (state.taskId !== taskId) throw new Error('Task identity mismatch in saved state');
  return state;
}

export function saveTaskState(state, projectRoot) {
  validate(state);
  const path = statePath(state.taskId, projectRoot);
  mkdirSync(join(resolve(projectRoot || '.'), '.brad', 'state'), { recursive: true });
  const lock = `${path}.lock`;
  const fd = openSync(lock, 'wx', 0o600);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const previous = loadTaskState(state.taskId, projectRoot);
    if ((previous?.revision ?? 0) !== (state.revision ?? 0)) throw new Error('Stale state revision: reload the changed checkpoint before saving');
    const revision = (state.revision ?? 0) + 1;
    const staged = openSync(temporary, 'wx', 0o600);
    try { writeFileSync(staged, JSON.stringify({ ...state, revision }, null, 2) + '\n'); fsyncSync(staged); }
    finally { closeSync(staged); }
    renameSync(temporary, path);
    // Saving advances this snapshot's revision, so subsequent copies carry its lease.
    state.revision = revision;
    return path;
  } finally {
    closeSync(fd);
    if (stat(temporary)) unlinkSync(temporary);
    unlinkSync(lock);
  }
}

export function detectExistingWork(taskId, projectRoot, options = {}) {
  const state = loadTaskState(taskId, projectRoot);
  if (state) {
    const status = state.stage === 'INTERRUPTED' ? 'INTERRUPTED_FOUND' : terminal(state) ? 'ALREADY_COMPLETED' : 'ACTIVE_FOUND';
    return { status, taskId, branch: state.branch, stage: state.stage, taskState: state,
      action: status === 'INTERRUPTED_FOUND' ? 'RESUME_RECOMMENDED' : status === 'ALREADY_COMPLETED' ? 'DO_NOT_REGENERATE' : 'CONTINUE_ACTIVE' };
  }
  const candidates = [`feat/${taskId.toLowerCase()}`, `feat/${taskId.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`];
  const branch = (options.branches || []).find(b => candidates.some(candidate => b === candidate || b.endsWith(`/${candidate}`)));
  return branch ? { status: 'BRANCH_EXISTS_NO_STATE', taskId, branch, action: 'INSPECT_BRANCH' } :
    { status: 'NO_PREVIOUS_WORK', taskId, action: 'START_FRESH' };
}

/** Advisory inspection only; saving a checkpoint does not lock workflow execution. */
export function guardDuplicateRequest(taskId, projectRoot, options = {}) {
  const detection = detectExistingWork(taskId, projectRoot, options);
  const completed = detection.status === 'ALREADY_COMPLETED';
  const existing = detection.status !== 'NO_PREVIOUS_WORK';
  return { canProceed: !completed && (!existing || options.allowActiveContinuation === true), detection,
    ...(completed ? { reason: `Task ${taskId} already marked ${detection.stage}; inspect native completion evidence before repeating.` } :
      existing && !options.allowActiveContinuation ? { reason: 'Existing work requires explicit continuation and branch inspection.' } : {}) };
}
