# RelayDesk v0.5.0 — Demonstration Artifacts Index

This directory contains the complete, sanitized evaluation artifacts for the **BRAD v0.5.0 RelayDesk SDLC Demonstration & Engineering Audit**.

---

## 1. Primary Reports & Engineering Reviews

| Document | Purpose | Format |
|---|---|---|
| [`report/MASTER_REPORT.html`](report/MASTER_REPORT.html) | Interactive offline master evaluation dashboard | Self-contained HTML (110 KB) |
| [`reports/CHATGPT_BRAD_ENGINEERING_REVIEW.md`](reports/CHATGPT_BRAD_ENGINEERING_REVIEW.md) | Comprehensive engineering review and decision package for ChatGPT | Markdown |
| [`reports/COLLABORATION_AUDIT.md`](reports/COLLABORATION_AUDIT.md) | Empirical audit of 3-subagent independent collaboration cycle | Markdown |
| [`reports/FINDINGS.md`](reports/FINDINGS.md) | Confirmed BRAD defects (F-001 to F-003) and root cause analysis | Markdown |
| [`reports/NATIVE_BMAD_HOST_HANDOFF.md`](reports/NATIVE_BMAD_HOST_HANDOFF.md) | Executable dispatch protocol for 8 native BMAD workflows | Markdown |
| [`reports/EXECUTION.md`](reports/EXECUTION.md) | Step-by-step experiment execution log and environment manifest | Markdown |
| [`reports/BRAD_IMPROVEMENT_HANDOFF.md`](reports/BRAD_IMPROVEMENT_HANDOFF.md) | Handoff note for proposed candidate improvements | Markdown |
| [`reports/NEXT_DEMO_PLAN.md`](reports/NEXT_DEMO_PLAN.md) | Test protocol for next release validation | Markdown |
| [`reports/REGRESSION_COMPARISON.md`](reports/REGRESSION_COMPARISON.md) | Baseline v0.5.0 vs Candidate v0.5.1 test suite comparison | Markdown |

---

## 2. RelayDesk Application Source Code & Tests

| Component | Path | Description |
|---|---|---|
| **API Server** | [`app/server/src/api.mjs`](app/server/src/api.mjs) | Express REST API on Node 24 with role authorization and SLA summary |
| **Database & Schema** | [`app/server/src/schema.sql`](app/server/src/schema.sql) | SQLite schema with version tracking for optimistic concurrency |
| **Seed Data** | [`app/server/src/seed.mjs`](app/server/src/seed.mjs) | Deterministic test dataset with seeded users, requests, and stages |
| **Web UI** | [`app/web/src/App.jsx`](app/web/src/App.jsx) | React 19 + Vite 6 browser interface for requests and approvals |
| **Integration Tests** | [`app/server/tests/api.test.mjs`](app/server/tests/api.test.mjs) | Automated end-to-end SDLC lifecycle integration tests |
| **SLA Analytics Tests** | [`app/server/tests/analytics.test.mjs`](app/server/tests/analytics.test.mjs) | Unit and schema tests for `GET /api/analytics/sla-summary` |
| **QA Adversarial Tests** | [`app/server/tests/analytics_qa.test.mjs`](app/server/tests/analytics_qa.test.mjs) | Security boundary and date sanitization verification (DEF-102) |
| **Export Tests** | [`app/server/tests/export.test.mjs`](app/server/tests/export.test.mjs) | CSV and JSON audit export tests |
| **Webhook Tests** | [`app/server/tests/webhook.test.mjs`](app/server/tests/webhook.test.mjs) | HMAC-SHA256 signature verification tests |

---

## 3. Evaluation & Routing Datasets

| Dataset | Path | Description |
|---|---|---|
| **Canonical 85 Scenarios** | [`evaluation/routing-results.json`](evaluation/routing-results.json) | Audited results across canonical 85 routing suite (12 observed PASS, 73 NOT_RUN) |
| **Observed Routing Evidence** | [`evaluation/observed-routing-evidence.json`](evaluation/observed-routing-evidence.json) | Empirical blind trial model observations with execution IDs, SHA-256 hashes, and sanitized evidence paths |
| **25 Behavioral Cases** | [`evaluation/behavioral-routing-25.json`](evaluation/behavioral-routing-25.json) | High-priority behavioral intent tests (11 observed PASS, 14 NOT_RUN) |
| **Sanitized Blind Trials** | [`evaluation/trials/sanitized-trials.json`](evaluation/trials/sanitized-trials.json) | 12 sanitized blind routing trials with SHA-256 hashes and tool calls (raw thinking/paths omitted) |
| **Historical Pre-Audit Records** | [`evaluation/historical/`](evaluation/historical/) | Preserved retrospective records (Run 0) and answer-exposed trials (Run 1) prior to isolated blind run |
| **Findings Register** | [`evaluation/findings.json`](evaluation/findings.json) | Machine-readable defects register |
| **Improvement Backlog** | [`evaluation/improvement-backlog.json`](evaluation/improvement-backlog.json) | Prioritized candidate fixes |
| **Stakeholder Outcomes** | [`evaluation/stakeholder-results.json`](evaluation/stakeholder-results.json) | Stakeholder persona delivery outcomes |
| **Experiment Manifest** | [`evaluation/manifest.json`](evaluation/manifest.json) | Stage Gates A–G status and environment metadata |

---

## 4. Telemetry & Collaboration Evidence

| Artifact | Path | Description |
|---|---|---|
| **Event Stream** | [`telemetry/events.jsonl`](telemetry/events.jsonl) | Append-only execution event telemetry |
| **Metrics Summary** | [`analytics/metrics.json`](analytics/metrics.json) | Machine-readable pass rates and ratios |
| **Metrics Table** | [`analytics/metrics.csv`](analytics/metrics.csv) | Tabular metric exports |
| **Code Review Record** | [`evidence/collaboration/CODE_REVIEW_002.md`](evidence/collaboration/CODE_REVIEW_002.md) | Adversarial code review for feature REQ-B7 |
| **QA Defect 102** | [`evidence/collaboration/DEF-102.md`](evidence/collaboration/DEF-102.md) | Defect lifecycle record (OPEN → CLOSED) |
| **Git Conflict Record** | [`evidence/collaboration/CONFLICT-RESOLUTION-001.md`](evidence/collaboration/CONFLICT-RESOLUTION-001.md) | Merge conflict resolution audit |

---

## 5. Getting Started & Reproduction

- [`README.md`](README.md): High-level overview of the RelayDesk evaluation.
- [`QUICK_START.md`](QUICK_START.md): 3-step guide to run the server, seed database, and run web client.
- [`REPRODUCE.md`](REPRODUCE.md): Exact verification commands to reproduce test passes and report generation.
