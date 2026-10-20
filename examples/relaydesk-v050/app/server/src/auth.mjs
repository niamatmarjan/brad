export function authMiddleware(db) {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const roleOverride = req.headers['x-role'];
    
    if (userId) {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(userId);
      if (user) {
        req.user = roleOverride ? { ...user, role: roleOverride } : user;
        return next();
      }
    }
    
    // Default fallback development identity (Admin) if none specified
    const defaultUserStmt = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1");
    const defaultUser = defaultUserStmt.get();
    if (defaultUser) {
      req.user = roleOverride ? { ...defaultUser, role: roleOverride } : defaultUser;
    } else {
      req.user = {
        id: 'USR-DEV-ADMIN',
        name: 'Default Dev Admin',
        email: 'admin@relaydesk.local',
        role: roleOverride || 'ADMIN',
        department: 'Operations'
      };
    }
    next();
  };
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: `Permission denied. Required role: [${allowedRoles.join(', ')}]. Active role: ${req.user ? req.user.role : 'none'}`
      });
    }
    next();
  };
}
