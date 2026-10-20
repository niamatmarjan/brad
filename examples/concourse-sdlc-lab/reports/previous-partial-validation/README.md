# Concourse SDLC lab

Concourse is a small, offline-capable team-delivery board included as a test vehicle for BRAD. This checked-in artifact is a **scoped local rehearsal**, not the complete cross-functional, live-host validation described in the originating brief. It records the work that was actually verifiable in this Copilot CLI session and marks missing native workflow execution, independent stakeholder execution, remote PR/CI, and full routing trials explicitly.

## Run the demo

Requirements: Node.js 20 or newer. No install, production credential, or network access is needed.

```powershell
cd examples\concourse-sdlc-lab\app
npm start
```

Open <http://127.0.0.1:4173>. The demo persists changes in this browser's `localStorage`; **Reset** restores the sample board. The selected role is a UI-level demonstration control, not authentication or an authorization boundary. Do not use it with real or sensitive data.

Run the domain tests with:

```powershell
npm test
```

## What's included

- Projects, seeded team roles, work-item create/edit/delete, status changes, priorities, assignments, tags, search and filters.
- Comment threads, a project activity pulse, role-aware UI checks, responsive board/list views, and local browser persistence.
- A self-contained offline dossier at [`report/MASTER_REPORT.html`](report/MASTER_REPORT.html), adoption guidance under `docs/`, and machine-readable evaluation/evidence records.

## Evidence boundary

The report distinguishes checks on BRAD's installer/package from live native BMAD invocation and delivered-work evidence. BRAD v0.4.1 was tested from the clean local repository; an isolated temporary fixture was used for setup, BMAD v6.12.4/BMM/TEA installation, and doctor. The active Copilot CLI session was not launched from that fixture, so native skill dispatch, role-specific workflows, and the 85 behavioral routes were not exercised. Antigravity was not the active host and the concrete Auto-selected model ID was unavailable. No remote was created, no branch was pushed, and no PR/CI/customer acceptance is claimed.

The sample tasks, dates, comments and activity in the application are **fictional product-demo fixtures**, not telemetry or evidence of completed SDLC work. See [`REPRODUCE.md`](REPRODUCE.md), the [manifest](MANIFEST.json), and the master report for exact observed outcomes and limitations.

## License and provenance

Demo-specific source is MIT-licensed under [`LICENSE`](LICENSE). It was authored for this example without external application dependencies or real customer data. BRAD itself remains a separately licensed project; no BRAD runtime or canonical routing source is copied into the app.
