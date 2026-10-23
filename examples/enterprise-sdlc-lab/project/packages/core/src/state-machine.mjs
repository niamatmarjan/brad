import { randomUUID } from 'node:crypto';
import { ChangeStatuses, StepStatuses, ChangeCategories, RiskLevels, Roles } from './types.mjs';

export class ChangeRequestStateMachine {
  static createDraft({ tenantId, requesterId, title, description, category, riskLevel, rollbackPlan, budgetImpact = 0 }) {
    if (!tenantId) throw new Error('TENANT_REQUIRED: Missing tenantId');
    if (!requesterId) throw new Error('REQUESTER_REQUIRED: Missing requesterId');
    if (!title || title.trim().length === 0) throw new Error('TITLE_REQUIRED: Title cannot be empty');
    if (!description || description.trim().length === 0) throw new Error('DESCRIPTION_REQUIRED: Description cannot be empty');
    if (!rollbackPlan || rollbackPlan.trim().length === 0) throw new Error('ROLLBACK_PLAN_REQUIRED: Rollback plan is mandatory');

    const validCategory = ChangeCategories[category] || ChangeCategories.APPLICATION;
    const validRisk = RiskLevels[riskLevel] || RiskLevels.LOW;

    return {
      id: randomUUID(),
      tenantId,
      requesterId,
      title: title.trim(),
      description: description.trim(),
      category: validCategory,
      riskLevel: validRisk,
      rollbackPlan: rollbackPlan.trim(),
      budgetImpact: Number(budgetImpact) || 0,
      status: ChangeStatuses.DRAFT,
      stages: [],
      activeStageIndex: 0,
      slaDeadline: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
  }

  static updateDraft(cr, actorId, updates) {
    if (cr.status !== ChangeStatuses.DRAFT) {
      throw new Error(`ILLEGAL_STATE: Cannot edit change request in status ${cr.status}`);
    }
    if (cr.requesterId !== actorId) {
      throw new Error('UNAUTHORIZED_ACTOR: Only the requester can update this draft');
    }

    if (updates.title) cr.title = updates.title.trim();
    if (updates.description) cr.description = updates.description.trim();
    if (updates.category && ChangeCategories[updates.category]) cr.category = updates.category;
    if (updates.riskLevel && RiskLevels[updates.riskLevel]) cr.riskLevel = updates.riskLevel;
    if (updates.rollbackPlan) cr.rollbackPlan = updates.rollbackPlan.trim();
    if (updates.budgetImpact !== undefined) cr.budgetImpact = Number(updates.budgetImpact);

    cr.updatedAt = new Date().toISOString();
    cr.version += 1;
    return cr;
  }

  static generateApprovalStages(cr) {
    const stages = [];
    const isFinance = cr.category === ChangeCategories.FINANCE || cr.budgetImpact > 100000;
    const isSecurity = cr.category === ChangeCategories.SECURITY;
    const isHighRisk = cr.riskLevel === RiskLevels.HIGH || cr.riskLevel === RiskLevels.CRITICAL;

    if (isFinance) {
      stages.push({
        stageNumber: 1,
        title: 'Team Manager Operational Sign-off',
        requiredRole: Roles.MANAGER,
        status: StepStatuses.PENDING,
        approvals: []
      });
      stages.push({
        stageNumber: 2,
        title: 'Finance Director Commercial Approval',
        requiredRole: Roles.APPROVER,
        status: StepStatuses.PENDING,
        approvals: []
      });
    } else if (isSecurity) {
      stages.push({
        stageNumber: 1,
        title: 'Security Officer Threat Audit',
        requiredRole: Roles.APPROVER,
        status: StepStatuses.PENDING,
        approvals: []
      });
      stages.push({
        stageNumber: 2,
        title: 'CISO / Security Admin Sign-off',
        requiredRole: Roles.ADMIN,
        status: StepStatuses.PENDING,
        approvals: []
      });
    } else if (isHighRisk) {
      stages.push({
        stageNumber: 1,
        title: 'Department Manager Review',
        requiredRole: Roles.MANAGER,
        status: StepStatuses.PENDING,
        approvals: []
      });
      stages.push({
        stageNumber: 2,
        title: 'Operations Director Review',
        requiredRole: Roles.APPROVER,
        status: StepStatuses.PENDING,
        approvals: []
      });
    } else {
      stages.push({
        stageNumber: 1,
        title: 'Standard Manager Review',
        requiredRole: Roles.MANAGER,
        status: StepStatuses.PENDING,
        approvals: []
      });
    }

    return stages;
  }

  static submit(cr, actorId, calculatedDeadline) {
    if (cr.status !== ChangeStatuses.DRAFT) {
      throw new Error(`ILLEGAL_TRANSITION: Cannot submit from status ${cr.status}`);
    }
    if (cr.requesterId !== actorId) {
      throw new Error('UNAUTHORIZED_ACTOR: Only the author can submit this change request');
    }

    cr.stages = this.generateApprovalStages(cr);
    cr.activeStageIndex = 0;
    cr.status = ChangeStatuses.PENDING_APPROVAL;
    cr.slaDeadline = calculatedDeadline ? calculatedDeadline.toISOString() : null;
    cr.updatedAt = new Date().toISOString();
    cr.version += 1;
    return cr;
  }

  static approveStage(cr, approverId, approverRole, comments = '') {
    if (cr.status !== ChangeStatuses.PENDING_APPROVAL && cr.status !== ChangeStatuses.ESCALATED) {
      throw new Error(`ILLEGAL_TRANSITION: Cannot approve change request in status ${cr.status}`);
    }

    // Rule BR-001: Self-approval ban
    if (cr.requesterId === approverId) {
      const err = new Error('SELF_APPROVAL_VIOLATION: Requesters cannot approve their own change requests');
      err.code = 'SELF_APPROVAL_VIOLATION';
      throw err;
    }

    const currentStage = cr.stages[cr.activeStageIndex];
    if (!currentStage) {
      throw new Error('STAGE_ERROR: No active pending approval stage found');
    }

    // Role verification
    const roleRank = { [Roles.EMPLOYEE]: 1, [Roles.MANAGER]: 2, [Roles.APPROVER]: 3, [Roles.AUDITOR]: 3, [Roles.ADMIN]: 4 };
    const requiredRank = roleRank[currentStage.requiredRole] || 2;
    const approverRank = roleRank[approverRole] || 1;

    if (approverRank < requiredRank) {
      const err = new Error(`INSUFFICIENT_ROLE: Required ${currentStage.requiredRole}, received ${approverRole}`);
      err.code = 'INSUFFICIENT_ROLE_PERMISSIONS';
      throw err;
    }

    // Record approval signature
    currentStage.approvals.push({
      approverId,
      approverRole,
      comments: comments.trim(),
      timestamp: new Date().toISOString()
    });
    currentStage.status = StepStatuses.APPROVED;

    // Check if subsequent stages exist
    if (cr.activeStageIndex + 1 < cr.stages.length) {
      cr.activeStageIndex += 1;
    } else {
      cr.status = ChangeStatuses.APPROVED;
    }

    cr.updatedAt = new Date().toISOString();
    cr.version += 1;
    return cr;
  }

  static rejectStage(cr, approverId, approverRole, reason) {
    if (cr.status !== ChangeStatuses.PENDING_APPROVAL && cr.status !== ChangeStatuses.ESCALATED) {
      throw new Error(`ILLEGAL_TRANSITION: Cannot reject change request in status ${cr.status}`);
    }

    if (cr.requesterId === approverId) {
      const err = new Error('SELF_APPROVAL_VIOLATION: Requesters cannot reject their own change request approval step');
      err.code = 'SELF_APPROVAL_VIOLATION';
      throw err;
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('REJECTION_REASON_MANDATORY: Rejection reason is required');
    }

    const currentStage = cr.stages[cr.activeStageIndex];
    if (currentStage) {
      currentStage.status = StepStatuses.REJECTED;
      currentStage.approvals.push({
        approverId,
        approverRole,
        action: 'REJECT',
        reason: reason.trim(),
        timestamp: new Date().toISOString()
      });
    }

    cr.status = ChangeStatuses.REJECTED;
    cr.updatedAt = new Date().toISOString();
    cr.version += 1;
    return cr;
  }

  static escalate(cr, reason = 'SLA deadline exceeded') {
    if (cr.status !== ChangeStatuses.PENDING_APPROVAL) {
      throw new Error(`ILLEGAL_TRANSITION: Cannot escalate change request in status ${cr.status}`);
    }
    cr.status = ChangeStatuses.ESCALATED;
    cr.escalationReason = reason;
    cr.updatedAt = new Date().toISOString();
    cr.version += 1;
    return cr;
  }

  static cancel(cr, actorId, reason = 'Cancelled by requester') {
    if (cr.status === ChangeStatuses.APPROVED || cr.status === ChangeStatuses.IMPLEMENTED) {
      throw new Error(`ILLEGAL_TRANSITION: Cannot cancel an approved or implemented change request`);
    }
    if (cr.requesterId !== actorId) {
      throw new Error('UNAUTHORIZED_ACTOR: Only the requester can cancel this change request');
    }
    cr.status = ChangeStatuses.CANCELLED;
    cr.cancellationReason = reason;
    cr.updatedAt = new Date().toISOString();
    cr.version += 1;
    return cr;
  }
}
