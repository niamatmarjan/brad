import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const labRoot = resolve(scriptDir, '..');
const evalDir = resolve(labRoot, 'evaluation');
const reportDir = resolve(labRoot, 'report');
const reportsDir = resolve(labRoot, 'reports');
const telemetryDir = resolve(labRoot, 'telemetry');
const canonicalSnapshot = resolve(evalDir, 'canonical-cases.json');
const upstreamCases = resolve(scriptDir, '../../../skills/brad/evals/routing-cases.json');

await mkdir(evalDir, { recursive: true });
await mkdir(reportDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });
await mkdir(telemetryDir, { recursive: true });

let canonicalRaw;
try {
  canonicalRaw = await readFile(canonicalSnapshot, 'utf8');
} catch {
  canonicalRaw = await readFile(upstreamCases, 'utf8');
  await writeFile(canonicalSnapshot, canonicalRaw);
}
const canonical = JSON.parse(canonicalRaw);
if (!Array.isArray(canonical.cases)) throw new Error('Canonical routing file must contain a cases array.');
const ids = canonical.cases.map(item => item.id);
if (ids.length !== 85) throw new Error(`Expected 85 canonical cases; found ${ids.length}.`);
if (new Set(ids).size !== ids.length) throw new Error('Canonical routing file has duplicate case IDs.');
for (const item of canonical.cases) {
  if (!item.id || !item.user_request || !item.expected_route || !item.fixture) {
    throw new Error(`Incomplete canonical case metadata: ${item.id || '(missing id)'}`);
  }
}

const cases = canonical.cases.map(item => ({
  ...item,
  selected_route: null,
  native_invocation_verified: false,
  outcome: null,
  levels: {
    L1: { status: 'PASS', evidence_id: 'E-ROUTING-85', note: 'Canonical case metadata and unique IDs validated; no behavioral claim.' },
    L2: { status: 'NOT_RUN', evidence_id: null, note: 'No per-case project/environment resolution was executed.' },
    L3: { status: 'NOT_RUN', evidence_id: null, note: 'No per-case model-in-the-loop route selection was executed.' },
    L4: { status: 'BLOCKED', evidence_id: 'E-HOST-CONTEXT', note: 'BMM and TEA were installed in an isolated fixture, but the active Copilot session was not launched from that fixture and invoked no native skill.' },
    L5: { status: 'NOT_RUN', evidence_id: null, note: 'No per-case artifact, delivery, or user outcome was verified.' }
  }
}));
const results = {
  schemaVersion: 1,
  source: 'BRAD v0.4.1 skills/brad/evals/routing-cases.json',
  total: cases.length,
  observedRouteSelections: 0,
  verifiedNativeInvocations: 0,
  statuses: { L1: 'metadata contract check only', L2: 'NOT_RUN', L3: 'NOT_RUN', L4: 'BLOCKED', L5: 'NOT_RUN' },
  cases
};
await writeFile(resolve(evalDir, 'routing-results.json'), `${JSON.stringify(results, null, 2)}\n`);
const csvEscape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const routingCsv = [
  'id,fixture,user_request,expected_route,selected_route,L1,L2,L3,L4,L5,native_invocation_verified,outcome,evidence',
  ...cases.map(item => [
    item.id, item.fixture, item.user_request, item.expected_route, item.selected_route,
    ...['L1', 'L2', 'L3', 'L4', 'L5'].map(level => item.levels[level].status),
    item.native_invocation_verified, item.outcome,
    ['L1', 'L2', 'L3', 'L4', 'L5'].map(level => item.levels[level].evidence_id).filter(Boolean).join(';')
  ].map(csvEscape).join(','))
].join('\n');
await writeFile(resolve(evalDir, 'routing-results.csv'), `${routingCsv}\n`);
await writeFile(resolve(evalDir, 'audit-observations.json'), `${JSON.stringify(cases.map(item => ({
  id: item.id,
  selected: null,
  invoked: [],
  delivery: { status: 'NOT_RUN' }
})), null, 2)}\n`);
const evidenceRecords = [
  { id: 'E-BASELINE', status: 'PASS', date: '2026-10-19', description: 'Initial clean main-branch baseline and v0.4.1 tag verified before edits.', artifacts: ['../REPRODUCE.md'], limitations: ['Initial-state evidence; no claim of a clean working tree after the example was authored.'] },
  { id: 'E-BRAD-SETUP', status: 'PASS', date: '2026-10-19', description: 'BRAD v0.4.1 dry-run, setup, and doctor completed in a disposable temporary fixture.', artifacts: ['../REPRODUCE.md'], limitations: ['Does not establish current-host native workflow invocation.'] },
  { id: 'E-BMAD-INSTALLED', status: 'PASS', date: '2026-10-19', description: 'Official BMAD v6.12.4 installer configured BMM v6.12.4 and TEA v1.27.2 in that fixture; 39 Copilot skill files were reported on disk.', artifacts: ['../REPRODUCE.md'], limitations: ['Skills were not loaded or invoked by the active session.'] },
  { id: 'E-HOST-CONTEXT', status: 'BLOCKED', date: '2026-10-19', description: 'Active Copilot session was not launched from the isolated fixture and did not invoke its installed native skills.', artifacts: ['../REPRODUCE.md'], limitations: ['Native BMAD workflow behavior remains unverified.'] },
  { id: 'E-AUDIT-85', status: 'PASS', date: '2026-10-19', description: 'The routing auditor processed all 85 canonical observations; selection, invocation, and delivery were each NOT_RUN for all cases.', artifacts: ['../evaluation/audit-summary.json', '../evaluation/audit-observations.json'], limitations: ['Auditor validates submitted observations; it does not independently validate evidence files or native execution.'] },
  { id: 'E-BRAD-TESTS', status: 'PARTIAL', date: '2026-10-19', description: 'BRAD Node suite repeatedly reported 27/29; Windows symlink EPERM and nested npm-pack output parsing failure remained unresolved.', artifacts: ['../REPRODUCE.md'], limitations: ['Environment and underlying failure causes were not conclusively isolated.'] },
  { id: 'E-BRAD-PYTHON', status: 'PASS', date: '2026-10-19', description: 'BRAD Python unittest suite passed 21 tests.', artifacts: ['../REPRODUCE.md'], limitations: [] },
  { id: 'E-REPO-CHECK', status: 'PASS', date: '2026-10-19', description: 'Repository consistency check passed.', artifacts: ['../REPRODUCE.md'], limitations: [] },
  { id: 'E-RELEASE', status: 'PASS', date: '2026-10-19', description: 'Deterministic release ZIP generation completed.', artifacts: ['../REPRODUCE.md'], limitations: ['No publish or release action was performed.'] },
  { id: 'E-NPM-PACK', status: 'PASS', date: '2026-10-19', description: 'Direct npm pack dry-run produced package metadata and file list.', artifacts: ['../REPRODUCE.md'], limitations: ['This does not resolve the separate nested package-test failure.'] },
  { id: 'E-ROUTING-85', status: 'PASS', date: '2026-10-19', description: 'All 85 canonical routing case IDs and required metadata were checked.', artifacts: ['../evaluation/canonical-cases.json', '../evaluation/routing-results.json'], limitations: ['Metadata validation only; L2/L3/L5 not run, L4 blocked.'] },
  { id: 'E-APP-TESTS', status: 'PASS', date: '2026-10-19', description: 'Concourse domain suite passed 5/5 tests.', artifacts: ['../app/tests/domain.test.mjs'], limitations: ['Not a full acceptance, browser automation, or CI suite.'] },
  { id: 'E-APP-UI', status: 'PASS', date: '2026-10-19', description: 'Manual narrow browser smoke at 628x732 CSS pixels loaded the app; creating and resetting a task worked.', artifacts: ['../DEMO_WALKTHROUGH.md'], limitations: ['No screenshot artifact; no full viewport, accessibility, or feature matrix.'] },
  { id: 'E-REPORT-GENERATED', status: 'PASS', date: '2026-10-19', description: 'Local report generator created 85-case evaluation files, 18 report summaries, and the offline master HTML dossier.', artifacts: ['../report/MASTER_REPORT.html'], limitations: ['Generated local artifacts; no remote publication.'] }
];
const telemetryEvents = evidenceRecords.map(record => ({
  event_id: record.id,
  run_id: 'BRAD-041-CONCOURSE-LOCAL',
  scenario_id: null,
  timestamp: record.date,
  timestamp_precision: 'day',
  agent_track: 'single-session-local-validation',
  host: 'GitHub Copilot CLI',
  brad_version: '0.4.1',
  bmad_version: record.id === 'E-BMAD-INSTALLED' || record.id === 'E-HOST-CONTEXT' ? '6.12.4 (BMM); TEA 1.27.2' : null,
  status: record.status,
  summary: record.description,
  limitations: record.limitations
}));
await writeFile(resolve(telemetryDir, 'events.jsonl'), `${telemetryEvents.map(event => JSON.stringify(event)).join('\n')}\n`);
await writeFile(resolve(telemetryDir, 'evidence-index.json'), `${JSON.stringify({
  schemaVersion: 1,
  runId: 'BRAD-041-CONCOURSE-LOCAL',
  timestampPrecision: 'day',
  records: evidenceRecords
}, null, 2)}\n`);
await writeFile(resolve(evalDir, 'sdlc-stage-results.json'), `${JSON.stringify({
  status: 'PARTIAL',
  stages: [
    { stage: 'Baseline and installation', status: 'PASS', evidence: ['E-BASELINE', 'E-BRAD-SETUP', 'E-BMAD-INSTALLED'] },
    { stage: 'Product discovery and requirements', status: 'NOT_RUN', evidence: [] },
    { stage: 'Architecture and planning', status: 'NOT_RUN', evidence: [] },
    { stage: 'Development', status: 'PARTIAL', evidence: ['E-APP-TESTS', 'E-APP-UI'] },
    { stage: 'QA', status: 'PARTIAL', evidence: ['E-APP-TESTS'] },
    { stage: 'Integration and release readiness', status: 'NOT_RUN', evidence: [] }
  ]
}, null, 2)}\n`);
await writeFile(resolve(evalDir, 'collaboration-results.json'), `${JSON.stringify({
  status: 'NOT_RUN',
  stakeholdersSpecified: 10,
  independentContextsExecuted: 0,
  realHandoffsObserved: 0,
  separateDeveloperWorktrees: 0,
  notes: ['Role guides and demo personas are recommendations/fictional seed data, not independent sessions.']
}, null, 2)}\n`);
await writeFile(resolve(evalDir, 'handoff-results.json'), `${JSON.stringify({
  status: 'NOT_RUN',
  requiredTransfers: ['PM→BA', 'BA→Architect', 'Architect→Tech Lead', 'Tech Lead→Developers', 'Developer→QA', 'QA→Developer', 'QA→PM', 'PM→Delivery Manager', 'Tech Lead→Release'],
  observedTransfers: [],
  notes: ['No real stakeholder sessions or native backlog state were available.']
}, null, 2)}\n`);
await writeFile(resolve(evalDir, 'qa-results.json'), `${JSON.stringify({
  status: 'PARTIAL',
  appDomainTests: { status: 'PASS', command: 'npm test', passed: 5, failed: 0 },
  nativeTea: 'NOT_RUN',
  functionalBrowserAcceptance: 'NOT_RUN',
  endToEndAutomation: 'NOT_RUN',
  coverage: null,
  notes: ['Five Node built-in domain tests do not establish full functional acceptance.']
}, null, 2)}\n`);
await writeFile(resolve(evalDir, 'stakeholder-matrix.csv'), [
  'role,simulation_or_observation,independent_context,native_workflow,verified_outcome',
  ...[
    'Product Manager / Product Owner', 'Business Analyst', 'Delivery Manager / Scrum Master', 'Solution Architect',
    'Technical Lead', 'Backend Developer', 'Frontend Developer', 'Full-Stack Developer',
    'Functional QA', 'Automation QA'
  ].map(role => [role, 'recommended role guide; fictional app persona only', 'NOT_RUN', 'NOT_RUN', 'NOT_RUN'].map(csvEscape).join(','))
].join('\n') + '\n');
await writeFile(resolve(evalDir, 'benchmark-results.csv'),
  'comparison,task,brad_duration_ms,native_bmad_duration_ms,token_count,cost,status\nBRAD vs native BMAD,matched fixture,,,,,NOT_RUN\n');

const reportSummaries = [
  ['00-executive-summary.md', 'Executive summary', 'PARTIAL: A local Concourse prototype and scoped installer checks are available. The requested ten-person live SDLC study, native BMAD runs, and remote delivery were not performed.'],
  ['01-installation.md', 'Installation and environment', 'BRAD v0.4.1 and official BMAD v6.12.4 with BMM and TEA v1.27.2 were installed/configured in an isolated temporary fixture. Doctor discovered skill files; active-host invocation was not verified.'],
  ['02-team-and-roles.md', 'Team and roles', 'Ten role guides and a sample role switcher are included. No independent stakeholder context was executed; the app personas and seeded updates are fictional.'],
  ['03-product-discovery.md', 'Product discovery', 'A concise demo scope is documented. No customer discovery, PM/BA interview, or native Analyst/PM workflow was run.'],
  ['04-requirements.md', 'Requirements', 'Demo feature scope and testable local behaviors are documented as an implementation brief, not an approved PRD. Native requirements artifacts were not generated.'],
  ['05-architecture.md', 'Architecture', 'The app uses a local static server and browser localStorage to avoid dependencies. This is a demo choice; no native Architect workflow or production architecture review occurred.'],
  ['06-sprint-planning.md', 'Sprint planning', 'No authoritative native backlog, estimates, sprint plans, ownership assignment, or replanning was executed. The UI sprint label is sample content.'],
  ['07-development.md', 'Development', 'A single Copilot CLI session created the runnable local app. No separate developer branches/worktrees, ticket claims, or commits were recorded.'],
  ['08-functional-qa.md', 'Functional QA', 'A narrow browser smoke interaction created and reset a sample task. Independent functional QA and acceptance were not run.'],
  ['09-automation-qa.md', 'Automation QA', 'Five built-in Node domain tests pass. Native TEA, ATDD, E2E, CI, and coverage remain NOT_RUN.'],
  ['10-collaboration.md', 'Collaboration', 'No real stakeholder handoff or independent review occurred. Recommendations are provided in the handoff protocol and RACI.'],
  ['11-routing-evaluation.md', 'Routing evaluation', 'All 85 canonical IDs and expected route labels were schema-checked. Per-case L2/L3 route selection and L5 outcomes are NOT_RUN; L4 is blocked because the active host did not invoke skills installed in the separate fixture.'],
  ['12-ticket-delivery.md', 'Ticket delivery', 'No canonical ticket was implemented through BRAD, and no commit, push, PR, CI, or native state reconciliation is claimed.'],
  ['13-failure-recovery.md', 'Failure and recovery', 'BRAD test attempts exposed Windows EPERM errors and an unresolved npm pack test parse failure. No crash/resume, merge-conflict, or CI recovery experiment ran.'],
  ['14-benchmarks.md', 'Benchmarks', 'Matched BRAD/native BMAD benchmarks were NOT_RUN. Durations, cost, tokens, speedup, and uncertainty are not available.'],
  ['15-security.md', 'Security and privacy', 'No secrets or real customer data were used. The local app role picker is not authentication. This is a scoped safety note, not a comprehensive security audit.'],
  ['16-brad-improvements.md', 'BRAD improvements', 'Findings separate observed test failures from environment/host limitations and untested hypotheses. No BRAD runtime changes were made.'],
  ['17-final-readiness.md', 'Final readiness', 'NOT READY for production or publication as a complete SDLC validation. Suitable only as a local prototype and partial, explicitly caveated example pending human review.']
];
for (const [filename, title, summary] of reportSummaries) {
  await writeFile(resolve(reportsDir, filename),
    `# ${title}\n\n**Status:** ${summary.split(':')[0]}\n\n${summary}\n\nSee [the self-contained master report](../report/MASTER_REPORT.html) and the [reproduction notes](../REPRODUCE.md) for scope, commands, evidence IDs, and limitations.\n`);
}
await writeFile(resolve(reportsDir, 'team-showcase.md'),
  '# Concourse team showcase\n\nThe local prototype demonstrates a fictional delivery board, not a ten-person study. Start it with `cd examples/concourse-sdlc-lab/app; npm start`; run the five domain checks with `npm test`. Role guides are in `docs/roles/`. No native BMAD invocation, independent stakeholder context, PR, CI, or user acceptance is claimed.\n');

const embeddedCases = JSON.stringify(cases).replaceAll('<', '\\u003c');
const reportHtml = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light"><title>Concourse SDLC Lab — Master Report</title>
<style>
:root{--ink:#192b32;--paper:#f3f4ef;--white:#fff;--line:#d9e1dc;--muted:#62726f;--mint:#397968;--blue:#477da5;--coral:#ba5a45;--gold:#a77428;--nav:266px;font:15px/1.6 "Segoe UI",Aptos,sans-serif;color:var(--ink);background:var(--paper)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}.layout{display:grid;grid-template-columns:var(--nav) minmax(0,1fr);min-height:100vh}
aside{position:sticky;top:0;height:100vh;overflow:auto;padding:26px 18px;background:var(--ink);color:#eef3ef}
.brand{margin:0 8px 5px;font:28px Georgia,serif;letter-spacing:-1px}.brand small{display:block;margin-top:4px;color:#9cb7ab;font:700 9px "Segoe UI",sans-serif;letter-spacing:2px}
.side-copy{margin:16px 8px 21px;color:#aebdb8;font-size:11px}.nav{display:grid;gap:2px}.nav a{padding:7px 9px;color:#c0ccc7;font-size:11px;text-decoration:none;border-left:2px solid transparent}.nav a:hover,.nav a:focus{background:#263b41;color:white;border-left-color:#8fc3aa}
main{max-width:1420px;width:100%;padding:42px clamp(20px,5vw,72px) 70px;margin:auto}
.cover{position:relative;overflow:hidden;padding:39px 42px;background:var(--ink);color:#f5f6f0}.cover:after{position:absolute;right:-30px;bottom:-120px;width:340px;height:340px;border:1px solid #39565a;border-radius:50%;box-shadow:0 0 0 25px #1b3138,0 0 0 26px #39565a,0 0 0 58px #1b3138,0 0 0 59px #39565a;content:""}
.kicker{color:#9cc6ae;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase}.cover h1{max-width:770px;margin:12px 0 12px;font:clamp(38px,5vw,68px)/1.03 Georgia,serif;letter-spacing:-2px}.cover h1 em{color:#95c3a8;font-weight:400}.cover p{max-width:700px;color:#c2d0ca;font-size:14px}.cover-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:25px}.chip{padding:6px 9px;border:1px solid #49615f;color:#e2eae4;font-size:10px}
.verdict{display:grid;grid-template-columns:auto 1fr;gap:17px;align-items:start;margin:22px 0;padding:18px 20px;border:1px solid #e8c9b9;background:#fcf5ee}.verdict strong{color:#a54836}.verdict p{margin:2px 0 0;color:#485a58;font-size:13px}
.section{scroll-margin-top:20px;margin-top:42px}.section-head{display:flex;align-items:baseline;gap:12px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--line)}.section-no{color:var(--mint);font:12px Georgia,serif}.section h2{margin:0;font:26px Georgia,serif;letter-spacing:-.4px}.section h3{margin:20px 0 7px;font-size:14px}.section p{max-width:930px;margin:8px 0;color:#51615e;font-size:13px}.section ul,.section ol{padding-left:20px;color:#51615e;font-size:13px}.section li{margin:5px 0}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.card{padding:15px;border:1px solid var(--line);background:var(--white)}.card h3{margin:0 0 7px;font-size:12px}.card p{margin:0;font-size:11px}.stat{font:30px Georgia,serif}.label{color:var(--muted);font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.status{display:inline-block;padding:3px 7px;border:1px solid var(--line);font:700 9px "Segoe UI",sans-serif;letter-spacing:.4px}.pass{color:#2e715d;background:#e9f3ed}.fail{color:#a54535;background:#faeae4}.blocked{color:#835b1f;background:#f8f0df}.notrun{color:#6f7774;background:#ecefed}.partial{color:#3c6484;background:#e8f0f6}
.metric-chart{display:grid;gap:9px;margin-top:13px}.metric-row{display:grid;grid-template-columns:35px minmax(70px,1fr) 70px;gap:10px;align-items:center;font-size:10px}.bar{height:9px;background:#e4eae5}.bar span{display:block;height:100%;background:var(--mint)}.metric-row small{text-align:right;color:var(--muted)}
.table-wrap{overflow:auto;border:1px solid var(--line);background:white}.controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.controls input,.controls select{min-height:36px;padding:6px 9px;border:1px solid var(--line);background:white;color:var(--ink);font:12px "Segoe UI",sans-serif}.controls input{flex:1;min-width:220px}
table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:8px 9px;border-bottom:1px solid #e8ece8;vertical-align:top;font-size:10px}th{position:sticky;top:0;background:#edf1ed;color:#64736f;font-size:9px;letter-spacing:.6px;text-transform:uppercase}td code{white-space:nowrap;color:#38525b;font-size:9px}.case-id{font-weight:700}.expected{min-width:220px}.request{min-width:250px;color:#71807c}.evidence{white-space:nowrap;color:#7d8984}
.timeline{border-left:1px solid #a9bdb2;margin:14px 0 0 6px;padding-left:18px}.event{position:relative;margin:0 0 15px}.event:before{position:absolute;left:-23px;top:8px;width:7px;height:7px;border-radius:50%;background:var(--mint);content:""}.event time{display:block;color:#788781;font-size:10px}.event strong{font-size:12px}.event p{margin:3px 0;font-size:11px}
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.flow div{min-height:76px;padding:11px;border:1px solid var(--line);background:white}.flow strong{display:block;margin-bottom:5px;color:#315f50;font-size:11px}.flow span{color:#75827d;font-size:10px}
.tree{padding:14px;background:#e9efea;color:#3c514b;font:11px/1.9 ui-monospace,Consolas,monospace;white-space:pre-wrap}
.callout{padding:12px 14px;border-left:2px solid var(--gold);background:#f8f1e4;color:#6a5635;font-size:11px}
.footer{margin-top:50px;padding-top:16px;border-top:1px solid var(--line);color:#788580;font-size:10px}
@media(max-width:900px){.layout{grid-template-columns:1fr}aside{position:relative;height:auto;padding:16px 18px}.nav{grid-template-columns:repeat(3,minmax(0,1fr));max-height:180px;overflow:auto}.side-copy{margin:8px}.brand{font-size:22px}main{padding-top:24px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){main{padding:17px 14px 45px}.cover{padding:25px 20px}.cover:after{opacity:.35}.cover h1{font-size:42px}.grid{grid-template-columns:1fr}.flow{grid-template-columns:repeat(2,1fr)}.verdict{grid-template-columns:1fr;gap:6px}.section h2{font-size:22px}.nav{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media(max-width:900px){.layout{grid-template-columns:minmax(0,1fr)}aside,main{min-width:0}}
</style>
</head>
<body>
<div class="layout">
<aside><p class="brand">Concourse<small>BRAD SDLC VALIDATION · PARTIAL RUN</small></p><p class="side-copy">Offline technical dossier · BRAD v0.4.1 baseline · local prototype only</p><nav class="nav" aria-label="Report sections">
<a href="#executive">01 Overview</a><a href="#environment">02 Environment</a><a href="#team">03 Team</a><a href="#timeline">04 Timeline</a><a href="#roles">05 Role usage</a><a href="#workflow">06 Workflow map</a><a href="#product">07 Product</a><a href="#architecture">08 Architecture</a><a href="#planning">09 Planning</a><a href="#development">10 Development</a><a href="#qa">11 QA</a><a href="#handoffs">12 Handoffs</a><a href="#delivery">13 Ticket to PR</a><a href="#routing">14 Routing cases</a><a href="#recovery">15 Recovery</a><a href="#security">16 Safety</a><a href="#analytics">17 Analytics</a><a href="#comparison">18 Comparison</a><a href="#demo">19 Demo</a><a href="#improvements">20 Improvements</a><a href="#readiness">21 Readiness</a><a href="#appendix">22 Appendix</a>
</nav></aside>
<main>
<header class="cover"><div class="kicker">Field notes · local rehearsal</div><h1>Concourse <em>in motion.</em></h1><p>A careful record of a runnable team-delivery prototype and the boundaries of a BRAD/BMAD validation that could not be completed in this host. Evidence is separated from recommendations, fiction, and unrun work.</p><div class="cover-meta"><span class="chip">BRAD baseline v0.4.1</span><span class="chip">Host: Copilot CLI</span><span class="chip">Model: Auto; concrete ID unavailable</span><span class="chip">Run: local / single context</span></div></header>
<div class="verdict"><strong>FINAL VERDICT · PARTIAL / NOT PRODUCTION READY</strong><p>A no-dependency local prototype and five passing domain tests are available. The host did not provide an installed native BMAD runtime; ten independent stakeholder workflows, behavioral evaluation of 85 routes, remote PR/CI, full QA, and comparative benchmarks were not performed. BRAD's own Node suite also had unresolved failures on this Windows environment.</p></div>
<section class="section" id="executive"><div class="section-head"><span class="section-no">01</span><h2>Executive overview</h2></div><div class="grid"><article class="card"><div class="label">Status</div><div class="stat">PARTIAL</div><p>Useful local demo; incomplete validation.</p></article><article class="card"><div class="label">Native invocations verified</div><div class="stat">0</div><p>No official BMAD skill was installed or invoked.</p></article><article class="card"><div class="label">Canonical cases</div><div class="stat" id="case-total">85</div><p>Metadata checked; behavior remains unrun.</p></article></div><h3>Objective and outcome</h3><p>Assess whether BRAD v0.4.1 can support a cross-functional SDLC while native BMAD performs specialist work. The attainable outcome in this session was narrower: verify local baseline/install behavior, build a browser-local Concourse sample, create adoption guidance, and publish a truthful evidence dossier. The app's sample timeline, team and comments are fictional fixtures, not evidence of stakeholder activity.</p><h3>Major blockers</h3><ul><li>Native BMAD v6/v7, BMM and TEA were absent. No version choice or install was authorized/performed.</li><li>Antigravity was not available as the current host; the concrete Auto-selected model was not exposed.</li><li>Only one session context was used. No genuine independent role sessions or developer worktrees were launched.</li><li>No approved remote demo repo, push, PR, CI, customer acceptance, merge or deployment.</li><li>BRAD Node tests: 27/29 in repeated runs; Windows <code>EPERM</code> and nested npm-pack JSON parse failures remain unresolved.</li></ul></section>
<section class="section" id="environment"><div class="section-head"><span class="section-no">02</span><h2>Installation & environment</h2></div><div class="grid"><article class="card"><h3>Observed local toolchain</h3><p>Windows · Node v24.19.0 · npm 12.0.2 · Python 3.13.14 · Git present · Copilot CLI session. <code>gh</code> executable was present; remote authentication was not checked.</p></article><article class="card"><h3>Baseline</h3><p>Clean initial branch <code>main</code>; <code>VERSION=0.4.1</code>; tag <code>v0.4.1</code> resolves to <code>dcad5e7d9d463c562f6cd94ea0ac5f6231ce23c8</code>. No core baseline files were edited.</p></article><article class="card"><h3>Isolated setup</h3><p>Local CLI dry-run then setup ran under a temporary directory. Doctor reported BRAD files current and BMAD absent. This verifies files/CLI only, not host skill discovery or native execution.</p></article></div><h3>Commands and results</h3><p><code>node cli\\brad.mjs doctor --json --dir "$env:TEMP\\brad-v050-validation-lab"</code> — BRAD absent, BMAD absent. <code>setup --agent copilot --dry-run --json</code> — would install only into the fixture. Actual setup and doctor then reported BRAD 0.4.1 current; <code>nativeBmad</code>, <code>hostInvocation</code>, PR and CI remained unverified.</p><p>BRAD Node tests first/repeated: 27/29; later quiet attempt 27/29. The symlink test could not create a symlink (<code>EPERM</code>). The package-content test parsed no JSON record and raised <code>Cannot read properties of undefined (reading 'files')</code>. One later run also saw an intermittent staging-directory rename <code>EPERM</code>. Python: 21/21 passed. Repository check passed. Release archive build passed. Direct <code>npm pack --dry-run --json</code> succeeded. Full command record: <a href="../REPRODUCE.md">REPRODUCE.md</a>.</p></section>
<section class="section" id="team"><div class="section-head"><span class="section-no">03</span><h2>Team structure</h2></div><p>Ten responsibilities are covered in reusable role guides and fictional app personas. The roles did not execute as independent agents or stakeholders in this run; persona labels are not session evidence.</p><div class="flow"><div><strong>Product</strong><span>PM / PO · BA</span></div><div><strong>Direction</strong><span>Delivery Manager · Architect</span></div><div><strong>Engineering</strong><span>Tech Lead · Backend · Frontend · Full-stack</span></div><div><strong>Quality</strong><span>Functional QA · Automation QA</span></div></div><p>Session independence: 0 independent stakeholder contexts executed; 0 separate developer worktrees created. See <a href="../../../../../docs/RACI_MATRIX.md">recommended RACI</a> and <a href="../../../../../docs/roles/product-manager.md">role guides</a>.</p></section>
<section class="section" id="timeline"><div class="section-head"><span class="section-no">04</span><h2>Complete SDLC timeline</h2></div><p>Only observed validation actions are included. Tool timestamps were not emitted for every historical command; times below are explicitly limited to the captured Windows npm log where possible. Product sprint labels in the app are sample data, not this run's timeline.</p><div class="timeline">
<div class="event"><time>2026-10-19 · initial inspection</time><strong>Baseline read-only inspection</strong><p>Repository clean on <code>main</code>; inspected v0.4.1 setup contract, architecture, evaluation policy, canonical case catalog and demo publication restrictions.</p></div>
<div class="event"><time>2026-10-19 · isolated fixture</time><strong>BRAD CLI dry-run, setup, and doctor</strong><p>BRAD v0.4.1 installed only into a temporary local fixture. Doctor found native BMAD absent. No BMAD install or host restart.</p></div>
<div class="event"><time>2026-10-19 · validation sequence</time><strong>Baseline test/check commands</strong><p>Node suite had environment/unresolved failures; Python suite, repository check, release archive, and direct package dry-run succeeded.</p></div>
<div class="event"><time>2026-10-19 · app build</time><strong>Concourse prototype and focused tests</strong><p>Single Copilot CLI context authored app and domain tests. Five tests passed. A narrow browser view (628×732 CSS px) loaded; a task was created and reset. No screenshot file is packaged.</p></div>
<div class="event"><time>NOT RUN</time><strong>Requirements approval through release decision</strong><p>No real discovery, native planning, independent developer work, TEA, branch/PR/CI, product acceptance, or release approval.</p></div>
</div></section>
<section class="section" id="roles"><div class="section-head"><span class="section-no">05</span><h2>Stakeholder-by-stakeholder BRAD usage</h2></div><p>Guides distinguish practitioner authority, candidate native route, review checkpoint, handoff, failure recovery, and observed evidence. The prompt examples are recommended, not captured interactions. No specialist workflow was invoked in this rehearsal.</p><div class="grid">
<article class="card"><h3>PM / PO</h3><p>Owns value, scope and acceptance; candidate BMM PM/PRD. <a href="../../../../../docs/roles/product-manager.md">Guide</a></p></article><article class="card"><h3>Business Analyst</h3><p>Owns elicitation, rules and traceability; candidate BMM Analyst. <a href="../../../../../docs/roles/business-analyst.md">Guide</a></p></article><article class="card"><h3>Delivery Manager</h3><p>Facilitates flow; candidate native sprint planning/SM. <a href="../../../../../docs/roles/delivery-manager.md">Guide</a></p></article><article class="card"><h3>Solution Architect</h3><p>Proposes system trade-offs; candidate installed Architect workflow. <a href="../../../../../docs/roles/solution-architect.md">Guide</a></p></article><article class="card"><h3>Technical Lead</h3><p>Coordinates bounded work and contracts; Build/review as installed. <a href="../../../../../docs/roles/technical-lead.md">Guide</a></p></article><article class="card"><h3>Backend Developer</h3><p>Server/data implementation; candidate <code>bmad-build</code>. <a href="../../../../../docs/roles/backend-developer.md">Guide</a></p></article><article class="card"><h3>Frontend Developer</h3><p>UI/accessibility implementation; candidate <code>bmad-build</code>. <a href="../../../../../docs/roles/frontend-developer.md">Guide</a></p></article><article class="card"><h3>Full-stack Developer</h3><p>One vertical slice; candidate <code>bmad-build</code>. <a href="../../../../../docs/roles/fullstack-developer.md">Guide</a></p></article><article class="card"><h3>Functional QA</h3><p>Independent exploration and acceptance evidence; installed TEA/QA. <a href="../../../../../docs/roles/functional-qa.md">Guide</a></p></article><article class="card"><h3>Automation QA</h3><p>ATDD/regression automation; installed TEA capabilities. <a href="../../../../../docs/roles/automation-qa.md">Guide</a></p></article></div></section>
<section class="section" id="workflow"><div class="section-head"><span class="section-no">06</span><h2>Native BMAD workflow map</h2></div><p>Expected capabilities are intent-level only. Exact IDs, discovery, commands, and menus are version/host-specific. Observed specialist invocations: none; there is no expected-vs-observed native route sample.</p><div class="table-wrap"><table><thead><tr><th>Need</th><th>Candidate native specialist</th><th>Observed</th><th>Evidence boundary</th></tr></thead><tbody><tr><td>Product discovery/PRD</td><td>BMM Analyst / PM</td><td>NOT_RUN</td><td>BMAD absent</td></tr><tr><td>Architecture/ADR</td><td>Installed Architect</td><td>NOT_RUN</td><td>BMAD absent</td></tr><tr><td>Story/sprint readiness</td><td>PO / SM / sprint planning</td><td>NOT_RUN</td><td>No native backlog</td></tr><tr><td>Implementation</td><td><code>bmad-build</code> for one story</td><td>NOT_RUN</td><td>App authored directly in one session</td></tr><tr><td>Test strategy/ATDD</td><td>Installed TEA</td><td>NOT_RUN</td><td>Five local Node tests only</td></tr></tbody></table></div></section>
<section class="section" id="product"><div class="section-head"><span class="section-no">07</span><h2>Product & requirements</h2></div><p>Concourse's demo scope is a local team task board: projects, tasks, statuses, priority, assignment, tags, filters, comments, activity pulse, demo role control, and local persistence. This is not a validated product vision or customer-approved PRD.</p><ul><li>Implemented in the prototype: task CRUD, status changes, search/priority/assignee/project filtering, notes, recent activity, responsive board/list, seeded fictional personas.</li><li>Not implemented: real organizations/accounts, server-side authorization, database/API, multi-user sync, durable shared notifications, production audit history, external integrations, deployment.</li><li>Traceability and change history for a real backlog: NOT_RUN. No scope approval, acceptance signoff, or change request occurred.</li></ul></section>
<section class="section" id="architecture"><div class="section-head"><span class="section-no">08</span><h2>Architecture</h2></div><p>The app uses Node built-in HTTP to serve static assets from localhost; browser ES modules hold domain helpers and localStorage contains client data. No npm runtime dependencies or production services are required.</p><div class="tree">Browser UI (public/index.html + app.mjs)
  ├── domain rules (src/domain.mjs)
  ├── localStorage (single-browser persistence; no server identity)
  └── Node HTTP static server (server.mjs)
       └── 127.0.0.1 only · path containment · CSP / nosniff</div><p>This was chosen for a reproducible no-install demo. It is not a reviewed production design. No native Architect, security, or NFR workflow ran; no database schema, API contract, ADR approval, or threat model was established.</p></section>
<section class="section" id="planning"><div class="section-head"><span class="section-no">09</span><h2>Sprint planning</h2></div><p>Two sprints, story ownership, dependencies, estimates, blockers, re-planning, and progress were not planned against a real native backlog. The “Sprint 02” label and task state in UI are fictional demo fixtures; they are not completion analytics. No story assignment or acceptance is inferred from them.</p><p>Recommended sequencing and readiness criteria are in <a href="../../../../../docs/DEFINITION_OF_READY.md">Definition of Ready</a> and <a href="../../../../../docs/SDLC_PLAYBOOK.md">SDLC Playbook</a>.</p></section>
<section class="section" id="development"><div class="section-head"><span class="section-no">10</span><h2>Developer execution</h2></div><p>One conversation context edited the demo app files in the current repository. There were no separate DEV-01/02/03 sessions, branches, worktrees, commits, cross-developer reviews, shared migration changes, or merged integration branch. No file is attributed to fictional app personas.</p><p>Verification: five domain tests pass. Server request smoke checks returned 200 for app assets, 404 for server source and traversal attempts. This is not a full app acceptance test or CI run. No commit, PR, push, or CI status is claimed.</p></section>
<section class="section" id="qa"><div class="section-head"><span class="section-no">11</span><h2>QA & TEA</h2></div><div class="grid"><article class="card"><div class="label">Demo domain tests</div><div class="stat">5 / 5</div><p>Pass; role checks, state changes, filters and progress helpers.</p></article><article class="card"><div class="label">Native TEA</div><div class="stat">NOT RUN</div><p>BMAD/TEA not installed.</p></article><article class="card"><div class="label">E2E / CI / coverage</div><div class="stat">NOT RUN</div><p>No browser automation, CI job, or coverage measurement.</p></article></div><p>A browser canvas at 628×732 CSS px displayed the responsive breakpoint; manual create/reset of a sample task succeeded. This is one narrow smoke interaction, not independent QA or desktop/mobile matrix coverage.</p></section>
<section class="section" id="handoffs"><div class="section-head"><span class="section-no">12</span><h2>Collaboration & handoffs</h2></div><p>Observed real handoffs: 0. No PM→BA, BA→Architect, Architect→Tech Lead, developer→QA, QA→PM, or release transfer occurred. <code>docs/TEAM_HANDOFF_PROTOCOL.md</code> describes the recommended record and is not evidence of execution. No rejected handoff, blocker resolution, dependency change, or communication latency was measured.</p></section>
<section class="section" id="delivery"><div class="section-head"><span class="section-no">13</span><h2>Full ticket-to-PR evidence</h2></div><p>No Concourse implementation was linked to an authoritative native ticket. No BRAD request triggered Build, no native invocation evidence exists, and no ticket was pushed or opened as a PR. No CI or native state reconciliation occurred. The product prototype's files and tests are real local artifacts, but they do not establish a BRAD ticket-to-PR lifecycle.</p><div class="callout">Remote PR and CI: 0 verified. No external repository was created or modified. The user retains publication authority.</div></section>
<section class="section" id="routing"><div class="section-head"><span class="section-no">14</span><h2>Canonical 85-case routing evaluation</h2></div><p>Every canonical ID and required metadata field was checked for presence and uniqueness. That L1 schema check does not test routing. L2 environment resolution and L3 route selection were NOT_RUN. L4 native execution is BLOCKED because BMAD is absent. L5 per-case outcome is NOT_RUN. Expected routing is shown unchanged from BRAD v0.4.1's catalog; actual selection is blank.</p><div id="route-summary" class="metric-chart" aria-label="Routing case stage statuses"></div><div class="controls"><input id="case-search" type="search" placeholder="Search case ID, request, or expected route" aria-label="Search routing cases"><select id="case-status" aria-label="Filter by stage status"><option value="all">All status</option><option>PASS</option><option>BLOCKED</option><option>NOT_RUN</option></select></div><div class="table-wrap"><table><thead><tr><th>ID / fixture</th><th>Request</th><th>Expected route</th><th>Selected</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th><th>L5</th><th>Evidence</th></tr></thead><tbody id="case-rows"></tbody></table></div><p id="case-count"></p><p><a href="../evaluation/routing-results.json">routing-results.json</a> · <a href="../evaluation/routing-results.csv">routing-results.csv</a> · <a href="../evaluation/audit-observations.json">auditor input</a>.</p></section>
<section class="section" id="recovery"><div class="section-head"><span class="section-no">15</span><h2>Failure and recovery</h2></div><p>Observed: BRAD test run had Windows symlink <code>EPERM</code>, nested npm pack parsing failed, and a later repeated setup test hit a staging-directory rename <code>EPERM</code>. The direct package dry-run succeeded separately. These were not repaired in BRAD core because the work scope preserves its v0.4.1 baseline; their underlying cause remains unverified.</p><p>Not run: deliberate crash/restart, interrupted workflow resume, branch conflict, CI failure/repair, duplicate ticket claims, push denial, stale native ticket, or existing PR reuse. No forced Git changes were performed.</p></section>
<section class="section" id="security"><div class="section-head"><span class="section-no">16</span><h2>Security & safety</h2></div><ul><li>No credentials, private transcripts, customer data, remote repository, or production service was used.</li><li>BRAD setup was confined to a temporary directory; no BMAD installation or global configuration change.</li><li>Concourse binds to 127.0.0.1, restricts static paths, sets a local CSP and MIME protections, and has no external runtime dependencies.</li><li>The UI role picker and localStorage are demonstration-only; there is no identity, server authorization, encryption, or shared persistence.</li><li>This is not a full security review or supply-chain audit. Remote auth, prompt injection, symlink attacks, and destructive-boundary experiments were NOT_RUN.</li></ul></section>
<section class="section" id="analytics"><div class="section-head"><span class="section-no">17</span><h2>Performance analytics</h2></div><div class="grid"><article class="card"><div class="label">Behavioral routes observed</div><div class="stat">0 / 85</div><p>Metadata validation only; no selected routes.</p></article><article class="card"><div class="label">Native invocations</div><div class="stat">0</div><p>No verified specialist calls.</p></article><article class="card"><div class="label">Independent contexts</div><div class="stat">0</div><p>No parallelism or handoff latency measurement.</p></article></div><p>Setup duration, per-workflow duration, model token/cost, route accuracy, rework, defect rate, comparative speedup, and recovery time are unavailable or not measured. No blended score is calculated from missing evidence.</p></section>
<section class="section" id="comparison"><div class="section-head"><span class="section-no">18</span><h2>BRAD vs native BMAD</h2></div><p>Matched benchmarks were NOT_RUN because native BMAD was not installed. There is no sample size, duration, token/cost, quality comparison, confidence interval, or speedup claim. The included app is not a benchmark task pair.</p></section>
<section class="section" id="demo"><div class="section-head"><span class="section-no">19</span><h2>Product demonstration</h2></div><p>The local app shows a board/list, project/assignee/priority filters, create/edit/delete, task status, comments, activity pulse, demo role controls and responsive layout. Run from <code>app/</code> using <code>npm start</code>; run unit checks using <code>npm test</code>. No production credentials or external service is needed. A narrow 628×732 CSS-pixel browser view and create/reset path were checked. A desktop viewport, automated end-to-end flow, screenshot artifact, screen-reader audit, and full feature matrix were NOT_RUN.</p><p>Known issue: role enforcement is client-side and for demonstration only. Data is local to one browser. See <a href="../DEMO_WALKTHROUGH.md">demo walkthrough</a>.</p></section>
<section class="section" id="improvements"><div class="section-head"><span class="section-no">20</span><h2>Recommended BRAD improvements</h2></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Classification</th><th>Finding / evidence</th><th>Next action</th></tr></thead><tbody>
<tr><td>F-01</td><td>Observed, medium</td><td>Node tests are not green in this Windows host: symlink setup returns EPERM; distribution-test JSON parse fails; staging rename EPERM observed once.</td><td>Reproduce on a supported Windows runner; distinguish host privilege/flakiness from installer/package defects; add exact npm packaging regression coverage.</td></tr>
<tr><td>F-02</td><td>Validation blocker</td><td>Native BMAD absent; BMM/TEA selection and actual invocation are unverified.</td><td>Repeat in an authorized disposable host after the owner chooses a compatible official BMAD version.</td></tr>
<tr><td>F-03</td><td>Validation gap</td><td>85 canonical cases have no model-selected route or native invocation observation.</td><td>Run per-case through the actual supported host and use <code>audit_routing_results.py</code> without editing expected routes.</td></tr>
<tr><td>F-04</td><td>Validation gap</td><td>No independent multi-role sessions, actual handoffs, or developer isolation were exercised.</td><td>Plan the minimum genuinely separate contexts the target host supports and record isolation evidence.</td></tr>
<tr><td>F-05</td><td>Product/demo limitation</td><td>Prototype has no server auth/database/multi-user sync and is not production-ready.</td><td>Keep as local showcase; any production expansion needs approved security and architecture work.</td></tr>
</tbody></table></div><p>These findings are not a claim that every proposed cause is proven. No BRAD code/runtime defect was fixed in this example branch.</p></section>
<section class="section" id="readiness"><div class="section-head"><span class="section-no">21</span><h2>Production readiness</h2></div><p><span class="status fail">NOT READY</span> for a production pilot, public claim of full SDLC validation, or release. A numerical score is deliberately omitted: critical evidence gates are untested and the test baseline has unresolved failures.</p><p>For individual evaluation, this is a useful local installation/prototype example only. Small-team or enterprise adoption recommendations are premature until native workflow, safety, independent collaboration, QA, recovery, and remote delivery evidence are collected. Human maintainer review and publication authorization remain required.</p></section>
<section class="section" id="appendix"><div class="section-head"><span class="section-no">22</span><h2>Complete execution appendix</h2></div><h3>Reproduction</h3><p>App: <code>cd examples\\concourse-sdlc-lab\\app</code>, <code>npm test</code>, <code>npm start</code>. Baseline: see <code>REPRODUCE.md</code> for the exact local CLI and repository validation commands. Start/report generation changes no remote state. No commit or PR was made.</p><h3>Evidence schema and links</h3><p>Evidence IDs are defined in <a href="../telemetry/evidence-index.json">evidence-index.json</a>. Machine-readable records include routing, collaboration, handoff, QA, benchmarks, workflow traces, and timestamped observation events. A missing evidence pointer stays missing; this HTML does not treat labels as proof.</p><h3>Resume instructions</h3><p>Before expanding the study: recheck the repository and publication authority; use an owner-approved disposable work area; resolve the platform's native BMAD version/modules and model/session topology; continue with per-case L2–L5 evidence; run actual independent stakeholder and developer contexts; complete QA/integration/release gates; refresh this dossier from recorded data. Do not infer a background continuation from this file.</p></section>
<p class="footer">Concourse SDLC lab · BRAD v0.4.1 immutable baseline · Local-only partial rehearsal · No external publication or release claim · See <a href="../MANIFEST.json">manifest</a>.</p>
</main></div>
<script id="cases" type="application/json">__CASES__</script>
<script>
const cases=JSON.parse(document.getElementById('cases').textContent);
document.getElementById('case-total').textContent=cases.length;
const stages=['L1','L2','L3','L4','L5'];
const summary=document.getElementById('route-summary');
for(const stage of stages){
 const passed=cases.filter(item=>item.levels[stage].status==='PASS').length;
 const blocked=cases.filter(item=>item.levels[stage].status==='BLOCKED').length;
 const notRun=cases.filter(item=>item.levels[stage].status==='NOT_RUN').length;
 const bar=document.createElement('div');bar.className='metric-row';
 bar.innerHTML='<strong>'+stage+'</strong><div class="bar"><span style="width:'+Math.round(passed/cases.length*100)+'%"></span></div><small>'+passed+' pass · '+blocked+' blocked · '+notRun+' not run</small>';
 summary.append(bar);
}
const body=document.getElementById('case-rows'), search=document.getElementById('case-search'), filter=document.getElementById('case-status');
function renderCases(){
 const q=search.value.trim().toLowerCase(), status=filter.value;
 const visible=cases.filter(item=>(!q||(item.id+' '+item.fixture+' '+item.user_request+' '+item.expected_route).toLowerCase().includes(q))&&(status==='all'||stages.some(level=>item.levels[level].status===status)));
 body.replaceChildren();
 for(const item of visible){
  const tr=document.createElement('tr');
  const statusCell=level=>{const value=item.levels[level].status;return '<span class="status '+(value==='PASS'?'pass':value==='BLOCKED'?'blocked':value==='FAIL'?'fail':'notrun')+'">'+value+'</span>'};
  tr.innerHTML='<td><span class="case-id">'+item.id+'</span><br><small>'+item.fixture+'</small></td><td class="request"></td><td class="expected"></td><td>—</td>'+stages.map(level=>'<td>'+statusCell(level)+'</td>').join('')+'<td class="evidence">'+stages.map(level=>item.levels[level].evidence_id).filter(Boolean).join(', ')+'</td>';
  tr.children[1].textContent=item.user_request;tr.children[2].textContent=item.expected_route;body.append(tr);
 }
 document.getElementById('case-count').textContent='Showing '+visible.length+' of '+cases.length+' canonical cases.';
}
search.addEventListener('input',renderCases);filter.addEventListener('change',renderCases);renderCases();
</script></body></html>`;
const renderedHtml = reportHtml
  .replace('The host did not provide an installed native BMAD runtime;', 'BMM/TEA were installed in an isolated fixture, but the active Copilot session did not load or invoke those skills;')
  .replace('No official BMAD skill was installed or invoked.', 'Native skills were installed and inspected in the fixture; no workflow was invoked by this host.')
  .replace('Native BMAD v6/v7, BMM and TEA were absent. No version choice or install was authorized/performed.', 'BMAD v6.12.4 with BMM and TEA v1.27.2 were installed in the fixture, but the current session did not execute them.')
  .replace('Doctor reported BRAD files current and BMAD absent. This verifies files/CLI only, not host skill discovery or native execution.', 'Doctor found BRAD files current and native skills on disk. It does not verify that the active host loaded or invoked them.')
  .replace('BRAD absent, BMAD absent.', 'BRAD absent; native BMAD was absent on the initial pre-install doctor.')
  .replace('Doctor found native BMAD absent. No BMAD install or host restart.', 'The initial doctor found BMAD absent; official BMAD was subsequently installed, but the active host was not restarted/launched from the fixture.')
  .replace('Matched benchmarks were NOT_RUN because native BMAD was not installed.', 'Matched benchmarks were NOT_RUN because no native workflow was executed in the active host.')
  .replace('Doctor reported BRAD files current and BMAD absent.', 'Doctor found BRAD files current and native skills on disk, but did not verify active-host invocation.')
  .replace('Actual setup and doctor then reported BRAD 0.4.1 current; <code>nativeBmad</code>, <code>hostInvocation</code>, PR and CI remained unverified.', 'Actual setup and doctor reported BRAD 0.4.1 current and native skills on disk; active-host invocation, PR and CI remained unverified.')
  .replaceAll('<td>BMAD absent</td>', '<td>Installed in isolated fixture; host invocation unverified</td>')
  .replace('<p>BMAD/TEA not installed.</p>', '<p>TEA installed in fixture; not invoked.</p>')
  .replace('L4 native execution is BLOCKED because BMAD is absent.', 'L4 native execution is BLOCKED because the active host did not invoke skills installed in the separate fixture.')
  .replace('BRAD setup was confined to a temporary directory; no BMAD installation or global configuration change.', 'BRAD and BMAD setup were confined to temporary directories; no project-global BMAD configuration change.')
  .replace('Native BMAD absent; BMM/TEA selection and actual invocation are unverified.', 'BMM/TEA were installed in the isolated fixture; workflow selection and actual invocation remain unverified.')
  .replace('Repeat in an authorized disposable host after the owner chooses a compatible official BMAD version.', 'Launch the supported host from the authorized fixture and capture actual selection and invocation evidence.')
  .replace('<a href="../evaluation/audit-observations.json">auditor input</a>.', '<a href="../evaluation/audit-observations.json">auditor input</a> · <a href="../evaluation/audit-summary.json">audit summary</a> · <a href="../telemetry/evidence-index.json">evidence index</a> · <a href="../telemetry/events.jsonl">event log</a>.');
await writeFile(resolve(reportDir, 'MASTER_REPORT.html'), renderedHtml.replace('__CASES__', embeddedCases));

console.log(`Generated the offline report and ${cases.length} case records (L1 metadata check only; native behavior remains unrun).`);
