# RelayDesk Architecture Specification

**Version:** 0.5.0  
**Author:** Solution Architect  
**Status:** APPROVED  

## 1. System Context & Component Architecture

```text
+-------------------------------------------------------------+
|                  RelayDesk Browser UI (React/Vite)          |
|  - Active Persona Switcher (PO, Approver, Dev, QA, Admin)  |
|  - Intake & Approval Panel (Module A)                       |
|  - Fulfillment & Defect Board (Module B)                    |
|  - Release Readiness Dashboard (System Health)              |
+------------------------------+------------------------------+
                               | HTTP REST / JSON
                               v
+-------------------------------------------------------------+
|               RelayDesk API Server (Node.js 24)              |
|  - Role Authorization Middleware (x-user-id, x-role)        |
|  - State Transition Engine (Deterministic SDLC Gates)       |
|  - Optimistic Concurrency Controller (Version checking)     |
|  - SLA Calculation Engine (Dynamic schedule tracking)       |
|  - Webhook Dispatcher (HMAC-SHA256 signature)               |
+------------------------------+------------------------------+
                               | Native node:sqlite (DatabaseSync)
                               v
+-------------------------------------------------------------+
|                      SQLite 3 Database                      |
|  - users, requests, requirements, defects, comments, audit  |
+-------------------------------------------------------------+
```

## 2. SDLC State Machine Matrix

| Current State | Action | Next State | Allowed Roles | Enforced Preconditions |
|---|---|---|---|---|
| `DRAFT` | `SUBMIT` | `SUBMITTED` | PO, Admin | At least 1 acceptance criterion defined |
| `SUBMITTED` | `APPROVE` | `APPROVED` | Approver, Admin | Notes provided |
| `SUBMITTED` | `REJECT` | `REJECTED` | Approver, Admin | Rejection reason required |
| `APPROVED` | `ASSIGN` | `ASSIGNED` | PO, Approver, Admin | Valid `assignee_id` |
| `ASSIGNED` | `START` | `IN_PROGRESS` | Engineer, Admin | Valid engineer identity |
| `IN_PROGRESS` | `BLOCK` | `IN_PROGRESS` (blocked) | Any role | Reason required (`is_blocked = 1`) |
| `IN_PROGRESS` | `REQUEST_REVIEW` | `REVIEW_REQUESTED` | Engineer, Admin | `is_blocked == 0` |
| `REVIEW_REQUESTED` | `SUBMIT_QA` | `QA_PENDING` | Engineer, Admin | Peer review complete |
| `QA_PENDING` | `REOPEN` | `IN_PROGRESS` | QA, Admin | Defect notes |
| `QA_PENDING` | `VERIFY` | `VERIFIED` | QA, Admin | All criteria `is_met == 1` & zero open defects |
| `VERIFIED` | `COMPLETE` | `COMPLETED` | PO, Admin | State must be `VERIFIED` |

## 3. Optimistic Concurrency & Data Integrity
Every mutation to a request checks `version`:
```sql
UPDATE requests SET ..., version = version + 1 WHERE id = ? AND version = ?;
```
If another concurrent session updated the record, the database check rejects the mutation with `HTTP 409 Conflict`.
