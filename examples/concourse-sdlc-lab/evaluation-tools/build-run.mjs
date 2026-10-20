import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(labRoot, '..', '..');
const inputPath = resolve(labRoot, 'evaluations/brad-v0.4.1/brad-v0.4.1-8ecc17ba/run-input.json');
const input = JSON.parse(await readFile(inputPath, 'utf8'));
const runRoot = resolve(labRoot, 'evaluations/brad-v0.4.1', input.runId);
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = value => createHash('sha256').update(value).digest('hex').toUpperCase();
const now = new Date().toISOString();
const sourceRoot = resolve(labRoot, 'server-backed');
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
const sourceFiles = (await listSourceFiles(sourceRoot)).sort((a, b) => {
  const left = relative(sourceRoot, a).replaceAll(sep, '/');
  const right = relative(sourceRoot, b).replaceAll(sep, '/');
  return left < right ? -1 : left > right ? 1 : 0;
});
const appHash = createHash('sha256');
for (const path of sourceFiles) {
  const relativePath = relative(sourceRoot, path).replaceAll(sep, '/');
  const content = await readFile(path);
  const length = Buffer.alloc(4);
  length.writeInt32LE(content.length);
  appHash.update(Buffer.from(`${relativePath}\0`, 'utf8')).update(length).update(content);
}
const sourceTreeSha256 = appHash.digest('hex').toUpperCase();
const expectedSourceHash = input.application.publicationSourceTreeSha256 ?? input.application.sourceTreeSha256;
if (sourceFiles.length !== input.application.sourceFileCount || sourceTreeSha256 !== expectedSourceHash) {
  throw new Error(`Application fingerprint mismatch. Expected ${input.application.sourceFileCount}/${input.application.sourceTreeSha256}; observed ${sourceFiles.length}/${sourceTreeSha256}.`);
}
const evidence = [
  { id: 'E-BASELINE', status: 'PASS', summary: 'v0.4.1 tag and commit verified; local npm tarball SHA-256 recorded; packaged inputs match the tag.', repoPaths: ['examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-SNAPSHOT', status: 'PASS', summary: 'Pre-edit snapshot of 180 files was copied to private session storage and SHA-256-verified; intentionally not published.', repoPaths: [] },
  { id: 'E-BRAD-NODE', status: 'FAIL', summary: 'v0.4.1 Node suite reproduced 27/29 on Windows Node 24.19.0/npm 12.0.2.', repoPaths: ['tests/cli.test.mjs', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-BRAD-PYTHON', status: 'PASS', summary: 'BRAD Python suite: 21/21.', repoPaths: ['examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-BRAD-PACK', status: 'PASS', summary: 'npm pack dry-run succeeded with 33 entries; observed npm 12.0.2 name-keyed JSON output.', repoPaths: ['package.json', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-BRAD-REPO', status: 'PASS', summary: 'Repository consistency audit passed.', repoPaths: ['tools/check_repository.py', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-BRAD-RELEASE', status: 'PASS', summary: 'Local deterministic release ZIP generation passed; no publication.', repoPaths: ['tools/build_release.py', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-APP-SERVER', status: 'PASS', summary: 'Server typecheck and 27 tests passed.', repoPaths: ['examples/concourse-sdlc-lab/server-backed/server/spec/api.spec.ts', 'examples/concourse-sdlc-lab/server-backed/server/spec/domain.spec.ts', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-APP-WEB', status: 'PASS', summary: 'Web lint/build, 15 unit tests, and 40 quality tests passed.', repoPaths: ['examples/concourse-sdlc-lab/server-backed/web/package.json', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-APP-DELIVERY', status: 'PASS', summary: 'Three real HTTP/SQLite integration tests passed.', repoPaths: ['examples/concourse-sdlc-lab/server-backed/web/tests/delivery.integration.test.mjs', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-APP-PLAYWRIGHT', status: 'PASS', summary: 'Twenty-seven Playwright tests passed across desktop, tablet and mobile.', repoPaths: ['examples/concourse-sdlc-lab/server-backed/web/tests/browser/workspace.spec.ts', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-LEGACY-APP', status: 'PASS', summary: 'The retained browser-local prototype domain tests passed 5/5; separate from the current server-backed app.', repoPaths: ['examples/concourse-sdlc-lab/app/tests/domain.test.mjs', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-ACCEPTANCE-GAPS', status: 'BLOCKED', summary: 'AC-02 has no approved role/action matrix; AC-04 has no owner-approved missing-criteria oracle and conflicting contract wording.', repoPaths: ['examples/concourse-sdlc-lab/server-backed/docs/qa/ACCEPTANCE.md', 'examples/concourse-sdlc-lab/server-backed/docs/api/CONTRACT.md', 'examples/concourse-sdlc-lab/reports/current/CLOSURE_MATRIX.md'] },
  { id: 'E-AC04-PROBE', status: 'PASS', summary: 'Ephemeral in-memory HTTP probe observed both empty and omitted acceptance criteria returning 201 and persisting [] in Draft; observation is not acceptance.', repoPaths: ['examples/concourse-sdlc-lab/server-backed/server/src/delivery.ts', 'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-INDEPENDENT-REVIEW', status: 'PARTIAL', summary: 'Separate read-only review found the AC-04 API-contract/matrix wording conflict; reviewer did not execute the endpoint or edit files.', contextAlias: input.independentReview.contextAlias, repoPaths: ['examples/concourse-sdlc-lab/reports/current/CLOSURE_MATRIX.md'] },
  { id: 'E-NATIVE-TEA', status: 'BLOCKED', summary: 'Native TEA loader reported workflow not found; cached instructions were not host-discovered; no artifact was produced.', repoPaths: ['examples/concourse-sdlc-lab/reports/current/EXECUTION.md'] },
  { id: 'E-BRAD-CANDIDATE', status: 'PARTIAL', summary: 'Separate candidate worktree on its own branch reports two test-harness fixes and passing candidate suites; no changes are merged or published.', contextAlias: input.candidate.contextAlias, branch: input.candidate.branch, repoPaths: [] },
  { id: 'E-ROUTING-CATALOG', status: 'PASS', summary: 'The 85-case snapshot exactly matches the canonical BRAD routing catalog by SHA-256 and unique ID set; static catalog validation only.', repoPaths: ['examples/concourse-sdlc-lab/evaluation/canonical-cases.json', 'skills/brad/evals/routing-cases.json'] },
  { id: 'E-APP-SCREENSHOTS', status: 'PASS', summary: 'Existing live-journey screenshots and recorded SHA-256 values were re-verified; no new screenshot was captured in this session.', repoPaths: input.screenshots.map(item => item.path), hashes: Object.fromEntries(input.screenshots.map(item => [item.path, item.sha256])) },
  {
    id: 'E-REPORT-VALIDATION',
    status: 'PASS',
    summary: 'Generated and browser-inspected the offline reports; final validator confirms report links, anchors, source evidence, and run records.',
    repoPaths: [
      'examples/concourse-sdlc-lab/evaluation-tools/build-run.mjs',
      'examples/concourse-sdlc-lab/evaluation-tools/validate-run.mjs',
      'examples/concourse-sdlc-lab/report/MASTER_REPORT.html',
      'examples/concourse-sdlc-lab/evaluations/brad-v0.4.1/brad-v0.4.1-8ecc17ba/MASTER_REPORT.html',
      'examples/concourse-sdlc-lab/reports/current/EXECUTION.md'
    ]
  }
];

const canonicalPath = resolve(labRoot, 'evaluation/canonical-cases.json');
const officialPath = resolve(repoRoot, 'skills/brad/evals/routing-cases.json');
const canonicalBytes = await readFile(canonicalPath);
const officialBytes = await readFile(officialPath);
if (!canonicalBytes.equals(officialBytes)) throw new Error('Canonical routing snapshot differs from BRAD source catalog.');
const catalog = JSON.parse(canonicalBytes.toString('utf8'));
if (catalog.cases.length !== 85 || new Set(catalog.cases.map(item => item.id)).size !== 85) {
  throw new Error(`Expected exactly 85 unique canonical cases; found ${catalog.cases.length}.`);
}
for (const item of catalog.cases) {
  if (!item.id || !item.user_request || !item.expected_route || !item.fixture) {
    throw new Error(`Incomplete canonical case: ${item.id ?? '(no id)'}`);
  }
}

const cases = catalog.cases.map(item => ({
  id: item.id,
  fixture: item.fixture,
  userRequest: item.user_request,
  expectedRoute: item.expected_route,
  selectedRoute: null,
  nativeInvocationVerified: false,
  outcome: null,
  levels: Object.fromEntries(['L1', 'L2', 'L3', 'L4', 'L5'].map(level => [level, {
    status: level === 'L1' ? 'PASS' : 'NOT_RUN',
    evidenceId: level === 'L1' ? 'E-ROUTING-CATALOG' : null,
    note: level === 'L1'
      ? 'Catalog fields, unique IDs, and source snapshot hash validated; no behavioral claim.'
      : level === 'L4'
        ? 'No per-case native workflow invocation was verified; a separate TEA probe was blocked by host discovery.'
        : 'No per-case model-in-the-loop observation was recorded.'
  }]))
}));
const scenarioResults = {
  schemaVersion: 1,
  runId: input.runId,
  sourceCatalogSha256: sha256(canonicalBytes),
  total: cases.length,
  cases
};
const countStatuses = items => Object.fromEntries(
  ['PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED', 'NOT_RUN'].map(status =>
    [status, items.filter(item => item.status === status).length])
);
const levels = Object.fromEntries(['L1', 'L2', 'L3', 'L4', 'L5'].map(level => {
  const values = cases.map(item => item.levels[level]);
  const counts = countStatuses(values);
  const executed = counts.PASS + counts.FAIL + counts.PARTIAL;
  return [level, { total: values.length, counts, executed, passRate: executed ? counts.PASS / executed : null }];
}));
const metrics = {
  schemaVersion: 1,
  runId: input.runId,
  routing: { caseCount: cases.length, levels },
  applicationSuites: input.validation.filter(item => item.id.startsWith('APP-') || item.id === 'LEGACY-APP')
    .map(({ id, status, passed, failed, total, testGroups }) => ({ id, status, passed, failed, total, ...(testGroups ? { testGroups } : {}) })),
  bradBaselineNode: { passed: 27, failed: 2, total: 29, passRate: 27 / 29, status: 'FAIL' },
  acceptance: countStatuses(input.acceptance),
  stakeholderContexts: input.collaboration.independentStakeholderContexts,
  directBmadMatchedTasks: input.collaboration.directBmadMatchedTasks,
  nativeWorkflowExecutions: 0,
  tokenUsage: null,
  cost: null
};
const evidenceIndex = { schemaVersion: 1, runId: input.runId, records: evidence };
const eventEntries = [
  { eventId: 'evt-0001', timestamp: input.startedAt, timestampMeaning: 'occurred_at', occurredAt: input.startedAt, eventType: 'stakeholder-request', status: 'INFO', summary: 'User requested continuation of the BRAD v0.4.1 Concourse evaluation under the attached contract.', evidenceIds: ['E-BASELINE'] },
  { eventId: 'evt-0002', eventType: 'snapshot-verified', status: 'PASS', summary: 'SHA-256 comparison verified the private pre-edit snapshot of 180 existing lab files.', evidenceIds: ['E-SNAPSHOT'] },
  { eventId: 'evt-0003', eventType: 'demo-branch-created', status: 'PASS', summary: 'Created isolated demo branch demo/concourse-v050-evaluation at the existing HEAD; no commit or push.', evidenceIds: ['E-BASELINE'] },
  { eventId: 'evt-0004', eventType: 'test-run', status: 'FAIL', summary: 'BRAD npm test completed with 27/29; two Windows/npm pack test failures reproduced.', evidenceIds: ['E-BRAD-NODE'], durationMs: 8453 },
  { eventId: 'evt-0005', eventType: 'test-run', status: 'PASS', summary: 'BRAD Python tests completed 21/21.', evidenceIds: ['E-BRAD-PYTHON'], durationMs: 6955 },
  { eventId: 'evt-0006', eventType: 'package-check', status: 'PASS', summary: 'npm pack dry-run produced 33 package entries using npm 12.0.2 name-keyed JSON output.', evidenceIds: ['E-BRAD-PACK'] },
  { eventId: 'evt-0007', eventType: 'release-check', status: 'PASS', summary: 'Repository audit and local deterministic release ZIP generation passed; no publication.', evidenceIds: ['E-BRAD-REPO', 'E-BRAD-RELEASE'] },
  { eventId: 'evt-0008', eventType: 'test-run', status: 'PASS', summary: 'Concourse server typecheck and 27 server tests passed.', evidenceIds: ['E-APP-SERVER'], durationMs: 1539 },
  { eventId: 'evt-0009', eventType: 'test-run', status: 'PASS', summary: 'Web lint/build, 15 unit tests, 40 quality tests, 3 delivery tests, and 27 Playwright tests passed.', evidenceIds: ['E-APP-WEB', 'E-APP-DELIVERY', 'E-APP-PLAYWRIGHT'] },
  { eventId: 'evt-0010', eventType: 'acceptance-observation', status: 'PARTIAL', summary: 'Ephemeral API probe observed 201 and empty persisted criteria for both empty-array and omitted-field create requests; no pass/fail oracle was applied.', evidenceIds: ['E-AC04-PROBE', 'E-ACCEPTANCE-GAPS'] },
  { eventId: 'evt-0011', eventType: 'native-invocation-attempt', status: 'BLOCKED', summary: 'Native TEA loader reported workflow unavailable; no workflow execution or artifact.', evidenceIds: ['E-NATIVE-TEA'] },
  { eventId: 'evt-0012', eventType: 'independent-review', status: 'PARTIAL', summary: 'Separate read-only review found AC-04 wording conflict; no edits or endpoint execution by reviewer.', evidenceIds: ['E-INDEPENDENT-REVIEW'] },
  { eventId: 'evt-0013', eventType: 'candidate-regression-check', status: 'PARTIAL', summary: 'Separate BRAD candidate worktree confirmed two test-only changes and reported passing test matrix; no merge/push.', evidenceIds: ['E-BRAD-CANDIDATE'] }
].map(event => ({
  runId: input.runId,
  timestamp: event.timestamp ?? now,
  timestampMeaning: event.timestampMeaning ?? 'captured_at',
  occurredAt: event.occurredAt ?? null,
  ...event,
  runId: input.runId,
  tokenUsage: null
}));
const manifest = {
  schemaVersion: 1,
  runId: input.runId,
  status: 'PARTIAL',
  startedAt: input.startedAt,
  completedAt: now,
  project: 'BRAD',
  baselineVersion: '0.4.1',
  evaluationType: 'SDLC implementation and evaluation',
  demoApplication: 'Concourse',
  targetFutureMilestone: '0.5.0',
  longTermObjective: 'Production-ready BRAD v1.0',
  verdict: 'Application verified / BRAD orchestration partially validated.',
  bradBaseline: input.bradBaseline,
  environment: input.environment,
  application: input.application,
  git: { repository: 'niamatmarjan/brad', branch: 'demo/concourse-v050-evaluation', head: '57fad81b340f11430900568e8cc8500678b7004a', changesCommitted: false, scope: 'Historical evaluation capture before publication; not current Git state.' },
  executionBoundary: {
    nativeBmadVerified: false,
    nativeBmadBlocker: 'TEA skill not registered in the current host inventory; no workflow artifact produced.',
    independentStakeholderCount: 0,
    developerWorktrees: 0,
    independentQaReviewContexts: 1,
    remotePrCi: 'NOT_RUN',
    modelId: 'UNAVAILABLE',
    tokenUsage: 'UNAVAILABLE',
    aiCost: 'UNAVAILABLE'
  },
  finalizedFrom: 'run-input.json'
};

const ensureDir = path => mkdir(path, { recursive: true });
await ensureDir(runRoot);
for (const name of ['telemetry', 'evidence', 'evaluation', 'analytics', 'reports', 'benchmarks']) await ensureDir(join(runRoot, name));
await writeFile(join(runRoot, 'manifest.json'), json(manifest));
await writeFile(join(runRoot, 'evaluation/experiment-manifest.json'), json(manifest));
const telemetryPath = join(runRoot, 'telemetry/events.jsonl');
try {
  await readFile(telemetryPath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await writeFile(telemetryPath, `${eventEntries.map(event => JSON.stringify(event)).join('\n')}\n`);
}
await writeFile(join(runRoot, 'evidence/evidence-index.json'), json(evidenceIndex));
await writeFile(join(runRoot, 'evaluation/scenario-results.json'), json(scenarioResults));
await writeFile(join(runRoot, 'evaluation/acceptance-results.json'), json({ schemaVersion: 1, runId: input.runId, records: input.acceptance }));
await writeFile(join(runRoot, 'evaluation/observations.jsonl'), `${cases.map(item => JSON.stringify({ runId: input.runId, scenarioId: item.id, status: 'NOT_RUN', levels: item.levels, evidenceId: 'E-ROUTING-CATALOG' })).join('\n')}\n`);
const csv = [
  'id,fixture,user_request,expected_route,selected_route,L1,L2,L3,L4,L5,native_invocation_verified,outcome,evidence',
  ...cases.map(item => [
    item.id, item.fixture, item.userRequest, item.expectedRoute, item.selectedRoute,
    ...['L1', 'L2', 'L3', 'L4', 'L5'].map(level => item.levels[level].status),
    item.nativeInvocationVerified, item.outcome, item.levels.L1.evidenceId
  ].map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
].join('\n');
await writeFile(join(runRoot, 'evaluation/scenario-results.csv'), `${csv}\n`);
await writeFile(join(runRoot, 'evaluation/evidence-index.json'), json(evidenceIndex));
await writeFile(join(runRoot, 'evaluation/handoff-results.json'), json({
  schemaVersion: 1, runId: input.runId, status: 'NOT_RUN',
  requiredTransfers: ['PM→BA', 'BA→Architect', 'Architect→Tech Lead', 'Tech Lead→Developers', 'Developer→QA', 'QA→Developer', 'QA→PM', 'PM→Delivery Manager', 'Tech Lead→Release'],
  observedTransfers: [], independentStakeholderContexts: 0,
  notes: ['Seeded app personas and login accounts are test fixtures, not independent stakeholders.']
}));
await writeFile(join(runRoot, 'evaluation/defect-regressions.json'), json({
  schemaVersion: 1, runId: input.runId,
  cases: [
    { id: 'REG-WIN-SYMLINK', initialState: 'Windows without elevated symlink privilege', input: 'Run root npm test', expected: 'Safety test reaches BRAD symlink rejection behavior', observedFailure: 'symlinkSync(..., dir) raises EPERM before BRAD runs', controlledFixture: 'Separate candidate branch reports real junction fixture', assertions: ['linked target rejected', 'linked parent rejected', 'external sentinel unchanged'], evidenceIds: ['E-BRAD-NODE', 'E-BRAD-CANDIDATE'], fixedStatus: 'PASS_IN_SEPARATE_CANDIDATE_NOT_MERGED' },
    { id: 'REG-NPM-PACK-SHAPE', initialState: 'npm 12.0.2 pack JSON object keyed by package name', input: 'npm test', expected: 'Package file list validated from JSON result', observedFailure: 'Test indexes object as array and reads undefined.files', controlledFixture: 'Array and keyed-object parser fixtures in candidate report', assertions: ['array fixture accepted', 'object fixture accepted', 'invalid output fails', 'nonzero npm exit remains failure'], evidenceIds: ['E-BRAD-NODE', 'E-BRAD-CANDIDATE'], fixedStatus: 'PASS_IN_SEPARATE_CANDIDATE_NOT_MERGED' }
  ]
}));
await writeFile(join(runRoot, 'analytics/metrics.json'), json(metrics));
await writeFile(join(runRoot, 'analytics/routing-analytics.json'), json({ runId: input.runId, caseCount: cases.length, levels }));
const stakeholderRoles = ['Product Manager', 'Business Analyst', 'Delivery Manager', 'Solution Architect', 'Technical Lead', 'Backend Developer', 'Frontend Developer', 'Full-Stack Developer', 'Functional QA', 'Automation QA'];
const stakeholderAnalytics = {
  runId: input.runId,
  roles: stakeholderRoles.map(role => ({ role, actualBradRequests: 0, independentContext: false, nativeWorkflowExecutions: 0, completedTasks: 0, status: 'NOT_RUN' }))
};
await writeFile(join(runRoot, 'analytics/stakeholder-analytics.json'), json(stakeholderAnalytics));
await writeFile(join(runRoot, 'analytics/workflow-analytics.json'), json({
  runId: input.runId, verifiedNativeWorkflows: [], blockedAttempts: [{ workflow: input.nativeProbe.workflow, status: 'BLOCKED', reason: input.nativeProbe.reason, evidenceId: 'E-NATIVE-TEA' }]
}));
await writeFile(join(runRoot, 'analytics/collaboration-analytics.json'), json(input.collaboration));
await writeFile(join(runRoot, 'analytics/qa-analytics.json'), json({
  runId: input.runId,
  appTestTotals: { server: 27, webUnit: 15, webQuality: 40, delivery: 3, playwright: 27, legacyDomain: 5 },
  independentReadOnlyReviews: 1,
  reviewFindings: ['AC-04 API contract and acceptance matrix wording conflict'],
  nativeTea: 'BLOCKED',
  manualAssistiveTechnology: 'NOT_RUN'
}));
const observedSuiteDurationsMs = Object.fromEntries(input.validation.flatMap(item => [
  ...(item.durationMs !== undefined && item.durationMs !== null ? [[item.id, item.durationMs]] : []),
  ...Object.entries(item.observedDurationsMs ?? {}).map(([name, duration]) => [`${item.id}.${name}`, duration])
]));
await writeFile(join(runRoot, 'analytics/performance-analytics.json'), json({
  runId: input.runId,
  observedSuiteDurationsMs,
  aiWorkflowDurationMs: null, modelRequests: null, inputTokens: null, outputTokens: null, cost: null,
  limitations: 'The host did not expose model/request/token/cost telemetry; duration for several shell commands was not recorded.'
}));
await writeFile(join(runRoot, 'analytics/benchmark-results.json'), json({
  runId: input.runId, status: 'NOT_RUN', matchedTaskCount: 0, directBmadRuns: 0, bradRuns: 0, comparableDeliverables: 0, results: []
}));
await writeFile(join(runRoot, 'analytics/reliability-analytics.json'), json({
  runId: input.runId, rootBradNode: { status: 'FAIL', passed: 27, failed: 2, total: 29 },
  candidateBradNode: input.candidate.nodeTests, candidateIntegration: 'NOT_MERGED',
  nativeWorkflowRecovery: 'NOT_RUN', interruptedTaskResumption: 'NOT_RUN', remotePrRecovery: 'NOT_RUN'
}));
await writeFile(join(runRoot, 'analytics/findings-summary.json'), json({ runId: input.runId, findings: input.findings }));
await writeFile(join(runRoot, 'analytics/metric-definitions.json'), json({
  runId: input.runId,
  definitions: [
    { id: 'routing.Ln', formula: 'Count of scenarios at level Ln by status; denominator is 85 only for coverage counts. Pass rate uses PASS+FAIL+PARTIAL executed cases; BLOCKED, UNSUPPORTED, and NOT_RUN are excluded and displayed separately.', evidence: 'evaluation/scenario-results.json' },
    { id: 'suite.passRate', formula: 'passed / (passed + failed) for that named suite only; never pooled across unlike suites.', evidence: 'run-input.json validation[]' },
    { id: 'stakeholder.requests', formula: 'Count of observed role-specific BRAD requests; not seeded app logins or fictional personas.', evidence: 'analytics/stakeholder-analytics.json' }
  ]
}));
const suiteCsv = ['suite,status,passed,failed,total,command', ...input.validation.map(row =>
  [row.id, row.status, row.passed, row.failed, row.total, row.command ?? (row.commands ?? []).join('; ')]
    .map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
await writeFile(join(runRoot, 'analytics/metrics.csv'), `${suiteCsv}\n`);
await writeFile(join(runRoot, 'analytics/benchmark-results.csv'), 'task,direct_bmad,brad,comparable_deliverable,status\n');
await writeFile(join(runRoot, 'benchmarks/README.md'), '# Benchmarks\n\nNo matched direct-BMAD/BRAD experiment was run. Sample size is 0; no efficiency or quality comparison is reported.\n');

const chapters = [
  ['01', 'Executive summary', 'The Concourse server-backed application passed its current automated suite. BRAD/BMAD orchestration remains partially validated: native TEA could not be invoked, 85 route scenarios were not behaviorally executed, stakeholder collaboration and matched comparisons were not run, and AC-02/AC-04 remain blocked.'],
  ['02', 'Application demonstration', 'The demo provides SQLite-backed projects and stories, role-gated HTTP actions, version conflict handling, review/QA evidence, defect retests, audit history and release readiness. See the verified screenshots and setup instructions.'],
  ['03', 'Full SDLC execution', 'The current evidence covers implementation validation and a previously recorded live delivery journey. It does not establish a complete independent PM→BA→Architect→developer→QA→release chain through BRAD.'],
  ['04', 'Stakeholder performance', 'Ten roles are defined; no role-specific independent BRAD requests or native workflow outcomes were measured. Seeded demo accounts are fixtures, not stakeholders.'],
  ['05', 'BRAD routing evaluation', 'All 85 canonical catalog records passed static metadata/hash checks. L2, L3, L4 and L5 remain NOT_RUN for all 85; no behavioral accuracy percentage is reported.'],
  ['06', 'Native BMAD invocation', 'No native BMM, Architect, Build, code-review or TEA workflow was verified in this current host. The TEA probe was blocked because the host loader did not discover the workflow.'],
  ['07', 'Developer collaboration', 'Three independent Concourse developers and two QA stakeholders did not execute. A separate installer-test candidate worktree and one read-only review context are recorded separately and are not counted as the requested collaboration study.'],
  ['08', 'QA and TEA evaluation', 'The app passed 27 server, 15 web unit, 40 quality, 3 delivery integration and 27 browser tests. A separate reviewer found a specification conflict. Native TEA and manual assistive-technology review remain unrun.'],
  ['09', 'Ticket lifecycle analytics', 'The documented app journey exercised role-separated local delivery and defect retesting; no BRAD ticket-to-PR lifecycle or remote delivery is claimed.'],
  ['10', 'Reliability and recovery', 'BRAD v0.4.1 Node tests reproduced two test-harness failures. Candidate-only tests reportedly pass after portability/parser changes. Task interruption/resumption and duplicate-PR experiments were not run.'],
  ['11', 'Installer and host compatibility', 'Observed baseline is Windows 11, Node 24.19.0, npm 12.0.2. The package dry-run and repository/release checks pass; cross-version and other-host compatibility were not tested.'],
  ['12', 'BRAD versus direct BMAD', 'No matched tasks were run; sample size is zero. There is no measured speedup, quality delta, or cost comparison.'],
  ['13', 'Performance analytics', 'Only test-runner durations available in tool output are included. Model requests, tokens, cost, and complete workflow timing were unavailable and are left null.'],
  ['14', 'Failure analysis', 'The register separates confirmed test-harness defects, acceptance specification gaps, and host capability blockers. No host blocker is attributed to BRAD without evidence.'],
  ['15', 'BRAD v0.5.0 changes', 'Prioritize npm pack output normalization and Windows link-test portability as candidate test-harness improvements; separately improve host capability reporting only after a reproducible BRAD runtime issue is established.'],
  ['16', 'Production readiness', 'Not ready for a supervised team pilot or production. Application verification is local and the key orchestration, collaboration, authorization-oracle, and remote-delivery gates remain incomplete.'],
  ['17', 'Roadmap to v1.0', 'Repeat the evaluation on an authorized brownfield project, complete host-native invocation and independent collaboration experiments, and set quantitative gates before measuring outcomes.'],
  ['18', 'Reproducibility and evidence appendix', 'The versioned run contains the manifest, tests, 85-case results, event ledger, analytics, findings, hashes, machine-readable data, and validator. No PR, CI, publication, merge, or deployment occurred.']
];

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const imageData = Object.fromEntries(await Promise.all(input.screenshots.map(async item => {
  const bytes = await readFile(resolve(repoRoot, item.path));
  if (sha256(bytes) !== item.sha256) throw new Error(`Screenshot hash mismatch: ${item.path}`);
  return [item.path, `data:image/png;base64,${bytes.toString('base64')}`];
})));
const statusCounts = ['PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED', 'NOT_RUN'];
const caseRows = cases.map(item => `<tr data-status="${esc(item.levels.L3.status)}"><td>${esc(item.id)}</td><td>${esc(item.fixture)}</td><td>${esc(item.expectedRoute)}</td>${['L1','L2','L3','L4','L5'].map(level => `<td>${esc(item.levels[level].status)}</td>`).join('')}<td>${esc(item.selectedRoute ?? '—')}</td></tr>`).join('');
const acceptanceRows = input.acceptance.map(row => `<tr><td>${esc(row.id)}</td><td>${esc(row.status)}</td><td>${esc(row.source)}</td><td>${row.evidenceIds.map(id => `<a href="#evidence-${esc(id)}"><code>${esc(id)}</code></a>`).join(', ')}</td></tr>`).join('');
const evidenceRowsWithAnchors = evidence.map(item => `<tr id="evidence-${esc(item.id)}"><td><code>${esc(item.id)}</code></td><td>${esc(item.status)}</td><td>${esc(item.summary)}</td></tr>`).join('');
const stakeholderRows = stakeholderAnalytics.roles.map(row => `<tr><td>${esc(row.role)}</td><td>${row.actualBradRequests}</td><td>${row.independentContext ? 'Yes' : 'No'}</td><td>${row.nativeWorkflowExecutions}</td><td>${row.completedTasks}</td><td>${esc(row.status)}</td></tr>`).join('');
const findingRows = input.findings.map(item => `<tr><td><code>${esc(item.id)}</code></td><td>${esc(item.severity)} · ${esc(item.status)}</td><td>${esc(item.component)}</td><td><strong>Expected:</strong> ${esc(item.expected)}<br><strong>Observed:</strong> ${esc(item.actual)}</td><td><strong>Root cause:</strong> ${esc(item.rootCause)}<br><strong>Impact:</strong> ${esc(item.impact)}</td><td>${Math.round(item.confidence * 100)}%</td><td>${item.evidenceIds.map(id => `<a href="#evidence-${esc(id)}"><code>${esc(id)}</code></a>`).join(', ')}</td></tr>`).join('');
const reportValidation = input.validation.flatMap(row => row.testGroups
  ? Object.entries(row.testGroups).map(([name, passed]) => ({
    ...row, id: `${row.id}.${name}`, passed, failed: 0, total: passed,
    observedDurationsMs: undefined,
    durationMs: row.observedDurationsMs?.[`${name}Tests`],
    commands: undefined,
    command: name === 'unit' ? 'npm test' : 'npm run test:quality',
  }))
  : [row]);
const validationRows = reportValidation.map(row => {
  const durations = row.observedDurationsMs
    ? Object.entries(row.observedDurationsMs).map(([name, duration]) => `${name}: ${duration} ms`).join('; ')
    : row.durationMs !== undefined && row.durationMs !== null ? `${row.durationMs} ms` : row.durationText ?? 'Not recorded';
  const total = row.total ?? (row.passed !== undefined && row.failed !== undefined ? row.passed + row.failed : '—');
  return `<tr><td>${esc(row.id)}</td><td>${esc(row.status)}</td><td>${row.passed ?? '—'} / ${total} (${row.failed ?? 0} failed)</td><td>${esc(durations)}</td><td>${row.evidenceIds.map(id => `<a href="#evidence-${esc(id)}"><code>${esc(id)}</code></a>`).join(', ')}</td><td><code>${esc(row.cwd)}</code><br>${esc((row.commands ?? [row.command]).filter(Boolean).join('; '))}</td></tr>`;
}).join('');
const collaborationRows = [
  ['Independent stakeholder contexts', input.collaboration.independentStakeholderContexts, `${input.collaboration.rolesSpecified} roles defined`],
  ['Independent implementation worktrees', input.collaboration.independentImplementationWorktrees, String(input.collaboration.developerWorktreesRequested)],
  ['Independent QA review contexts (not stakeholder study)', input.collaboration.independentQaReviewContexts, `${input.collaboration.qaStakeholdersRequested} QA stakeholders requested`],
  ['Verified real handoffs', input.collaboration.realHandoffs, '9 transfer types requested'],
  ['Remote pull requests / CI runs', `${input.collaboration.remotePullRequests} / ${input.collaboration.ciRuns}`, 'No remote delivery performed'],
  ['Direct-BMAD matched tasks', input.collaboration.directBmadMatchedTasks, 'No matched comparison']
].map(([label, actual, reference]) => `<tr><td>${esc(label)}</td><td>${esc(actual)}</td><td>${esc(reference)}</td></tr>`).join('');
const suiteBars = reportValidation.filter(row => Number.isFinite(row.passed) && Number.isFinite(row.total) && row.total > 0).map(row => {
  const passWidth = Math.round(row.passed / row.total * 100);
  const failWidth = 100 - passWidth;
  return `<div class="metric"><strong>${esc(row.id)}</strong><div class="bar"><i style="width:${passWidth}%"></i><b style="width:${failWidth}%"></b></div><span>${row.passed}/${row.total} pass · ${row.failed ?? 0} fail</span></div>`;
}).join('');
const chart = Object.entries(levels).map(([level, data]) => {
  const pass = data.counts.PASS;
  const notRun = data.counts.NOT_RUN;
  const blocked = data.counts.BLOCKED;
  return `<div class="metric"><strong>${level}</strong><div class="bar"><i style="width:${Math.round(pass / data.total * 100)}%"></i></div><span>${pass} PASS / ${blocked} BLOCKED / ${notRun} NOT_RUN of ${data.total}</span></div>`;
}).join('');
const chaptersHtml = chapters.map(([number, title, summary]) => `<section id="chapter-${number}"><h2>${number} — ${esc(title)}</h2><p>${esc(summary)}</p></section>`).join('');
const embedded = JSON.stringify({ runId: input.runId, levels, cases }).replaceAll('<', '\\u003c');
const reportHtml = (prefix, runPrefix) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>BRAD v0.4.1 — Concourse SDLC Implementation &amp; Evaluation</title>
<style>
:root{font:16px/1.55 "Segoe UI",Arial,sans-serif;color:#1d2b33;background:#f3f4ef;--ink:#183038;--mint:#28725d;--line:#dbe2dc;--muted:#586b68}
*{box-sizing:border-box}body{margin:0}main{max-width:1200px;margin:auto;padding:28px clamp(16px,4vw,58px) 64px}header{padding:32px;background:var(--ink);color:#f5f6f2}header small{color:#9fd0b6;font-weight:700;letter-spacing:.15em}h1{max-width:900px;font:clamp(30px,5vw,52px)/1.1 Georgia,serif;margin:.45em 0}header p{max-width:850px;color:#c4d3cd}.verdict{padding:16px 20px;background:#fff4e7;border:1px solid #dfc49c;margin:18px 0}.verdict strong{color:#8a4a27}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.card,section{background:#fff;border:1px solid var(--line);padding:16px;margin:12px 0}.card strong{display:block;font:28px Georgia,serif}.muted{color:var(--muted);font-size:.9rem}.metric{display:grid;grid-template-columns:125px minmax(80px,1fr) minmax(190px,auto);align-items:center;gap:10px;margin:10px 0;font-size:.85rem}.bar{height:10px;background:#e9eeea}.bar i{display:block;height:100%;background:var(--mint);float:left}.bar b{display:block;height:100%;background:#bd684e;float:left}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #e6ebe6;font-size:.78rem;vertical-align:top}th{background:#eef2ee;position:sticky;top:0}.wrap{overflow:auto;border:1px solid var(--line)}.wrap table{min-width:680px}#case-table{min-width:900px}#findings table{min-width:1280px}#findings th:nth-child(1),#findings td:nth-child(1){min-width:170px;white-space:nowrap}#findings th:nth-child(2),#findings td:nth-child(2){min-width:150px;white-space:nowrap}#findings th:nth-child(3),#findings td:nth-child(3){min-width:170px}#findings th:nth-child(4),#findings td:nth-child(4){min-width:300px}#findings th:nth-child(5),#findings td:nth-child(5){min-width:320px}#findings th:nth-child(6),#findings td:nth-child(6){min-width:100px}#findings th:nth-child(7),#findings td:nth-child(7){min-width:160px}#stakeholders table{min-width:850px}input,select{padding:8px;border:1px solid #aab9b1;margin:8px 8px 8px 0}a{color:#1b6653}img{max-width:100%;height:auto;border:1px solid var(--line)}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.foot{font-size:.8rem;color:var(--muted)}@media(max-width:650px){main{padding:12px}header{padding:22px 18px}.metric{grid-template-columns:100px 1fr}.metric span{grid-column:2}th,td{font-size:.72rem}}
</style></head><body><main>
<header><small>BRAD v0.4.1 IMPLEMENTATION EVALUATION · ${esc(input.runId)}</small><h1>BRAD v0.4.1 — Concourse SDLC Implementation &amp; Evaluation</h1><p>Baseline v0.4.1 · Evaluation type: SDLC implementation and evaluation · Demo: Concourse · Host: GitHub Copilot CLI · Model: Auto (concrete model unavailable) · Future milestone: v0.5.0 · Long-term objective: production-ready v1.0.</p></header>
<div class="verdict"><strong>APPLICATION VERIFIED / BRAD ORCHESTRATION PARTIALLY VALIDATED</strong><br>Local application suites pass. AC-02 and AC-04 remain blocked; native BMAD workflow execution, independent stakeholder collaboration, behavioral routing and remote PR/CI remain unverified.</div>
<div class="grid"><div class="card"><span class="muted">Application suites</span><strong>27 + 15 + 40 + 3 + 27</strong><span class="muted">Server / web / quality / delivery / Playwright; separate denominators.</span></div><div class="card"><span class="muted">BRAD baseline Node</span><strong>27/29</strong><span class="muted">Two test-harness failures reproduced on Windows.</span></div><div class="card"><span class="muted">Native workflows verified</span><strong>0</strong><span class="muted">TEA attempt blocked by host discovery.</span></div><div class="card"><span class="muted">Routing cases</span><strong>85</strong><span class="muted">Static metadata only; no behavioral route success claimed.</span></div></div>
<section><h2>Routing levels — exact denominator</h2><p class="muted">Pass rate is omitted where no behavioral case executed. L1 is catalog validation only; it is not model-in-the-loop routing.</p>${chart}</section>
<section><h2>Automated suite outcomes</h2><p class="muted">Each denominator belongs to that named suite; these are not pooled rates. Green is passing tests and red is failing tests.</p>${suiteBars}<div class="wrap"><table><thead><tr><th>Suite</th><th>Status</th><th>Tests</th><th>Observed duration</th><th>Evidence</th><th>Scope and command</th></tr></thead><tbody>${validationRows}</tbody></table></div></section>
<section><h2>Evidence-backed application screenshots</h2><div class="gallery"><figure><img src="${imageData[input.screenshots[0].path]}" alt="Concourse demo release-readiness screen"><figcaption>Server-reported demo readiness; not release approval.</figcaption></figure><figure><img src="${imageData[input.screenshots[1].path]}" alt="Concourse audit history"><figcaption>Persisted QA and audit activity.</figcaption></figure><figure><img src="${imageData[input.screenshots[2].path]}" alt="Full Concourse release view"><figcaption>Full-page local demo capture.</figcaption></figure></div></section>
${chaptersHtml}
<section id="stakeholders"><h2>Stakeholder participation matrix</h2><p class="muted">Ten defined roles are listed; no independent BRAD stakeholder request, native workflow execution, or completed BRAD task was observed. Seeded application accounts are test fixtures, not participants.</p><div class="wrap"><table><thead><tr><th>Role</th><th>Observed BRAD requests</th><th>Independent context</th><th>Native workflow executions</th><th>Completed BRAD tasks</th><th>Status</th></tr></thead><tbody>${stakeholderRows}</tbody></table></div></section>
<section id="collaboration"><h2>Developer collaboration and delivery</h2><p class="muted">This run did not execute the requested multi-developer/two-QA collaboration experiment. The installer candidate worktree is a separately reported test-harness effort and is not counted as a BRAD implementation collaboration result.</p><div class="wrap"><table><thead><tr><th>Measure</th><th>Observed</th><th>Requested/reference</th></tr></thead><tbody>${collaborationRows}</tbody></table></div><p>Candidate-only branch: <code>${esc(input.candidate.branch)}</code>; it remains separate, uncommitted, and unintegrated. No remote PR or CI result is claimed.</p></section>
<section id="qa"><h2>QA lifecycle and release comparison</h2><p>The app's local delivery journey recorded a failed QA run, a blocking defect, a failed retest, a fix, a passing retest, a fresh passing QA run, and acceptance. This is application behavior evidence, not evidence of a BRAD-orchestrated ticket-to-PR lifecycle. Evidence: <a href="#evidence-E-APP-SCREENSHOTS"><code>E-APP-SCREENSHOTS</code></a> and <a href="#evidence-E-APP-DELIVERY"><code>E-APP-DELIVERY</code></a>.</p><p>Direct-BMAD matched tasks: <strong>0</strong>. BRAD/direct-BMAD benchmark: <strong>NOT RUN</strong>. No speed, quality, cost, or throughput delta is calculated.</p></section>
<section id="findings"><h2>Findings and root-cause register</h2><p class="muted">P1/P2 values are project finding priorities, not security vulnerability severities. Host capability and acceptance-specification blockers are not attributed to a BRAD runtime defect without evidence.</p><div class="wrap"><table><thead><tr><th>Finding</th><th>Priority / status</th><th>Component</th><th>Expected / observed</th><th>Root cause / impact</th><th>Confidence</th><th>Evidence</th></tr></thead><tbody>${findingRows}</tbody></table></div><p><a href="${esc(runPrefix)}analytics/findings-summary.json">Machine-readable findings register</a></p></section>
<section id="readiness"><h2>BRAD v1.0 readiness gates</h2><p><strong>Proposal only:</strong> the quantitative thresholds are future evaluation criteria, not results or current product claims. Freeze them with owners before the next evaluation.</p><p>None of the proposed gates is considered satisfied by this Concourse run; see <a href="${esc(prefix + 'reports/V1_READINESS_GATES.md')}">proposed gate definitions</a>. Overall readiness remains incomplete.</p></section>
<section id="acceptance"><h2>Acceptance results</h2><div class="wrap"><table><thead><tr><th>Criterion</th><th>Status</th><th>Evidence source</th><th>Evidence IDs</th></tr></thead><tbody>${acceptanceRows}</tbody></table></div><p><a href="${esc(prefix + 'reports/current/CLOSURE_MATRIX.md')}">Detailed closure matrix</a></p></section>
<section id="cases"><h2>All 85 canonical scenarios</h2><p class="muted">L1 passed static catalog validation. L2–L5 were not run per case. Search filters only displayed rows.</p><label>Search <input id="case-search" type="search" placeholder="ID, fixture or expected route"></label><label>Level status <select id="status-filter"><option value="">All</option>${statusCounts.map(x => `<option>${x}</option>`).join('')}</select></label><div class="wrap"><table id="case-table"><thead><tr><th>ID</th><th>Fixture</th><th>Expected route</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th><th>L5</th><th>Observed route</th></tr></thead><tbody>${caseRows}</tbody></table></div></section>
<section><h2>Evidence index</h2><div class="wrap"><table><thead><tr><th>ID</th><th>Status</th><th>Observation</th></tr></thead><tbody>${evidenceRowsWithAnchors}</tbody></table></div><p><a href="${esc(runPrefix)}evidence/evidence-index.json">Machine-readable evidence index</a> · <a href="${esc(runPrefix)}manifest.json">Run manifest</a> · <a href="${esc(runPrefix)}analytics/metrics.json">Metrics JSON</a> · <a href="${esc(runPrefix)}README.md">Run package guide</a></p></section>
<section><h2>Reproducibility</h2><p>BRAD baseline tag <code>v0.4.1</code>, commit <code>dcad5e7d9d463c562f6cd94ea0ac5f6231ce23c8</code>; local package SHA-256 <code>28A5871DB43E11B00BD1E9B784AC217A1801536BF66EC00D127EF0C25C4912AB</code>. The app source was uncommitted; its fingerprint and algorithm are in the manifest. Exact commands and observed results are in <a href="${esc(prefix + 'reports/current/EXECUTION.md')}">the execution record</a>. No remote PR/CI, publication, merge or deployment occurred.</p><p>Performance/model cost/token values are null when the host did not expose them. No statistic implies unsupported coverage.</p></section>
<p class="foot">Self-contained offline HTML; no remote script, stylesheet, chart library, font or API is loaded. Source run: ${esc(input.runId)}.</p>
<script type="application/json" id="report-data">${embedded}</script>
<script>(()=>{const q=document.querySelector('#case-search'),s=document.querySelector('#status-filter'),rows=[...document.querySelectorAll('#case-table tbody tr')];function update(){const text=q.value.toLowerCase(),status=s.value;for(const row of rows){const visible=row.innerText.toLowerCase().includes(text)&&(!status||row.innerText.includes(status));row.hidden=!visible}}q.addEventListener('input',update);s.addEventListener('change',update)})();</script>
</main></body></html>`;

const reportTargets = [
  { path: resolve(labRoot, 'report/MASTER_REPORT.html'), prefix: '../', runPrefix: '../evaluations/brad-v0.4.1/' + input.runId + '/' },
  { path: join(runRoot, 'MASTER_REPORT.html'), prefix: '../../../', runPrefix: '' }
];
for (const target of reportTargets) {
  await ensureDir(dirname(target.path));
  await writeFile(target.path, reportHtml(target.prefix, target.runPrefix));
}

const reportFiles = [
  ['00-executive-summary.md', 'Executive summary', chapters[0][2]],
  ['01-installation-and-onboarding.md', 'Installation and onboarding', 'BRAD v0.4.1 Node: 27/29 on Windows; the two failures are isolated as test portability/output-shape issues. Python, pack, repository and release checks passed. Native skill execution is not established.'],
  ['02-native-bmad-routing.md', 'Native BMAD routing', '85/85 cases passed static catalog validation. Model-in-the-loop routing and native invocation were not run; the TEA probe was blocked by host discovery.'],
  ['03-stakeholder-sdlc-performance.md', 'Stakeholder SDLC performance', 'Ten roles are specified, but no independent role sessions or measured role-specific BRAD requests ran.'],
  ['04-developer-collaboration.md', 'Developer collaboration', 'Three independent Concourse developers, two QA stakeholders and real cross-role handoffs were not executed. A separate BRAD test candidate branch is not counted as Concourse collaboration.'],
  ['05-tea-and-qa.md', 'TEA and QA', 'Application automated tests passed in separate suites. Native TEA did not execute; AC-02 and AC-04 remain blocked by missing/conflicting acceptance oracles.'],
  ['06-ticket-to-pr-delivery.md', 'Ticket to PR delivery', 'No BRAD ticket-to-PR or remote PR/CI run was performed. The documented local app flow is not a remote delivery result.'],
  ['07-failure-and-recovery.md', 'Failure and recovery', 'The root v0.4.1 Node suite failed 27/29 from Windows symlink test setup and npm pack JSON shape assumptions. Candidate-only tests report 32/32. Session interruption/recovery remains untested.'],
  ['08-performance-and-efficiency.md', 'Performance and efficiency', 'Test-runner durations are available for some suites. Model request count, token usage, cost and workflow duration are unavailable; no efficiency comparison is claimed.'],
  ['09-direct-bmad-comparison.md', 'Direct BMAD comparison', 'Not run. Matched sample size is zero and no comparative metric is available.'],
  ['10-root-cause-analysis.md', 'Root cause analysis', 'The two BRAD Node failures are test-harness defects exposed by Windows and npm 12 output. AC-02/04 are specification gaps. TEA discovery is a host/workspace blocker, not an established BRAD runtime defect.'],
  ['11-v050-improvement-backlog.md', 'v0.5.0 improvement backlog', 'See `BRAD_V0.5.0_ENGINEERING_HANDOFF.md` for reproducible candidate tasks, regression tests and acceptance criteria.'],
  ['12-production-readiness.md', 'Production readiness', 'Application verified locally; orchestration partially validated. Do not recommend a team pilot or production release while critical native, collaboration, RBAC-oracle, accessibility and delivery gates are unverified.'],
  ['13-next-validation-plan.md', 'Next validation plan', 'See `NEXT_DEMO_PLAN.md`; use a brownfield project, matched direct-BMAD control and independent worktrees after owner authorization.']
];
for (const [name, title, body] of reportFiles) {
  await writeFile(join(runRoot, 'reports', name), `# ${title}\n\n**Run:** ${input.runId}\n\n**Status:** PARTIAL\n\n${body}\n\nEvidence: [run manifest](../manifest.json), [evidence index](../evidence/evidence-index.json), [metrics](../analytics/metrics.json), [master report](../MASTER_REPORT.html).\n`);
}
await copyFile(resolve(labRoot, 'reports/BRAD_V0.5.0_ENGINEERING_HANDOFF.md'), join(runRoot, 'reports/BRAD_V0.5.0_ENGINEERING_HANDOFF.md'));
await copyFile(resolve(labRoot, 'reports/NEXT_DEMO_PLAN.md'), join(runRoot, 'reports/NEXT_DEMO_PLAN.md'));
await writeFile(join(runRoot, 'README.md'), `# Evaluation run ${input.runId}\n\nBRAD ${input.bradBaseline.version} baseline evaluation of the Concourse demo. Status is **PARTIAL**; this package records successful, failed, blocked, unsupported and unrun work without turning missing measurements into passes.\n\n- \`manifest.json\`: baseline identity, host, toolchain, run status and app fingerprint.\n- \`run-input.json\`: captured inputs, exact commands, current observations and findings used by the generator.\n- \`telemetry/events.jsonl\`: append-only event observations; missing operation timestamps/durations remain null.\n- \`evidence/evidence-index.json\`: evidence IDs, outcomes, repo paths and hashes.\n- \`evaluation/\`: 85 L1-L5 results, acceptance results, per-case observations, handoffs and regression specifications.\n- \`analytics/\`: metrics, definitions, CSV, stakeholder, routing, workflow, collaboration, QA, performance, benchmark, reliability and finding outputs.\n- \`reports/\`: 14 AI-readable summaries, engineering handoff and next demo plan.\n- \`MASTER_REPORT.html\`: self-contained offline report.\n- \`benchmarks/\`: direct-BMAD comparison status; no matched run was performed.\n\nProduce outputs with \`node evaluation-tools/build-run.mjs\`; validate with \`node evaluation-tools/validate-run.mjs\`. Results are generated from this run input and the canonical scenario file. Safe to share: the run contains fictional demo content and sanitized paths; the private recovery snapshot remains outside the repository. Review screenshots and all content before external publication.\n`);
await ensureDir(resolve(labRoot, 'evaluations/comparison'));
await writeFile(resolve(labRoot, 'evaluations/comparison/VERSION_HISTORY.json'), json({
  schemaVersion: 1,
  entries: [{ version: '0.4.1', runId: input.runId, status: 'PARTIAL', baselineCommit: input.bradBaseline.commit, evidence: `brad-v0.4.1/${input.runId}/manifest.json`, nextMilestone: '0.5.0' }]
}));

console.log(`Built ${input.runId}: ${cases.length} scenarios; L1 catalog metadata pass only; report status PARTIAL.`);
