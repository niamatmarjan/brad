export function logAuditEvent(db, { requestId, actorId, actorRole, action, fromStatus = null, toStatus = null, details = {} }) {
  const stmt = db.prepare(`
    INSERT INTO audit_log (request_id, actor_id, actor_role, action, from_status, to_status, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(requestId, actorId, actorRole, action, fromStatus, toStatus, JSON.stringify(details));
}

export function getAuditHistory(db, requestId) {
  const stmt = db.prepare(`
    SELECT a.*, u.name as actor_name
    FROM audit_log a
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.request_id = ?
    ORDER BY a.id ASC
  `);
  return stmt.all(requestId).map(row => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : {}
  }));
}
