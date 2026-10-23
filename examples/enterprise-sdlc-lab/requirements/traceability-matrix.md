# AegisFlow Enterprise — Traceability Matrix
## Phase B/E: Requirements-to-Test & Security Traceability

| Requirement ID | Business Need | Story ID | Implemented Component | Automated Verification Test | Security / Governance Control |
|---|---|---|---|---|---|
| **REQ-CR-01** | Create & Submit Change Request | **1.1** | `ChangeRequestService.create`, `submit` | `test_change_request_lifecycle.ts` | Schema validation, non-empty rollback |
| **REQ-SEC-01**| Multi-Tenant Isolation | **1.2** | `TenantContextMiddleware`, `ScopedRepo` | `test_cross_tenant_isolation.ts` | Row-level tenant partitioning |
| **REQ-RBAC-01**| Role-Based Access Control | **1.2** | `AuthMiddleware`, `RoleGuard` | `test_rbac_authorization.ts` | Minimal privilege, role hierarchies |
| **REQ-APP-01**| Multi-Tier Approval Pipeline | **1.3** | `ApprovalEngine.evaluateStage` | `test_multi_stage_approval.ts` | Multi-signature consensus |
| **REQ-APP-02**| Self-Approval Prohibition | **1.3** | `ApprovalGuard.preventSelfApproval` | `test_self_approval_ban.ts` | BR-001 Hard governance constraint |
| **REQ-AUD-01**| Immutable Audit Ledger | **1.4** | `CryptographicAuditLedger` | `test_audit_chain_tamper.ts` | SHA-256 continuous hash chaining |
| **REQ-SLA-01**| Business Calendar SLA Calculation | **2.1** | `BusinessHoursCalculator` | `test_sla_calculations.ts` | Risk-based SLA assignment |
| **REQ-ESC-01**| Automated Escalation on Breach | **2.2** | `EscalationEngine.processQueue` | `test_escalation_rules.ts` | Automated state transition & alerts |
| **REQ-UI-01** | Accessible Management Dashboard | **2.3** | Web client (`apps/web`) | `test_dashboard_a11y.ts` | WCAG 2.1 AA keyboard & ARIA |
| **REQ-IDP-01**| Idempotent Request Processing | **2.4** | `IdempotencyMiddleware` | `test_idempotency_concurrency.ts` | 24h key cache & payload hashing |
| **REQ-CON-01**| Optimistic Locking & Race Arbitration | **2.4** | `ScopedTenantRepository` | `test_concurrent_approvals.ts` | Entity version checking ($409$) |
| **REQ-NOT-01**| Mockable Notification Delivery | **3.1** | `NotificationAdapter` | `test_notification_delivery.ts` | Delivery logging & backoff retry |
| **REQ-EXP-01**| Secure Audit Ledger Export | **3.2** | `AuditExportController` | `test_audit_export.ts` | Auditor-only cryptographic proof |
| **REQ-OPS-01**| Health Probes & Structured Telemetry | **3.3** | `HealthRouter`, `MetricsLogger` | `test_health_telemetry.ts` | P95 latency tracking, probes |
| **REQ-HRD-01**| Security & Regression Hardening | **3.4** | Full Test Suite | `test_adversarial_suite.ts` | Zero-tolerance P0 security gate |
