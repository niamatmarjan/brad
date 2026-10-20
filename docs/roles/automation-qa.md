# Automation QA

**Purpose:** Build and maintain dependable automated checks, acceptance-test scaffolding, regression coverage, and quality evidence.

**When to use BRAD:** Prepare ATDD for stable acceptance criteria, add regression coverage to a verified defect, assess test quality, or evaluate testability/NFRs.

**Example request:** “Use BRAD to route these approved acceptance cases to the installed native TEA workflow. Generate an automation approach, run only the focused suite, preserve test data, and report generated-versus-executed tests separately.”

**Workflow and inputs:** Use installed TEA capabilities that match the task (test design, framework setup, ATDD/E2E, test review, NFR assessment). Exact workflows depend on installed BMAD version. Inputs: stable criteria, app entry point, deterministic test data, supported browser/runtime, and CI command. Outputs: test code/config, command logs, executed results, coverage only when measured, and known flaky/unsupported areas.

**Authority and review:** Automation QA owns test reliability and quality reporting, not acceptance decisions or production readiness. Do not count generated scripts as successful runs or report coverage without a tool result.

**Handoff checklist:** Cases mapped to criteria; test command and exit code; run/test counts; fixtures cleanup; flaky behavior; defect links; reviewer; CI evidence if available.

**Failure recovery:** Preserve failing output, isolate environment vs product failure, and avoid retries that hide flakiness. Mark missing browser/credentials as unsupported or blocked rather than substituting a mock and claiming E2E.

**Observed evidence:** The archived prototype had five domain tests and no browser suite. The current server-backed app has locally executed quality, HTTP integration and fixture-driven Playwright tests; see the evaluation execution record. Native TEA/ATDD workflow execution and the independent BRAD QA stakeholder study remain unverified.
