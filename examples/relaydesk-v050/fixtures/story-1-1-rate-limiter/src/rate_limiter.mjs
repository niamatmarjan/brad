/**
 * In-Memory Rate Limiter
 * Tracks and limits requests on a per-client basis within a configurable fixed time window.
 * Note on window semantics: This implements a fixed-window limiter with per-client window reset.
 * When (currentTime - windowStart) >= windowMs, the client window resets and count restarts from 0.
 */
export class RateLimiter {
  /**
   * @param {Object} options
   * @param {number} options.limit Maximum allowed requests within the time window.
   * @param {number} options.windowMs Time window duration in milliseconds.
   * @param {Function} [options.now] Optional timestamp provider (defaults to Date.now).
   */
  constructor({ limit, windowMs, now = Date.now } = {}) {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new TypeError('limit must be a positive integer');
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new TypeError('windowMs must be a positive number');
    }
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    /** @type {Map<string, { count: number, windowStart: number }>} */
    this.clients = new Map();
  }

  /**
   * Evaluates and records a request for the given client key.
   * @param {string} clientKey Unique client identifier (e.g. IP address or API key).
   * @returns {{ allowed: boolean, remaining: number, limit: number, resetTime: number, retryAfterMs: number }}
   */
  consume(clientKey) {
    if (!clientKey || typeof clientKey !== 'string' || clientKey.trim().length === 0) {
      throw new TypeError('clientKey must be a non-empty, non-whitespace string');
    }

    const currentTime = this.now();
    let record = this.clients.get(clientKey);

    // If no record exists or window has expired, reset window
    if (!record || (currentTime - record.windowStart) >= this.windowMs) {
      record = {
        count: 0,
        windowStart: currentTime
      };
      this.clients.set(clientKey, record);
    }

    const resetTime = record.windowStart + this.windowMs;
    const timeUntilReset = Math.max(0, resetTime - currentTime);

    if (record.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        limit: this.limit,
        resetTime,
        retryAfterMs: timeUntilReset
      };
    }

    record.count += 1;
    const remaining = this.limit - record.count;

    return {
      allowed: true,
      remaining,
      limit: this.limit,
      resetTime,
      retryAfterMs: 0
    };
  }

  /**
   * Clears all client tracking records.
   */
  reset() {
    this.clients.clear();
  }

  /**
   * Prunes client records whose window has elapsed.
   * @returns {number}
   */
  prune() {
    const currentTime = this.now();
    let pruned = 0;
    for (const [key, record] of this.clients.entries()) {
      if ((currentTime - record.windowStart) >= this.windowMs) {
        this.clients.delete(key);
        pruned += 1;
      }
    }
    return pruned;
  }
}
