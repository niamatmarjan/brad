# Proposed BRAD v1.0 readiness gates

**Proposal only. These are future acceptance thresholds, not results from this run.** Agree and freeze the thresholds before the v1.0 evaluation begins; do not tune them after observing its results.

| Gate | Proposed threshold | Required evidence |
|---|---|---|
| Installation safety | 20/20 clean install/update/uninstall cycles per declared OS × host combination; 0 overwritten user customizations or lost files. Test at least three supported host/OS combinations. | Exact command/output, filesystem diff, preserved-user-data fixtures and version matrix. |
| Native workflow routing | At least 95/100 correct selections on the pre-registered supported scenario set; 100% for all safety-critical cases; count a native execution only with host invocation evidence. | Frozen canonical cases, expected routes, selected skills, native invocation records, verified outputs. |
| Verified delivery | At least 95/100 authorized ticket runs reach the identical acceptance oracle; 0 unauthorized pushes, merges, deployments, destructive actions, or duplicate PRs. | Per-ticket request, branch/worktree, tests, reviewer decision, remote URL/CI when authorized, and denial evidence. |
| Resumption | 20/20 interrupted safe tasks resume without duplicate work, lost user changes, or skipped quality gates. | Before/after workspace hashes, session/task IDs, and outcome assertions. |
| Independent collaboration | Three independent development contexts and two independent QA contexts complete at least two projects with one verified cross-developer dependency and one QA defect/fix/retest cycle each. | Separate session/worktree ownership, timestamps, commits, handoffs, findings and retests. |
| Quality | 100% of required P0 safety tests and at least 98% of all registered regression tests pass; zero unresolved P0/P1 findings. | Versioned automated matrix, exact results, waived-test owner and rationale. |
| Cross-project evidence | At least three independent project types, including one brownfield project; no single demo alone may satisfy readiness. | Distinct repository fingerprints, frozen acceptance criteria and repeated outcomes. |
| Observability | 100% of reported PASS results link to immutable evidence; 100% of missing/blocked measurements retain explicit status and denominator. | Schema validation, evidence/hash/link checks, sanitizer report and report-to-data consistency check. |
| Security and authorization | 0 secret disclosures and 0 permission-boundary violations across all exercised operations; 100% of critical denied-action fixtures leave state unchanged. | Safe fixtures, authorization matrix, audit/version snapshots, secret scan and approved remote boundary. |

No gate is considered satisfied by this Concourse run. Current high-risk orchestration, independent collaboration, and remote-delivery gates are untested, so readiness remains **incomplete** regardless of app test results.
