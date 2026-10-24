# BRAD Enterprise SDLC Reference Lab — Operation Ironclad
## Industrial-Grade Battle-Hardening of BRAD with Native BMAD Workflows

---

## Executive Summary

**Operation Ironclad** is an evidence-driven, adversarial acceptance exercise evaluating whether **BRAD (BMAD Routing & Agent Delegation)** can reliably coordinate the software development lifecycle of a commercial multi-tenant enterprise platform—**AegisFlow Enterprise**—under messy real-world conditions.

This lab does **not** rely on simulated AI role-play where a single context pretends to be multiple employees. Instead, it tests:
1. **Adversarial Routing & Intent Precision**: A 120-case diagnostic suite testing shorthand requests, ambiguous tickets, missing context, and role handoffs.
2. **Authentic Subagent Delegation**: Multi-agent segregation between Product Management, Business Analysis, Architecture, Engineering, Functional QA, Automation QA/TEA, and Security.
3. **Enterprise Defense & Zero-Leak Multi-Tenancy**: Automated penetration suites against cross-tenant data leaks, privilege escalation, and audit ledger tampering.
4. **Crash & Interruption Resilience**: Reproducible recovery from mid-task crashes, git branch collisions, and uncommitted diffs.
5. **Dual BMAD Compatibility**: Real comparisons between official **BMAD v6.12 stable** and **BMAD v7 preview**.

---

## Repository Map

```text
examples/enterprise-sdlc-lab/
├── README.md                     # This reference document
├── QUICKSTART.md                 # 5-minute newcomer reproduction guide
├── TEAM.md                       # Simulated stakeholder charter & RACI matrix
├── ARCHITECTURE.md               # AegisFlow system architecture (ADR-001 - ADR-006)
├── TEST-METHODOLOGY.md           # Dual-track verification & anti-gaming rules
├── SECURITY-AND-PRIVACY.md       # Multi-tenant isolation & cryptographic audit specs
├── project/                      # Runnable AegisFlow application monorepo
│   ├── apps/
│   │   ├── api/                  # Fastify / Express API with middleware & routes
│   │   └── web/                  # Accessible operational dashboard (WCAG 2.1 AA)
│   ├── packages/
│   │   ├── core/                 # Domain logic, state machine, SLA engine, audit chain
│   │   └── storage/              # Multi-tenant scoped repositories
│   └── tests/                    # End-to-end integration & security attack test suite
├── requirements/                 # Native BMAD planning & requirements artifacts
│   ├── product-brief.md          # Phase A: Product brief
│   ├── prd.md                    # Phase A: Comprehensive PRD
│   ├── business-rules.md         # Phase B: Business rules & decision tables
│   ├── acceptance-criteria.md    # Phase B: Traceable acceptance criteria
│   └── traceability-matrix.md    # Requirements to test traceability
├── planning/                     # Sprint & Architecture governance
│   ├── epics-and-dependencies.md # Dependency DAG for Epics 1, 2, and 3
│   ├── architecture-decisions/   # ADR-001 through ADR-006 records
│   └── handoff-records/          # Stakeholder handoff audit trails
├── scenarios/                    # Benchmark catalog & oracle
│   ├── case-manifest.json        # 120-case adversarial scenario inventory
│   ├── expected-outcomes.json    # Frozen pre-test oracle
│   ├── stakeholder-prompts.md    # Verbatim user utterances
│   ├── fault-injection.md        # Chaos & fault injection matrix
│   └── replay-config.json        # Benchmark runner configuration
├── harness/                      # Automated test runners & routing verifiers
│   ├── runner/                   # Scenario execution harness
│   └── validators/               # Evidence & invariant validators
├── evidence/                     # Verifiable execution logs & session traces
├── reports/                      # Formal Markdown audit reports (9 reports)
└── analytics/                    # Offline HTML/SVG dashboard, JSON/CSV exports
```
