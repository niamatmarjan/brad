# Concourse demo test strategy and results

**Scope:** focused local demo checks only. Native BMAD TEA, Playwright, CI, formal accessibility review, and coverage are not present in this run.

## Automated checks

`npm test` in `app/` runs five Node built-in tests:

- Assignee and elevated-role task management.
- Narrower delete permission.
- Valid/invalid task transition and missing-task error.
- Composed text/priority/assignee filters without input mutation.
- Progress calculation and empty-project behavior.

## Manual smoke evidence

The browser canvas loaded the app at 628×732 CSS pixels, with the narrow-screen CSS breakpoint active. Creating a sample work item showed it on the board; Reset removed it and restored the seed board. This was a single-context UI smoke, not independent functional QA. No screenshot file is packaged.

## Limitations

Domain tests do not prove full DOM behavior, browser compatibility, screen-reader support, persisted-data migration, server authorization, cross-browser behavior, production security, or release readiness. Do not cite the fictional seed activity as test evidence.
