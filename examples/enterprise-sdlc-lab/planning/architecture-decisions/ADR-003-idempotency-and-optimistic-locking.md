# ADR-003: Idempotency Keys & Optimistic Concurrency Control

**Status**: ACCEPTED  
**Date**: 2026-10-24  
**Author**: Marcus Lee (Solution Architect)  

## Context
In enterprise operations, network retries, browser double-clicks, and automated scripts often dispatch identical mutating requests. Additionally, multiple approvers may review and sign off simultaneously.

## Decision
1. **Idempotency Keys**: Mutating endpoints (`/submit`, `/approve`, `/reject`) require an `Idempotency-Key` HTTP header. The system stores the key, SHA-256 digest of payload, and resulting HTTP response for 24 hours. Replayed requests return cached responses immediately without state re-execution.
2. **Optimistic Version Locking**: Every entity maintains an integer `version`. Writes enforce `UPDATE ... WHERE id = :id AND version = :currentVersion`. Conflicts return `409 Conflict`, prompting the client to refetch the fresh state.
