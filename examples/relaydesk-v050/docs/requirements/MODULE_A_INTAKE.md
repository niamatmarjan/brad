# Module A Requirements: Request Intake & Approvals

**Module Owner:** Devon Miller (Dev A / Intake Team)  
**Stakeholder Approver:** Elena Vance (Product Owner), Marcus Sterling (Approver)  

## 1. Functional Requirements

### REQ-A1: Service Request Creation
- **Actor:** Product Owner, Requester, or Admin
- **Behavior:** Users can draft a service request with `title`, `description`, `category` (INFRASTRUCTURE, SECURITY_ACCESS, DATA_PIPELINE, APP_INTEGRATION), `priority` (LOW, MEDIUM, HIGH, CRITICAL, EXPEDITED), and optional `target_completion_date`.
- **Initial State:** `DRAFT`.
- **Validation:** Missing required fields reject with HTTP 400.

### REQ-A2: Requirements & Acceptance Criteria Definition
- **Actor:** Product Owner, Business Analyst
- **Behavior:** Each request can contain multiple granular acceptance criteria (`id`, `title`, `acceptance_criteria`, `is_met`).
- **Gate Rule:** A request in `DRAFT` status CANNOT be submitted for approval without at least one defined acceptance criterion.

### REQ-A3: Departmental Approval Workflow
- **Actor:** Approver role (e.g., Security, Infrastructure Manager)
- **Behavior:**
  - `POST /api/requests/:id/submit`: Transition `DRAFT` → `SUBMITTED`.
  - `POST /api/requests/:id/approve`: Transition `SUBMITTED` → `APPROVED` (requires approval notes).
  - `POST /api/requests/:id/reject`: Transition `SUBMITTED` → `REJECTED` (requires mandatory rejection rationale).
- **Authorization Enforcement:** Non-approver roles receive HTTP 403 Forbidden.
