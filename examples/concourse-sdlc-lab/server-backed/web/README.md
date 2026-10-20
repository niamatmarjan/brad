# Concourse frontend

Light-first React/TypeScript workspace. Use Node 24.x and run these commands from `examples\concourse-sdlc-lab\server-backed\web`:

```powershell
npm ci
npm run dev
```

Vite proxies `/api` to `http://localhost:4173`. Start the actual application API separately on that port. No application records are mocked, stored in localStorage, or persisted by the browser. Cookies are sent same-origin; every mutation is authorized by the server. Demo sign-in is development-only and uses `/api/demo-users` filtered to the ten contract IDs.

## Included

- Responsive navigation, project chooser, project creation, project overview, server activity and release readiness.
- Initiative/story/task backlog, five-lane Kanban covering all twelve statuses, personal assignments, review/QA queue.
- Search and status/assignee/type filters; details, acceptance criteria, dependencies, priority, estimates, assignment, creation/editing.
- Role-aware planning/editing/transition affordances; optimistic `expectedVersion` on edits and transitions. On conflict, refresh from the error notice and review the retained draft before retrying.
- Native modal focus containment, Escape dismissal/focus return, semantic headings, labeled controls, live feedback, skip navigation, visible focus, reduced-motion support.
- Explicit loading, unavailable API, forbidden action, conflict, empty dataset, and no-filter-results states. Refresh is manual; there is no real-time guarantee.

## Validation

```powershell
npm run build
npm run lint
npm test
npm run test:quality
npx playwright install chromium
npm run test:browser
```

Build includes TypeScript project checking. Node tests cover the typed request boundary and deterministic permission/filter helpers. Browser tests cover desktop, tablet, and mobile, including keyboard focus and automated axe WCAG AA checks. They use **test-only contract fixtures** intercepted at `/api`; they verify UI behavior, not server authorization, persistence, or an integrated backend. Automated accessibility checks do not replace assistive-technology testing. The application bundle has no fixture mode.

The separate real-backend regression uses the compiled delivery service, loopback HTTP, real server sessions, and isolated in-memory SQLite. It creates every supported type/priority combination from the form serializer, checks PATCH/null clearing and expected failures, and compares every role/state/assignment transition option to actual backend authorization. It does not modify the backend or its application database. Build the backend package first, then from `web`:

```powershell
$env:CONCOURSE_SERVER_ROOT = (Resolve-Path '..\server').Path
npm run test:delivery
```

## Implemented delivery contract

The backend's `server/README.md`, delivery validation, and authorization implementation refine `docs/api/CONTRACT.md`:

- Types: `initiative`, `story`, `task`; priorities: `urgent`, `high`, `medium`, `low` (labels may be capitalized, serialized values are not).
- Estimate: `null` or a finite number from 0 through 10000, including fractions. Clearing the form submits `null` so an existing estimate is removed.
- PATCH whitelists mutable planning fields and `expectedVersion`, never `type`, project, status, or identity. Type is read-only after creation. Full form scope saves invalidate approvals; saving Ready scope returns it to Requirements Review.
- Creation/planning edits: PM, BA, Delivery Manager, Architect, Tech Lead. Editing requires a planning state; developers cannot edit scope or assignment. Transition choices reflect current state, role, and assignment; the server additionally enforces review approvals, requirements, dependencies, and QA gates.
- Review/QA/comment/defect writes belong to the collaboration module and are outside this frontend correction. The review queue and transition controls do not replace required evidence.
- Activity and readiness panels render actual server fields. Parent hierarchy and sprint persistence remain unavailable; the backlog groups by supported type and shows dependency links.

Fixture browser tests are not evidence of an integrated backend journey. `test:delivery` is real HTTP/SQLite integration evidence for serialized delivery payloads, not a full browser delivery/QA lifecycle.
