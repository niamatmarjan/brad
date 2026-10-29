import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  TASK_STAGES,
  ROLES,
  EXECUTION_MODES,
  createTaskState,
  developerSubmitDeliverable,
  qaIdentifyDefect,
  qaAcceptDeliverable,
  reviewerAssess,
  developerApplyCorrection,
  interruptTask,
  resumeTask,
  saveTaskState,
  loadTaskState,
  detectExistingWork,
  guardDuplicateRequest
} from '../src/handoff.mjs';

const fixture = fn => {
  const dir = mkdtempSync(join(tmpdir(), 'brad-handoff-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
};

test('Multi-Agent Handoff: Full Developer -> QA Defect -> Dev Correction -> Reviewer Remediation -> Acceptance Lifecycle', () => {
  // 1. Task Initialized by Operator
  const state0 = createTaskState({
    taskId: 'STORY-1.1',
    title: 'User Authentication Flow',
    intent: 'BUILD_WORK_UNIT',
    executionMode: EXECUTION_MODES.SPECIALIST_DISPATCHED
  });

  assert.equal(state0.taskId, 'STORY-1.1');
  assert.equal(state0.stage, TASK_STAGES.INITIALIZED);
  assert.equal(state0.currentRole, ROLES.DEVELOPER);
  assert.equal(state0.deliverables.length, 0);
  assert.equal(state0.defects.length, 0);
  assert.equal(state0.blockers.length, 0);

  // 2. Developer submits initial deliverable
  const state1 = developerSubmitDeliverable(state0, {
    files: [
      { path: 'src/auth/login.ts', content: 'export function login(u, p) { return true; }' },
      { path: 'tests/auth/login.test.ts', content: 'test("login", () => {})' }
    ],
    commitSha: 'c0ffee1',
    notes: 'Initial implementation of login endpoint'
  });

  assert.equal(state1.stage, TASK_STAGES.QA_PENDING);
  assert.equal(state1.currentRole, ROLES.QA);
  assert.equal(state1.deliverables.length, 2);
  assert.equal(state1.commitSha, 'c0ffee1');
  assert.ok(state1.deliverables[0].sha256.length === 64, 'Deliverable must compute sha256 digest');

  // 3. QA independently tests deliverable and discovers a defect
  const state2 = qaIdentifyDefect(state1, {
    defectId: 'DEFECT-G04-001',
    severity: 'HIGH',
    description: 'Empty password string bypasses authentication check',
    failingChecks: ['test_empty_password_fails', 'test_sql_injection_guard']
  });

  assert.equal(state2.stage, TASK_STAGES.QA_DEFECT_IDENTIFIED);
  assert.equal(state2.currentRole, ROLES.DEVELOPER);
  assert.equal(state2.defects.length, 1);
  assert.equal(state2.defects[0].defectId, 'DEFECT-G04-001');
  assert.equal(state2.defects[0].status, 'OPEN');
  assert.equal(state2.blockers.length, 1);
  assert.match(state2.blockers[0], /Empty password string/);

  // 4a. Cannot accept deliverable when current role is DEVELOPER
  assert.throws(
    () => qaAcceptDeliverable(state2),
    /Cannot accept deliverable: current role is DEVELOPER, expected QA/
  );

  // 4b. QA cannot accept deliverable while open defect exists
  assert.throws(
    () => qaAcceptDeliverable({ ...state2, currentRole: ROLES.QA }),
    /QA cannot accept deliverable while open defects exist/
  );

  // 5. Developer cannot bypass QA directly to Reviewer
  assert.throws(
    () => reviewerAssess(state2, { status: 'APPROVED' }),
    /Cannot assess review: current role is DEVELOPER, expected REVIEWER/
  );

  // 6. Developer applies correction resolving DEFECT-G04-001
  const state3 = developerApplyCorrection(state2, {
    resolvedDefectIds: ['DEFECT-G04-001'],
    files: [
      { path: 'src/auth/login.ts', content: 'export function login(u, p) { if (!p) throw new Error(); return true; }' },
      { path: 'tests/auth/login.test.ts', content: 'test("login reject empty", () => {})' }
    ],
    commitSha: 'c0ffee2',
    explanation: 'Added validation for empty password string and guard checks'
  });

  assert.equal(state3.stage, TASK_STAGES.QA_PENDING);
  assert.equal(state3.currentRole, ROLES.QA);
  assert.equal(state3.defects[0].status, 'RESOLVED');
  assert.equal(state3.blockers.length, 0);

  // 7. QA re-verifies and accepts deliverable
  const state4 = qaAcceptDeliverable(state3, {
    notes: 'All auth tests pass, zero regressions'
  });

  assert.equal(state4.stage, TASK_STAGES.REVIEW_PENDING);
  assert.equal(state4.currentRole, ROLES.REVIEWER);

  // 8. Reviewer reviews code changes read-only, requests remediation
  const state5 = reviewerAssess(state4, {
    status: 'REMEDIATION_REQUIRED',
    comments: 'Missing rate-limiting header on authentication route'
  });

  assert.equal(state5.stage, TASK_STAGES.REVIEW_REMEDIATION_REQUIRED);
  assert.equal(state5.currentRole, ROLES.DEVELOPER);
  assert.equal(state5.blockers.length, 1);
  assert.match(state5.blockers[0], /rate-limiting header/);

  // 9. Developer applies remediation
  const state6 = developerApplyCorrection(state5, {
    clearReviewBlockers: true,
    files: [
      { path: 'src/auth/login.ts', content: 'export function login(u, p) { checkRateLimit(); return true; }' }
    ],
    commitSha: 'c0ffee3',
    explanation: 'Added rate limiting guard to login handler'
  });

  assert.equal(state6.blockers.length, 0);
  assert.equal(state6.currentRole, ROLES.QA);

  // 10. QA accepts remediation
  const state7 = qaAcceptDeliverable(state6);
  assert.equal(state7.currentRole, ROLES.REVIEWER);

  // 11. Reviewer approves
  const stateFinal = reviewerAssess(state7, {
    status: 'APPROVED',
    comments: 'Verified rate-limiting and security checks. LGTM.'
  });

  assert.equal(stateFinal.stage, TASK_STAGES.ACCEPTED);
  assert.equal(stateFinal.currentRole, ROLES.OPERATOR);
  assert.equal(stateFinal.blockers.length, 0);
  assert.equal(stateFinal.reviewDecisions.length, 2);
  assert.equal(stateFinal.reviewDecisions[1].status, 'APPROVED');

  // Verify transition audit trail integrity
  assert.ok(stateFinal.history.length >= 8);
  const actions = stateFinal.history.map(h => h.action);
  assert.ok(actions.includes('TASK_INITIALIZED'));
  assert.ok(actions.includes('DELIVERABLE_SUBMITTED'));
  assert.ok(actions.includes('DEFECT_IDENTIFIED'));
  assert.ok(actions.includes('CORRECTION_APPLIED'));
  assert.ok(actions.includes('QA_VERIFIED_PASS'));
  assert.ok(actions.includes('REVIEW_REMEDIATION_REQUIRED'));
  assert.ok(actions.includes('REVIEW_APPROVED'));
});

test('Durable Task Continuation: Interruption, State Persistence, and Resumption', () => fixture(root => {
  const task = createTaskState({
    taskId: 'TICKET-202',
    title: 'Database Migration Service',
    intent: 'BUILD_WORK_UNIT'
  });

  const submitted = developerSubmitDeliverable(task, {
    files: [{ path: 'migrations/001_init.sql', content: 'CREATE TABLE test (id INT);' }],
    commitSha: 'deadbeef'
  });

  // Save to disk
  const filePath = saveTaskState(submitted, root);
  assert.ok(existsSync(filePath));

  // Interruption occurs (e.g. host context limit or timeout)
  const interrupted = interruptTask(submitted, 'Antigravity session budget reached');
  assert.equal(interrupted.stage, TASK_STAGES.INTERRUPTED);
  saveTaskState(interrupted, root);

  // Detect existing work in project root
  const detected = detectExistingWork('TICKET-202', root, {
    branches: ['main', 'feat/ticket-202']
  });

  assert.equal(detected.status, 'INTERRUPTED_FOUND');
  assert.equal(detected.action, 'RESUME_RECOMMENDED');
  assert.equal(detected.taskState.taskId, 'TICKET-202');

  // Resume task
  const loaded = loadTaskState('TICKET-202', root);
  const resumed = resumeTask(loaded);

  assert.equal(resumed.stage, TASK_STAGES.QA_PENDING);
  assert.equal(resumed.currentRole, ROLES.QA);
  assert.ok(resumed.history.some(h => h.action === 'TASK_RESUMED'));
}));

test('Continuation Safeguards: Duplicate Execution Guard and Fresh Detection', () => fixture(root => {
  // Case A: Fresh task with no existing state
  const fresh = detectExistingWork('STORY-3.1', root);
  assert.equal(fresh.status, 'NO_PREVIOUS_WORK');
  assert.equal(fresh.action, 'START_FRESH');

  const guardFresh = guardDuplicateRequest('STORY-3.1', root);
  assert.equal(guardFresh.canProceed, true);

  // Case B: Completed task in state
  const completed = createTaskState({ taskId: 'STORY-3.1' });
  completed.stage = TASK_STAGES.ACCEPTED;
  saveTaskState(completed, root);

  const guardCompleted = guardDuplicateRequest('STORY-3.1', root);
  assert.equal(guardCompleted.canProceed, false);
  assert.match(guardCompleted.reason, /already marked ACCEPTED/);

  // Case C: Branch exists in Git but no state file
  const branchOnly = detectExistingWork('STORY-4.1', root, {
    branches: ['feat/story-4-1']
  });
  assert.equal(branchOnly.status, 'BRANCH_EXISTS_NO_STATE');
  assert.equal(branchOnly.action, 'INSPECT_BRANCH');
}));
