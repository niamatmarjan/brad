# Natural tasks and bounded route inspection

The AI host interprets the user's intent using project context and the actual
installed BMAD instructions. `brad route` is a deterministic, read-only preflight:
it matches bounded phrases and suggests an installed workflow. It does not run
BMAD, resolve a native ticket, grant permission, or prove task completion.
It is not a general semantic router or a security boundary.

## Choose the requested outcome

| Outcome | Candidate native owner, if installed |
|---|---|
| Create PRD | `bmad-prd`, or creation-only `bmad-create-prd` |
| Refine PRD | `bmad-prd`, or `bmad-edit-prd` |
| Validate existing PRD | `bmad-prd` validation mode, or `bmad-validate-prd` |
| Approve PRD | Authorized human owner; validation is not approval |
| Refine epic/story | Native epic/story planning or `bmad-ticket`; no implementation |
| Build or resume work | `bmad-build`; no Help substitution |
| Explicit unattended Build | Inspect `bmad-build-auto` prerequisites and host permissions |
| Review PR/code | `bmad-code-review`, read-only constraints passed explicitly |
| Review test quality | `bmad-testarch-test-review` |
| Design test strategy | `bmad-testarch-test-design` |
| Acceptance tests before implementation | `bmad-testarch-atdd` |
| Generate E2E tests | `bmad-qa-generate-e2e-tests`, or compatible `bmad-testarch-automate` |
| Expand automated coverage | `bmad-testarch-automate` |
| Investigate architecture | Installed architecture workflow, findings only |
| Assess release readiness | Collect exact-commit evidence; NFR review is one input |
| Retrospective | `bmad-retrospective`, for the requested completed epic |

Read the installed contract before invocation. Explicit workflow selection beats
incidental words. Test review must not become test generation because the prompt
mentions E2E. A story ID must not turn review, QA, or status into implementation.
An ambiguous "Test story 1.1" requires native context before choosing a QA action.
Missing specialists return `SPECIALIST_UNAVAILABLE`; never invent agents.

## Preflight result contract

```bash
brad route "review PR #40, don't change anything" --dir . --json
brad route "build story 1.1" --dir . --dry-run --json
```

The ESM API remains `resolveRoute({ utterance, projectRoot, installedSkills?, dryRun? })`
from `@niamatmarjan/brad/router`. An explicit `installedSkills` array supplies a
caller-owned inventory for inspection/testing; it does not attest to installation.
Normal CLI inspection reads project-local skill files. Conflicting copies require
inspection; identical copies are allowed. v6/v7 indicators are hints, not version
certification. Mixed hints stop proposed writes until the host resolves ownership.
User/global skill caches and the host catalog are outside this CLI inventory.

- `selected_route` is a suggestion. Legacy `action: DELEGATE_WORKFLOW` does
  not mean dispatch occurred. `execution: NOT_RUN` always describes this preflight.
- `is_authorized: true` means the bounded refusal filter did not reject the
  request. `authorization: REQUIRES_HOST_CHECK` means actual consent is unverified.
  Harmless discussion of destructive commands is allowed. The executing host
  must enforce real permissions even if the phrase filter misses a paraphrase.
- `requires_mutations` describes the suggested work, never writes performed by
  the CLI. `mutation_scope` distinguishes `NONE`, `DOCUMENTS_ONLY`, `TESTS_ONLY`,
  and `CODE_AND_DOCUMENTS`. Plan-only and read-only constraints force `NONE`.
  Explicit workflow choices return `INSPECT_WORKFLOW`: their native mutation
  contract must be inspected before any work, even when the preflight reports none.
- `target_candidate` is unverified. `target_resolution: REQUIRES_NATIVE_RESOLUTION`
  means the host must resolve the exact story/ticket in native BMAD state, including
  duplicate IDs, initiative, dependencies, completed work, branch and PR identity.
  Do not infer that `1.1`, `1-1`, or an issue number mean the same item.
- `assessment_scope: NFR_ONLY` and `release_verdict: UNVERIFIED` do not certify a
  release. Use [quality and release](quality-and-release.md) for evidence gathering.

Unrecognized or conflicting requests require clarification in the host. Do not
extend phrase matching into a second workflow engine or a ticket-state parser.

## Optional handoff checkpoints

`@niamatmarjan/brad/handoff` keeps its exported functions for callers already using
them. The CLI and primary skill do not require this checkpoint store. Native BMAD
remains authoritative for backlog, lifecycle, writer ownership and approvals.
Role/stage records and execution-mode strings are caller declarations, not proof
of an actual skill invocation, separate reviewer, user approval, Git branch or PR.
New states default to `NOT_VERIFIED`; legacy execution-mode labels remain accepted.
`ACCEPTED` is a reported local handoff decision, not verified native completion.

Checkpoints validate roles/stages, preserve the exact suspended gate, and reject
malformed state. Corrections merge changed file records with the existing manifest;
each record requires content (including empty content) or a SHA-256 digest. These
digests describe the supplied bytes, not independently read disk or Git content.

Save with `saveTaskState(state, root)`. It returns the path and advances
`state.revision` only after replacing the file. Load fresh state before a later
save; stale revisions fail instead of overwriting newer work. File replacement
uses a flushed temporary file and an exclusive per-task write lock. This protects
checkpoint writes across local processes, not two hosts executing the same task.
It is not a distributed lock or a promise of power-loss durability on every disk.

A writer killed during a save can leave `<task>.json.lock` and a temporary file.
Stop and inspect the writer PID/process and the saved/native state before manually
removing that lock and abandoned temporary file. Never steal a live lock or turn
an unreadable checkpoint into permission to start fresh. Safe legacy IDs keep
their filenames; unsafe IDs and case-colliding identities fail explicitly.

`guardDuplicateRequest` is advisory. Existing branches and interrupted work require
explicit continuation. It does not claim an execution lease or query GitHub.
Callers must supply observed branch information and verify actual Git/PR identity
with the host's native tools. Keep human checkpoints and native BMAD gates intact.
