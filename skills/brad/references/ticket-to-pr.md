# Default development lane: ticket -> native Build -> verified PR

This is a DELIVERY CONTRACT, not an implementation workflow. The installed
`bmad-build` / `bmad-build-auto` owns technical planning, coding and internal
review. Other installed QA workflows own their own tests/audits. Wrapper handles
preflight, external delivery and evidence. A bare ticket identifier selects this
lane unless the user explicitly asks for status, planning, QA or review only.
Read-only review safety: When a request specifies 'review', 'audit', 'inspect',
or 'assess', ticket-to-pr delivery is strictly forbidden from creating topic branches,
writing code, or publishing PRs without explicit write authorization.

## Intake and discovery

1. Resolve task ID in the **current actual** backlog. v6: story source / sprint
   status / implementation artifacts. v7 preview: ticket registry, `tickets.py`
   and plan state. Do not assume `1.1` == `1-1` == GitHub issue #11 until proven.
   When exactly one matching ticket exists, show title and acceptance target.
2. Read existing requirements, linked ADRs, dependencies, ticket status, related
   specs, previous build commits, and relevant tests. If already done, examine
   current branch/PR: report or continue missing delivery, don't rebuild.
3. Preflight `git status`, current branch/base, remote, auth and existing PR.
   Dirty tree: preserve it, isolate safely in an approved clean worktree or ask.
   Never stash/reset/drop someone else's edits unilaterally. Prefer a
   `bmad/<ticket>-<slug>` topic branch or project naming policy.
4. Check readiness. Block on unfinished hard dependencies, ambiguous scope,
   incompatible architecture, high-risk unresolved product choices. Ask a
   single ranked question if needed. No work on unrelated backlog entries.
5. Decide publish policy:
   - `--local` / `--no-pr`: stay local.
   - `--pr`, "push/open a PR", or previously accepted project `delivery: pr`:
     publish without asking for routine permission again.
   - no permission stored: ask once whether this and future ticket commands
     default to PR delivery. Record only consented choice in project policy.
   - Remote may be unavailable: continue local implementation where safe, and
     report PR as NOT CREATED (not a successful finish).

## Native implementation

6. Choose exactly one installed Build primitive:
   - attended or new/ambiguous requirements -> `bmad-build <resolved ticket>`;
   - unattended one ticket -> `bmad-build-auto` only if host permits its native
     delegation/review contract, the ticket is stable, and the skill is installed;
   - configured bmad-loop/native orchestrator -> call its OWN established
     single-ticket entry point when appropriate; do NOT wrap both it and another
     Build as separate duplicated implementations.
   - Legacy create-story/dev-story ONLY if user explicitly requests and installed
     (deprecated in v6.11+; never automatically require that pair).
   Inspect native SKILL.md, the actual allowed invocation method, any commit
   behavior, and compliance with host/repo guidance. No invented command syntax.
7. Use the skill's documented clarification, plan, implement, review and fixes.
   Pass resolved acceptance criteria, target and any stop requirements.
   Native mandatory approval stays interactive. Don't let an automatic worker
   answer business/security decisions on the user's behalf.
8. Read the native result spec/status, check actual diff, review evidence and
   deferred items. If blocked, stop *that branch*; preserve/describe recoverable
   state. Do not treat a worker's `status: done` alone as CI success.

## Verification and delivery

9. Use repo's applicable existing commands: format/lint, typecheck, unit,
   integration/e2e, test framework, build, migration/smoke as relevant. Report
   exact commands and exit status. Use TEA ATDD/automate/trace/NFR only when
   present, required by acceptance/risk, or explicitly requested. Do not add
   every QA workflow to every bug. For a high-risk change, require an independent
   review if possible, or declare limitation before marking ready.
10. On failures: native Build fix loop or corresponding QA workflow; bounded
    retries (default two correction cycles), inspect changed scope, rerun gates.
    Do not mask failing required checks; open a **draft PR** only if allowed and
    useful, clearly flag blockers; never call ready.
11. Commit according to repository policy, avoiding double commits if native
    Build already committed. Validate branch and staged diff do not include
    secrets or unrelated local changes. Never create an empty cosmetic commit.
12. With publication authority: push topic branch (never force), create or
    update existing matching PR against verified base. Include ticket link,
    scope, acceptance evidence, tests, risks, deferred items and review notes.
    Get real PR URL using `gh pr view --json url,state,isDraft` or host GitHub
    equivalent. Without working remote/auth, leave explicit local completion.
13. Query CI for this PR/head commit. Distinguish PENDING, PASS, FAIL, TIMED_OUT,
    INACCESSIBLE, NOT CONFIGURED. Optionally perform bounded checks while host
    session remains active; don't claim to monitor indefinitely. Failed CI ->
    investigate and repair if within scope, push and re-check. If gate remains
    red/unverified, keep PR draft/blocked and report candidly.
14. Ticket state: use **native** BMAD transition scripts/workflows after
    verification and according to version. Plan `done`, implementation complete,
    PR opened, CI green, PR merged and released are **different states**.
    Don't mark merged or deployed by assumption. Respect native skill writer
    ownership; don't corrupt sprint-status.yaml or tickets.toml manually.
15. Stop at OPEN PR by default. Never merge, delete branches or deploy without
    separate explicit authority and required branch protections/reviews.

## Examples of meaningful questions

- Two tickets named 1.1 in different initiatives -> "Which initiative?"
- No tracked ticket, just GitHub issue 1.1 -> "Which source should own this?"
- Unsatisfied prerequisite -> "Complete dependency first or stop?" Do not
  start unrequested dependency work by default.
- Ambiguous acceptance: "Should login lockout be per IP or account?"
- Dirty branch -> "Keep existing edits and create isolated worktree?"
- First remote write -> "Make PR delivery the default for future ticket runs?"
- Mandatory security architecture approval -> ask before affecting design.

## Idempotency and restart

Reconstruct phase from actual files, branch/PR, native BMAD state and CI.
- Existing open PR + passing CI -> report complete; do not duplicate it.
- Local commit not pushed -> verify diff, then publish if authorized.
- Review done but tests fail -> fix/test, no needless review restart.
- Story marked done while PR is red -> report inconsistent states and repair
  via native workflows; do not blindly rewrite statuses.
- Interrupted before implementation -> resume native spec in same scope.
