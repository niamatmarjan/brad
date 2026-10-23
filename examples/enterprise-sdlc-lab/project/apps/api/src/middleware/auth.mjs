import { Roles } from '../../../../packages/core/src/types.mjs';

const ROLE_HIERARCHY = {
  [Roles.EMPLOYEE]: 1,
  [Roles.MANAGER]: 2,
  [Roles.APPROVER]: 3,
  [Roles.AUDITOR]: 3,
  [Roles.ADMIN]: 4
};

export function createAuthMiddleware() {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'] || 'anonymous-user';
    const rawRole = (req.headers['x-user-role'] || Roles.EMPLOYEE).toUpperCase();
    const role = Roles[rawRole] || Roles.EMPLOYEE;

    req.user = {
      userId,
      role
    };

    next();
  };
}

export function requireRole(minimumRole) {
  return (req, res, next) => {
    const userRoleRank = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredRank = ROLE_HIERARCHY[minimumRole] || 99;

    if (userRoleRank < requiredRank) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Role ${minimumRole} or higher required; user holds ${req.user.role}`
      }));
      return;
    }

    next();
  };
}
