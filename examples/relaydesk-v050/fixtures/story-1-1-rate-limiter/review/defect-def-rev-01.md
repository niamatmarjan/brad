# Defect Record: DEF-REV-01 — Acceptance of Whitespace-Only Client Keys

- **Defect ID:** `DEF-REV-01`
- **Severity:** Low / Boundary Edge Case
- **Component:** `src/rate_limiter.mjs` (`consume(clientKey)`)
- **Discovered by:** Independent Code Reviewer Subagent (`6fbd15da-1163-4221-a9d7-23640f61c569`)
- **Baseline Commit:** `860a9e8`
- **Remediation Commit:** `0ae7eeb`

---

### Description
In commit `860a9e8`, the client key validation in `consume(clientKey)` was:
```javascript
if (!clientKey || typeof clientKey !== 'string') {
  throw new TypeError('clientKey must be a non-empty string');
}
```
This guarded against `null`, `undefined`, numbers, and empty strings `""`, but permitted whitespace-only strings (e.g. `"   "`), allowing unauthenticated or malformed whitespace headers to allocate rate limiting buckets.

---

### Reproduction
```javascript
const limiter = new RateLimiter({ limit: 10, windowMs: 1000 });
limiter.consume('   '); // Succeeded instead of throwing TypeError
```

---

### Remediation
Updated validation in `src/rate_limiter.mjs`:
```javascript
if (!clientKey || typeof clientKey !== 'string' || clientKey.trim().length === 0) {
  throw new TypeError('clientKey must be a non-empty, non-whitespace string');
}
```
Added test case in `test/rate_limiter.test.mjs`:
```javascript
assert.throws(() => limiter.consume('   '), TypeError);
```

---

### Verification
- **Command:** `node --test test/rate_limiter.test.mjs`
- **Result:** PASS (6/6 tests passing)
- **Status:** **CLOSED** in commit `0ae7eeb`.
