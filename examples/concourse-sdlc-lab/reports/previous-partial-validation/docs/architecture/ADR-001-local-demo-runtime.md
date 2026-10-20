# ADR-001: keep the demo local and dependency-free

**Status:** Accepted for this example implementation only; not a production architecture decision.

**Decision owner:** Example author. No customer or architecture board approval is implied.

## Context

The test vehicle must run locally without production credentials and be easy to inspect offline. This session did not have a native BMAD runtime, approved infrastructure, or user-provided production architecture constraints.

## Decision

Use a Node.js built-in HTTP server bound to `127.0.0.1`, plain browser ES modules, and browser `localStorage`. Keep domain rules in a small module that can be tested by Node's built-in test runner. Add a restrictive local Content Security Policy and path containment checks. Do not fetch third-party scripts or services.

## Consequences

- No dependency installation or production service is needed to demonstrate the workflow.
- Data is per-browser and can be cleared; there is no real identity, server-side permission boundary, encryption, collaboration, or shared audit log.
- This does not meet production multi-user or enterprise security needs.
- Any move to hosted/shared use requires a new approved architecture, threat model, server-side authorization, persistent datastore, migration strategy, and operational review.

## Alternatives considered

React/Next.js with Prisma/SQLite was suggested in the brief. It would introduce package/runtime setup beyond the currently available validation need and cannot make this rehearsal more truthful about native BMAD or independent agents. Revisit only with approved scope.
