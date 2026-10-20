# Initial API contract

All application data is served from `/api`. JSON success responses use `{ "data": ... }`; failures use `{ "error": { "code": "...", "message": "...", "details": ... } }`. Mutations require a same-origin request and a valid server session cookie.

## Identity

- `GET /api/session` returns the signed-in demo user or `401`.
- `GET /api/demo-users` returns `{ "data": [{ "id": "pm-01", "name": "...", "role": "product-manager" }] }` only outside production; it powers the clearly labeled development sign-in screen.
- `POST /api/session/demo` with `{ "userId": "..." }` starts a development-only demo session; it is disabled when `NODE_ENV=production`.
- `POST /api/session/logout` revokes the current server-side session.
- `GET /api/users` returns the seeded project roster to signed-in users.

Seeded identity IDs/roles are `pm-01/product-manager`, `ba-01/business-analyst`, `dm-01/delivery-manager`, `arch-01/solution-architect`, `tl-01/technical-lead`, `dev-01/developer`, `dev-02/developer`, `dev-03/developer`, `qa-01/functional-qa`, and `qa-02/automation-qa`.

## Project delivery

- `GET /api/projects` and `POST /api/projects` (`{ "name": "...", "description": "..." }`)
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/work-items`
- `POST /api/projects/:projectId/work-items` (`type`, `title`, `description`, `acceptanceCriteria`, `priority`, optional `estimate`, `assigneeId`, `dependencies`)
- `PATCH /api/work-items/:workItemId` requires `expectedVersion`; stale versions return `409 VERSION_CONFLICT`.
- `POST /api/work-items/:workItemId/transitions` with `{ "to": "...", "expectedVersion": n }`
- `POST /api/work-items/:workItemId/comments`
- `GET /api/projects/:projectId/activity`
- `GET /api/projects/:projectId/release-readiness`

## Review and QA

- `POST /api/work-items/:workItemId/reviews`
- `POST /api/work-items/:workItemId/test-runs`
- `POST /api/work-items/:workItemId/defects`
- `PATCH /api/defects/:defectId` requires `expectedVersion`.
- `POST /api/defects/:defectId/retests`

All state changes must run authorization and domain validation on the server and create immutable audit/activity entries in the same SQLite transaction. Stories move through `Draft`, `Requirements Review`, `Ready`, `In Development`, `Code Review`, `Ready for QA`, `In QA`, `Accepted`, and `Done`; `Blocked`, `Changes Requested`, and `Reopened` are explicit states. A blocking open defect prevents `Accepted` and release readiness. State-changing updates use optimistic versions; no silent last-write-wins behavior.

Read responses return `{ "data": record }` or `{ "data": records }`. A project includes `id`, `name`, `description`, and `status`. A work item includes `id`, `projectId`, `type`, `title`, `description`, `acceptanceCriteria` (string array), `priority`, `estimate`, `assigneeId`, `dependencies` (ID array), `status`, `version`, and `updatedAt`. Error status codes are `400` invalid input, `401` unauthenticated, `403` forbidden, `404` missing record, and `409` stale version or blocked transition.

This is a versioned implementation contract to coordinate the first build; it is not evidence that endpoints exist or have passed tests.
