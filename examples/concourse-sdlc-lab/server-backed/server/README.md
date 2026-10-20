# Concourse local backend

Node **24.x**, strict TypeScript, built-in `node:sqlite`, and no native add-ons or external services. This is a local demonstration boundary, **not production authentication**. No Auth0/OAuth integration or native BMAD execution is implied.

## Workflow (PowerShell)

From the BRAD repository root:

```powershell
Set-Location examples\concourse-sdlc-lab\server-backed\server
npm ci
npm run typecheck
npm test
npm run seed
npm start
```

`npm test` builds and explicitly executes `spec\*.spec.ts` as compiled domain and real loopback HTTP tests. The separate spec directory prevents the legacy root's bare `node --test` from attempting to execute uncompiled TypeScript. Test databases are created under `server\.test-data\` and removed after each test; no OS temporary directory is used. `npm run build` removes only generated `dist\` output before compiling. `npm run dev` builds and starts. The service binds **127.0.0.1:3001** by default; `PORT` overrides the port. `GET /api/health` returns `{ "data": { "status": "ok", "database": "ok" } }` after a SQLite probe.

Schema migrations run on opening the database in a short `BEGIN IMMEDIATE` transaction. `schema_migrations` records applied versions; newer unknown schemas fail startup. Foreign keys, WAL, a five-second busy timeout, and version-checked short transactions are enabled. Starting outside production also runs the idempotent ten-user seed; explicit `seed` is available for reproducibility. Seeding preserves existing users, sessions, projects, and user data.

### Database and origin isolation

```powershell
$env:CONCOURSE_WORKTREE = (Resolve-Path '..').Path
# Optional explicit file takes precedence:
$env:CONCOURSE_DB = Join-Path $PWD 'data\manual.sqlite'
# For a Vite proxy, use the exact browser origin:
$env:CONCOURSE_ORIGIN = 'http://localhost:5173'
npm run seed
npm start
```

Default: `<this package's worktree>\server\data\concourse.sqlite`, independent of process working directory. `CONCOURSE_WORKTREE` selects `<worktree>\server\data\concourse.sqlite`; `CONCOURSE_DB` selects an explicit path (relative paths resolve from the process working directory). Never point isolated developer/QA worktrees at the same database.

Every mutation, including demo login and logout, requires a matching `Origin` header. Without `CONCOURSE_ORIGIN`, only an HTTP loopback request's exact host/port origin is accepted. Cross-site fetch metadata is rejected. No permissive CORS is enabled. For CLI requests, explicitly send `Origin: http://127.0.0.1:3001` and `Content-Type: application/json`.

If `web\dist` already exists, this service serves its assets and SPA routes; it does not build or modify the browser package. Otherwise API routes still work and browser requests return a structured 404.

## Sessions

`GET /api/demo-users` exposes exactly the contract's ten fictional identities. `POST /api/session/demo` accepts `{ "userId": "pm-01" }`, rotates/revokes the previous cookie's session, and returns the selected user. The cookie is an opaque random 256-bit token with `HttpOnly`, `SameSite=Strict`, `Path=/`, and an eight-hour lifetime. Only its SHA-256 hash is stored. The cookie is never placed in activity records. A session resolves the user's role from the database on every request. Expired/revoked sessions return 401.

`GET /api/session`, `GET /api/users`, and every project/work-item read require a session. `POST /api/session/logout` revokes the database session and expires the cookie. Logout accepts an empty body. `NODE_ENV=production` disables demo enumeration, sign-in, seeding, and acceptance of existing development sessions; there is deliberately no production sign-in provider.

## Models, permissions and lifecycle

- Project creation: Product Manager or Delivery Manager.
- Work-item creation and planning edits: PM, BA, Delivery Manager, Architect or Tech Lead. Types: `initiative`, `story`, `task`; priority: `urgent`, `high`, `medium`, `low`.
- Editing scope is allowed only in planning states (`Draft`, `Requirements Review`, `Ready`, `Changes Requested`, `Reopened`, `Blocked`). Scope edits invalidate approvals. A scope edit to `Ready` explicitly returns the item to `Requirements Review` with transition history.
- Development transitions: assigned developer or Tech Lead; development requires an assigned developer/Tech Lead, approved current requirements, and dependencies in `Done`. Dependencies must exist in the same project and be acyclic.
- Requirements reviews: planning roles. Code reviews and promotion to `Ready for QA`: Tech Lead or Architect; code self-review by the assignee is forbidden.
- QA entry, test runs, defects, retests and acceptance: Functional QA or Automation QA. Assigned developer/Tech Lead can mark defects `In Progress` or `Fixed`; QA controls defect scope and reopening.
- Completion (`Accepted` → `Done`): PM or Delivery Manager.
- Comments: any signed-in roster member. All seeded users share the demo's project roster; this is not multi-tenant access control.

Main path:

```text
Draft → Requirements Review → Ready → In Development → Code Review
      → Ready for QA → In QA → Accepted → Done
```

Requirements/code approval is required before leaving its corresponding review state. Requirements Review, Code Review and In QA may send work to `Changes Requested`. Planning can return that state to `Draft`; assigned development may resume only with current approved requirements. Active pre-acceptance states can become `Blocked`; recovery is explicitly `Blocked → Draft` or `Blocked → Reopened → In Development`. `Accepted`/`Done` can become `Reopened`. There is no arbitrary status patch and no skip-to-Done endpoint.

Acceptance and completion require complete requirements, current passing QA evidence and **zero non-Closed blocking defects**. A Fixed blocking defect still blocks acceptance. Only a passing QA retest can close a Fixed defect; failed retests reopen it. Open blocking defects cannot be downgraded to bypass the gate. New or changed defects reopen an Accepted/Done item and invalidate prior QA evidence. A fresh passing test run is required after defect changes/retests or a new development/QA cycle.

Release readiness is derived, never stored: a nonempty project, all work items Done with requirements and current passing QA evidence, and no open blocking defects. The response contains `ready`, `reasons`, `workItemCount`, and `blockingDefectCount`.

## API request details

The root contract is implemented under `/api`. JSON success is `{ "data": ... }`; errors are `{ "error": { "code", "message", "details" } }`, with actionable human-readable messages and no stack traces or SQL. Body limit: 64 KiB. Unknown input fields are rejected. JSON object bodies and `application/json` are required for content mutations.

All mutable updates require positive integer `expectedVersion`. Stale updates return **409 `VERSION_CONFLICT`** with current/submitted versions; domain gates return 409 with specific codes such as `BLOCKING_DEFECT`, `REVIEW_REQUIRED`, `QA_EVIDENCE_REQUIRED`, or `INVALID_TRANSITION`. Refresh and retry deliberately, not blindly. Reads/mutations return work-item `version`; append operations that bump a parent also expose `workItemVersion` where applicable. Refetch the work item after defect creation/update to obtain its new version.

- `POST /api/projects`: `{ "name", "description" }`.
- `POST /api/projects/:id/work-items`: `{ "type", "title", "description", "acceptanceCriteria": ["..."], "priority", "estimate": null, "assigneeId": null, "dependencies": [] }`. Type/title required; other fields have safe defaults. Incomplete Drafts are allowed, readiness is not.
- `PATCH /api/work-items/:id`: planning fields plus `expectedVersion`; type/project/status/identity fields cannot be patched.
- `POST /api/work-items/:id/transitions`: `{ "to": "Requirements Review", "expectedVersion": 1 }`.
- `POST /api/work-items/:id/comments`: `{ "body": "..." }`. Optional `expectedVersion` checks the parent when supplied. Comments are immutable append-only records and do **not** bump the item.
- `POST /api/work-items/:id/reviews`: `{ "kind": "requirements" | "code", "decision": "approved" | "changes-requested", "body": "...", "expectedVersion": n }`. Appends a review and bumps the item; a transition is a separate deliberate action.
- `POST /api/work-items/:id/test-runs`: `{ "name": "...", "result": "passed" | "failed" | "blocked", "cases": [{ "name": "...", "result": "passed" }], "notes": "...", "expectedVersion": n }`. At least one named case required, aggregate result must match cases; failed dominates blocked, blocked dominates passed. Only In QA permits runs.
- `POST /api/work-items/:id/defects`: `{ "title", "description", "severity": "blocking" | "critical" | "major" | "minor", "expectedVersion": n }` (parent item version). Defects start Open.
- `PATCH /api/defects/:id`: `{ "status": "In Progress" | "Fixed" | "Reopened", "expectedVersion": n }` (defect version); QA can also edit title/description/severity. Closure is only through retest.
- `POST /api/defects/:id/retests`: `{ "result": "passed" | "failed", "notes": "...", "expectedVersion": n }` (defect version). Returns the retest, updated `defect`, and `workItemVersion`.

GET endpoints additionally expose `/api/work-items/:id`, that item's `/comments`, `/reviews`, `/test-runs`, `/defects`, `/transitions`, plus `/api/defects/:id` and `/api/defects/:id/retests`, so append-only evidence survives refresh.

Every runtime mutation writes immutable activity in the same transaction as domain data; failure to append audit rolls back the mutation. Transitions, comments, reviews, QA runs and retests have database-level update/delete rejection triggers. Session lifecycle audit is not exposed in project feeds. Database initialization/seed is a separate bootstrap operation, not a fictional human activity.

## Validation scope

Tests exercise migrations/seed/restart persistence, isolated paths, role denials, malformed input, stale writes through independent SQLite connections and concurrent HTTP requests, dependency cycles, lifecycle/review bypass attempts, immutable audit/rollback, session expiry/revocation/switching, production demo disablement, origin enforcement, bounded JSON errors, test evidence, blocker fixing/retesting, and the full HTTP delivery journey. These are local automated tests, not native BMAD dispatch, independent review, browser accessibility validation, CI or remotely verified delivery.
