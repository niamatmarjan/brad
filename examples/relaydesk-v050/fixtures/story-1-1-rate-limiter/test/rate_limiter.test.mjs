import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../src/rate_limiter.mjs';

describe('Story 1.1 — In-Memory Rate Limiter', () => {
  test('AC1: Configurable request limit and time window validation', () => {
    // Valid configuration
    const limiter = new RateLimiter({ limit: 5, windowMs: 1000 });
    assert.equal(limiter.limit, 5);
    assert.equal(limiter.windowMs, 1000);

    // Invalid limit configurations
    assert.throws(() => new RateLimiter({ limit: 0, windowMs: 1000 }), TypeError);
    assert.throws(() => new RateLimiter({ limit: -1, windowMs: 1000 }), TypeError);
    assert.throws(() => new RateLimiter({ limit: 2.5, windowMs: 1000 }), TypeError);
    assert.throws(() => new RateLimiter({ limit: '5', windowMs: 1000 }), TypeError);

    // Invalid window configurations
    assert.throws(() => new RateLimiter({ limit: 5, windowMs: 0 }), TypeError);
    assert.throws(() => new RateLimiter({ limit: 5, windowMs: -500 }), TypeError);
    assert.throws(() => new RateLimiter({ limit: 5, windowMs: '1000' }), TypeError);
  });

  test('AC2 & AC5: Requests are tracked independently by client key', () => {
    let mockTime = 10000;
    const limiter = new RateLimiter({
      limit: 2,
      windowMs: 5000,
      now: () => mockTime
    });

    // Client A uses 2 requests
    const resA1 = limiter.consume('client-a');
    assert.equal(resA1.allowed, true);
    assert.equal(resA1.remaining, 1);

    const resA2 = limiter.consume('client-a');
    assert.equal(resA2.allowed, true);
    assert.equal(resA2.remaining, 0);

    // Client A is now at limit
    const resA3 = limiter.consume('client-a');
    assert.equal(resA3.allowed, false);

    // Client B must be completely isolated and unaffected by Client A
    const resB1 = limiter.consume('client-b');
    assert.equal(resB1.allowed, true);
    assert.equal(resB1.remaining, 1);

    const resB2 = limiter.consume('client-b');
    assert.equal(resB2.allowed, true);
    assert.equal(resB2.remaining, 0);
  });

  test('AC3: Requests over the threshold are rejected', () => {
    let mockTime = 20000;
    const limiter = new RateLimiter({
      limit: 3,
      windowMs: 10000,
      now: () => mockTime
    });

    assert.equal(limiter.consume('client-x').allowed, true);
    assert.equal(limiter.consume('client-x').allowed, true);
    assert.equal(limiter.consume('client-x').allowed, true);

    // 4th request must be rejected
    const rejected = limiter.consume('client-x');
    assert.equal(rejected.allowed, false);
    assert.equal(rejected.remaining, 0);
    assert.equal(rejected.limit, 3);
    assert.equal(rejected.resetTime, 30000);
    assert.equal(rejected.retryAfterMs, 10000);

    // Advance time slightly (not expired yet)
    mockTime = 25000;
    const stillRejected = limiter.consume('client-x');
    assert.equal(stillRejected.allowed, false);
    assert.equal(stillRejected.retryAfterMs, 5000);
  });

  test('AC4: Expired windows reset correctly', () => {
    let mockTime = 50000;
    const limiter = new RateLimiter({
      limit: 2,
      windowMs: 1000,
      now: () => mockTime
    });

    assert.equal(limiter.consume('client-y').allowed, true);
    assert.equal(limiter.consume('client-y').allowed, true);
    assert.equal(limiter.consume('client-y').allowed, false);

    // Advance time past the 1000ms window
    mockTime = 51001;

    // Window must have reset: request accepted with fresh limit count
    const fresh = limiter.consume('client-y');
    assert.equal(fresh.allowed, true);
    assert.equal(fresh.remaining, 1);
    assert.equal(fresh.resetTime, 52001);
  });

  test('AC5: Invalid client keys fail fast', () => {
    const limiter = new RateLimiter({ limit: 10, windowMs: 1000 });
    assert.throws(() => limiter.consume(''), TypeError);
    assert.throws(() => limiter.consume('   '), TypeError);
    assert.throws(() => limiter.consume(null), TypeError);
    assert.throws(() => limiter.consume(undefined), TypeError);
    assert.throws(() => limiter.consume(123), TypeError);
  });

  test('AC5: State reset and memory pruning', () => {
    let mockTime = 1000;
    const limiter = new RateLimiter({
      limit: 5,
      windowMs: 2000,
      now: () => mockTime
    });

    limiter.consume('client-1');
    limiter.consume('client-2');
    assert.equal(limiter.clients.size, 2);

    // Prune before expiration
    assert.equal(limiter.prune(), 0);
    assert.equal(limiter.clients.size, 2);

    // Advance past window
    mockTime = 3001;
    assert.equal(limiter.prune(), 2);
    assert.equal(limiter.clients.size, 0);

    // Manual reset
    limiter.consume('client-3');
    assert.equal(limiter.clients.size, 1);
    limiter.reset();
    assert.equal(limiter.clients.size, 0);
  });
});
