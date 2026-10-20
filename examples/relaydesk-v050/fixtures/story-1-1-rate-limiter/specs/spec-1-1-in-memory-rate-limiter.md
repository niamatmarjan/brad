---
title: 'Story 1.1: Implement a configurable in-memory rate limiter'
type: 'feature'
created: '2026-10-20'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Applications require traffic throttling to prevent abusive request bursts and denial-of-service conditions across distinct clients.

**Approach:** Implement an in-memory RateLimiter class in `src/rate_limiter.mjs` that tracks client requests per time window and rejects requests exceeding the configured limit, with comprehensive tests in `test/rate_limiter.test.mjs`.

## Boundaries & Constraints

**Always:**
- Limit and windowMs must be configurable.
- Requests tracked by client key (string).
- Requests over threshold must be rejected with `allowed: false` and `retryAfterMs`.
- Expired windows must reset automatically.
- Tests cover accepted requests, rejected requests, expiration, and isolated clients.

**Never:**
- No external npm packages or database dependencies.
- No unrelated modifications outside `src/rate_limiter.mjs` and `test/rate_limiter.test.mjs`.

</frozen-after-approval>

## Implementation Notes

- Initialized via BMAD bmad-build oneshot route under BRAD ticket 1.1 delivery contract.
- Window semantics: Fixed window per client key with expiration-based reset.
- Remediation applied: Whitespace-only client keys rejected per independent code review finding DEF-REV-01.

## Review Triage Log
- DEF-REV-01: Whitespace string accepted as client key. Verdict: low/patch. Fixed in commit 0ae7eeb.
