import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './database.js';
import { Delivery } from './delivery.js';
import { Quality } from './quality.js';
import { Sessions } from './sessions.js';
import { ApiError, fail } from './errors.js';
import { object, text } from './validation.js';

export interface AppOptions {
  production?: boolean;
  origin?: string;
  webRoot?: string;
}
const mutationMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function sameOrigin(request: IncomingMessage, configured: string | undefined, production: boolean): void {
  if (request.headers['sec-fetch-site'] === 'cross-site') fail(403, 'ORIGIN_DENIED', 'Cross-site mutations are not allowed.');
  let expected: string;
  if (configured) expected = new URL(configured).origin;
  else {
    if (production) fail(403, 'ORIGIN_DENIED', 'A trusted application origin is required in production.');
    const host = request.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) fail(403, 'ORIGIN_DENIED', 'Only the local application origin is trusted.');
    expected = `http://${host}`;
  }
  if (request.headers.origin !== expected) fail(403, 'ORIGIN_DENIED', 'A matching Origin header is required for mutations.');
}

async function body(request: IncomingMessage) {
  if (request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    fail(400, 'INVALID_INPUT', 'Use application/json for mutation requests.');
  }
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > 65536) fail(400, 'BODY_TOO_LARGE', 'JSON request bodies must not exceed 64 KiB.');
    chunks.push(buffer);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { fail(400, 'INVALID_JSON', 'The request body is not valid JSON.'); }
  return object(parsed);
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}

async function serveWeb(response: ServerResponse, pathname: string, root: string): Promise<void> {
  const path = resolve(root, `.${pathname}`);
  if (path !== root && !path.startsWith(`${root}${sep}`)) fail(404, 'NOT_FOUND', 'File not found.');
  let data: Buffer, extension = extname(path);
  try { data = await readFile(extension ? path : resolve(root, 'index.html')); }
  catch { fail(404, 'NOT_FOUND', 'Build the browser application before serving it.'); }
  if (!extension) extension = '.html';
  response.writeHead(200, { 'Content-Type': mime[extension] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  response.end(data);
}

export function createApp(store: Store, options: AppOptions = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const origin = options.origin ?? process.env.CONCOURSE_ORIGIN;
  if (origin && !/^https?:$/.test(new URL(origin).protocol)) throw new Error('Application origin must use HTTP or HTTPS.');
  const sessions = new Sessions(store, production);
  const delivery = new Delivery(store);
  const quality = new Quality(delivery);
  const defaultWebRoot = fileURLToPath(new URL(import.meta.url.includes('/dist/') ? '../../../web/dist/' : '../../web/dist/', import.meta.url));
  const server = createServer((request, response) => {
    void (async () => {
      const method = request.method ?? 'GET';
      const url = new URL(request.url ?? '/', 'http://localhost');
      let path: string;
      try { path = decodeURIComponent(url.pathname); }
      catch { fail(400, 'INVALID_INPUT', 'The URL contains invalid encoding.'); }
      if (path === '/api/health' && method === 'GET') {
        store.get('SELECT 1');
        return json(response, 200, { data: { status: 'ok', database: 'ok' } });
      }
      if (!path.startsWith('/api/') && path !== '/api') {
        if (method !== 'GET') fail(404, 'NOT_FOUND', 'Route not found.');
        return serveWeb(response, path, resolve(options.webRoot ?? defaultWebRoot));
      }
      if (mutationMethods.includes(method)) sameOrigin(request, origin, production);
      const token = sessions.token(request);
      if (path === '/api/demo-users' && method === 'GET') {
        if (production) fail(404, 'NOT_FOUND', 'Development sign-in is disabled.');
        return json(response, 200, { data: store.all('SELECT id, name, role FROM users ORDER BY id') });
      }
      if (path === '/api/session/demo' && method === 'POST') {
        if (production) fail(404, 'NOT_FOUND', 'Development sign-in is disabled.');
        const input = await body(request);
        if (Object.keys(input).some(key => key !== 'userId')) fail(400, 'INVALID_INPUT', 'Only userId is allowed.');
        const result = sessions.login(text(input.userId, 'userId', 100), token);
        response.setHeader('Set-Cookie', result.cookie);
        return json(response, 201, { data: result.user });
      }
      const user = sessions.user(token);
      if (path === '/api/session' && method === 'GET') return json(response, 200, { data: user });
      if (path === '/api/session/logout' && method === 'POST') {
        response.setHeader('Set-Cookie', sessions.logout(token));
        return json(response, 200, { data: { signedOut: true } });
      }
      if (path === '/api/users' && method === 'GET') return json(response, 200, { data: store.all('SELECT id, name, role FROM users ORDER BY id') });
      if (path === '/api/projects') {
        if (method === 'GET') return json(response, 200, { data: delivery.projects() });
        if (method === 'POST') return json(response, 201, { data: delivery.createProject(user, await body(request)) });
      }
      const project = /^\/api\/projects\/([^/]+)(?:\/(work-items|activity|release-readiness))?$/.exec(path);
      if (project) {
        const id = project[1]!, collection = project[2];
        if (!collection && method === 'GET') return json(response, 200, { data: delivery.project(id) });
        if (collection === 'work-items') {
          if (method === 'GET') return json(response, 200, { data: delivery.items(id) });
          if (method === 'POST') return json(response, 201, { data: delivery.createItem(user, id, await body(request)) });
        }
        if (collection === 'activity' && method === 'GET') return json(response, 200, { data: delivery.activity(id) });
        if (collection === 'release-readiness' && method === 'GET') return json(response, 200, { data: delivery.readiness(id) });
      }
      const item = /^\/api\/work-items\/([^/]+)(?:\/(transitions|comments|reviews|test-runs|defects))?$/.exec(path);
      if (item) {
        const id = item[1]!, collection = item[2];
        if (!collection) {
          if (method === 'GET') return json(response, 200, { data: delivery.item(id) });
          if (method === 'PATCH') return json(response, 200, { data: delivery.updateItem(user, id, await body(request)) });
        }
        if (method === 'GET') {
          if (collection === 'comments') return json(response, 200, { data: quality.comments(id) });
          if (collection === 'reviews') return json(response, 200, { data: quality.reviews(id) });
          if (collection === 'test-runs') return json(response, 200, { data: quality.testRuns(id) });
          if (collection === 'defects') return json(response, 200, { data: quality.defects(id) });
          if (collection === 'transitions') {
            delivery.item(id);
            return json(response, 200, { data: store.all('SELECT * FROM transitions WHERE workItemId = ? ORDER BY rowid', id) });
          }
        }
        if (method === 'POST') {
          const input = await body(request);
          if (collection === 'transitions') return json(response, 200, { data: delivery.transition(user, id, input) });
          if (collection === 'comments') return json(response, 201, { data: quality.comment(user, id, input) });
          if (collection === 'reviews') return json(response, 201, { data: quality.review(user, id, input) });
          if (collection === 'test-runs') return json(response, 201, { data: quality.testRun(user, id, input) });
          if (collection === 'defects') return json(response, 201, { data: quality.createDefect(user, id, input) });
        }
      }
      const defect = /^\/api\/defects\/([^/]+)(?:\/(retests))?$/.exec(path);
      if (defect) {
        const id = defect[1]!;
        if (!defect[2] && method === 'PATCH') return json(response, 200, { data: quality.updateDefect(user, id, await body(request)) });
        if (!defect[2] && method === 'GET') return json(response, 200, { data: quality.defect(id) });
        if (defect[2] === 'retests' && method === 'GET') return json(response, 200, { data: quality.retests(id) });
        if (defect[2] === 'retests' && method === 'POST') return json(response, 201, { data: quality.retest(user, id, await body(request)) });
      }
      fail(404, 'NOT_FOUND', 'Route not found.');
    })().catch((error: unknown) => {
      if (response.headersSent) { response.end(); return; }
      if (error instanceof ApiError) {
        json(response, error.status, { error: { code: error.code, message: error.message, details: error.details } });
      } else if (error instanceof Error && /database is (locked|busy)/i.test(error.message)) {
        json(response, 409, { error: { code: 'DATABASE_BUSY', message: 'Another update is in progress. Try again.', details: null } });
      } else {
        json(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.', details: null } });
      }
    });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
