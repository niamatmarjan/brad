# Concourse product scope — demo brief

**Status: implementation brief for the local prototype; not a user-approved PRD.** This was written to explain the delivered demo, not generated or approved by a native BMAD workflow.

## Audience and job

A small cross-functional delivery team needs one local view of project work, ownership, progress, and discussion. The demo's single job is to let a reviewer explore that workflow without production credentials or external services.

## In scope

- Sample workspace and projects; fictional stakeholder roles.
- Work item create, edit, delete, status transition, priority and assignee.
- Search and combined priority, assignee, and project filtering.
- Comments, a recent activity pulse, basic project progress, and board/list presentation.
- Local browser persistence, visible local-demo boundary, responsive layout, keyboard focus.

## Explicitly out of scope

Real authentication/authorization, organization provisioning, shared database, multi-user synchronization, external notifications, remote GitHub links, production deployment, enterprise audit retention, customer data, and claims of user acceptance.

## Acceptance examples for the demo

1. A local reviewer can create an item and see it on the selected project's board.
2. Search and filters narrow visible items without changing the underlying board data.
3. A permitted demo role can move an assigned item through the allowed statuses; an unassigned contributor cannot manage someone else's item.
4. A comment appears in the item discussion; new changes are stored only in this browser.
5. Reset restores fictional seed data.
6. The static server stays bound to loopback and does not expose files outside the served asset roots.

These are demo acceptance examples, not a product contract for production Concourse.
