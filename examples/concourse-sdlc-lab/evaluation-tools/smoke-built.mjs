import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Store } from '../server-backed/server/dist/src/database.js';
import { createApp } from '../server-backed/server/dist/src/http.js';

const store = new Store(':memory:');
const server = createApp(store, {
  production: true,
  webRoot: fileURLToPath(new URL('../server-backed/web/dist/', import.meta.url)),
});
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const request = path => fetch(`${origin}${path}`, { signal: AbortSignal.timeout(5000) });
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { data: { status: 'ok', database: 'ok' } });
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
  assert.ok(assets.length >= 2, 'Expected built JavaScript and CSS references');
  for (const asset of assets) {
    const result = await request(asset);
    assert.equal(result.status, 200, `Missing built asset: ${asset}`);
    assert.ok((await result.arrayBuffer()).byteLength > 0, `Empty built asset: ${asset}`);
  }
  assert.equal((await request('/api/demo-users')).status, 404);
  console.log(`Built-client smoke PASS: health, HTML, ${assets.length} compiled assets, production demo enumeration disabled; in-memory database only.`);
} finally {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
  store.close();
}
