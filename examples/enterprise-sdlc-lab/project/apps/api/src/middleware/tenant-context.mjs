export function createTenantMiddleware() {
  return (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId || tenantId.trim() === '') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'MISSING_TENANT_HEADER', message: 'Header X-Tenant-ID is required' }));
      return;
    }

    req.tenantContext = { tenantId: tenantId.trim() };
    next();
  };
}
