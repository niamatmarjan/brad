import { ChangeRequestStateMachine } from '../../../../packages/core/src/state-machine.mjs';
import { BusinessHoursCalculator } from '../../../../packages/core/src/sla-calculator.mjs';
import { AuditActions } from '../../../../packages/core/src/types.mjs';
import { ScopedTenantRepository } from '../../../../packages/storage/src/scoped-repository.mjs';

export function registerChangeRequestRoutes(router, { driver, auditLedger, notificationAdapter }) {
  // CREATE DRAFT
  router.post('/api/v1/change-requests', async (req, res) => {
    try {
      const repo = new ScopedTenantRepository(driver, req.tenantContext);
      const draft = ChangeRequestStateMachine.createDraft({
        ...req.body,
        tenantId: req.tenantContext.tenantId,
        requesterId: req.user.userId
      });

      const saved = await repo.create('change_requests', draft);

      auditLedger.append({
        tenantId: req.tenantContext.tenantId,
        actorId: req.user.userId,
        action: AuditActions.CR_CREATED,
        entityId: saved.id,
        payload: { title: saved.title, category: saved.category, riskLevel: saved.riskLevel }
      });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(saved));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.code || 'BAD_REQUEST', message: err.message }));
    }
  });

  // LIST WITH FILTERS & PAGINATION
  router.get('/api/v1/change-requests', async (req, res) => {
    try {
      const repo = new ScopedTenantRepository(driver, req.tenantContext);
      const { status, category, limit = 50, offset = 0 } = req.query || {};

      const records = await repo.query('change_requests', item => {
        if (status && item.status !== status) return false;
        if (category && item.category !== category) return false;
        return true;
      });

      const start = Number(offset);
      const paginated = records.slice(start, start + Number(limit));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        total: records.length,
        offset: start,
        limit: Number(limit),
        items: paginated
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  });

  // GET DETAILS
  router.get('/api/v1/change-requests/:id', async (req, res) => {
    try {
      const repo = new ScopedTenantRepository(driver, req.tenantContext);
      const item = await repo.findById('change_requests', req.params.id);

      if (!item) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Change request not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  });

  // SUBMIT DRAFT
  router.post('/api/v1/change-requests/:id/submit', async (req, res) => {
    try {
      const repo = new ScopedTenantRepository(driver, req.tenantContext);
      const cr = await repo.findById('change_requests', req.params.id);

      if (!cr) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Change request not found' }));
        return;
      }

      const deadline = BusinessHoursCalculator.computeDeadline(new Date(), cr.riskLevel, cr.category);
      const submitted = ChangeRequestStateMachine.submit(cr, req.user.userId, deadline);

      const updated = await repo.updateWithVersion('change_requests', cr.id, cr.version - 1, submitted);

      auditLedger.append({
        tenantId: req.tenantContext.tenantId,
        actorId: req.user.userId,
        action: AuditActions.CR_SUBMITTED,
        entityId: updated.id,
        payload: { stagesCount: updated.stages.length, slaDeadline: updated.slaDeadline }
      });

      await notificationAdapter.send({
        tenantId: req.tenantContext.tenantId,
        recipientId: 'manager-queue',
        subject: `[AegisFlow] Change Request Submitted: ${updated.title}`,
        message: `Change request ${updated.id} submitted for approval. Deadline: ${updated.slaDeadline}`,
        eventType: 'CR_SUBMITTED'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    } catch (err) {
      const status = err.code === 'CONCURRENCY_CONFLICT' ? 409 : 400;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.code || 'SUBMIT_ERROR', message: err.message }));
    }
  });
}
