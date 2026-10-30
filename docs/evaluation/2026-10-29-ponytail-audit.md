What this repo does: BRAD installs a small AI-host skill and suggests installed BMAD workflows for stakeholder requests. BMAD owns specialist work and native ticket state; the host executes it. This audit assumes one supervised operator per project, with interrupted sessions and occasional competing local checkpoint writers, not an unattended multi-user service.

Baseline: Gate 04 commit `217fd2756335af97d56f42a53a2d6fca32ed68a2`, inspected on 2026-10-29. Source links below are pinned to that original commit. The report records original defects; implementation and remaining limits are tracked in the companion verification report. No P0 core defect was established.

## Must fix

1. **P1 — Preview and read-only constraints can become write plans** ([router.mjs:125](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L125), [core.mjs:603](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/cli/core.mjs#L603)).
   - **What this is:** The router describes the next native workflow and whether it needs writes.
   - **Problem:** `/brad --plan 1.1` proposes Build with writes, and architecture investigation also proposes writes. The CLI accepts `--dry-run` but does not pass it to the router.
   - **Fix:** Apply read-only constraints once to every proposed route and pass the CLI flag through. Distinguish document-only planning from code changes.
   - **If we skip it:** A host trusting this result can change a project after the user requested inspection only.

2. **P1 — Testing and reviewing a story can select implementation** ([router.mjs:472](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L472)).
   - **What this is:** The final story rule selects Build.
   - **Problem:** `Test story 1.1` and `Review story 1.1` both select `bmad-build` because a story number alone matches. No test distinguishes these actions.
   - **Fix:** Classify the requested action before the identifier. Review selects code review; vague QA needs native context or clarification.
   - **If we skip it:** A request to inspect work can trigger new implementation.

3. **P1 — Different test jobs use the wrong specialists** ([router.mjs:263](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L263), [router.mjs:308](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L308)).
   - **What this is:** These rules choose workflows for test creation and test-quality review.
   - **Problem:** E2E generation selects ATDD, which creates acceptance tests before implementation. Test-quality review selects test design, and `Use bmad-testarch-test-review on our E2E tests` ignores the selected workflow and generates tests.
   - **Fix:** Use the actual installed owners for review, design, ATDD and E2E. Honor explicit selection before incidental keywords and correct the tests that expect the wrong owners.
   - **If we skip it:** The wrong work is produced, and passing tests protect the mistake.

4. **P1 — PRD validation can select a creation-only workflow** ([router.mjs:220](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L220)).
   - **What this is:** PRD requests choose a requirements-document workflow.
   - **Problem:** With only `bmad-create-prd` installed, `Validate the existing PRD` still selects creation. Refinement and human approval are also treated as creation.
   - **Fix:** Preserve create, refine and validate intent. Use a compatible multi-mode PRD workflow or the matching shim; leave approval to the authorized human.
   - **If we skip it:** An existing approved document can be replaced instead of assessed.

5. **P1 — Release readiness selects an epic retrospective** ([router.mjs:392](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L392)).
   - **What this is:** This rule chooses a release-audit owner.
   - **Problem:** Release checks select `bmad-retrospective`, whose installed contract reviews a completed epic and can update sprint status. `Is this release ready?` is not recognized at all.
   - **Fix:** Keep retrospective explicit. Release readiness needs exact-commit evidence; an available nonfunctional review is only one input and must leave the overall verdict unverified.
   - **If we skip it:** A retrospective can be mistaken for permission to ship an unverified release.

6. **P1 — Missing Build is reported as an available Help workflow** ([router.mjs:178](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L178), [router.mjs:475](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L475)).
   - **What this is:** Build and resume requests select an implementation specialist.
   - **Problem:** With no Build installed, the router returns `bmad-help`, even when Help is also absent. An unattended Build can also be selected without checking its prerequisites.
   - **Fix:** Return `SPECIALIST_UNAVAILABLE`. Require an explicit unattended workflow choice and inspect its native contract.
   - **If we skip it:** Callers receive a successful-looking route that cannot perform the requested task.

7. **P1 — Checkpoint writes can escape through symlinks or overwrite another identity** ([handoff.mjs:397](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L397)).
   - **What this is:** Task IDs become files under `.brad/state`.
   - **Problem:** A `.brad` link redirects writes outside the project. Different IDs such as `A/B` and `A B` normalize to the same filename, while case variants also collide.
   - **Fix:** Validate portable IDs, reject linked state paths and verify the stored task identity before replacement.
   - **If we skip it:** Unrelated files or another task's checkpoint can be overwritten.

8. **P1 — Corrupt state is silently treated as no previous work** ([handoff.mjs:407](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L407)).
   - **What this is:** Loading a checkpoint tells the duplicate guard whether a task already exists.
   - **Problem:** Writing directly truncates the old file. A killed writer can leave invalid JSON; the loader catches every error and returns `null`, so the duplicate guard permits a fresh run.
   - **Fix:** Flush a temporary file and replace the old file atomically. Treat only a missing file as absent; reject malformed state and surface read errors.
   - **If we skip it:** Interrupted work can be duplicated and recovery evidence lost.

9. **P1 — Competing checkpoint writers silently lose updates** ([handoff.mjs:397](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L397)).
   - **What this is:** Multiple sessions can save the same task file.
   - **Problem:** Two readers can load the same state, make different changes, and both save successfully. The second save erases the first writer's defect or review record.
   - **Fix:** Hold an exclusive write lock while comparing a saved revision and replacing the file. Reject a stale revision rather than guessing how to merge decisions.
   - **If we skip it:** A later session can remove current blockers or revert progress without noticing.

10. **P1 — Resume reconstructs the wrong gate** ([handoff.mjs:344](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L344)).
    - **What this is:** Resume chooses who should act after an interruption.
    - **Problem:** Interrupting `REVIEW_PENDING` resumes at `QA_PENDING`. A historical remediation decision can keep sending already-corrected work back to the developer, and completed tasks can be reopened.
    - **Fix:** Record the suspended stage and restore it exactly. Recover older checkpoints from history; reject terminal or non-interrupted resumption.
    - **If we skip it:** Finished gates repeat and pending gates can be skipped or misassigned.

11. **P1 — Role checks alone allow suspended or blocked work to advance** ([handoff.mjs:80](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L80), [handoff.mjs:167](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L167)).
    - **What this is:** Transition functions move work through developer, QA and review roles.
    - **Problem:** `qaAcceptDeliverable(interruptTask(qaState))` advances despite interruption. QA and reviewer acceptance also ignore unresolved non-defect blockers.
    - **Fix:** Validate stage and role together at each transition and require an empty blocker list before acceptance.
    - **If we skip it:** Work can be accepted while required checks or decisions are still pending.

## Should fix

12. **P2 — Deliverable records lose unchanged files and empty-file digests** ([handoff.mjs:91](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L91), [handoff.mjs:286](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L286)).
    - **What this is:** A manifest lists delivered paths and fingerprints, called SHA-256 digests.
    - **Problem:** An empty file gets `UNKNOWN` instead of its real digest. Correcting one file replaces the whole manifest and removes unchanged submitted files.
    - **Fix:** Hash provided bytes even when empty; share one validated file-record helper and merge changed records by path.
    - **If we skip it:** Review and recovery operate on incomplete or inaccurate delivery records.

13. **P2 — Resolving a defect can clear another defect's blocker** ([handoff.mjs:269](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L269)).
    - **What this is:** Correction removes blockers for resolved defects.
    - **Problem:** Resolving `D1` clears any blocker containing `D1`, including `D10`. Unknown and duplicate defect IDs are accepted too.
    - **Fix:** Match the full generated defect prefix and reject unknown or duplicate IDs.
    - **If we skip it:** The recorded blockers disagree with the defects that still need work.

14. **P2 — Discovery disagrees between doctor and routing** ([router.mjs:34](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L34), [core.mjs:350](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/cli/core.mjs#L350)).
    - **What this is:** Local file discovery identifies candidate native capabilities.
    - **Problem:** Different definitions of the same skill are silently collapsed. Doctor misses official `_bmad/bmm/config.yaml`, and routing ignores mixed v6/v7 hints.
    - **Fix:** Share the JavaScript inventory, report conflicting definitions and unreadable roots, recognize BMM configuration, and stop proposed writes on mixed ownership hints.
    - **If we skip it:** Two CLI views disagree about a valid installation or silently choose a conflicting workflow.

15. **P2 — Destructive-operation discussion is refused as execution** ([router.mjs:65](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L65)).
    - **What this is:** A phrase filter rejects destructive requests before routing.
    - **Problem:** `Explain why force pushing main is dangerous` is refused, while the hyphenated action `Force-push main` is missed. Matching a phrase is neither consent enforcement nor general language understanding.
    - **Fix:** Keep bounded discussion and action checks separate, cover compound action clauses, and require real host permission enforcement before execution.
    - **If we skip it:** Harmless safety questions fail while callers may overtrust a limited filter.

16. **P2 — Declared handoffs and advisory duplicate checks overstate their evidence** ([handoff.mjs:45](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L45), [handoff.mjs:488](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L488)).
    - **What this is:** An optional exported module records caller-supplied task transitions.
    - **Problem:** Creating a state asserts inline execution before any workflow runs. The duplicate guard allows branch-only and interrupted work; it has no execution lock, real Git query, PR lookup, or authenticated reviewer identity.
    - **Fix:** Default execution to `NOT_VERIFIED`, require explicit continuation, and label records and guards as advisory. Use host/native BMAD evidence for actual invocation, ticket completion, Git/PR identity and authorization.
    - **If we skip it:** A saved object can be mistaken for independent review or proof that concurrent execution is safe.

17. **P2 — Repeated result and history construction multiplies policy fixes** ([router.mjs:192](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/router.mjs#L192), [handoff.mjs:97](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/src/handoff.mjs#L97)).
    - **What this is:** Each route and transition separately constructs nearly identical result fields.
    - **Problem:** Read-only flags, missing-skill behavior and event metadata are copied across many branches; findings 1 and 6 already show the copies disagreeing.
    - **Fix:** Share the route result, file-record and history-writing code. Keep domain decisions in ordinary functions and avoid adding a routing framework.
    - **If we skip it:** Every safety correction needs many edits and can miss another branch.

18. **P2 — A stacked PR receives no automatic checks** ([ci.yml:3](https://github.com/niamatmarjan/brad/blob/217fd2756335af97d56f42a53a2d6fca32ed68a2/.github/workflows/ci.yml#L3)).
    - **What this is:** The workflow chooses which pull requests receive tests.
    - **Problem:** It accepts PRs targeting `main` only. The requested improvement PR targets `feat/gate-04-real-routing`, so opening it would schedule no checks.
    - **Fix:** Add that development base to the pull-request trigger. Keep the release job limited to pushes to `main`.
    - **If we skip it:** Local results cannot be independently checked by the normal stacked-PR workflow.

Verdict: Fix the P1 route and checkpoint defects before relying on Gate 04 for execution. Green unit tests do not establish authentic native host dispatch.

Lean: -600 production lines, -0 dependencies possible through shared result construction and removal of repeated branches. This is a conservative estimate; exact final measurements are in the verification report.

Not checked: No host-native BMAD invocation, full v7 ticket lifecycle, independent specialist identity, distributed execution locking or production load certification. The audit read all core JavaScript, helper Python scripts, core tests, packaging/build/CI configuration and relevant skill contracts; it sampled historical role/release guides and did not re-audit the separate enterprise lab or its evidence history.
