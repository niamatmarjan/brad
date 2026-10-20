# Epic 1 Context: Rate Limiter Core

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Provide a lightweight, in-memory rate limiting engine to protect downstream services and endpoints from traffic spikes and abusive clients by tracking request frequency over configurable time windows.

## Stories

- Story 1.1: Implement a configurable in-memory rate limiter

## Requirements & Constraints

- Configurable request limit (`limit`) and time window in milliseconds (`windowMs`).
- In-memory storage keyed by client identifier (e.g., client IP or API key).
- Requests up to the threshold must be permitted (`allowed: true`).
- Requests over the threshold must be rejected (`allowed: false`) and provide reset / retry information (`retryAfterMs`).
- Windows must automatically reset when time expires.
- Zero external runtime dependencies; uses Node.js standard libraries.

## Technical Decisions

- Node.js ESM module (`src/rate_limiter.mjs`).
- Clean class / interface (`RateLimiter`) with `consume(clientKey)` method returning `{ allowed, remaining, limit, resetTime, retryAfterMs }`.
- Fixed-window semantics with per-client window reset.
- Automated test coverage via Node.js native test runner (`node:test`, `node:assert`).
