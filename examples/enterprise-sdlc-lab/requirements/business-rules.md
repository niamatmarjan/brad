# AegisFlow Enterprise — Business Rules & Decision Specifications
## Phase B: Business Analysis & Exception Modeling

**Document Owner**: Aisha Rahman (Business Analyst)  
**Co-Author**: Sofia Patel (Business Analyst)  
**Status**: APPROVED_SIMULATED_TEST_FIXTURE  

---

## 1. Approval Tier Determination Matrix

The number and roles of required approvers are computed dynamically upon change submission according to category, estimated risk, and budget impact:

| Change Category | Risk Level | Budget Impact | Stage 1 Approver | Stage 2 Approver | SLA Deadline |
|---|---|---|---|---|---|
| **INFRASTRUCTURE** | Low / Medium | $\le \$10,000$ | Reporting Manager | None | 48 hours |
| **INFRASTRUCTURE** | High | $> \$10,000$ | Technical Lead | Systems Director | 8 hours |
| **FINANCE** | Any | Any | Reporting Manager | Finance Director | 24 hours |
| **SECURITY** | High / Critical | Any | Security Officer | CISO Delegate | 4 hours |
| **EMERGENCY** | Emergency | Any | Duty Incident Manager | Auditor (Post-hoc) | 2 hours |

---

## 2. Hard Governance Constraints & Exception Cases

### Rule BR-001: Strict Self-Approval Prohibition
- Under no circumstance can a user approve or reject a change request they created, even if they possess the `MANAGER` or `APPROVER` role.
- **Enforcement**: If `requesterId === approverId`, the API immediately aborts with error code `SELF_APPROVAL_VIOLATION`.

### Rule BR-002: Rejection Finality
- A rejection by any designated approver in any stage terminates the approval pipeline immediately.
- The change request transitions to `REJECTED`.
- No further approvals can be recorded on a rejected change request.
- The requester must clone or create a new draft if modifications are desired.

### Rule BR-003: Simultaneous Multi-Approver Consensus
- For stages requiring $N$ approvers:
  - Each individual signature is recorded with timestamp and signature hash.
  - The step only completes when all required signatures are present.
  - If a concurrent write occurs, optimistic locking ensures no lost signatures or double-counting.

### Rule BR-004: SLA Expiration & Automated Escalation
- If a change request remains in `PENDING_APPROVAL` past its computed `slaDeadline`, the escalation scheduler automatically:
  1. Transitions request status to `ESCALATED`.
  2. Emits an `ESCALATION_EVENT` notification to the tenant's escalation queue.
  3. Appends an immutable record to the audit ledger.

### Rule BR-005: Idempotency Key Expiration
- Mutating operations must provide an `Idempotency-Key`.
- Replaying the request with the identical key within 24 hours returns the cached response without re-executing state transitions.
