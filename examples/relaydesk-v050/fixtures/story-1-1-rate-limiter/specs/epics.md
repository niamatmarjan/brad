---
status: approved
stepsCompleted: [step-01-validate-prerequisites, step-02-decompose-epics, step-03-generate-stories]
inputDocuments: []
---

# In-Memory Rate Limiter Service - Epic Breakdown

## Overview
Decomposes requirements for the configurable in-memory rate limiter service.

## Epic 1: Rate Limiter Core

Core rate limiting engine and client tracking.

### Story 1.1: Implement a configurable in-memory rate limiter

As an API gateway or service middleware,
I want to rate-limit incoming client requests using an in-memory fixed window with per-client reset,
So that abusive bursts and denial-of-service attempts are mitigated.

**Acceptance Criteria:**

**Given** a rate limiter initialized with configurable `limit` and `windowMs`
**When** a client sends requests within `windowMs`
**Then** requests up to `limit` are accepted (`allowed: true`)
**And** requests are tracked independently by client key
**And** requests exceeding `limit` within the window are rejected (`allowed: false`, with `retryAfterMs` or reset metadata)
**And** once `windowMs` has elapsed, the window resets and subsequent requests are accepted
**And** tests cover accepted requests, rejected requests, expiration, and isolated clients
**And** no unrelated application changes are introduced
