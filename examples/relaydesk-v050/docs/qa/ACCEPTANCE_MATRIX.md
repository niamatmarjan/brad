# RelayDesk Functional & Quality Acceptance Matrix

**Test Lead:** Chloe Bennett (QA Lead)  
**Execution Date:** 2026-10-20  
**Test Suite:** `server/tests/*.test.mjs` (11 Automated Specs) + Manual UI Verification  
**Overall Verdict:** PASS  

| ID | Capability / Test Scenario | Role | Preconditions | Expected Outcome | Observed Outcome | Status |
|---|---|---|---|---|---|---|
| TC-01 | Create request in DRAFT | PO | Valid payload | Request created in DRAFT with version 1 | REQ created, audit logged | PASS |
| TC-02 | Submit DRAFT without criteria | PO | Zero criteria | Rejected with HTTP 400 | HTTP 400 returned with error message | PASS |
| TC-03 | Add Acceptance Criteria | PO | Existing DRAFT | Requirement saved with `is_met = 0` | Criteria added to request | PASS |
| TC-04 | Submit with criteria | PO | Criteria present | Transitions `DRAFT` → `SUBMITTED` | Status updated to `SUBMITTED` | PASS |
| TC-05 | Unauthorized approval | Engineer | Status `SUBMITTED` | Rejected with HTTP 403 Forbidden | HTTP 403 returned | PASS |
| TC-06 | Authorized approval | Approver | Status `SUBMITTED` | Transitions `SUBMITTED` → `APPROVED` | Status updated to `APPROVED` | PASS |
| TC-07 | Assign engineer | PO / Approver | Status `APPROVED` | Status `ASSIGNED`, assignee assigned | Assignee linked, status `ASSIGNED` | PASS |
| TC-08 | Start fulfillment | Engineer | Status `ASSIGNED` | Transitions `ASSIGNED` → `IN_PROGRESS` | Status updated to `IN_PROGRESS` | PASS |
| TC-09 | Flag blocker | Engineer | Status `IN_PROGRESS` | `is_blocked = 1`, reason recorded | Flag set, audit event logged | PASS |
| TC-10 | Blocked request review attempt | Engineer | `is_blocked = 1` | Rejected with HTTP 400 | HTTP 400 returned | PASS |
| TC-11 | Clear blocker | Engineer | `is_blocked = 1` | `is_blocked = 0`, reason cleared | Flag cleared | PASS |
| TC-12 | Request review | Engineer | Status `IN_PROGRESS` | Transitions to `REVIEW_REQUESTED` | Status updated | PASS |
| TC-13 | Handoff to QA | Engineer | Status `REVIEW_REQUESTED` | Transitions to `QA_PENDING` | Status updated to `QA_PENDING` | PASS |
| TC-14 | Premature verification | QA | Unmet criteria present | Rejected with HTTP 400 | HTTP 400 returned | PASS |
| TC-15 | Log QA Defect | QA | Status `QA_PENDING` | Defect logged in `OPEN` status | DEF-001 created | PASS |
| TC-16 | Defect block on verify | QA | Open defect present | Verification rejected | HTTP 400 returned | PASS |
| TC-17 | Fix & Retest Defect | Dev / QA | Status `OPEN` | Transitions `FIXED` → `RETEST_PASSED` | Defect closed | PASS |
| TC-18 | Verify QA Gate Pass | QA | Zero defects, criteria met | Transitions to `VERIFIED` | Status `VERIFIED` | PASS |
| TC-19 | Close & Complete Request | PO | Status `VERIFIED` | Transitions to `COMPLETED` | Status `COMPLETED` | PASS |
| TC-20 | Optimistic Concurrency Conflict | Any | Stale version payload | Rejected with HTTP 409 Conflict | HTTP 409 Conflict returned | PASS |
| TC-21 | Dynamic SLA evaluation | Any | Target date configured | Evaluates ON_TRACK, AT_RISK, OVERDUE | Accurate calculation returned | PASS |
| TC-22 | Webhook HMAC SHA256 Signature | System | Outbound event | Includes valid X-RelayDesk-Signature | Signature verified with secret | PASS |
