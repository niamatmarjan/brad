/**
 * BRAD Multi-Agent Handoff & Continuation Protocol
 *
 * Implements structured task state transitions between Developer, QA, and Reviewer roles,
 * durable session resumption, branch/PR detection, defect tracking, and conflict safeguards.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const TASK_STAGES = Object.freeze({
  INITIALIZED: 'INITIALIZED',
  IN_DEVELOPMENT: 'IN_DEVELOPMENT',
  QA_PENDING: 'QA_PENDING',
  QA_DEFECT_IDENTIFIED: 'QA_DEFECT_IDENTIFIED',
  REVIEW_PENDING: 'REVIEW_PENDING',
  REVIEW_REMEDIATION_REQUIRED: 'REVIEW_REMEDIATION_REQUIRED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  INTERRUPTED: 'INTERRUPTED'
});

export const ROLES = Object.freeze({
  DEVELOPER: 'DEVELOPER',
  QA: 'QA',
  REVIEWER: 'REVIEWER',
  OPERATOR: 'OPERATOR'
});

export const EXECUTION_MODES = Object.freeze({
  HOST_NATIVE_SKILL_INVOKED: 'HOST_NATIVE_SKILL_INVOKED',
  INLINE_WORKFLOW_INLINE: 'INLINE_WORKFLOW_INLINE',
  SPECIALIST_DISPATCHED: 'SPECIALIST_DISPATCHED',
  HELPER_SCRIPTS_ONLY: 'HELPER_SCRIPTS_ONLY'
});

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Initialize a new structured task state.
 */
export function createTaskState(options = {}) {
  const taskId = (options.taskId || '').trim();
  if (!taskId) throw new Error('taskId is required to create task state');

  const intent = options.intent || 'BUILD_WORK_UNIT';
  const executionMode = options.executionMode || EXECUTION_MODES.INLINE_WORKFLOW_INLINE;

  return {
    taskId,
    title: options.title || `Task ${taskId}`,
    intent,
    currentRole: ROLES.DEVELOPER,
    stage: TASK_STAGES.INITIALIZED,
    executionMode,
    branch: options.branch || `feat/${taskId.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`,
    baseBranch: options.baseBranch || 'main',
    deliverables: [],
    blockers: [],
    defects: [],
    reviewDecisions: [],
    history: [
      {
        timestamp: new Date().toISOString(),
        role: ROLES.OPERATOR,
        action: 'TASK_INITIALIZED',
        stage: TASK_STAGES.INITIALIZED,
        note: `Task ${taskId} initialized under intent ${intent}`
      }
    ]
  };
}

/**
 * Developer submits deliverable files for QA inspection.
 */
export function developerSubmitDeliverable(taskState, payload = {}) {
  if (!taskState || !taskState.taskId) throw new Error('Invalid task state');
  if (taskState.currentRole !== ROLES.DEVELOPER) {
    throw new Error(`Cannot submit deliverable: current role is ${taskState.currentRole}, expected DEVELOPER`);
  }

  const files = payload.files || [];
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Developer submission must include at least one deliverable file');
  }

  const deliverables = files.map(f => ({
    path: f.path,
    sha256: f.content ? sha256(f.content) : (f.sha256 || 'UNKNOWN'),
    description: f.description || 'Source file deliverable'
  }));

  const updated = {
    ...taskState,
    deliverables,
    commitSha: payload.commitSha || taskState.commitSha || null,
    currentRole: ROLES.QA,
    stage: TASK_STAGES.QA_PENDING,
    history: [
      ...taskState.history,
      {
        timestamp: new Date().toISOString(),
        role: ROLES.DEVELOPER,
        action: 'DELIVERABLE_SUBMITTED',
        stage: TASK_STAGES.QA_PENDING,
        note: payload.notes || `Submitted ${files.length} deliverable file(s) for QA verification`,
        deliverablesSummary: deliverables.map(d => d.path)
      }
    ]
  };

  return updated;
}

/**
 * QA Agent inspects deliverable and records defect(s), returning task to Developer.
 */
export function qaIdentifyDefect(taskState, payload = {}) {
  if (!taskState || !taskState.taskId) throw new Error('Invalid task state');
  if (taskState.currentRole !== ROLES.QA) {
    throw new Error(`Cannot record defect: current role is ${taskState.currentRole}, expected QA`);
  }

  const defectId = payload.defectId || `DEFECT-${taskState.taskId}-${taskState.defects.length + 1}`;
  const description = payload.description || 'QA acceptance check failure';
  const failingChecks = payload.failingChecks || [];

  const defect = {
    defectId,
    reportedBy: ROLES.QA,
    severity: payload.severity || 'HIGH',
    description,
    failingChecks,
    reportedAt: new Date().toISOString(),
    status: 'OPEN'
  };

  const blocker = `Defect ${defectId}: ${description}`;

  return {
    ...taskState,
    defects: [...taskState.defects, defect],
    blockers: [...taskState.blockers, blocker],
    currentRole: ROLES.DEVELOPER,
    stage: TASK_STAGES.QA_DEFECT_IDENTIFIED,
    history: [
      ...taskState.history,
      {
        timestamp: new Date().toISOString(),
        role: ROLES.QA,
        action: 'DEFECT_IDENTIFIED',
        stage: TASK_STAGES.QA_DEFECT_IDENTIFIED,
        defectId,
        note: `QA identified defect ${defectId}: ${description}`
      }
    ]
  };
}

/**
 * QA Agent verifies deliverable passes all acceptance criteria, handing off to Reviewer.
 */
export function qaAcceptDeliverable(taskState, payload = {}) {
  if (!taskState || !taskState.taskId) throw new Error('Invalid task state');
  if (taskState.currentRole !== ROLES.QA) {
    throw new Error(`Cannot accept deliverable: current role is ${taskState.currentRole}, expected QA`);
  }

  const openDefects = taskState.defects.filter(d => d.status === 'OPEN');
  if (openDefects.length > 0) {
    throw new Error(`QA cannot accept deliverable while open defects exist: ${openDefects.map(d => d.defectId).join(', ')}`);
  }

  return {
    ...taskState,
    currentRole: ROLES.REVIEWER,
    stage: TASK_STAGES.REVIEW_PENDING,
    history: [
      ...taskState.history,
      {
        timestamp: new Date().toISOString(),
        role: ROLES.QA,
        action: 'QA_VERIFIED_PASS',
        stage: TASK_STAGES.REVIEW_PENDING,
        note: payload.notes || 'All QA acceptance criteria verified; submitted for peer review'
      }
    ]
  };
}

/**
 * Reviewer conducts read-only code review and issues decision (Approved or Remediation Required).
 */
export function reviewerAssess(taskState, payload = {}) {
  if (!taskState || !taskState.taskId) throw new Error('Invalid task state');
  if (taskState.currentRole !== ROLES.REVIEWER) {
    throw new Error(`Cannot assess review: current role is ${taskState.currentRole}, expected REVIEWER`);
  }

  const status = payload.status; // 'APPROVED' or 'REMEDIATION_REQUIRED'
  if (!['APPROVED', 'REMEDIATION_REQUIRED'].includes(status)) {
    throw new Error('Review decision status must be APPROVED or REMEDIATION_REQUIRED');
  }

  const decisionId = `REV-${taskState.taskId}-${taskState.reviewDecisions.length + 1}`;
  const decision = {
    decisionId,
    reviewer: ROLES.REVIEWER,
    status,
    comments: payload.comments || (status === 'APPROVED' ? 'Changes approved' : 'Remediation requested'),
    timestamp: new Date().toISOString()
  };

  if (status === 'REMEDIATION_REQUIRED') {
    const blocker = `Reviewer Remediation (${decisionId}): ${decision.comments}`;
    return {
      ...taskState,
      reviewDecisions: [...taskState.reviewDecisions, decision],
      blockers: [...taskState.blockers, blocker],
      currentRole: ROLES.DEVELOPER,
      stage: TASK_STAGES.REVIEW_REMEDIATION_REQUIRED,
      history: [
        ...taskState.history,
        {
          timestamp: new Date().toISOString(),
          role: ROLES.REVIEWER,
          action: 'REVIEW_REMEDIATION_REQUIRED',
          stage: TASK_STAGES.REVIEW_REMEDIATION_REQUIRED,
          decisionId,
          note: decision.comments
        }
      ]
    };
  }

  // Approved
  return {
    ...taskState,
    reviewDecisions: [...taskState.reviewDecisions, decision],
    currentRole: ROLES.OPERATOR,
    stage: TASK_STAGES.ACCEPTED,
    history: [
      ...taskState.history,
      {
        timestamp: new Date().toISOString(),
        role: ROLES.REVIEWER,
        action: 'REVIEW_APPROVED',
        stage: TASK_STAGES.ACCEPTED,
        decisionId,
        note: decision.comments
      }
    ]
  };
}

/**
 * Developer applies correction resolving defect(s) and remediation items.
 */
export function developerApplyCorrection(taskState, payload = {}) {
  if (!taskState || !taskState.taskId) throw new Error('Invalid task state');
  if (taskState.currentRole !== ROLES.DEVELOPER) {
    throw new Error(`Cannot apply correction: current role is ${taskState.currentRole}, expected DEVELOPER`);
  }

  const resolvedIds = new Set(payload.resolvedDefectIds || []);
  const updatedDefects = taskState.defects.map(d => {
    if (resolvedIds.has(d.defectId)) {
      return { ...d, status: 'RESOLVED', resolvedAt: new Date().toISOString() };
    }
    return d;
  });

  const remainingOpen = updatedDefects.filter(d => d.status === 'OPEN').map(d => d.defectId);
  const remainingBlockers = taskState.blockers.filter(b => {
    for (const id of resolvedIds) {
      if (b.includes(id)) return false;
    }
    if (payload.clearReviewBlockers && b.includes('Reviewer Remediation')) return false;
    return true;
  });

  // Updated deliverables if provided
  let deliverables = taskState.deliverables;
  if (payload.files && Array.isArray(payload.files)) {
    deliverables = payload.files.map(f => ({
      path: f.path,
      sha256: f.content ? sha256(f.content) : (f.sha256 || 'UNKNOWN'),
      description: f.description || 'Corrected deliverable'
    }));
  }

  return {
    ...taskState,
    deliverables,
    defects: updatedDefects,
    blockers: remainingBlockers,
    commitSha: payload.commitSha || taskState.commitSha || null,
    currentRole: ROLES.QA,
    stage: TASK_STAGES.QA_PENDING,
    history: [
      ...taskState.history,
      {
        timestamp: new Date().toISOString(),
        role: ROLES.DEVELOPER,
        action: 'CORRECTION_APPLIED',
        stage: TASK_STAGES.QA_PENDING,
        resolvedDefectIds: Array.from(resolvedIds),
        note: payload.explanation || `Applied correction resolving ${resolvedIds.size} defect(s)`
      }
    ]
  };
}

/**
 * Mark a task state as interrupted by host limits, session termination, or pause.
 */
export function interruptTask(taskState, reason = 'Host session paused or interrupted') {
  if (!taskState || !taskState.taskId) throw new Error('Invalid task state');
  return {
    ...taskState,
    stage: TASK_STAGES.INTERRUPTED,
    interruptedAt: new Date().toISOString(),
    interruptionReason: reason,
    history: [
      ...taskState.history,
      {
        timestamp: new Date().toISOString(),
        role: ROLES.OPERATOR,
        action: 'TASK_INTERRUPTED',
        stage: TASK_STAGES.INTERRUPTED,
        note: reason
      }
    ]
  };
}

/**
 * Resume an interrupted task state.
 */
export function resumeTask(taskState) {
  if (!taskState || !taskState.taskId) throw new Error('Invalid task state');
  
  // Reconstruct target stage based on current state and open defects
  let targetStage = TASK_STAGES.IN_DEVELOPMENT;
  let targetRole = ROLES.DEVELOPER;

  if (taskState.defects.some(d => d.status === 'OPEN')) {
    targetStage = TASK_STAGES.QA_DEFECT_IDENTIFIED;
    targetRole = ROLES.DEVELOPER;
  } else if (taskState.deliverables.length > 0 && taskState.reviewDecisions.length === 0) {
    targetStage = TASK_STAGES.QA_PENDING;
    targetRole = ROLES.QA;
  } else if (taskState.reviewDecisions.some(r => r.status === 'REMEDIATION_REQUIRED')) {
    targetStage = TASK_STAGES.REVIEW_REMEDIATION_REQUIRED;
    targetRole = ROLES.DEVELOPER;
  } else if (taskState.deliverables.length > 0) {
    targetStage = TASK_STAGES.REVIEW_PENDING;
    targetRole = ROLES.REVIEWER;
  }

  return {
    ...taskState,
    stage: targetStage,
    currentRole: targetRole,
    resumedAt: new Date().toISOString(),
    history: [
      ...taskState.history,
      {
        timestamp: new Date().toISOString(),
        role: ROLES.OPERATOR,
        action: 'TASK_RESUMED',
        stage: targetStage,
        note: `Resumed task ${taskState.taskId} at stage ${targetStage} for role ${targetRole}`
      }
    ]
  };
}

/**
 * State storage directory inside project root.
 */
function getStateDir(projectRoot) {
  return join(resolve(projectRoot || '.'), '.brad', 'state');
}

/**
 * Persist task state to disk.
 */
export function saveTaskState(taskState, projectRoot) {
  if (!taskState || !taskState.taskId) throw new Error('Cannot save invalid task state');
  const dir = getStateDir(projectRoot);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const safeFilename = `${taskState.taskId.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}.json`;
  const filePath = join(dir, safeFilename);
  writeFileSync(filePath, JSON.stringify(taskState, null, 2) + '\n', 'utf8');
  return filePath;
}

/**
 * Load task state from disk if it exists.
 */
export function loadTaskState(taskId, projectRoot) {
  if (!taskId) return null;
  const dir = getStateDir(projectRoot);
  const safeFilename = `${taskId.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}.json`;
  const filePath = join(dir, safeFilename);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Detect ongoing or existing work in the repository for a given task ID.
 */
export function detectExistingWork(taskId, projectRoot, options = {}) {
  const root = resolve(projectRoot || '.');
  const existingState = loadTaskState(taskId, root);

  const existingBranches = options.branches || [];
  const expectedCandidates = [
    `feat/${taskId.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`,
    `feat/${taskId.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`
  ];
  const matchedBranch = existingBranches.find(b =>
    expectedCandidates.some(cand => b === cand || b.endsWith(`/${cand}`))
  );
  const branchExists = Boolean(matchedBranch);

  if (existingState) {
    if (existingState.stage === TASK_STAGES.INTERRUPTED) {
      return {
        status: 'INTERRUPTED_FOUND',
        taskId,
        branch: existingState.branch,
        stage: existingState.stage,
        taskState: existingState,
        action: 'RESUME_RECOMMENDED'
      };
    }

    if (existingState.stage === TASK_STAGES.ACCEPTED) {
      return {
        status: 'ALREADY_COMPLETED',
        taskId,
        branch: existingState.branch,
        stage: existingState.stage,
        taskState: existingState,
        action: 'DO_NOT_REGENERATE'
      };
    }

    return {
      status: 'ACTIVE_FOUND',
      taskId,
      branch: existingState.branch,
      stage: existingState.stage,
      taskState: existingState,
      action: 'CONTINUE_ACTIVE'
    };
  }

  if (branchExists) {
    return {
      status: 'BRANCH_EXISTS_NO_STATE',
      taskId,
      branch: matchedBranch,
      action: 'INSPECT_BRANCH'
    };
  }

  return {
    status: 'NO_PREVIOUS_WORK',
    taskId,
    action: 'START_FRESH'
  };
}

/**
 * Guard against duplicate execution requests on an already completed or in-progress task.
 */
export function guardDuplicateRequest(taskId, projectRoot, options = {}) {
  const detection = detectExistingWork(taskId, projectRoot, options);
  if (detection.status === 'ALREADY_COMPLETED') {
    return {
      canProceed: false,
      reason: `Task ${taskId} is already marked ACCEPTED in .brad/state. Refusing duplicate execution without explicit --force.`,
      detection
    };
  }
  if (detection.status === 'ACTIVE_FOUND' && !options.allowActiveContinuation) {
    return {
      canProceed: false,
      reason: `Task ${taskId} currently active in stage ${detection.stage}. Use resume or specify continuation.`,
      detection
    };
  }
  return {
    canProceed: true,
    detection
  };
}
