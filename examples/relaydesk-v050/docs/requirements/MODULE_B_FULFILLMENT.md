# Module B Requirements: Fulfillment Lifecycle & Quality

**Module Owner:** Priya Sharma (Dev B / Fulfillment Team)  
**Stakeholder Approver:** Technical Lead, Chloe Bennett (QA Lead)  

## 1. Functional Requirements

### REQ-B1: Work Assignment & In-Progress Tracking
- **Actor:** Product Owner, Approver, or Admin
- **Behavior:** Approved requests can be assigned to an implementation engineer (`assignee_id`) and assigned a QA owner (`qa_owner_id`), moving status to `ASSIGNED`.
- **Fulfillment Commencing:** Assigned engineer calls `POST /api/requests/:id/start`, transitioning status to `IN_PROGRESS`.

### REQ-B2: Blocker Flagging & Impediment Management
- **Actor:** Engineer, Admin
- **Behavior:** When blocked by third-party credentials or environment outages, an engineer can set `is_blocked = 1` with a required `blocker_reason`.
- **Gate Rule:** A request flagged as blocked CANNOT request peer review or transition to QA.
- **Unblocking:** `POST /api/requests/:id/unblock` clears the blocker and logs the resolution.

### REQ-B3: Peer Review & QA Handoff
- **Actor:** Engineer
- **Behavior:**
  - `POST /api/requests/:id/request-review`: Transition `IN_PROGRESS` → `REVIEW_REQUESTED`.
  - `POST /api/requests/:id/submit-qa`: Transition `REVIEW_REQUESTED` → `QA_PENDING`.

### REQ-B4: Defect Lifecycle & Retesting
- **Actor:** QA Engineer
- **Behavior:**
  - Log defect with `title`, `severity` (CRITICAL, MAJOR, MINOR), `steps_to_reproduce`, `expected_behavior`, and `actual_behavior`.
  - Defect status transitions: `OPEN` → `FIXED` → `RETEST_PASSED` / `RETEST_FAILED` → `CLOSED`.
- **Gate Rule:** `POST /api/requests/:id/verify` is BLOCKED if any defect remains in `OPEN`, `FIXED`, or `RETEST_FAILED` status.

### REQ-B5: Verification & Formal Completion
- **Actor:** QA Engineer (for verification), Product Owner (for completion)
- **Gate Rule:** `POST /api/requests/:id/verify` requires all acceptance criteria `is_met = 1` and zero open defects. Status moves to `VERIFIED`.
- **Completion:** `POST /api/requests/:id/complete` moves `VERIFIED` → `COMPLETED`.
