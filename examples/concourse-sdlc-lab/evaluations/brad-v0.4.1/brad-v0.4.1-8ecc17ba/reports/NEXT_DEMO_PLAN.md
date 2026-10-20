# Next BRAD validation demo

## Recommendation

Use a **brownfield application with existing tests and incomplete documentation**, rather than repeating the greenfield Concourse workflow. Choose a repository with no real customer data, a clear local test command, and an owner-approved bounded change.

## Why this is the next useful control

This Concourse run verified a server-backed application journey and quality checks but left native workflow execution, all 85 model-in-the-loop routes, independent multi-developer work, and matched direct-BMAD comparison unverified. A brownfield project can expose whether BRAD correctly resolves an existing backlog and version, resumes work safely, avoids redoing implementation, and routes review/QA to installed native workflows.

## Executable plan

1. **Preflight:** select a disposable or explicitly authorized project; record the clean SHA, branch, Node/toolchain, model disclosure, available host skills, BMAD version/modules, and existing tests. Keep the BRAD baseline immutable.
2. **Pick one ticket:** obtain an owner-approved acceptance oracle and identify the native ticket source. Run BRAD preview and record the expected route before any write.
3. **Matched control:** perform the same bounded ticket once through direct BMAD and once through BRAD, using fresh worktrees, equivalent context and identical acceptance criteria. Randomize order if repeated; record complete verified deliverables rather than elapsed time alone.
4. **Real collaboration:** where host capabilities permit, assign three separate implementation tickets to independent developer worktrees and two QA tasks to independent contexts. Record session/worktree/commit IDs and a real dependency handoff. If unavailable, mark blocked rather than representing sequential personas as independent developers.
5. **Defect lifecycle:** have QA discover a real acceptance failure, report it without fixing, hand it back to a developer, then independently retest the fix and regression.
6. **Routing:** run a safe stratified subset of canonical scenarios first; expand only when each scenario has a real isolated fixture and the action is authorized. Record L1-L5 separately; never execute destructive cases just to raise coverage.
7. **Recovery and delivery:** interrupt one safe task after a checkpoint, resume it, check duplicate prevention, and exercise branch → PR → CI only after the owner authorizes remote creation. Never merge or deploy without approval.
8. **Publish the evidence package:** validate the event ledger, evidence references, scenario denominators, hashes, local links, and sanitization; preserve the immutable baseline and candidate fix results.

## Required decision gates

- The project owner approves scope, data handling, ticket source, and remote permissions.
- The host exposes native skill invocation and independent sessions; otherwise record the exact blocker and limit the conclusions.
- Direct-BMAD and BRAD runs use equivalent model/tool settings; if not, mark the comparison incomplete.
- Acceptance criteria and role permissions are approved before classifying results as pass/fail.

## Success measurement

Report exact denominators for route selection, verified native invocation, verified outcome, and stakeholder tasks. Compare only completed equivalent deliverables. Do not infer production readiness from one project or a composite score.
