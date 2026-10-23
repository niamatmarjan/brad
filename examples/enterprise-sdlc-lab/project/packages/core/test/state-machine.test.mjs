import test from 'node:test';
import assert from 'node:assert/strict';
import { ChangeRequestStateMachine } from '../src/state-machine.mjs';
import { ChangeStatuses, StepStatuses, Roles, ChangeCategories, RiskLevels } from '../src/types.mjs';

test('ChangeRequestStateMachine: creates valid draft and validates required fields', () => {
  assert.throws(
    () => ChangeRequestStateMachine.createDraft({ tenantId: '', requesterId: 'user-1', title: 'Test' }),
    /TENANT_REQUIRED/
  );
  assert.throws(
    () => ChangeRequestStateMachine.createDraft({ tenantId: 'tenant-1', requesterId: '', title: 'Test' }),
    /REQUESTER_REQUIRED/
  );
  assert.throws(
    () => ChangeRequestStateMachine.createDraft({ tenantId: 'tenant-1', requesterId: 'user-1', title: '' }),
    /TITLE_REQUIRED/
  );

  const cr = ChangeRequestStateMachine.createDraft({
    tenantId: 'tenant-alpha',
    requesterId: 'user-123',
    title: 'Migrate DB to PG16',
    description: 'Upgrade PostgreSQL to version 16',
    category: 'INFRASTRUCTURE',
    riskLevel: 'HIGH',
    rollbackPlan: 'Restore from snapshot snap-01'
  });

  assert.equal(cr.status, ChangeStatuses.DRAFT);
  assert.equal(cr.tenantId, 'tenant-alpha');
  assert.equal(cr.version, 1);
  assert.equal(cr.stages.length, 0);
});

test('ChangeRequestStateMachine: submits draft and dynamically generates multi-stage approvals', () => {
  const financeCR = ChangeRequestStateMachine.createDraft({
    tenantId: 'tenant-alpha',
    requesterId: 'user-123',
    title: 'Acquisition tooling budget',
    description: 'Procure software licenses',
    category: 'FINANCE',
    riskLevel: 'MEDIUM',
    rollbackPlan: 'Cancel invoice'
  });

  const submittedFinance = ChangeRequestStateMachine.submit(financeCR, 'user-123');
  assert.equal(submittedFinance.status, ChangeStatuses.PENDING_APPROVAL);
  assert.equal(submittedFinance.stages.length, 2, 'Finance changes must have 2 stages');
  assert.equal(submittedFinance.stages[0].requiredRole, Roles.MANAGER);
  assert.equal(submittedFinance.stages[1].requiredRole, Roles.APPROVER);

  const stdCR = ChangeRequestStateMachine.createDraft({
    tenantId: 'tenant-alpha',
    requesterId: 'user-456',
    title: 'Minor config update',
    description: 'Update logging level',
    category: 'APPLICATION',
    riskLevel: 'LOW',
    rollbackPlan: 'Revert git commit'
  });

  const submittedStd = ChangeRequestStateMachine.submit(stdCR, 'user-456');
  assert.equal(submittedStd.stages.length, 1, 'Low risk standard change requires 1 stage');
});

test('ChangeRequestStateMachine: Rule BR-001 strictly blocks self-approval', () => {
  const cr = ChangeRequestStateMachine.createDraft({
    tenantId: 'tenant-alpha',
    requesterId: 'user-alice',
    title: 'Deploy microservice',
    description: 'Deploy new auth service',
    category: 'APPLICATION',
    riskLevel: 'LOW',
    rollbackPlan: 'Rollback pod image'
  });
  ChangeRequestStateMachine.submit(cr, 'user-alice');

  // Alice tries to approve her own change request
  assert.throws(
    () => ChangeRequestStateMachine.approveStage(cr, 'user-alice', Roles.MANAGER, 'Looks good to me'),
    (err) => err.code === 'SELF_APPROVAL_VIOLATION',
    'Requester must be blocked from approving own change'
  );
});

test('ChangeRequestStateMachine: multi-stage approvals advance stages and finalize to APPROVED', () => {
  const cr = ChangeRequestStateMachine.createDraft({
    tenantId: 'tenant-alpha',
    requesterId: 'user-alice',
    title: 'Finance ERP update',
    description: 'Apply ERP patch',
    category: 'FINANCE',
    riskLevel: 'MEDIUM',
    rollbackPlan: 'Revert patch'
  });
  ChangeRequestStateMachine.submit(cr, 'user-alice');

  // Stage 1 approval by Bob (Manager)
  ChangeRequestStateMachine.approveStage(cr, 'user-bob', Roles.MANAGER, 'Manager sign-off');
  assert.equal(cr.stages[0].status, StepStatuses.APPROVED);
  assert.equal(cr.activeStageIndex, 1);
  assert.equal(cr.status, ChangeStatuses.PENDING_APPROVAL);

  // Stage 2 approval by Carol (Director / Approver)
  ChangeRequestStateMachine.approveStage(cr, 'user-carol', Roles.APPROVER, 'Finance Director sign-off');
  assert.equal(cr.stages[1].status, StepStatuses.APPROVED);
  assert.equal(cr.status, ChangeStatuses.APPROVED, 'Should finalize to APPROVED once all stages complete');
});

test('ChangeRequestStateMachine: rejection halts the pipeline immediately', () => {
  const cr = ChangeRequestStateMachine.createDraft({
    tenantId: 'tenant-alpha',
    requesterId: 'user-alice',
    title: 'Firewall port opening',
    description: 'Open port 8080',
    category: 'SECURITY',
    riskLevel: 'HIGH',
    rollbackPlan: 'Close port'
  });
  ChangeRequestStateMachine.submit(cr, 'user-alice');

  // Stage 1 rejection by Security Officer
  ChangeRequestStateMachine.rejectStage(cr, 'user-dave', Roles.APPROVER, 'Too risky without VPN');
  assert.equal(cr.status, ChangeStatuses.REJECTED);
  assert.equal(cr.stages[0].status, StepStatuses.REJECTED);

  // Subsequent approval attempt must be blocked
  assert.throws(
    () => ChangeRequestStateMachine.approveStage(cr, 'user-carol', Roles.ADMIN, 'Override'),
    /ILLEGAL_TRANSITION/
  );
});
