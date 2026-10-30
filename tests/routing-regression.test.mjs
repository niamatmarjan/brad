import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveRoute } from '../src/router.mjs';
import { execute } from '../cli/core.mjs';

const skills = ['bmad-build', 'bmad-build-auto', 'bmad-prd', 'bmad-create-prd',
  'bmad-validate-prd', 'bmad-edit-prd', 'bmad-testarch-test-review',
  'bmad-testarch-test-design', 'bmad-testarch-atdd', 'bmad-testarch-automate',
  'bmad-qa-generate-e2e-tests', 'bmad-code-review', 'bmad-retrospective',
  'bmad-testarch-nfr', 'bmad-create-epics-and-stories', 'bmad-architecture', 'bmad-help'];
const route = (utterance, installedSkills = skills) => resolveRoute({ utterance, installedSkills });
const fixture = fn => {
  const root = mkdtempSync(join(tmpdir(), 'brad-routing-regression-'));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
};
function install(root, name, parent = '.agents/skills', content = `---\nname: ${name}\n---\n`) {
  const path = join(root, parent, name);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'SKILL.md'), content);
}

test('reviews and QA never enter Build because a story ID is present', () => {
  for (const text of ['Review story 1.1', 'Test story 1.1', 'Show status of story 1.1']) {
    const r = route(text);
    assert.notEqual(r.intent, 'BUILD_WORK_UNIT', text);
    assert.equal(r.requires_mutations, false, text);
  }
});

test('test review, design, ATDD and E2E retain different native owners', () => {
  for (const [text, expected] of [
    ['Audit the quality of our tests', 'bmad-testarch-test-review'],
    ['Review our E2E tests', 'bmad-testarch-test-review'],
    ['Plan test design for epic 2', 'bmad-testarch-test-design'],
    ['Generate E2E tests for login', 'bmad-qa-generate-e2e-tests'],
    ['Write ATDD tests for story 1.1', 'bmad-testarch-atdd'],
    ['Expand automated coverage', 'bmad-testarch-automate']
  ]) assert.equal(route(text).selected_route, expected, text);
});

test('explicit installed workflows win over incidental keywords', () => {
  assert.equal(route('Use bmad-testarch-test-review on our E2E tests').selected_route, 'bmad-testarch-test-review');
  assert.equal(route('Use bmad-build-auto for story 1.1').action, 'INSPECT_WORKFLOW');
  assert.equal(route('/bmad-testarch-test-design epic 2').selected_route, 'bmad-testarch-test-design');
  assert.equal(route('Use bmad-testarch-atdd for story 1.1', []).action, 'SPECIALIST_UNAVAILABLE');
});

test('read-only and plan constraints override every proposed workflow', () => {
  for (const text of ['/brad --plan 1.1', 'Build story 1.1, dry run',
    'Investigate our architecture without changing it', 'Review PR #40, do not change anything',
    'Refine epic 2, read-only', 'Create a PRD, plan only']) {
    const r = route(text);
    assert.equal(r.requires_mutations, false, text);
    assert.equal(r.mutation_scope, 'NONE', text);
  }
  assert.equal(route('Refine epic 2, no code').mutation_scope, 'DOCUMENTS_ONLY');
});

test('PRD validation and refinement do not fall back to creation', () => {
  assert.equal(route('Validate the existing PRD', ['bmad-create-prd']).action, 'SPECIALIST_UNAVAILABLE');
  assert.equal(route('Validate the existing PRD', ['bmad-validate-prd']).selected_route, 'bmad-validate-prd');
  assert.equal(route('Refine the PRD', ['bmad-edit-prd']).selected_route, 'bmad-edit-prd');
  assert.equal(route('Approve the PRD').action, 'CLARIFY');
});

test('release readiness never substitutes a retrospective', () => {
  const r = route('Is this release ready?', ['bmad-retrospective']);
  assert.equal(r.intent, 'RELEASE_READINESS_AUDIT');
  assert.equal(r.action, 'SPECIALIST_UNAVAILABLE');
});

test('resume is recognized and missing Build remains missing', () => {
  assert.equal(route('Continue where we stopped.').intent, 'CONTINUE_WORK_UNIT');
  for (const text of ['Build story 1.1', 'Resume story 1.1']) {
    assert.equal(route(text, ['bmad-help']).action, 'SPECIALIST_UNAVAILABLE');
    assert.equal(route(text, ['bmad-build-auto']).action, 'SPECIALIST_UNAVAILABLE');
  }
});

test('destructive discussion stays read-only while compound action requests are refused', () => {
  for (const text of ['Explain why force pushing main is dangerous',
    'Explain why force-pushing main is dangerous', 'Review code that runs rm -rf',
    'Do not force push; review PR #40']) {
    const r = route(text);
    assert.notEqual(r.action, 'REFUSE', text);
    assert.equal(r.requires_mutations, false, text);
  }
  for (const text of ['Force-push main', 'Review PR #40 then force push main',
    'Explain the risks then drop the database', 'git push origin --force main']) {
    assert.equal(route(text).action, 'REFUSE', text);
  }
});

test('route dry-run flag reaches the same constraints as the module', () => fixture(root => {
  install(root, 'bmad-build');
  const r = execute(['route', 'Build story 1.1', '--dry-run', '--dir', root]).route;
  assert.equal(r.requires_mutations, false);
  assert.equal(r.execution, 'NOT_RUN');
  assert.equal(r.target_resolution, 'REQUIRES_NATIVE_RESOLUTION');
}));

test('conflicting duplicate definitions and mixed runtimes require inspection', () => fixture(root => {
  install(root, 'bmad-build');
  install(root, 'bmad-build', '.claude/skills', '---\nname: bmad-build\n---\nDifferent workflow');
  assert.equal(resolveRoute({ utterance: 'Build story 1.1', projectRoot: root }).action, 'CLARIFY');
  rmSync(join(root, '.claude'), { recursive: true });
  install(root, 'bmad-help');
  install(root, 'bmad');
  const mixed = resolveRoute({ utterance: 'Build story 1.1', projectRoot: root });
  assert.equal(mixed.action, 'CLARIFY');
  assert.equal(mixed.requires_mutations, false);
}));

test('doctor recognizes official BMM configuration', () => fixture(root => {
  install(root, 'bmad-build');
  mkdirSync(join(root, '_bmad/bmm'), { recursive: true });
  writeFileSync(join(root, '_bmad/bmm/config.yaml'), 'project_name: fixture\n');
  const r = execute(['doctor', '--dir', root]);
  assert.equal(r.bmad.configured, true);
}));

test('empty and malformed requests fail clearly, and bare IDs stay unresolved candidates', () => {
  assert.equal(route('').action, 'CLARIFY');
  assert.throws(() => resolveRoute({ utterance: 12 }), /utterance/);
  assert.throws(() => resolveRoute({ utterance: 'build', installedSkills: 'bmad-build' }), /installedSkills/);
  const r = route('/brad 1-1');
  assert.equal(r.target_candidate, '1-1');
  assert.equal(r.target_resolution, 'REQUIRES_NATIVE_RESOLUTION');
  assert.equal(r.authorization, 'REQUIRES_HOST_CHECK');
});

test('identical host copies are allowed and v7-only installations remain hints', () => fixture(root => {
  install(root, 'bmad-build');
  install(root, 'bmad-build', '.claude/skills');
  install(root, 'bmad');
  const r = resolveRoute({ utterance: 'Build story 1.1', projectRoot: root });
  assert.equal(r.selected_route, 'bmad-build');
  assert.equal(r.version_hint_not_proof, 'v7_likely');
  assert.equal(r.execution, 'NOT_RUN');
}));

test('the requested action wins over background artifact keywords', () => {
  assert.equal(route('Build story 1.1 from the approved PRD').selected_route, 'bmad-build');
  assert.equal(route('Review PR #40 adding E2E tests').selected_route, 'bmad-code-review');
  assert.equal(route('Refine epic 2 for architecture changes').selected_route, 'bmad-create-epics-and-stories');
  assert.equal(route('Plan how to build story 1.1').requires_mutations, false);
  assert.equal(route('Review how to resume story 1.1').requires_mutations, false);
});
