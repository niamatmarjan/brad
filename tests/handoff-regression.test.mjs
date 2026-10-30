import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import * as h from '../src/handoff.mjs';

const fixture = fn => {
  const root = mkdtempSync(join(tmpdir(), 'brad-state-regression-'));
  const clean = () => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  try {
    const result = fn(root);
    if (result?.then) return result.finally(clean);
    clean();
    return result;
  } catch (error) { clean(); throw error; }
};
const initial = () => h.createTaskState({ taskId: 'STORY-1.1' });
const submitted = () => h.developerSubmitDeliverable(initial(), { files: [{ path: 'a', content: '' }, { path: 'b', content: 'b' }] });

test('resumption preserves each exact gate, including repeated interruptions', () => {
  const qa = submitted();
  const review = h.qaAcceptDeliverable(qa);
  const remediation = h.reviewerAssess(review, { status: 'REMEDIATION_REQUIRED' });
  const corrected = h.developerApplyCorrection(remediation, { files: [{ path: 'a', content: 'fixed' }], clearReviewBlockers: true });
  for (const state of [initial(), qa, review, remediation, corrected, h.qaAcceptDeliverable(corrected)]) {
    const resumed = h.resumeTask(h.interruptTask(h.interruptTask(state)));
    assert.equal(resumed.stage, state.stage);
    assert.equal(resumed.currentRole, state.currentRole);
  }
  assert.throws(() => h.resumeTask(review), /interrupted/i);
  assert.throws(() => h.interruptTask(h.reviewerAssess(review, { status: 'APPROVED' })), /terminal|accepted/i);
});

test('interrupted roles cannot bypass their suspended gate', () => {
  assert.throws(() => h.qaAcceptDeliverable(h.interruptTask(submitted())), /stage|interrupted/i);
  assert.throws(() => h.developerSubmitDeliverable(h.interruptTask(initial()), { files: [{ path: 'a', content: 'a' }] }), /stage|interrupted/i);
});

test('empty file digests and correction manifests remain accurate', () => {
  const qa = submitted();
  assert.equal(qa.deliverables[0].sha256, createHash('sha256').update('').digest('hex'));
  const defect = h.qaIdentifyDefect(qa, { defectId: 'D1' });
  const correction = h.developerApplyCorrection(defect, { resolvedDefectIds: ['D1'], files: [{ path: 'a', content: 'fixed' }] });
  assert.deepEqual(correction.deliverables.map(d => d.path), ['a', 'b']);
  assert.throws(() => h.developerSubmitDeliverable(initial(), { files: [{ path: '../escape', content: 'x' }] }), /path/i);
});

test('unresolved blockers and unknown defect IDs cannot disappear at acceptance', () => {
  const qa = submitted();
  assert.throws(() => h.qaAcceptDeliverable({ ...qa, blockers: ['Needs security approval'] }), /blocker/i);
  const d1 = h.qaIdentifyDefect(qa, { defectId: 'D1' });
  assert.throws(() => h.developerApplyCorrection(d1, { resolvedDefectIds: ['unknown'] }), /defect/i);
});

test('corrupt and mismatched saved states never mean fresh work', () => fixture(root => {
  const path = h.saveTaskState(initial(), root);
  writeFileSync(path, '{');
  assert.throws(() => h.guardDuplicateRequest('STORY-1.1', root), /state|JSON/i);
  writeFileSync(path, JSON.stringify({ taskId: 'other' }));
  assert.throws(() => h.loadTaskState('STORY-1.1', root), /state|task/i);
}));

test('stale writers fail without replacing a newer checkpoint', () => fixture(root => {
  const s = initial();
  h.saveTaskState(s, root);
  const a = h.loadTaskState(s.taskId, root);
  const b = h.loadTaskState(s.taskId, root);
  h.saveTaskState(h.interruptTask(a), root);
  assert.throws(() => h.saveTaskState(b, root), /stale|changed|revision/i);
  assert.equal(h.loadTaskState(s.taskId, root).stage, 'INTERRUPTED');
}));

test('state writes refuse symlink parents and normalized ID collisions', () => fixture(root => {
  const external = join(root, 'outside');
  mkdirSync(external);
  symlinkSync(external, join(root, '.brad'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => h.saveTaskState(initial(), root), /symlink/i);
  assert.deepEqual(readdirSync(external), []);
  rmSync(join(root, '.brad'));
  h.saveTaskState(initial(), root);
  assert.throws(() => h.saveTaskState(h.createTaskState({ taskId: 'story-1.1' }), root), /identity|mismatch|collision/i);
}));

test('an existing branch or interrupted task requires explicit continuation', () => fixture(root => {
  assert.equal(h.guardDuplicateRequest('STORY-1.1', root, { branches: ['feat/story-1.1'] }).canProceed, false);
  assert.equal(h.guardDuplicateRequest('STORY-1.1', root, { branches: ['origin/feat/story-1.1'] }).canProceed, false);
  h.saveTaskState(h.interruptTask(initial()), root);
  assert.equal(h.guardDuplicateRequest('STORY-1.1', root).canProceed, false);
  assert.equal(h.guardDuplicateRequest('STORY-1.1', root, { allowActiveContinuation: true }).canProceed, true);
}));

test('new handoff state does not assert workflow execution', () => {
  assert.equal(initial().executionMode, 'NOT_VERIFIED');
});

test('two processes loading one revision cannot overwrite each other', { timeout: 10000 }, () => fixture(async root => {
  h.saveTaskState(initial(), root);
  const script = `import * as h from ${JSON.stringify(new URL('../src/handoff.mjs', import.meta.url).href)};
    const root = process.argv[1];
    const state = h.loadTaskState('STORY-1.1', root);
    process.on('message', () => {
      try { h.saveTaskState(h.interruptTask(state), root); process.send('saved'); }
      catch (error) { process.send(error.code === 'EEXIST' || /Stale state revision/.test(error.message) ? 'rejected' : 'unexpected error'); }
      process.disconnect();
    });
    process.send('ready');`;
  const workers = [];
  try {
    const ready = [0, 1].map(() => new Promise((resolveReady, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', script, root], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      workers.push(child);
      child.once('error', reject);
      child.once('message', message => message === 'ready' ? resolveReady(child) : reject(new Error(String(message))));
    }));
    await Promise.all(ready);
    const outcomes = workers.map(child => new Promise(resolveOutcome => child.once('message', resolveOutcome)));
    for (const child of workers) child.send('save');
    assert.deepEqual((await Promise.all(outcomes)).sort(), ['rejected', 'saved']);
    const state = h.loadTaskState('STORY-1.1', root);
    assert.equal(state.revision, 2);
    assert.equal(state.stage, 'INTERRUPTED');
  } finally { for (const child of workers) child.kill(); }
}));

test('a failed staged write or held lock preserves the old checkpoint', () => fixture(root => {
  const state = initial();
  const path = h.saveTaskState(state, root);
  assert.throws(() => h.saveTaskState({ ...state, unsupportedValue: 1n }, root), /BigInt/i);
  assert.equal(h.loadTaskState(state.taskId, root).revision, 1);
  writeFileSync(`${path}.lock`, 'held by another writer');
  assert.throws(() => h.saveTaskState(h.interruptTask(state), root), /EEXIST/);
  assert.equal(h.loadTaskState(state.taskId, root).stage, 'INITIALIZED');
}));

test('portable IDs, malformed arrays and legacy checkpoints are handled explicitly', () => fixture(root => {
  for (const taskId of ['../a', 'a/b', 'CON', 'com1.log', 'story.']) assert.throws(() => h.createTaskState({ taskId }), /taskId/);
  const state = initial();
  const path = h.saveTaskState(state, root);
  writeFileSync(path, JSON.stringify({ ...state, revision: undefined, blockers: null }));
  assert.throws(() => h.loadTaskState(state.taskId, root), /blockers/);
  const interrupted = h.interruptTask(submitted());
  delete interrupted.interruptedStage;
  delete interrupted.revision;
  writeFileSync(path, JSON.stringify(interrupted));
  assert.equal(h.resumeTask(h.loadTaskState(state.taskId, root)).stage, 'QA_PENDING');
}));

test('resolving one defect keeps other defects and their blockers intact', () => {
  let state = h.qaIdentifyDefect(submitted(), { defectId: 'D10' });
  state = h.developerSubmitDeliverable(state, { files: [{ path: 'a', content: 'changed' }] });
  state = h.qaIdentifyDefect(state, { defectId: 'D1' });
  state = h.developerApplyCorrection(state, { resolvedDefectIds: ['D1'] });
  assert.equal(state.defects.find(d => d.defectId === 'D10').status, 'OPEN');
  assert.equal(state.blockers.length, 1);
  assert.match(state.blockers[0], /^Defect D10:/);
  assert.throws(() => h.qaAcceptDeliverable(state), /open defects/);
});
