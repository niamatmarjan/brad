import { createHash } from 'node:crypto';

export class IdempotencyStore {
  constructor(ttlMs = 24 * 3600 * 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  hashPayload(body) {
    const raw = typeof body === 'string' ? body : JSON.stringify(body || {});
    return createHash('sha256').update(raw).digest('hex');
  }

  get(tenantId, key) {
    const compositeKey = `${tenantId}::${key}`;
    const entry = this.cache.get(compositeKey);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(compositeKey);
      return null;
    }
    return entry;
  }

  set(tenantId, key, payloadHash, statusCode, responseBody) {
    const compositeKey = `${tenantId}::${key}`;
    this.cache.set(compositeKey, {
      payloadHash,
      statusCode,
      responseBody,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear() {
    this.cache.clear();
  }
}

export function createIdempotencyMiddleware(store) {
  return (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key || req.method === 'GET' || req.method === 'HEAD') {
      next();
      return;
    }

    const tenantId = req.tenantContext?.tenantId || 'global';
    const cached = store.get(tenantId, key);

    if (cached) {
      const currentHash = store.hashPayload(req.body);
      if (cached.payloadHash !== currentHash) {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
          message: 'Idempotency-Key previously used with a different request payload'
        }));
        return;
      }

      res.writeHead(cached.statusCode, {
        'Content-Type': 'application/json',
        'X-Cache-Lookup': 'HIT',
        'X-Idempotent-Replay': 'true'
      });
      res.end(cached.responseBody);
      return;
    }

    // Intercept res.end to cache response
    const originalEnd = res.end.bind(res);
    res.end = (chunk, encoding, callback) => {
      const responseBody = chunk ? chunk.toString() : '';
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const payloadHash = store.hashPayload(req.body);
        store.set(tenantId, key, payloadHash, res.statusCode, responseBody);
      }
      return originalEnd(chunk, encoding, callback);
    };

    next();
  };
}
