# RelayDesk v0.5.0 — Demonstration Artifacts Index

This directory contains the complete, sanitized evaluation artifacts for the **BRAD v0.5.0 RelayDesk SDLC Demonstration & Engineering Audit**.

---

## 1. Primary Reports & Engineering Reviews

| Document | Purpose | Format |
|---|---|---|
| [`report/MASTER_REPORT.html`](report/MASTER_REPORT.html) | Interactive offline master evaluation dashboard | Self-contained HTML (110 KB) |
| [`reports/CHATGPT_BRAD_ENGINEERING_REVIEW.md`](reports/CHATGPT_BRAD_ENGINEERING_REVIEW.md) | Comprehensive engineering review and decision package for ChatGPT | Markdown |
| [`reports/STORY_1_1_BRAD_HANDOFF.md`](reports/STORY_1_1_BRAD_HANDOFF.md) | Final implementation and engineering handoff for Story 1.1 | Markdown |
| [`reports/COLLABORATION_AUDIT.md`](reports/COLLABORATION_AUDIT.md) | Empirical audit of 3-subagent independent collaboration cycle | Markdown |
| [`reports/FINDINGS.md`](reports/FINDINGS.md) | Confirmed BRAD defects (F-001 to F-007) and root cause analysis | Markdown |
| [`reports/NATIVE_BMAD_HOST_HANDOFF.md`](reports/NATIVE_BMAD_HOST_HANDOFF.md) | Executable dispatch protocol for 8 native BMAD workflows | Markdown |
| [`reports/NATIVE_BMAD_EXECUTION_AUDIT.md`](reports/NATIVE_BMAD_EXECUTION_AUDIT.md) | Audit of native BMAD execution, host skill catalog discovery, Tests A/B/C, and Story 1.1 | Markdown |
| [`reports/EXECUTION.md`](reports/EXECUTION.md) | Step-by-step experiment execution log and environment manifest | Markdown |
| [`reports/BRAD_IMPROVEMENT_HANDOFF.md`](reports/BRAD_IMPROVEMENT_HANDOFF.md) | Handoff note for proposed candidate improvements | Markdown |
| [`reports/NEXT_DEMO_PLAN.md`](reports/NEXT_DEMO_PLAN.md) | Test protocol for next release validation | Markdown |
| [`reports/REGRESSION_COMPARISON.md`](reports/REGRESSION_COMPARISON.md) | Baseline v0.5.0 vs Candidate v0.5.1 test suite comparison | Markdown |

---

## 2. Story 1.1 Fixture Snapshot & Independent Review Evidence

| Component | Path | Description |
|---|---|---|
| **Rate Limiter Source** | [`fixtures/story-1-1-rate-limiter/src/rate_limiter.mjs`](fixtures/story-1-1-rate-limiter/src/rate_limiter.mjs) | In-memory RateLimiter class (fixed window with per-client expiration reset) |
| **Rate Limiter Tests** | [`fixtures/story-1-1-rate-limiter/test/rate_limiter.test.mjs`](fixtures/story-1-1-rate-limiter/test/rate_limiter.test.mjs) | 6 unit tests with virtual clock dependency injection |
| **Fixture Package** | [`fixtures/story-1-1-rate-limiter/package.json`](fixtures/story-1-1-rate-limiter/package.json) | Minimal ESM package (`node:test`) |
| **Fixture Documentation** | [`fixtures/story-1-1-rate-limiter/README.md`](fixtures/story-1-1-rate-limiter/README.md) | Reproduction commands and window semantics guide |
| **BMAD Spec Artifact** | [`fixtures/story-1-1-rate-limiter/specs/spec-1-1-in-memory-rate-limiter.md`](fixtures/story-1-1-rate-limiter/specs/spec-1-1-in-memory-rate-limiter.md) | BMAD oneshot build specification |
| **Reviewer Evidence (JSON)** | [`evidence/independent-review-6fbd15da.json`](evidence/independent-review-6fbd15da.json) | Sanitized review subagent trace, inputs, tool calls, and findings |
| **Reviewer Evidence (Markdown)** | [`evidence/independent-review-6fbd15da.md`](evidence/independent-review-6fbd15da.md) | Review subagent summary and defect DEF-REV-01 remediation record |
| **TEA Review Report** | [`fixtures/story-1-1-rate-limiter/qa/test-review-rate-limiter.md`](fixtures/story-1-1-rate-limiter/qa/test-review-rate-limiter.md) | TEA Test Quality Review (Authoritative score 100/100) |

---

## 3. RelayDesk Application Source Code & Tests

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
| **Canonical 85 Scenarios** | [`evaluation/routing-results.json`](evaluation/routing-results.json) | Audited results across canonical 85 routing suite (7 observed PASS, 78 NOT_RUN) |
| **Observed Routing Evidence** | [`evaluation/observed-routing-evidence.json`](evaluation/observed-routing-evidence.json) | Empirical blind trial model observations with execution IDs, SHA-256 hashes, and sanitized evidence paths (7 canonical cases) |
| **25 Behavioral Cases** | [`evaluation/behavioral-routing-25.json`](evaluation/behavioral-routing-25.json) | High-priority behavioral intent tests (6 observed PASS, 19 NOT_RUN) |
| **Sanitized Canonical Trials** | [`evaluation/trials/sanitized-trials.json`](evaluation/trials/sanitized-trials.json) | 7 sanitized blind routing trials matching exact canonical stimuli |
| **Frozen Raw Decisions** | [`evaluation/trials/raw-subagent-decisions.json`](evaluation/trials/raw-subagent-decisions.json) | Frozen source artifact of raw subagent output imported by generator |
| **Exploratory Trials Suite** | [`evaluation/exploratory/exploratory-trials.json`](evaluation/exploratory/exploratory-trials.json) | 5 noncanonical exploratory trials preserved with variant stimuli |
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
