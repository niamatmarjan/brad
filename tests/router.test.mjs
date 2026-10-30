import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveRoute, INTENTS } from '../src/router.mjs';

// Synthetic inventory, based on the inspected v6.12 workflow contracts.
const standardSkills = [
  'bmad-prd',
  'bmad-create-epics-and-stories',
  'bmad-build',
  'bmad-build-auto',
  'bmad-code-review',
  'bmad-testarch-atdd',
  'bmad-testarch-test-design',
  'bmad-testarch-test-review',
  'bmad-qa-generate-e2e-tests',
  'bmad-testarch-nfr',
  'bmad-testarch-automate',
  'bmad-architecture',
  'bmad-retrospective',
  'bmad-help',
  'bmad-agent-analyst',
  'bmad-agent-architect',
  'bmad-agent-dev',
  'bmad-agent-pm',
  'bmad-agent-qa',
  'bmad-sprint-planning'
];

test('Dynamic Router - Intent 1: Create or improve a PRD', () => {
  const utterances = [
    'Create a PRD for user notifications',
    'Write a PRD for the billing system',
    'Improve the PRD with dark mode requirements',
    'Draft product requirements document for search'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.PRD_SPECIFICATION, `Utterance "${text}" must resolve to PRD_SPECIFICATION`);
    assert.equal(res.selected_route, 'bmad-prd');
    assert.equal(res.is_authorized, true);
    assert.equal(res.action, 'DELEGATE_WORKFLOW');
  }
});

test('Dynamic Router - Intent 2: Refine an epic or an existing story', () => {
  const utterances = [
    'Refine epic 2 for user authentication',
    'Break down story 1.2 into implementation tasks',
    'Refine story 1.1 acceptance criteria',
    'Create epics and stories for checkout workflow'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.EPIC_STORY_PLANNING, `Utterance "${text}" must resolve to EPIC_STORY_PLANNING`);
    assert.equal(res.selected_route, 'bmad-create-epics-and-stories');
    assert.equal(res.is_authorized, true);
  }
});

test('Dynamic Router - Intent 3: Build story 1.1', () => {
  const utterances = [
    'Build story 1.1',
    'Implement task 1.1',
    'Code up story 1-1',
    '/brad 1.1',
    'Develop feature story 1.1'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.BUILD_WORK_UNIT, `Utterance "${text}" must resolve to BUILD_WORK_UNIT`);
    assert.equal(res.selected_route, 'bmad-build');
    assert.equal(res.is_authorized, true);
    assert.equal(res.is_resume, false);
  }
});

test('Dynamic Router - Intent 4: Continue an interrupted story', () => {
  const utterances = [
    'Continue interrupted story 1.1',
    'Resume work on story 1.1',
    '/brad resume 1.1',
    'Pick up where we left off on branch story-1.1'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.CONTINUE_WORK_UNIT, `Utterance "${text}" must resolve to CONTINUE_WORK_UNIT`);
    assert.equal(res.selected_route, 'bmad-build');
    assert.equal(res.is_resume, true);
    assert.equal(res.is_authorized, true);
  }
});

test('Dynamic Router - Intent 5: Review a pull request without changing code', () => {
  const utterances = [
    'Review pull request #12 without changing any code',
    'Audit PR 17 changes',
    'Run a code review on branch feature/auth',
    'Review PR 42 read-only'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.CODE_REVIEW_READONLY, `Utterance "${text}" must resolve to CODE_REVIEW_READONLY`);
    assert.equal(res.selected_route, 'bmad-code-review');
    assert.equal(res.requires_mutations, false, 'Review must be strictly read-only without mutations');
    assert.equal(res.is_authorized, true);
  }
});

test('Dynamic Router - Intent 6: Generate acceptance or E2E tests', () => {
  const utterances = [
    'Generate acceptance tests for the transfer workflow',
    'Write E2E tests for user login',
    'Create Playwright acceptance tests for checkout',
    'Author ATDD test suite for story 1.2'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.ACCEPTANCE_TEST_GENERATION, `Utterance "${text}" must resolve to ACCEPTANCE_TEST_GENERATION`);
    assert.equal(res.selected_route, /e2e/i.test(text) ? 'bmad-qa-generate-e2e-tests' : 'bmad-testarch-atdd');
    assert.equal(res.is_authorized, true);
  }
});

test('Dynamic Router - Intent 7: Audit test quality', () => {
  const utterances = [
    'Audit test quality of our payment module',
    'Review existing test coverage and assertion strength',
    'Critique our integration test suite',
    'Run test quality review'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.TEST_QUALITY_AUDIT, `Utterance "${text}" must resolve to TEST_QUALITY_AUDIT`);
    assert.equal(res.selected_route, 'bmad-testarch-test-review');
    assert.equal(res.is_authorized, true);
  }
});

test('Dynamic Router - Intent 8: Investigate an architectural concern', () => {
  const utterances = [
    'Investigate architectural concerns around multi-tenant database scaling',
    'Evaluate trade-offs between REST and GraphQL for our mobile API',
    'Design system architecture for async event processing'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.ARCHITECTURE_INVESTIGATION, `Utterance "${text}" must resolve to ARCHITECTURE_INVESTIGATION`);
    assert.equal(res.selected_route, 'bmad-architecture');
    assert.equal(res.is_authorized, true);
  }
});

test('Dynamic Router - Intent 9: Determine release readiness', () => {
  const utterances = [
    'Determine release readiness for v1.0',
    'Is release candidate 1.0 ready for deployment?',
    'Run release gate audit on main',
    'Verify release readiness and changelog'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.RELEASE_READINESS_AUDIT, `Utterance "${text}" must resolve to RELEASE_READINESS_AUDIT`);
    assert.equal(res.selected_route, 'bmad-testarch-nfr');
    assert.equal(res.release_verdict, 'UNVERIFIED');
    assert.equal(res.requires_mutations, false, 'Release readiness check must not deploy code');
  }
});

test('Dynamic Router - Intent 10: Unauthorized destructive request refuses with zero mutations', () => {
  const utterances = [
    'Delete all branches in production',
    'Force push to main and bypass CI',
    'Drop production database immediately',
    'Auto-merge to prod without review or CI checks'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.UNAUTHORIZED_DESTRUCTIVE_REQUEST);
    assert.equal(res.category, 'POLICY_REFUSAL');
    assert.equal(res.action, 'REFUSE');
    assert.equal(res.selected_route, 'REFUSAL_POLICY_DECISION');
    assert.equal(res.is_authorized, false);
    assert.equal(res.requires_mutations, false);
    assert.ok(res.refusal_reason.includes('BRAD Contract Rule 8'));
  }
});

test('Dynamic Router - Ambiguous request requires clarification', () => {
  const utterances = [
    'Do that thing with the system',
    'Update it',
    'Run the next one',
    'Fix something'
  ];

  for (const text of utterances) {
    const res = resolveRoute({ utterance: text, installedSkills: standardSkills });
    assert.equal(res.intent, INTENTS.AMBIGUOUS_REQUEST);
    assert.equal(res.category, 'CLARIFICATION_REQUIRED');
    assert.equal(res.action, 'CLARIFY');
    assert.equal(res.selected_route, 'CLARIFICATION_REQUIRED');
    assert.equal(res.requires_mutations, false);
    assert.ok(res.clarification_prompt);
  }
});

test('Dynamic Router - Missing specialist module reports SPECIALIST_UNAVAILABLE rather than substitute', () => {
  // Inventory missing bmad-ux
  const limitedSkills = standardSkills.filter(s => s !== 'bmad-ux');
  const res = resolveRoute({
    utterance: 'Design the UX user onboarding journey',
    installedSkills: limitedSkills
  });

  assert.equal(res.intent, INTENTS.UX_DESIGN);
  assert.equal(res.action, 'SPECIALIST_UNAVAILABLE');
  assert.equal(res.selected_route, 'SPECIALIST_UNAVAILABLE');
  assert.equal(res.missing_skill, 'bmad-ux');
  assert.notEqual(res.selected_route, 'bmad-build', 'Missing specialist must NEVER be substituted with unrelated build');
});

test('Dynamic Router - Real Project Root Discovery: Discovers skills on-disk from fixture and routes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'brad-router-test-'));
  try {
    const native = join(dir, '.agents', 'skills', 'bmad-prd');
    mkdirSync(native, { recursive: true });
    writeFileSync(join(native, 'SKILL.md'), '---\nname: bmad-prd\n---\n');

    const res = resolveRoute({
      utterance: 'Create a PRD for live metrics streaming',
      projectRoot: dir
    });

    assert.equal(res.intent, INTENTS.PRD_SPECIFICATION);
    assert.equal(res.selected_route, 'bmad-prd');
    assert.equal(res.is_authorized, true);
    assert.equal(res.action, 'DELEGATE_WORKFLOW');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
