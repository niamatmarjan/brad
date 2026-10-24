import { Roles, AuditActions } from '../../../../packages/core/src/types.mjs';
import { requireRole } from '../middleware/auth.mjs';

export function registerAuditRoutes(router, { auditLedger }) {
  // AUDIT RECORDS (AUDITOR OR ADMIN ONLY)
  router.get('/api/v1/audit/records', requireRole(Roles.AUDITOR), async (req, res) => {
    try {
      const records = auditLedger.getRecords(req.tenantContext.tenantId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        tenantId: req.tenantContext.tenantId,
        count: records.length,
        records
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  });

  // VERIFY CHAIN INTEGRITY
  router.get('/api/v1/audit/verify', requireRole(Roles.AUDITOR), async (req, res) => {
    try {
      const verification = auditLedger.verifyChainIntegrity(req.tenantContext.tenantId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        tenantId: req.tenantContext.tenantId,
        ...verification
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  });

  // EXPORT AUDIT LOG (JSON or CSV)
  router.get('/api/v1/audit/export', requireRole(Roles.AUDITOR), async (req, res) => {
    try {
      const records = auditLedger.getRecords(req.tenantContext.tenantId);
      const verification = auditLedger.verifyChainIntegrity(req.tenantContext.tenantId);

      auditLedger.append({
        tenantId: req.tenantContext.tenantId,
        actorId: req.user.userId,
        action: AuditActions.AUDIT_EXPORTED,
        payload: { recordCount: records.length, format: req.query?.format || 'json' }
      });

      if (req.query?.format === 'csv') {
        const headers = ['sequence', 'timestamp', 'tenantId', 'actorId', 'action', 'entityId', 'recordHash', 'previousHash'];
        const rows = records.map(r => [
          r.sequence,
          r.timestamp,
          r.tenantId,
          r.actorId,
          r.action,
          r.entityId,
          r.recordHash,
          r.previousHash
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

        const csvContent = [headers.join(','), ...rows].join('\r\n');
        res.writeHead(200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-export-${req.tenantContext.tenantId}.csv"`
        });
        res.end(csvContent);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        exportedAt: new Date().toISOString(),
        tenantId: req.tenantContext.tenantId,
        chainIntegrity: verification,
        recordCount: records.length,
        records
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  });
}
