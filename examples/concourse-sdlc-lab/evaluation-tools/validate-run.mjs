import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(labRoot, '..', '..');
const runId = process.argv[2] ?? 'brad-v0.4.1-8ecc17ba';
const runRoot = resolve(labRoot, 'evaluations/brad-v0.4.1', runId);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const manifest = await readJson(join(runRoot, 'manifest.json'));
const evidenceIndex = await readJson(join(runRoot, 'evidence/evidence-index.json'));
const results = await readJson(join(runRoot, 'evaluation/scenario-results.json'));
const metrics = await readJson(join(runRoot, 'analytics/metrics.json'));
const input = await readJson(join(runRoot, 'run-input.json'));
assert.deepEqual(await readJson(join(runRoot, 'evaluation/evidence-index.json')), evidenceIndex, 'Evidence index copies disagree');
assert.deepEqual(await readJson(join(runRoot, 'evaluation/experiment-manifest.json')), manifest, 'Manifest copies disagree');

assert.equal(manifest.runId, runId);
assert.equal(results.runId, runId);
assert.equal(metrics.runId, runId);
assert.equal(manifest.baselineVersion, '0.4.1');
assert.equal(manifest.bradBaseline.commit, 'dcad5e7d9d463c562f6cd94ea0ac5f6231ce23c8');
assert.match(manifest.bradBaseline.packageSha256, /^[A-F0-9]{64}$/);
assert.equal(results.cases.length, 85);
assert.equal(new Set(results.cases.map(item => item.id)).size, 85);
assert.equal(results.sourceCatalogSha256, sha256(await readFile(resolve(labRoot, 'evaluation/canonical-cases.json'))));
assert.equal(manifest.application.sourceTreeSha256, input.application.sourceTreeSha256);
const excludedDirs = new Set(['node_modules', 'dist', '.test-data', 'test-results', 'playwright-report', 'coverage']);
async function listSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const path = join(directory, entry.name);
    files.push(...(entry.isDirectory() ? await listSourceFiles(path) : [path]));
  }
  return files;
}
const sourceRoot = resolve(labRoot, 'server-backed');
const sourceFiles = (await listSourceFiles(sourceRoot)).sort((a, b) => {
  const left = relative(sourceRoot, a).replaceAll(sep, '/');
  const right = relative(sourceRoot, b).replaceAll(sep, '/');
  return left < right ? -1 : left > right ? 1 : 0;
});
const sourceHash = createHash('sha256');
for (const path of sourceFiles) {
  const relativePath = relative(sourceRoot, path).replaceAll(sep, '/');
  const content = await readFile(path);
  const length = Buffer.alloc(4);
  length.writeInt32LE(content.length);
  sourceHash.update(Buffer.from(`${relativePath}\0`, 'utf8')).update(length).update(content);
}
assert.equal(sourceFiles.length, manifest.application.sourceFileCount);
assert.equal(sourceHash.digest('hex').toUpperCase(), manifest.application.publicationSourceTreeSha256 ?? manifest.application.sourceTreeSha256, 'Published application source fingerprint changed');

const evidence = new Map();
for (const record of evidenceIndex.records) {
  assert.ok(record.id && !evidence.has(record.id), `Duplicate or missing evidence ID: ${record.id}`);
  assert.ok(['PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED', 'NOT_RUN'].includes(record.status), `Invalid evidence status: ${record.id}`);
  evidence.set(record.id, record);
  for (const path of record.repoPaths ?? []) {
    assert.ok(!path.startsWith('/') && !path.includes('..'), `Evidence path must be repo-relative: ${path}`);
    const target = resolve(repoRoot, path);
    assert.ok(target.startsWith(`${repoRoot}${sep}`), `Evidence path escapes repository: ${path}`);
    assert.ok((await stat(target)).isFile(), `Evidence artifact missing: ${path}`);
  }
  for (const [path, expected] of Object.entries(record.hashes ?? {})) {
    assert.equal(sha256(await readFile(resolve(repoRoot, path))), expected, `Artifact hash mismatch: ${path}`);
  }
}

for (const item of results.cases) {
  assert.ok(item.id && item.expectedRoute, `Incomplete scenario ${item.id}`);
  for (const level of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    const result = item.levels[level];
    assert.ok(result && ['PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED', 'NOT_RUN'].includes(result.status), `${item.id} has invalid ${level}`);
    if (result.status === 'PASS' || result.status === 'FAIL' || result.status === 'PARTIAL' || result.status === 'BLOCKED') {
      assert.ok(result.evidenceId && evidence.has(result.evidenceId), `${item.id} ${level} lacks valid evidence`);
    }
  }
}
const acceptance = await readJson(join(runRoot, 'evaluation/acceptance-results.json'));
assert.deepEqual(acceptance.records, input.acceptance, 'Acceptance records differ from captured input');
assert.deepEqual((await readJson(join(runRoot, 'analytics/findings-summary.json'))).findings, input.findings, 'Findings differ from captured input');
assert.deepEqual(await readJson(join(runRoot, 'analytics/collaboration-analytics.json')), input.collaboration, 'Collaboration analytics differ from captured input');
assert.deepEqual(metrics.applicationSuites, input.validation.filter(item => item.id.startsWith('APP-') || item.id === 'LEGACY-APP')
  .map(({ id, status, passed, failed, total, testGroups }) => ({ id, status, passed, failed, ...(total === undefined ? {} : { total }), ...(testGroups ? { testGroups } : {}) })), 'Application metrics differ from captured suite results');
for (const item of acceptance.records) {
  assert.ok(['PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED', 'NOT_RUN'].includes(item.status), `Invalid acceptance status: ${item.id}`);
  if (item.status === 'PASS' || item.status === 'FAIL' || item.status === 'PARTIAL' || item.status === 'BLOCKED') {
    assert.ok(item.evidenceIds?.length, `${item.id} missing evidence IDs`);
    for (const id of item.evidenceIds) assert.ok(evidence.has(id), `${item.id} references missing evidence ${id}`);
  }
}

const expectedStatusCounts = values => Object.fromEntries(['PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED', 'NOT_RUN']
  .map(status => [status, values.filter(item => item.status === status).length]));
for (const level of ['L1', 'L2', 'L3', 'L4', 'L5']) {
  const counts = expectedStatusCounts(results.cases.map(item => item.levels[level]));
  assert.deepEqual(metrics.routing.levels[level].counts, counts, `Metric mismatch for ${level}`);
  const executed = counts.PASS + counts.FAIL + counts.PARTIAL;
  assert.equal(metrics.routing.levels[level].executed, executed, `Executed denominator mismatch for ${level}`);
  assert.equal(metrics.routing.levels[level].passRate, executed ? counts.PASS / executed : null, `Pass rate mismatch for ${level}`);
}
assert.equal(metrics.routing.caseCount, 85);
assert.equal(metrics.nativeWorkflowExecutions, 0);
assert.equal(metrics.directBmadMatchedTasks, 0);

const eventPath = join(runRoot, 'telemetry/events.jsonl');
const events = (await readFile(eventPath, 'utf8')).trim().split(/\r?\n/).map(line => JSON.parse(line));
const eventIds = new Set();
for (const event of events) {
  assert.equal(event.runId, runId);
  assert.ok(event.eventId && !eventIds.has(event.eventId), `Duplicate or missing event ID ${event.eventId}`);
  eventIds.add(event.eventId);
  assert.ok(Number.isFinite(Date.parse(event.timestamp)), `Invalid timestamp in ${event.eventId}`);
  assert.ok(['occurred_at', 'captured_at'].includes(event.timestampMeaning));
  assert.ok(['PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED', 'NOT_RUN', 'INFO'].includes(event.status));
  for (const id of event.evidenceIds) assert.ok(evidence.has(id), `${event.eventId} references missing evidence ${id}`);
}

const reports = [resolve(labRoot, 'report/MASTER_REPORT.html'), join(runRoot, 'MASTER_REPORT.html')];
for (const reportPath of reports) {
  const html = await readFile(reportPath, 'utf8');
  assert.ok(html.includes('BRAD v0.4.1 IMPLEMENTATION EVALUATION'));
  assert.ok(html.includes(runId));
  assert.ok(html.includes('BRAD v0.4.1 — Concourse SDLC Implementation &amp; Evaluation'));
  assert.ok(!/<script[^>]+src=|<link[^>]+href=["']https?:/i.test(html), `Report loads a remote resource: ${reportPath}`);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const link = match[1];
    if (link.startsWith('#')) assert.ok(ids.has(link.slice(1)), `Broken report anchor: ${link}`);
    else if (!/^(?:https?:|mailto:|data:)/i.test(link)) {
      const target = resolve(dirname(reportPath), decodeURIComponent(link.split('#')[0].split('?')[0]));
      assert.ok((await stat(target)).isFile(), `Broken report link: ${link} in ${reportPath}`);
    }
  }
}

const scanFiles = async dir => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await scanFiles(path));
    else if (['.json', '.jsonl', '.csv', '.md', '.html'].includes(extname(path))) files.push(path);
  }
  return files;
};
const secretPatterns = [/gh[pousr]_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /AKIA[0-9A-Z]{16}/, /xox[baprs]-[A-Za-z0-9-]{20,}/];
for (const path of await scanFiles(runRoot)) {
  const text = await readFile(path, 'utf8');
  for (const pattern of secretPatterns) assert.ok(!pattern.test(text), `Possible secret pattern in ${path}`);
}

const csvRows = (await readFile(join(runRoot, 'evaluation/scenario-results.csv'), 'utf8')).trim().split(/\r?\n/);
assert.equal(csvRows.length - 1, 85, 'Scenario CSV does not contain 85 records');
console.log(`Validation PASS: ${runId}; 85 scenarios; ${evidence.size} evidence records; ${events.length} events; ${reports.length} reports.`);
