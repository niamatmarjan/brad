# Demo implementation plan

**Status:** Illustrative sequencing only. This is not a native BMAD sprint plan, an estimate, or a claim that two sprints were executed.

## Slice A — inspectable local board

- Serve a local app without production credentials.
- Show fictional workspace roles, project tasks, status, priority, ownership, and activity.
- Add domain tests for role guards, status transitions, filters, and progress.
- Gate: app test suite passes and localhost asset paths do not escape the served root.

## Slice B — collaboration interactions

- Add task editing, notes, filtering, role switching, project selection, and reset.
- Check narrow viewport rendering and keyboard-accessible controls.
- Gate: create/reset smoke works; demo warning clearly states local-only persistence and illustrative role checks.

These slices summarize authored code organization, not independent developer ownership or measured sprint velocity. There are no points, elapsed sprint metrics, native story IDs, or approvals.
