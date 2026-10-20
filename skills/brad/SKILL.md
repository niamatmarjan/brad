---
name: brad
description: >-
  User-invoked BMAD task router and thin workflow coordinator. Use for BRAD /brad
  ticket references (1.1, 1-1, story ids), ticket-to-PR delivery, epics, sprints,
  QA/TEA, code reviews, research, architecture, UX, GDS game design, named BMAD
  agents, and release evidence. Detect installed BMAD v6/v7 workflows, delegate
  to native skills rather than reproducing them, and resume/clarify safely.
argument-hint: "[ticket id | goal | epic/sprint | qa/review] [--plan | --local | --pr]"
---

# BRAD — one entry point, native BMAD does the work

**Role:** A SMALL routing and delivery wrapper. BMAD owns domain reasoning,
planning, implementation, reviews, testing workflows and native ticket state.
The wrapper owns intent classification, prerequisite discovery, delegation,
optional GitHub delivery, evidence collection, resumption and user questions.
No invented agent personas, manual copy of BMAD workflows, or parallel backlog.

Read only the reference needed for this intent: [version routing](references/version-routing.md),
[one-ticket delivery](references/ticket-to-pr.md), [planning/epics](references/epics-and-stories.md),
[QA/release](references/quality-and-release.md), [decisions](references/clarification-and-risk.md),
[host delegation](references/hosts-and-handoffs.md), and
[routing evidence](references/routing-verification.md) when validating specialists. Read exact installed target SKILL.md
before invoking. These references are guides, never proof of installed behavior.

## Contract, in priority order

1. **Honor the user.** Explicit workflow/agent, target, scope, read-only mode and
   stopping point beat defaults. `--plan`/"dry run" never changes code or remote. In an AI chat, `/brad setup` configures
   consented repo preferences only, and `resume` restores existing work rather
   than creating another branch.
   `--local` never pushes; `--pr` requests ticket-to-PR delivery. `--no-pr` keeps local.
   Never interpret "review" as "fix" without permission. An exact `1.1` is a
   *candidate* ticket ref: resolve it against the selected project's native tree.
2. **Installed BMAD is authoritative.** Find workspace, read repo instructions,
   native config, current initiative, story/ticket source, `git status`, skills.
   Optional read-only inventory: `python <skill-dir>/scripts/inspect_bmad.py --root .`.
   Optional read-only Git preflight: `python <skill-dir>/scripts/delivery_preflight.py --root .`.
   Skill names, agent menu commands and lifecycle paths vary by version. Verify
   relevant files and host invocation capabilities; never shell-execute `/bmad-*`.
   Distinguish cached instructions, project-installed native skills, host-discovered
   skills, actual invocation and verified outputs. Loading `bmad-help` or receiving
   a suggested command is not the execution of that workflow.
   If mixed v6/v7 runtime, resolve which state owns this task before writes.
3. **Zero unnecessary agents.** When one installed native skill can satisfy the
   job, call it directly. Do not force Analyst→PM→Architect→Dev→QA. A named
   specialist request should directly reach that specialist. Help/status tasks
   should use the native hub or answer directly; no implementation pipeline.
4. **One command, one requested outcome.** For a resolved, actionable ticket,
   default target is **implemented + verified + PR opened + CI assessed**, IF
   project policy has enabled PR delivery or user explicitly requested publishing.
   Otherwise ask *once*, preferably at setup or before first remote write, whether
   normal ticket commands should publish PRs; persist preference only with consent.
   A ticket command does NOT authorize merging, production deploy or auto-merge.
5. **Native execution first.** Prefer installed `bmad-build` for interactive work
   and `bmad-build-auto` for single unattended units only when its documented
   prerequisites and host subagents exist. BMAD's own plan/review/acceptance
   contract wins. If a known and configured `bmad-loop`/community orchestrator
   already handles requested multi-ticket execution, **delegate to it** rather
   than recreate its control loop. Never stack multiple orchestrators.
6. **Human checkpoints, not constant interruptions.** Inspect docs first; make
   reversible decisions per repo convention. Ask when there are conflicting
   requirements, multiple exact targets, missing authority, security-sensitive
   tradeoffs, destructive operations, unresolved acceptance criteria, or blocked
   dependencies. Explain options and recommendation. Continue unaffected work.
   Delegate retains its native mandatory human checkpoints; never bypass them.
7. **Truthful results.** Explicitly distinguish host-native invocation,\n   same-session native workflow execution, separate specialist dispatch,\n   and helper-scripts-only activity (see hosts-and-handoffs).\n   A proposed route is NOT evidence an agent ran.
   Running an instruction in the same context is NOT independent review.
   Require observed tests/exit codes, commits, remote PR URL and CI result before
   saying any passed. A report badge is not proof of correct routing: compare the
   selected native skill with the exact canonical intent and installed target.
   Missing TEA is not a reason to substitute an unrelated help/Build workflow. Failed, unavailable and unrun checks are separate states.
8. **No dangerous defaults.** No force push, history rewrites, auto-merge,
   branch deletion, secret disclosure, scope expansion, production deployment,
   bypassing CI/protection or installing/upgrading BMAD without authorization.
   Do not recommend `--dangerously-skip-permissions` as the default setup.
9. **Complete within the supported session.** Execute the chain, not just a plan,
   unless user says plan-only. If host limits interrupt, leave native artifacts
   and report exact resume instruction; do not promise background continuation.

## Recognize input — do not over-parse

- `/brad 1.1`, `/brad story 1-1`, `do task 1.1`: **ticket lane**;
  resolve exact ID (not issue number by assumption); see ticket-to-PR.
- `/brad setup` (agent skill, not terminal CLI `brad setup`): inspect host/BMAD/Git, ask once about default
  PR publication, default base branch and approval style if not already set,
  then (with consent) create/update `.brad/policy.yaml` without touching
  native `_bmad` config. Use short conversational prompts, not a questionnaire.
- `/brad resume 1.1`: resume using actual native plan, branch and PR
  evidence; never reset, regenerate, duplicate or skip unresolved gates.
- `/brad` (no argument): inspect existing work; resume interrupted unit
  first if evidence is unambiguous, otherwise show native hub's next action.
  Never choose an arbitrary backlog item without configured policy.
- `/brad epic 2` / `finish sprint`: resolve scope/dependencies, choose
  native planning or installed orchestrator; see epics-and-stories.
- `/brad increment <module>`, `refine increment`, `extend existing PRD`:
  **incremental planning**; inspect the existing approved PRD and architecture,
  then delegate only the requested delta to the installed native workflow.
  Do not create a replacement PRD or imply approval. See epics-and-stories.
- `/brad qa login`, `review PR #12`, `test-design epic 2`, `release R1`:
  route to *specific* installed QA, review, or gate; see quality-and-release.
- `/brad architect ...`, `analyst ...`, `UX ...`, `GDS ...`, `PM ...`:
  honor the explicitly named installed agent/skill, including menu semantics.
- `/brad --plan 1.1`: read-only routing/permission/phase preview. Do NOT
  run Build or write branches, tests, commits, GitHub state, or BMAD plan state.
- `/brad 1.1 --local`: ticket lifecycle through local verification only.
- `/brad 1.1 --pr`: explicitly authorizes ordinary branch push/PR creation
  for this task, subject to existing protections and credentials; not merge.

## Execute, adapt and report

1. **Resolve:** project/root, target (and duplicates), existing spec and status,
   v6/v7 runtime, direct instructions, approvals, dirty worktree, GitHub remote,
   and any incomplete PR. Reuse ongoing branch/PR when safe and intended.
2. **Choose:** smallest installed workflow that matches action. State a one-line
   route and end state. For ticket lane read ticket-to-pr.md; for other work
   choose native specialist plus only necessary validation and handoff.
3. **Delegate:** invoke installed native skill using actual host mechanism and
   its full task contract. Prefer separate context/subagent for implementation
   where supported, but if unavailable follow native instructions inline,
   disclose lost review independence, and never claim unsupported delegation.
4. **Inspect outcome:** read actual changes, native plan/result/status, tests,
   review decisions and blockers. Do not assume a skill's textual DONE = pass.
5. **Finish authorized delivery:** on ticket lane verify quality and prepare
   branch/commit/PR/CI; on planning or QA tasks finish their *own* required
   artifacts; on release audit provide a verdict, not a deployment.
6. **Resume reliably:** reconstruct state from native BMAD plan, branch, commits,
   PR and CI; do not start over if already implemented or reviewed. Never blindly
   rerun a finished ticket. If ambiguous, ask one material question.
7. **Summarize:** `Target | installed BMAD workflow actually used | what changed |
   tests with exact pass/fail/not-run | commit/branch | PR link/status/CI |
   approvals/questions | next action`. Never claim PR created without URL.

**Fail safely:** If native BMAD unavailable, do not fake BMAD agents. Offer a
precise installation/setup action or perform only independently authorized work.
If the repository/issue target is inaccessible, report the actual blocker. If
publish fails, retain local work and give the exact error and recovery step.
