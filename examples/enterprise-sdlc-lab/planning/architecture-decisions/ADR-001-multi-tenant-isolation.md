# ADR-001: Multi-Tenant Scoping and Zero-Leak Isolation Strategy

**Status**: ACCEPTED  
**Date**: 2026-10-24  
**Author**: Marcus Lee (Solution Architect)  
**Deciders**: Marcus Lee, Ethan Brooks, Isabel Torres  

## Context
AegisFlow Enterprise serves multiple independent enterprise organizations (tenants). Data leakage between tenants constitutes a critical compliance and security breach. We evaluated three architectural patterns:
1. Database-per-tenant (High operational overhead, high infrastructure cost).
2. Schema-per-tenant (Complex connection pooling and migration orchestration).
3. Shared database with strictly partitioned row-level tenant scoping and repository enforcement.

## Decision
We adopt **Shared Process with Mandatory Row-Level Partitioning & Scoped Repository Enforcement**.
- All entities (`Tenant`, `User`, `ChangeRequest`, `ApprovalStep`, `AuditLogEntry`) must include `tenantId`.
- The API gateway injects an authenticated, immutable `TenantContext` from validated tokens/headers.
- Storage repositories require `TenantContext` upon instantiation; queries omitting `tenant_id` are prohibited by TypeScript compiler types and repository invariant checks.
- Cross-tenant queries return `404 Not Found` (never leaking existence) or `403 Forbidden`.

## Consequences
- **Positive**: Low resource overhead, fast deterministic testing, single migration pipeline.
- **Negative**: Requires rigorous repository discipline and automated cross-tenant attack verification.
