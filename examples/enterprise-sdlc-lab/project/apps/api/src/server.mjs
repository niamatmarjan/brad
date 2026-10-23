import { createServer } from 'node:http';
import { MemoryDriver } from '../../../packages/storage/src/memory-driver.mjs';
import { CryptographicAuditLedger } from '../../../packages/core/src/audit-ledger.mjs';
import { MockNotificationAdapter } from '../../../packages/core/src/notification-adapter.mjs';
import { createTenantMiddleware } from './middleware/tenant-context.mjs';
import { createAuthMiddleware } from './middleware/auth.mjs';
import { IdempotencyStore, createIdempotencyMiddleware } from './middleware/idempotency.mjs';
import { registerChangeRequestRoutes } from './routes/change-requests.mjs';
import { registerApprovalRoutes } from './routes/approvals.mjs';
import { registerAuditRoutes } from './routes/audit.mjs';
import { MetricsTracker, registerHealthRoutes } from './routes/health.mjs';

export class SimpleRouter {
  constructor() {
    this.routes = [];
  }

  add(method, pathPattern, ...handlers) {
    // Convert path pattern e.g. /api/v1/change-requests/:id/submit to regex
    const paramNames = [];
    const regexPath = pathPattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexPath}$`);

    this.routes.push({
      method: method.toUpperCase(),
      regex,
      paramNames,
      handlers
    });
  }

  get(pattern, ...handlers) { this.add('GET', pattern, ...handlers); }
  post(pattern, ...handlers) { this.add('POST', pattern, ...handlers); }
  put(pattern, ...handlers) { this.add('PUT', pattern, ...handlers); }
  delete(pattern, ...handlers) { this.add('DELETE', pattern, ...handlers); }

  match(method, pathname) {
    for (const r of this.routes) {
      if (r.method !== method.toUpperCase()) continue;
      const match = pathname.match(r.regex);
      if (match) {
        const params = {};
        r.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        return { handlers: r.handlers, params };
      }
    }
    return null;
  }
}

export function createApp(options = {}) {
  const driver = options.driver || new MemoryDriver();
  const auditLedger = options.auditLedger || new CryptographicAuditLedger();
  const notificationAdapter = options.notificationAdapter || new MockNotificationAdapter();
  const idempotencyStore = options.idempotencyStore || new IdempotencyStore();
  const metricsTracker = options.metricsTracker || new MetricsTracker();

  const router = new SimpleRouter();
  const dependencies = { driver, auditLedger, notificationAdapter, idempotencyStore, metricsTracker };

  // Register route groups
  registerHealthRoutes(router, dependencies);
  registerChangeRequestRoutes(router, dependencies);
  registerApprovalRoutes(router, dependencies);
  registerAuditRoutes(router, dependencies);

  const tenantMiddleware = createTenantMiddleware();
  const authMiddleware = createAuthMiddleware();
  const idempotencyMiddleware = createIdempotencyMiddleware(idempotencyStore);

  const handleRequest = async (req, res) => {
    const startTime = Date.now();
    const parsed = new URL(req.url, 'http://localhost');
    req.pathname = parsed.pathname;
    req.query = Object.fromEntries(parsed.searchParams.entries());

    // Buffer incoming body
    let rawBody = '';
    for await (const chunk of req) {
      rawBody += chunk;
    }

    if (rawBody && req.headers['content-type']?.includes('application/json')) {
      try {
        req.body = JSON.parse(rawBody);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }));
        metricsTracker.recordRequest(Date.now() - startTime, true);
        return;
      }
    } else {
      req.body = rawBody;
    }

    // Wrap end to capture metrics
    const origEnd = res.end.bind(res);
    res.end = (...args) => {
      const isError = res.statusCode >= 400;
      metricsTracker.recordRequest(Date.now() - startTime, isError);
      return origEnd(...args);
    };

    // Health and ready skip tenant/auth middlewares
    if (req.pathname === '/health' || req.pathname === '/ready' || req.pathname === '/metrics') {
      const matched = router.match(req.method, req.pathname);
      if (matched) {
        req.params = matched.params;
        const handler = matched.handlers[0];
        await handler(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND' }));
      }
      return;
    }

    // Execute standard middleware chain
    const middlewares = [tenantMiddleware, authMiddleware, idempotencyMiddleware];
    let idx = 0;

    const next = async () => {
      if (idx < middlewares.length) {
        const mw = middlewares[idx++];
        mw(req, res, next);
      } else {
        const matched = router.match(req.method, req.pathname);
        if (!matched) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'ROUTE_NOT_FOUND', message: `Path ${req.pathname} not found` }));
          return;
        }

        req.params = matched.params;
        let hIdx = 0;
        const nextHandler = async () => {
          if (hIdx < matched.handlers.length) {
            const h = matched.handlers[hIdx++];
            await h(req, res, nextHandler);
          }
        };
        await nextHandler();
      }
    };

    await next();
  };

  return {
    handleRequest,
    driver,
    auditLedger,
    notificationAdapter,
    idempotencyStore,
    metricsTracker
  };
}

export function startServer(port = 3000, options = {}) {
  const app = createApp(options);
  const server = createServer(app.handleRequest);
  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, app, port: server.address().port });
    });
  });
}
