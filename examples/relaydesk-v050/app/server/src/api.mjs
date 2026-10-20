import express from 'express';
import { ROLES, REQUEST_STATUS, TRANSITIONS, DEFECT_STATUS, SLA_STATUS } from './types.mjs';
import { logAuditEvent, getAuditHistory } from './audit.mjs';
import { requireRole } from './auth.mjs';

export function calculateSla(targetDateStr, status, updatedAtStr) {
  if (typeof targetDateStr !== 'string' || !targetDateStr.trim()) {
    return { status: SLA_STATUS.NOT_CONFIGURED, hoursRemaining: null };
  }
  const trimmed = targetDateStr.trim();
  const target = new Date(trimmed).getTime();
  if (!Number.isFinite(target)) {
    return { status: SLA_STATUS.NOT_CONFIGURED, hoursRemaining: null };
  }
  const now = Date.now();

  if (['COMPLETED', 'VERIFIED'].includes(status)) {
    const completionTime = updatedAtStr ? new Date(updatedAtStr).getTime() : now;
    return {
      status: completionTime <= target ? SLA_STATUS.COMPLETED_ON_TIME : SLA_STATUS.COMPLETED_LATE,
      targetDate: trimmed
    };
  }

  const diffMs = target - now;
  const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) {
    return { status: SLA_STATUS.OVERDUE, hoursOverdue: Math.abs(hoursRemaining), targetDate: trimmed };
  } else if (diffMs < 24 * 60 * 60 * 1000) {
    return { status: SLA_STATUS.AT_RISK, hoursRemaining, targetDate: trimmed };
  } else {
    return { status: SLA_STATUS.ON_TRACK, hoursRemaining, targetDate: trimmed };
  }
}

export function createApiRouter(db) {
  const router = express.Router();

  // -------------------------------------------------------------
  // Users
  // -------------------------------------------------------------
  router.get('/users', (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, department FROM users ORDER BY name ASC').all();
    res.json({ ok: true, data: users });
  });

  // -------------------------------------------------------------
  // Requests: List & Detail
  // -------------------------------------------------------------
  router.get('/requests', (req, res) => {
    const { status, category, priority } = req.query;
    let query = `
      SELECT r.*, 
             u_req.name as requester_name,
             u_app.name as approver_name,
             u_ass.name as assignee_name,
             u_qa.name as qa_owner_name
      FROM requests r
      LEFT JOIN users u_req ON r.requester_id = u_req.id
      LEFT JOIN users u_app ON r.approver_id = u_app.id
      LEFT JOIN users u_ass ON r.assignee_id = u_ass.id
      LEFT JOIN users u_qa ON r.qa_owner_id = u_qa.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND r.category = ?';
      params.push(category);
    }
    if (priority) {
      query += ' AND r.priority = ?';
      params.push(priority);
    }
    query += ' ORDER BY r.updated_at DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params).map(r => ({
      ...r,
      sla: calculateSla(r.target_completion_date, r.status, r.updated_at)
    }));
    res.json({ ok: true, data: rows });
  });

  router.get('/requests/:id', (req, res) => {
    const { id } = req.params;
    const reqStmt = db.prepare(`
      SELECT r.*, 
             u_req.name as requester_name,
             u_app.name as approver_name,
             u_ass.name as assignee_name,
             u_qa.name as qa_owner_name
      FROM requests r
      LEFT JOIN users u_req ON r.requester_id = u_req.id
      LEFT JOIN users u_app ON r.approver_id = u_app.id
      LEFT JOIN users u_ass ON r.assignee_id = u_ass.id
      LEFT JOIN users u_qa ON r.qa_owner_id = u_qa.id
      WHERE r.id = ?
    `);
    const request = reqStmt.get(id);
    if (!request) {
      return res.status(404).json({ ok: false, error: `Request ${id} not found` });
    }

    const requirements = db.prepare('SELECT * FROM requirements WHERE request_id = ? ORDER BY id ASC').all(id);
    const defects = db.prepare(`
      SELECT d.*, u_rep.name as reporter_name, u_res.name as resolver_name
      FROM defects d
      LEFT JOIN users u_rep ON d.reported_by = u_rep.id
      LEFT JOIN users u_res ON d.resolved_by = u_res.id
      WHERE d.request_id = ? ORDER BY d.created_at DESC
    `).all(id);
    const comments = db.prepare(`
      SELECT c.*, u.name as author_name
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.request_id = ? ORDER BY c.created_at ASC
    `).all(id);
    const audit = getAuditHistory(db, id);
    const sla = calculateSla(request.target_completion_date, request.status, request.updated_at);

    res.json({
      ok: true,
      data: {
        ...request,
        sla,
        requirements,
        defects,
        comments,
        audit
      }
    });
  });

  router.get('/requests/:id/sla', (req, res) => {
    const { id } = req.params;
    const reqRecord = db.prepare('SELECT status, target_completion_date, updated_at FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });
    const sla = calculateSla(reqRecord.target_completion_date, reqRecord.status, reqRecord.updated_at);
    res.json({ ok: true, data: sla });
  });

  // -------------------------------------------------------------
  // Module A: Request Intake & Creation
  // -------------------------------------------------------------
  router.post('/requests', requireRole(ROLES.PRODUCT_OWNER, ROLES.ADMIN), (req, res) => {
    const { title, description, category, priority, target_completion_date = null, requirements = [] } = req.body;
    if (!title || !description || !category || !priority) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: title, description, category, priority' });
    }

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM requests');
    const nextNum = (countStmt.get().count || 0) + 101;
    const id = `REQ-${nextNum}`;

    const insertStmt = db.prepare(`
      INSERT INTO requests (
        id, title, description, category, priority, status, is_blocked,
        target_completion_date, requester_id, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'DRAFT', 0, ?, ?, 1, datetime('now'), datetime('now'))
    `);
    insertStmt.run(id, title, description, category, priority, target_completion_date, req.user.id);

    // Insert initial requirements if provided
    const insertReq = db.prepare(`
      INSERT INTO requirements (id, request_id, title, acceptance_criteria, is_met, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `);
    requirements.forEach((r, idx) => {
      insertReq.run(`${id}-C${idx + 1}`, id, r.title, r.acceptance_criteria);
    });

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CREATE_REQUEST',
      toStatus: REQUEST_STATUS.DRAFT,
      details: { title, category, priority, target_completion_date, requirementsCount: requirements.length }
    });

    res.status(201).json({ ok: true, data: { id, status: REQUEST_STATUS.DRAFT, target_completion_date } });
  });

  // Update Request Details (with optimistic concurrency check)
  router.put('/requests/:id', requireRole(ROLES.PRODUCT_OWNER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { title, description, category, priority, target_completion_date, version } = req.body;

    const current = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ ok: false, error: `Request ${id} not found` });
    }

    if (version !== undefined && current.version !== version) {
      return res.status(409).json({
        ok: false,
        error: `Conflict: Request ${id} was modified by another session (expected version ${version}, found ${current.version})`,
        currentVersion: current.version
      });
    }

    if (!['DRAFT', 'SUBMITTED'].includes(current.status)) {
      return res.status(400).json({ ok: false, error: `Cannot edit core request details while in status ${current.status}` });
    }

    const nextVersion = current.version + 1;
    db.prepare(`
      UPDATE requests
      SET title = coalesce(?, title),
          description = coalesce(?, description),
          category = coalesce(?, category),
          priority = coalesce(?, priority),
          target_completion_date = coalesce(?, target_completion_date),
          version = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(title, description, category, priority, target_completion_date, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'UPDATE_REQUEST_DETAILS',
      details: { title, category, priority, target_completion_date, version: nextVersion }
    });

    res.json({ ok: true, data: { id, version: nextVersion } });
  });

  // -------------------------------------------------------------
  // Module A: Approvals Workflow
  // -------------------------------------------------------------
  router.post('/requests/:id/submit', requireRole(ROLES.PRODUCT_OWNER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.DRAFT) {
      return res.status(400).json({ ok: false, error: `Cannot submit request in status ${reqRecord.status}` });
    }

    const reqCount = db.prepare('SELECT COUNT(*) as count FROM requirements WHERE request_id = ?').get(id).count;
    if (reqCount === 0) {
      return res.status(400).json({ ok: false, error: 'Cannot submit request without at least one requirement/acceptance criterion' });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare("UPDATE requests SET status = ?, version = ?, updated_at = datetime('now') WHERE id = ?")
      .run(REQUEST_STATUS.SUBMITTED, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'SUBMIT_FOR_APPROVAL',
      fromStatus: REQUEST_STATUS.DRAFT,
      toStatus: REQUEST_STATUS.SUBMITTED,
      details: { note: 'Submitted for managerial/security review' }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.SUBMITTED, version: nextVersion } });
  });

  router.post('/requests/:id/approve', requireRole(ROLES.APPROVER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.SUBMITTED) {
      return res.status(400).json({ ok: false, error: `Cannot approve request in status ${reqRecord.status}` });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare(`
      UPDATE requests 
      SET status = ?, approver_id = ?, approval_notes = ?, version = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(REQUEST_STATUS.APPROVED, req.user.id, notes || 'Approved', nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'APPROVE_REQUEST',
      fromStatus: REQUEST_STATUS.SUBMITTED,
      toStatus: REQUEST_STATUS.APPROVED,
      details: { notes: notes || 'Approved' }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.APPROVED, version: nextVersion } });
  });

  router.post('/requests/:id/reject', requireRole(ROLES.APPROVER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    if (!notes) {
      return res.status(400).json({ ok: false, error: 'Rejection requires detailed notes explaining the rationale' });
    }

    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.SUBMITTED) {
      return res.status(400).json({ ok: false, error: `Cannot reject request in status ${reqRecord.status}` });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare(`
      UPDATE requests 
      SET status = ?, approver_id = ?, approval_notes = ?, version = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(REQUEST_STATUS.REJECTED, req.user.id, notes, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'REJECT_REQUEST',
      fromStatus: REQUEST_STATUS.SUBMITTED,
      toStatus: REQUEST_STATUS.REJECTED,
      details: { notes }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.REJECTED, version: nextVersion } });
  });

  // -------------------------------------------------------------
  // Module B: Fulfillment Lifecycle & Assignment
  // -------------------------------------------------------------
  router.post('/requests/:id/assign', requireRole(ROLES.PRODUCT_OWNER, ROLES.APPROVER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { assignee_id, qa_owner_id } = req.body;
    if (!assignee_id) {
      return res.status(400).json({ ok: false, error: 'assignee_id is required' });
    }

    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (![REQUEST_STATUS.APPROVED, REQUEST_STATUS.ASSIGNED].includes(reqRecord.status)) {
      return res.status(400).json({ ok: false, error: `Cannot assign request in status ${reqRecord.status}` });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare(`
      UPDATE requests
      SET status = ?, assignee_id = ?, qa_owner_id = coalesce(?, qa_owner_id), version = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(REQUEST_STATUS.ASSIGNED, assignee_id, qa_owner_id || null, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ASSIGN_ENGINEER',
      fromStatus: reqRecord.status,
      toStatus: REQUEST_STATUS.ASSIGNED,
      details: { assignee_id, qa_owner_id }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.ASSIGNED, version: nextVersion } });
  });

  router.post('/requests/:id/start', requireRole(ROLES.ENGINEER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.ASSIGNED) {
      return res.status(400).json({ ok: false, error: `Cannot start work from status ${reqRecord.status}` });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare("UPDATE requests SET status = ?, version = ?, updated_at = datetime('now') WHERE id = ?")
      .run(REQUEST_STATUS.IN_PROGRESS, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'START_FULFILLMENT',
      fromStatus: REQUEST_STATUS.ASSIGNED,
      toStatus: REQUEST_STATUS.IN_PROGRESS,
      details: { engineerId: req.user.id }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.IN_PROGRESS, version: nextVersion } });
  });

  router.post('/requests/:id/block', (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ ok: false, error: 'Blocker reason is required' });

    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    const nextVersion = reqRecord.version + 1;
    db.prepare("UPDATE requests SET is_blocked = 1, blocker_reason = ?, version = ?, updated_at = datetime('now') WHERE id = ?")
      .run(reason, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'FLAG_BLOCKER',
      details: { reason }
    });

    res.json({ ok: true, data: { id, is_blocked: 1, blocker_reason: reason, version: nextVersion } });
  });

  router.post('/requests/:id/unblock', (req, res) => {
    const { id } = req.params;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    const nextVersion = reqRecord.version + 1;
    db.prepare("UPDATE requests SET is_blocked = 0, blocker_reason = NULL, version = ?, updated_at = datetime('now') WHERE id = ?")
      .run(nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'RESOLVE_BLOCKER',
      details: { previousReason: reqRecord.blocker_reason }
    });

    res.json({ ok: true, data: { id, is_blocked: 0, version: nextVersion } });
  });

  router.post('/requests/:id/request-review', requireRole(ROLES.ENGINEER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.IN_PROGRESS) {
      return res.status(400).json({ ok: false, error: `Cannot request review from status ${reqRecord.status}` });
    }

    if (reqRecord.is_blocked) {
      return res.status(400).json({ ok: false, error: 'Cannot request review while work is blocked' });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare("UPDATE requests SET status = ?, fulfillment_notes = ?, version = ?, updated_at = datetime('now') WHERE id = ?")
      .run(REQUEST_STATUS.REVIEW_REQUESTED, notes || 'Implementation complete; peer review requested', nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'REQUEST_CODE_REVIEW',
      fromStatus: REQUEST_STATUS.IN_PROGRESS,
      toStatus: REQUEST_STATUS.REVIEW_REQUESTED,
      details: { notes }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.REVIEW_REQUESTED, version: nextVersion } });
  });

  router.post('/requests/:id/submit-qa', requireRole(ROLES.ENGINEER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.REVIEW_REQUESTED) {
      return res.status(400).json({ ok: false, error: `Must complete peer review before submitting to QA (current status: ${reqRecord.status})` });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare("UPDATE requests SET status = ?, version = ?, updated_at = datetime('now') WHERE id = ?")
      .run(REQUEST_STATUS.QA_PENDING, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'HANDOFF_TO_QA',
      fromStatus: REQUEST_STATUS.REVIEW_REQUESTED,
      toStatus: REQUEST_STATUS.QA_PENDING,
      details: { notes: notes || 'Peer review passed; ready for acceptance verification' }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.QA_PENDING, version: nextVersion } });
  });

  // -------------------------------------------------------------
  // Module B: QA Verification, Defect Lifecycle & Completion
  // -------------------------------------------------------------
  router.post('/requests/:id/verify', requireRole(ROLES.QA_ENGINEER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.QA_PENDING) {
      return res.status(400).json({ ok: false, error: `Cannot verify request in status ${reqRecord.status}` });
    }

    const openDefects = db.prepare(`
      SELECT COUNT(*) as count FROM defects 
      WHERE request_id = ? AND status IN ('OPEN', 'FIXED', 'RETEST_FAILED')
    `).get(id).count;

    if (openDefects > 0) {
      return res.status(400).json({
        ok: false,
        error: `Cannot verify request: ${openDefects} unresolved defect(s) remain open`
      });
    }

    const unmetCriteria = db.prepare(`
      SELECT COUNT(*) as count FROM requirements
      WHERE request_id = ? AND is_met = 0
    `).get(id).count;

    if (unmetCriteria > 0) {
      return res.status(400).json({
        ok: false,
        error: `Cannot verify request: ${unmetCriteria} requirement(s) are not verified as met`
      });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare(`
      UPDATE requests 
      SET status = ?, qa_owner_id = ?, qa_notes = ?, version = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(REQUEST_STATUS.VERIFIED, req.user.id, notes || 'All acceptance criteria verified; zero open defects', nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'QA_VERIFY_PASS',
      fromStatus: REQUEST_STATUS.QA_PENDING,
      toStatus: REQUEST_STATUS.VERIFIED,
      details: { notes: notes || 'Verified' }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.VERIFIED, version: nextVersion } });
  });

  router.post('/requests/:id/reopen', requireRole(ROLES.QA_ENGINEER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.QA_PENDING) {
      return res.status(400).json({ ok: false, error: `Cannot return work for correction from status ${reqRecord.status}` });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare(`
      UPDATE requests
      SET status = ?, qa_notes = ?, version = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(REQUEST_STATUS.IN_PROGRESS, notes || 'Defects found during QA; returned for correction', nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'RETURN_FOR_CORRECTION',
      fromStatus: REQUEST_STATUS.QA_PENDING,
      toStatus: REQUEST_STATUS.IN_PROGRESS,
      details: { notes }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.IN_PROGRESS, version: nextVersion } });
  });

  router.post('/requests/:id/complete', requireRole(ROLES.PRODUCT_OWNER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Not found' });

    if (reqRecord.status !== REQUEST_STATUS.VERIFIED) {
      return res.status(400).json({ ok: false, error: `Cannot complete request before QA verification (current status: ${reqRecord.status})` });
    }

    const nextVersion = reqRecord.version + 1;
    db.prepare("UPDATE requests SET status = ?, version = ?, updated_at = datetime('now') WHERE id = ?")
      .run(REQUEST_STATUS.COMPLETED, nextVersion, id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CLOSE_COMPLETED',
      fromStatus: REQUEST_STATUS.VERIFIED,
      toStatus: REQUEST_STATUS.COMPLETED,
      details: { note: 'Service request fulfillment formally accepted and completed' }
    });

    res.json({ ok: true, data: { id, status: REQUEST_STATUS.COMPLETED, version: nextVersion } });
  });

  // -------------------------------------------------------------
  // Requirements & Acceptance Criteria
  // -------------------------------------------------------------
  router.post('/requests/:id/requirements', requireRole(ROLES.PRODUCT_OWNER, ROLES.ADMIN), (req, res) => {
    const { id } = req.params;
    const { title, acceptance_criteria } = req.body;
    if (!title || !acceptance_criteria) {
      return res.status(400).json({ ok: false, error: 'title and acceptance_criteria are required' });
    }

    const reqRecord = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!reqRecord) return res.status(404).json({ ok: false, error: 'Request not found' });

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM requirements WHERE request_id = ?');
    const nextIdx = countStmt.get(id).count + 1;
    const reqId = `${id}-C${nextIdx}`;

    db.prepare(`
      INSERT INTO requirements (id, request_id, title, acceptance_criteria, is_met, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).run(reqId, id, title, acceptance_criteria);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ADD_REQUIREMENT',
      details: { reqId, title, acceptance_criteria }
    });

    res.status(201).json({ ok: true, data: { id: reqId, title, acceptance_criteria, is_met: 0 } });
  });

  router.patch('/requests/:id/requirements/:reqId', (req, res) => {
    const { id, reqId } = req.params;
    const { is_met } = req.body;

    const current = db.prepare('SELECT * FROM requirements WHERE id = ? AND request_id = ?').get(reqId, id);
    if (!current) return res.status(404).json({ ok: false, error: 'Requirement not found' });

    db.prepare('UPDATE requirements SET is_met = ? WHERE id = ?').run(is_met ? 1 : 0, reqId);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'UPDATE_CRITERIA_STATUS',
      details: { reqId, is_met: !!is_met }
    });

    res.json({ ok: true, data: { id: reqId, is_met: is_met ? 1 : 0 } });
  });

  // -------------------------------------------------------------
  // Defects Management
  // -------------------------------------------------------------
  router.post('/requests/:id/defects', requireRole(ROLES.QA_ENGINEER, ROLES.ADMIN, ROLES.ENGINEER), (req, res) => {
    const { id } = req.params;
    const { title, severity, steps_to_reproduce, expected_behavior, actual_behavior } = req.body;

    if (!title || !severity || !steps_to_reproduce || !expected_behavior || !actual_behavior) {
      return res.status(400).json({ ok: false, error: 'All defect fields are required' });
    }

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM defects');
    const nextNum = (countStmt.get().count || 0) + 1;
    const defectId = `DEF-${String(nextNum).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO defects (
        id, request_id, title, severity, steps_to_reproduce, expected_behavior,
        actual_behavior, status, reported_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, datetime('now'))
    `).run(defectId, id, title, severity, steps_to_reproduce, expected_behavior, actual_behavior, req.user.id);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'LOG_DEFECT',
      details: { defectId, title, severity }
    });

    res.status(201).json({ ok: true, data: { id: defectId, status: 'OPEN' } });
  });

  router.patch('/requests/:id/defects/:defId', (req, res) => {
    const { id, defId } = req.params;
    const { status, notes } = req.body;

    const current = db.prepare('SELECT * FROM defects WHERE id = ? AND request_id = ?').get(defId, id);
    if (!current) return res.status(404).json({ ok: false, error: 'Defect not found' });

    let resolvedBy = current.resolved_by;
    let resolvedAt = current.resolved_at;
    if (['FIXED', 'CLOSED', 'RETEST_PASSED'].includes(status) && !current.resolved_at) {
      resolvedBy = req.user.id;
      resolvedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE defects 
      SET status = ?, resolved_by = ?, resolved_at = ?
      WHERE id = ?
    `).run(status, resolvedBy, resolvedAt, defId);

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'UPDATE_DEFECT_STATUS',
      details: { defectId: defId, fromStatus: current.status, toStatus: status, notes }
    });

    res.json({ ok: true, data: { id: defId, status } });
  });

  // -------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------
  router.post('/requests/:id/comments', (req, res) => {
    const { id } = req.params;
    const { body, comment_type = 'GENERAL' } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ ok: false, error: 'Comment body cannot be empty' });
    }

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM comments');
    const commentId = `COM-${(countStmt.get().count || 0) + 1}`;

    db.prepare(`
      INSERT INTO comments (id, request_id, author_id, role, comment_type, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(commentId, id, req.user.id, req.user.role, comment_type, body.trim());

    logAuditEvent(db, {
      requestId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ADD_COMMENT',
      details: { commentId, comment_type }
    });

    res.status(201).json({ ok: true, data: { id: commentId, author_id: req.user.id, body: body.trim() } });
  });

  // -------------------------------------------------------------
  // Audit History
  // -------------------------------------------------------------
  router.get('/requests/:id/audit', (req, res) => {
    const { id } = req.params;
    const history = getAuditHistory(db, id);
    res.json({ ok: true, data: history });
  });

  router.get('/requests/:id/export', (req, res) => {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    const history = getAuditHistory(db, id);
    if (!history) return res.status(404).json({ ok: false, error: 'Not found' });

    if (format === 'csv') {
      const headers = ['id', 'request_id', 'actor_id', 'actor_role', 'action', 'from_status', 'to_status', 'timestamp'];
      const rows = history.map(h => [h.id, h.request_id, h.actor_id, h.actor_role, h.action, h.from_status || '', h.to_status || '', h.timestamp]);
      const csv = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${id}-audit.csv"`);
      return res.send(csv);
    }

    res.json({ ok: true, data: history });
  });

  // -------------------------------------------------------------
  // System Release Readiness Dashboard
  // -------------------------------------------------------------
  router.get('/readiness', (req, res) => {
    const totalRequests = db.prepare('SELECT COUNT(*) as c FROM requests').get().c;
    const completed = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'COMPLETED'").get().c;
    const verified = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'VERIFIED'").get().c;
    const inProgress = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status IN ('ASSIGNED', 'IN_PROGRESS', 'REVIEW_REQUESTED', 'QA_PENDING')").get().c;
    const blocked = db.prepare("SELECT COUNT(*) as c FROM requests WHERE is_blocked = 1").get().c;
    
    const openDefects = db.prepare("SELECT COUNT(*) as c FROM defects WHERE status IN ('OPEN', 'FIXED', 'RETEST_FAILED')").get().c;
    const closedDefects = db.prepare("SELECT COUNT(*) as c FROM defects WHERE status IN ('CLOSED', 'RETEST_PASSED')").get().c;
    
    const totalCriteria = db.prepare('SELECT COUNT(*) as c FROM requirements').get().c;
    const metCriteria = db.prepare('SELECT COUNT(*) as c FROM requirements WHERE is_met = 1').get().c;

    const isReleaseReady = openDefects === 0 && blocked === 0 && (completed + verified > 0);

    res.json({
      ok: true,
      data: {
        isReleaseReady,
        counts: {
          totalRequests,
          completed,
          verified,
          inProgress,
          blocked,
          openDefects,
          closedDefects,
          totalCriteria,
          metCriteria
        },
        gates: {
          zeroOpenDefects: openDefects === 0,
          zeroBlockedItems: blocked === 0,
          verifiedWorkPresent: (completed + verified) > 0,
          allAcceptanceCriteriaMet: totalCriteria > 0 ? (metCriteria === totalCriteria) : true
        }
      }
    });
  });

  // -------------------------------------------------------------
  // REQ-B7: Operational SLA Risk Summary & Dashboard
  // -------------------------------------------------------------
  router.get('/analytics/sla-summary', requireRole(ROLES.ADMIN, ROLES.PRODUCT_OWNER, ROLES.APPROVER), (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, u_ass.name as assignee_name
      FROM requests r
      LEFT JOIN users u_ass ON r.assignee_id = u_ass.id
    `).all();

    const statusCounts = {
      ON_TRACK: 0,
      AT_RISK: 0,
      OVERDUE: 0,
      MET_COMPLETED: 0,
      BREACHED_COMPLETED: 0,
      NOT_CONFIGURED: 0
    };

    const byCategory = {
      INFRASTRUCTURE: 0,
      SECURITY_ACCESS: 0,
      DATA_PIPELINE: 0,
      APP_INTEGRATION: 0
    };

    const byPriority = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
      EXPEDITED: 0
    };

    const activeRequests = [];
    const now = Date.now();

    for (const r of requests) {
      const sla = calculateSla(r.target_completion_date, r.status, r.updated_at);

      if (sla.status === SLA_STATUS.ON_TRACK) {
        statusCounts.ON_TRACK++;
      } else if (sla.status === SLA_STATUS.AT_RISK) {
        statusCounts.AT_RISK++;
      } else if (sla.status === SLA_STATUS.OVERDUE) {
        statusCounts.OVERDUE++;
      } else if (sla.status === SLA_STATUS.COMPLETED_ON_TIME || sla.status === SLA_STATUS.MET_COMPLETED) {
        statusCounts.MET_COMPLETED++;
      } else if (sla.status === SLA_STATUS.COMPLETED_LATE || sla.status === SLA_STATUS.BREACHED_COMPLETED) {
        statusCounts.BREACHED_COMPLETED++;
      } else {
        statusCounts.NOT_CONFIGURED++;
      }

      // Active requests are non-terminal requests
      const isTerminal = ['COMPLETED', 'REJECTED'].includes(r.status);
      if (!isTerminal) {
        activeRequests.push({ ...r, sla });

        if (byCategory[r.category] !== undefined) {
          byCategory[r.category]++;
        } else {
          byCategory[r.category] = 1;
        }

        if (byPriority[r.priority] !== undefined) {
          byPriority[r.priority]++;
        } else {
          byPriority[r.priority] = 1;
        }
      }
    }

    // Top active requests closest to breach (or already breached)
    const topAtRisk = activeRequests
      .filter(r => r.target_completion_date && typeof r.target_completion_date === 'string' && r.target_completion_date.trim() !== '' && Number.isFinite(new Date(r.target_completion_date.trim()).getTime()))
      .map(r => {
        const targetMs = new Date(r.target_completion_date.trim()).getTime();
        const diffMs = targetMs - now;
        return {
          id: r.id,
          title: r.title,
          category: r.category,
          priority: r.priority,
          status: r.status,
          target_completion_date: r.target_completion_date.trim(),
          assignee_id: r.assignee_id,
          assignee_name: r.assignee_name,
          diffMs,
          sla: r.sla
        };
      })
      .filter(r => Number.isFinite(r.diffMs))
      .sort((a, b) => a.diffMs - b.diffMs)
      .slice(0, 10)
      .map(({ diffMs, ...item }) => item);

    res.json({
      ok: true,
      data: {
        totalRequests: requests.length,
        activeRequestsCount: activeRequests.length,
        statusCounts,
        slaStatus: statusCounts,
        byCategory,
        byPriority,
        activeBreakdown: {
          byCategory,
          byPriority
        },
        topAtRisk,
        closestToBreach: topAtRisk
      }
    });
  });

  return router;
}
