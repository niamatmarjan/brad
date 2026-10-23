import { ChangeRequestStateMachine } from '../../../../packages/core/src/state-machine.mjs';
import { AuditActions, Roles } from '../../../../packages/core/src/types.mjs';
import { ScopedTenantRepository } from '../../../../packages/storage/src/scoped-repository.mjs';

export function registerApprovalRoutes(router, { driver, auditLedger, notificationAdapter }) {
  // APPROVE STAGE
  router.post('/api/v1/approvals/:id/approve', async (req, res) => {
    try {
      const repo = new ScopedTenantRepository(driver, req.tenantContext);
      const cr = await repo.findById('change_requests', req.params.id);

      if (!cr) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Change request not found' }));
        return;
      }

      const comments = req.body?.comments || '';
      const previousVersion = cr.version;

      const approvedCR = ChangeRequestStateMachine.approveStage(
        cr,
        req.user.userId,
        req.user.role,
        comments
      );

      const updated = await repo.updateWithVersion('change_requests', cr.id, previousVersion, approvedCR);

      auditLedger.append({
        tenantId: req.tenantContext.tenantId,
        actorId: req.user.userId,
        action: AuditActions.STAGE_APPROVED,
        entityId: updated.id,
        payload: { stageIndex: updated.activeStageIndex, newStatus: updated.status, comments }
      });

      await notificationAdapter.send({
        tenantId: req.tenantContext.tenantId,
        recipientId: updated.requesterId,
        subject: `[AegisFlow] Change Request Approved: ${updated.title}`,
        message: `Your change request ${updated.id} was approved by ${req.user.userId}. Status: ${updated.status}`,
        eventType: 'STAGE_APPROVED'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    } catch (err) {
      let status = 400;
      if (err.code === 'SELF_APPROVAL_VIOLATION') status = 400;
      else if (err.code === 'INSUFFICIENT_ROLE_PERMISSIONS') status = 403;
      else if (err.code === 'CONCURRENCY_CONFLICT') status = 409;

      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.code || 'APPROVAL_ERROR', message: err.message }));
    }
  });

  // REJECT STAGE
  router.post('/api/v1/approvals/:id/reject', async (req, res) => {
    try {
      const repo = new ScopedTenantRepository(driver, req.tenantContext);
      const cr = await repo.findById('change_requests', req.params.id);

      if (!cr) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Change request not found' }));
        return;
      }

      const reason = req.body?.reason || '';
      const previousVersion = cr.version;

      const rejectedCR = ChangeRequestStateMachine.rejectStage(
        cr,
        req.user.userId,
        req.user.role,
        reason
      );

      const updated = await repo.updateWithVersion('change_requests', cr.id, previousVersion, rejectedCR);

      auditLedger.append({
        tenantId: req.tenantContext.tenantId,
        actorId: req.user.userId,
        action: AuditActions.STAGE_REJECTED,
        entityId: updated.id,
        payload: { reason }
      });

      await notificationAdapter.send({
        tenantId: req.tenantContext.tenantId,
        recipientId: updated.requesterId,
        subject: `[AegisFlow] Change Request Rejected: ${updated.title}`,
        message: `Your change request ${updated.id} was rejected by ${req.user.userId}. Reason: ${reason}`,
        eventType: 'STAGE_REJECTED'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    } catch (err) {
      let status = 400;
      if (err.code === 'SELF_APPROVAL_VIOLATION') status = 400;
      else if (err.code === 'CONCURRENCY_CONFLICT') status = 409;

      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.code || 'REJECTION_ERROR', message: err.message }));
    }
  });

  // ESCALATE STAGE
  router.post('/api/v1/approvals/:id/escalate', async (req, res) => {
    try {
      const repo = new ScopedTenantRepository(driver, req.tenantContext);
      const cr = await repo.findById('change_requests', req.params.id);

      if (!cr) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Change request not found' }));
        return;
      }

      const reason = req.body?.reason || 'SLA deadline breached';
      const previousVersion = cr.version;
      const escalatedCR = ChangeRequestStateMachine.escalate(cr, reason);

      const updated = await repo.updateWithVersion('change_requests', cr.id, previousVersion, escalatedCR);

      auditLedger.append({
        tenantId: req.tenantContext.tenantId,
        actorId: req.user.userId,
        action: AuditActions.CR_ESCALATED,
        entityId: updated.id,
        payload: { reason }
      });

      await notificationAdapter.send({
        tenantId: req.tenantContext.tenantId,
        recipientId: 'escalation-manager',
        subject: `[AegisFlow ESCALATION] Change Request Breached SLA: ${updated.title}`,
        message: `Change request ${updated.id} has been escalated: ${reason}`,
        eventType: 'CR_ESCALATED'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.code || 'ESCALATION_ERROR', message: err.message }));
    }
  });
}
