# AegisFlow Enterprise — Traceable Acceptance Criteria
## Given-When-Then Specifications for Epics 1, 2, and 3

---

### Epic 1 — Core Change Management

#### Story 1.1: Create and Submit Change Request
- **Scenario 1.1.1 (Draft Creation)**:
  - *Given* an authenticated employee in Tenant A
  - *When* they submit a valid change request payload (title, category, risk, description, rollback plan)
  - *Then* the request is created in `DRAFT` status with a unique UUID and tenantId set to Tenant A.
- **Scenario 1.1.2 (Submission)**:
  - *Given* a change request in `DRAFT`
  - *When* the requester calls `POST /change-requests/:id/submit`
  - *Then* its status transitions to `PENDING_APPROVAL` and the computed approval steps and SLA deadline are generated.

#### Story 1.2: Tenant Isolation & Role-Based Authorization
- **Scenario 1.2.1 (Cross-Tenant Isolation)**:
  - *Given* User B belonging to Tenant B
  - *When* User B attempts to read or mutate Change Request A belonging to Tenant A
  - *Then* the server returns `404 Not Found` or `403 Forbidden` with zero information leak.
- **Scenario 1.2.2 (Role Permissions)**:
  - *Given* an `EMPLOYEE` without `APPROVER` role
  - *When* they attempt to call `POST /approvals/:id/approve`
  - *Then* the server responds with `403 Forbidden` (`INSUFFICIENT_ROLE_PERMISSIONS`).

#### Story 1.3: Multi-Stage Approval & Rejection
- **Scenario 1.3.1 (Self-Approval Prohibition)**:
  - *Given* a Manager who authored Change Request CR-1
  - *When* they attempt to approve CR-1
  - *Then* the action is rejected with `SELF_APPROVAL_VIOLATION`.
- **Scenario 1.3.2 (Rejection Propagation)**:
  - *Given* a change request in Stage 1
  - *When* an authorized approver rejects the request with a reason
  - *Then* status transitions to `REJECTED`, further approvals are blocked, and notification is sent to the requester.

#### Story 1.4: Immutable Audit Log & Decision History
- **Scenario 1.4.1 (Audit Ledger Writing)**:
  - *Given* any state mutation on a change request
  - *When* the transaction commits
  - *Then* an append-only audit record is stored with sequence number, actor ID, payload hash, and SHA-256 hash chaining to the prior record.

---

### Epic 2 — Operational Workflows

#### Story 2.1: Deadline and SLA Calculations
- **Scenario 2.1.1 (SLA Assignment)**:
  - *Given* a change request with risk level `HIGH`
  - *When* it is submitted
  - *Then* its `slaDeadline` is calculated as exactly current timestamp + 8 business hours.

#### Story 2.2: Escalation & Reminder Rules
- **Scenario 2.2.1 (Breached SLA Escalation)**:
  - *Given* an unapproved change request whose `slaDeadline` has passed
  - *When* the escalation engine processes the queue
  - *Then* the request transitions to `ESCALATED`, audit ledger is updated, and escalation notification is triggered.

#### Story 2.3: Review Queue & Management Dashboard
- **Scenario 2.3.1 (Queue Filtering)**:
  - *Given* an authorized approver
  - *When* they view the dashboard
  - *Then* change requests are displayed scoped to their tenant, sorted by deadline urgency, with status badges and filter controls.

#### Story 2.4: Idempotent Approval Processing
- **Scenario 2.4.1 (Duplicate Request Idempotency)**:
  - *Given* an approval request with `Idempotency-Key: KEY-123`
  - *When* the identical request is repeated within 24 hours
  - *Then* the second call returns the cached HTTP 200 response without duplicating audit records or advancing steps twice.

---

### Epic 3 — Enterprise Readiness

#### Story 3.1: Mockable Notification Delivery & Retries
- **Scenario 3.1.1 (Notification Dispatch)**:
  - *Given* a state change event (e.g. `CR_SUBMITTED`, `CR_APPROVED`)
  - *When* the event handler fires
  - *Then* the notification adapter dispatches the event, logs delivery in `NotificationLog`, and supports retry on transient failure.

#### Story 3.2: Audit Export & Access Restrictions
- **Scenario 3.2.1 (Auditor Export)**:
  - *Given* a user with role `AUDITOR`
  - *When* they request an audit export for their tenant
  - *Then* the system exports the full chronological ledger with hash chain validation proof.

#### Story 3.3: Health Endpoints & Telemetry
- **Scenario 3.3.1 (Probes)**:
  - *Given* monitoring tools polling `/health` and `/ready`
  - *When* the services are operational
  - *Then* HTTP 200 is returned with uptime, memory stats, and dependency status.

#### Story 3.4: Security, Resilience & Regression Hardening
- **Scenario 3.4.1 (Adversarial Suite Pass)**:
  - *Given* the complete suite of penetration, tamper, and race condition tests
  - *When* the suite is executed
  - *Then* all security tests pass with 0 regressions and 0 data leakage.
