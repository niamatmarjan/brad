# Code Review 002: Operational SLA Risk Summary & Dashboard API (REQ-B7)

**Author:** Platform Developer (Dev C / Feature Team)  
**Reviewer:** Senior Code Reviewer (Reviewer Agent)  
**Feature:** REQ-B7 Operational SLA Risk Summary & Dashboard (`/api/analytics/sla-summary`)  
**Branch:** `feat/sla-analytics`  
**Commit SHA:** `ae6d8923f4e423ccdd3773b541d5238dcd96793f`  
**Date:** 2026-10-20  
**Verdict:** **`CHANGES_REQUESTED`**

---

## 1. Executive Summary

Branch `feat/sla-analytics` implements requirement **REQ-B7: Operational SLA Risk Summary & Dashboard**, adding a new reporting endpoint `GET /api/analytics/sla-summary` along with supporting enum definitions in `server/src/types.mjs` and an automated test suite in `server/tests/analytics.test.mjs`.

The business logic for aggregating status counts, active breakdowns by category/priority, and sorting top at-risk requests demonstrates sound functional intent. However, **the implementation exhibits critical security and robustness defects**:
1. **Unrestricted Endpoint Access (RBAC Breach):** The endpoint currently lacks authorization controls and explicitly allows any authenticated role (including `ENGINEER` and `QA_ENGINEER`) to access cross-organizational operational summary and performance metrics.
2. **Defective Test Suite Assertion:** The test suite codifies the lack of authorization into automated regression tests (`assert.equal(engRes.status, 200)`), creating a false sense of security compliance.
3. **Unsanitized Date Parsing & NaN Sort Poisoning:** Date difference calculation in `topAtRisk` does not sanitize whitespace-padded or malformed ISO date strings, causing `NaN` diffs that corrupt sort ordering.
4. **Enum Duplication / Contract Inconsistency:** In `server/src/types.mjs`, redundant constants (`MET_COMPLETED`, `BREACHED_COMPLETED`) were introduced without reconciling them with existing `COMPLETED_ON_TIME` and `COMPLETED_LATE` enum values used in `calculateSla`.

Approval is withheld pending remediation of the required actions outlined below.

---

## 2. Findings Table

| ID | Severity | Component | Finding | Recommendation |
|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | `server/src/api.mjs` | Missing RBAC on `/api/analytics/sla-summary`. Route handler is unprotected; comment acknowledges it is open to all users. Sensitive organization-wide SLA risk summaries exposed to unprivileged roles. | Apply `requireRole(ROLES.ADMIN, ROLES.PRODUCT_OWNER, ROLES.APPROVER)` middleware before the request handler. Reject `ENGINEER` and other non-managerial roles with HTTP 403 Forbidden. |
| **TEST-01** | **HIGH** | `server/tests/analytics.test.mjs` | The test `'GET /api/analytics/sla-summary is accessible to all authenticated roles'` asserts HTTP 200 OK for `ENGINEER` and `QA_ENGINEER`, cementing the security defect in CI. | Refactor test to assert HTTP 403 Forbidden for `ENGINEER` and `QA_ENGINEER`, and HTTP 200 OK for `ADMIN`, `PRODUCT_OWNER`, and `APPROVER`. |
| **BUG-01** | **HIGH** | `server/src/api.mjs` | `topAtRisk` date parsing fails on whitespace or invalid dates (`NaN` sort poisoning). `.filter(r => r.target_completion_date)` passes whitespace strings; `new Date(r.target_completion_date).getTime() - now` yields `NaN`, breaking array sorting stability. | Sanitize input: `const trimmed = r.target_completion_date?.trim(); const targetMs = trimmed ? new Date(trimmed).getTime() : NaN;` and filter with `!Number.isNaN(targetMs)`. |
| **ARCH-01** | **MEDIUM** | `server/src/types.mjs` | `SLA_STATUS` enum fragmentation. Added `MET_COMPLETED` and `BREACHED_COMPLETED` alongside existing `COMPLETED_ON_TIME` and `COMPLETED_LATE`. `calculateSla` produces the latter while summary maps both. | Standardize enum usage across `calculateSla`, `SLA_STATUS`, and API response schemas to prevent dual-source truth and contract confusion. |
| **PERF-01** | **LOW / ADVISORY** | `server/src/api.mjs` | In-memory evaluation over full table scan (`SELECT r.* FROM requests r`). Acceptable for current SQLite test scale, but non-terminal vs terminal filtering can be pushed down to SQL. | In a future iteration, consider indexing `status` and separating active queue queries from historical metrics queries. |

---

## 3. Detailed Review Findings

### 3.1 Security & Role-Based Access Control (SEC-01)
In `server/src/api.mjs`:
```javascript
router.get('/analytics/sla-summary', (req, res) => {
  // Note: Left accessible to any authenticated user without role restriction
  const requests = db.prepare(`
    SELECT r.*, u_ass.name as assignee_name
    FROM requests r
    LEFT JOIN users u_ass ON r.assignee_id = u_ass.id
  `).all();
```
- **Risk:** In RelayDesk's multi-stakeholder operational model, executive dashboards, SLA compliance metrics, and team-wide risk indicators must be restricted to management and governance personas: `ADMIN`, `PRODUCT_OWNER`, and `APPROVER`.
- Leaving this endpoint unrestricted violates the Principle of Least Privilege and allows individual contributors (Engineers, QA) to inspect unassigned/cross-team aggregate delivery metrics without authorization.
- **Required Fix:**
```javascript
router.get('/analytics/sla-summary', requireRole(ROLES.ADMIN, ROLES.PRODUCT_OWNER, ROLES.APPROVER), (req, res) => {
```

### 3.2 Date Parsing Robustness & Sorting Integrity (BUG-01)
In `server/src/api.mjs`:
```javascript
const topAtRisk = activeRequests
  .filter(r => r.target_completion_date)
  .map(r => ({
    ...
    diffMs: new Date(r.target_completion_date).getTime() - now,
    sla: r.sla
  }))
  .sort((a, b) => a.diffMs - b.diffMs)
```
- **Risk:** DEF-101 demonstrated that target dates may contain whitespace (e.g., `' 2026-10-30T00:00:00Z '` or `' '`).
- While `calculateSla` handles trimmed values, `r.target_completion_date` truthiness check passes `' '`.
- `new Date(' ').getTime()` evaluates to `NaN`.
- Calculating `NaN - now` yields `NaN`. When `NaN` is used in `.sort((a, b) => a.diffMs - b.diffMs)`, the comparator violates strict weak ordering, producing non-deterministic sorting and potentially burying severely overdue requests.
- **Required Fix:** Validate parsed millisecond timestamps and exclude or trim invalid values prior to sorting.

### 3.3 Test Suite Remediation (TEST-01)
In `server/tests/analytics.test.mjs`:
```javascript
test('GET /api/analytics/sla-summary is accessible to all authenticated roles', async () => {
  await withTestApp(async ({ request }) => {
    // Accessible as ENGINEER
    const engRes = await request('/api/analytics/sla-summary', {
      headers: { 'x-user-id': 'USR-DEV-01', 'x-role': ROLES.ENGINEER }
    });
    assert.equal(engRes.status, 200); // <-- DEFECT: Enforces missing security
```
- **Required Fix:** Invert the test assertion to verify that access is rejected for unprivileged roles:
  - Role `ENGINEER` -> HTTP 403 Forbidden (`res.data.ok === false`)
  - Role `QA_ENGINEER` -> HTTP 403 Forbidden (`res.data.ok === false`)
  - Role `PRODUCT_OWNER`, `APPROVER`, `ADMIN` -> HTTP 200 OK (`res.data.ok === true`)

---

## 4. Required Actions for Developer Before Approval

1. **Enforce Role-Based Access Control:**
   - Update `router.get('/analytics/sla-summary', ...)` in `server/src/api.mjs` with `requireRole(ROLES.ADMIN, ROLES.PRODUCT_OWNER, ROLES.APPROVER)`.
2. **Defensive Date Parsing in `topAtRisk`:**
   - Trim and validate `target_completion_date` with `Number.isFinite(targetMs)` to protect against `NaN` diff sort corruption.
3. **Enum Consistency:**
   - Clarify and unify `SLA_STATUS` enum constants in `server/src/types.mjs` and `api.mjs`.
4. **Update Automated Tests:**
   - Modify `server/tests/analytics.test.mjs` to assert `403 Forbidden` for `ENGINEER` and `QA_ENGINEER`.
   - Add explicit tests asserting HTTP 200 OK for `ADMIN`, `PRODUCT_OWNER`, and `APPROVER`.
   - Add test coverage for whitespace-padded and malformed target dates in the summary endpoint.
5. **Regression Verification:**
   - Run the complete server test suite (`node --test tests/*.test.mjs`) ensuring 100% test passage.

---

**Formal Verdict:** `CHANGES_REQUESTED`  
*Signed: Senior Code Reviewer (Reviewer Agent) — 2026-10-20*
