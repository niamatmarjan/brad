# ADR-002: Finite State Machine & Multi-Stage Approval Engine

**Status**: ACCEPTED  
**Date**: 2026-10-24  
**Author**: Marcus Lee (Solution Architect)  

## Context
Change requests move through complex lifecycles involving conditional stages, sequential approvals, rejections, cancellations, and SLA escalations. Uncontrolled status mutations lead to illegal transitions and inconsistent state.

## Decision
We implement a **Pure Domain Finite State Machine (FSM)**:
- Valid states: `DRAFT`, `SUBMITTED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`, `ESCALATED`, `IMPLEMENTED`.
- State transitions can only occur via explicit Domain Events (`SubmitEvent`, `ApproveStageEvent`, `RejectStageEvent`, `EscalateEvent`, `CancelEvent`).
- Each transition runs pre-execution guards (e.g. self-approval check, role check, stage completion check).
- The domain core is decoupled from HTTP and database drivers, ensuring 100% testability in pure memory.
