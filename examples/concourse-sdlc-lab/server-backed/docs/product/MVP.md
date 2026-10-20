# Concourse MVP

**Objective:** Give a small software team one shared, auditable workspace for requirements, delivery, code review, QA, defects, and release readiness.

**Primary users:** PM, BA, Delivery Manager, Architect, Tech Lead, three Developers, and two QA Engineers. Seed accounts are fictional demo identities; the sign-in screen must say that account switching is development-only.

**MVP:** Persistent SQLite-backed projects and stories; server-managed demo sessions and role permissions; acceptance criteria and status history; assignment and sprint organization; review decisions; QA cases/runs and blocking defects; comments/activity; role-aware project and release views; version-checked updates for stale-write rejection.

**Success criteria:** A second browser session sees persisted changes after refresh; forbidden role actions fail at the server; invalid transitions and stale versions are rejected; a blocking defect prevents readiness; a fixed defect can be retested and closed with history.

**Out of scope:** External OAuth, hosted deployment, public GitHub integration, real-time push synchronization, production identity/security claims, and real customer data.
