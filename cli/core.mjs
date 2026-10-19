import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, mkdirSync, renameSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, resolve, sep, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = join(packageRoot, 'skills', 'brad');
const copilotSource = join(packageRoot, '.github', 'agents', 'brad.agent.md');
const AGENTS = ['claude', 'codex', 'copilot', 'antigravity'];
const MARKER = '.brad-install.json';

export function version() {
  const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const ver = readFileSync(join(packageRoot, 'VERSION'), 'utf8').trim();
  if (pkg.version !== ver) throw new Error(`Version mismatch: package=${pkg.version}, VERSION=${ver}`);
  return ver;
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const isDir = p => existsSync(p) && lstatSync(p).isDirectory();
const isFile = p => existsSync(p) && lstatSync(p).isFile();

function allFiles(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Refusing symlink in package: ${rel}`);
    if (entry.isDirectory()) out.push(...allFiles(join(dir, entry.name), rel));
    else if (entry.isFile() && !rel.split('/').includes('__pycache__') && !rel.endsWith('.pyc')) out.push(rel);
  }
  return out;
}
const SOURCE_FILES = () => allFiles(skillRoot);

function parse(args) {
  const o = { command: 'init', agent: 'auto', dir: process.cwd(), global: false, force: false, dryRun: false, json: false, yes: false, help: false };
  const rest = [...args];
  if (rest[0] && !rest[0].startsWith('-')) o.command = rest.shift();
  while (rest.length) {
    const token = rest.shift();
    if (['--help', '-h'].includes(token)) o.help = true;
    else if (['--version', '-v'].includes(token)) o.command = 'version';
    else if (['--global', '-g'].includes(token)) o.global = true;
    else if (['--force', '-f'].includes(token)) o.force = true;
    else if (['--dry-run', '-n'].includes(token)) o.dryRun = true;
    else if (token === '--json') o.json = true;
    else if (['--yes', '-y'].includes(token)) o.yes = true;
    else if (token.startsWith('--agent=')) o.agent = token.substring(8);
    else if (token === '--agent') o.agent = rest.shift() || '';
    else if (token.startsWith('--dir=')) o.dir = token.substring(6);
    else if (token === '--dir') o.dir = rest.shift() || '';
    else throw new Error(`Unknown option: ${token}`);
  }
  if (o.global && o.dir !== process.cwd()) throw new Error('--global cannot be combined with --dir');
  if (!o.dir) throw new Error('--dir needs a path');
  if (!['init', 'update', 'doctor', 'uninstall', 'version', 'help'].includes(o.command)) throw new Error(`Unknown command: ${o.command}`);
  o.dir = resolve(o.dir);
  return o;
}

const help = `BRAD — BMAD Routing & Agent Delegation

Usage:
  brad init [--agent auto|claude|codex|copilot|antigravity|all] [--dir PATH]
  brad doctor [--dir PATH] [--json]
  brad update [--agent ...] [--force]
  brad uninstall [--agent ...] [--force]
  brad --version

Options:
  --agent <names>  Install for comma-separated coding hosts (default: auto)
  --global, -g    Install user-wide instead of in the current project
  --dir <path>    Target project path
  --dry-run, -n   Preview; never write to disk
  --force, -f     Back up and replace an existing modified/unmanaged install
  --json          Output structured JSON for automation
  --yes, -y       Non-interactive acknowledgment (no hidden approvals)

Examples:
  npx --yes github:niamatmarjan/brad#v0.2.0 init
  npx --yes github:niamatmarjan/brad#v0.2.0 init --agent claude
  npx --yes github:niamatmarjan/brad#v0.2.0 doctor

BRAD installs a thin skill; it does NOT install or modify BMAD Method.
`;

function detectAgents(root) {
  const detected = [];
  if (isDir(join(root, '.claude'))) detected.push('claude');
  if (isDir(join(root, '.github'))) detected.push('copilot');
  if (isDir(join(root, '.codex'))) detected.push('codex');
  if (isDir(join(root, '.agents')) && !detected.some(x => x !== 'claude')) detected.push('codex');
  if (isDir(join(root, '.gemini')) && !detected.includes('antigravity')) detected.push('antigravity');
  if (!detected.length) detected.push('codex'); // universal .agents/skills when no host detected
  return detected;
}
function selectedAgents(opts) {
  if (opts.agent === 'auto') return detectAgents(opts.dir);
  if (opts.agent === 'all') return AGENTS;
  const names = [...new Set(opts.agent.split(',').map(s => s.trim().toLowerCase()))];
  for (const name of names) if (!AGENTS.includes(name)) throw new Error(`Unknown agent: ${name}. Choose ${AGENTS.join(', ')}, all, or auto`);
  if (!names.length) throw new Error('No agents selected');
  return names;
}

function pathsFor(opts) {
  const root = opts.global ? homedir() : opts.dir;
  const selected = selectedAgents(opts);
  const plans = new Map();
  const universal = selected.includes('codex') || (!opts.global && selected.some(x => ['copilot', 'antigravity'].includes(x)));
  if (universal) plans.set(join(root, '.agents', 'skills', 'brad'), { kind: 'skill', agents: selected.filter(x => x !== 'claude') });
  if (selected.includes('claude')) plans.set(join(root, '.claude', 'skills', 'brad'), { kind: 'skill', agents: ['claude'] });
  if (opts.global && selected.includes('antigravity')) plans.set(join(root, '.gemini', 'config', 'skills', 'brad'), { kind: 'skill', agents: ['antigravity'] });
  if (opts.global && selected.includes('copilot')) plans.set(join(root, '.copilot', 'skills', 'brad'), { kind: 'skill', agents: ['copilot'] });
  if (!opts.global && selected.includes('copilot')) plans.set(join(root, '.github', 'agents', 'brad.agent.md'), { kind: 'copilot-agent', agents: ['copilot'] });
  return [...plans].map(([path, config]) => ({ path, ...config }));
}

function ensureInside(root, target) {
  // Reject redirecting writes outside the chosen root through symlink parents.
  const base = realpathSync(root);
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Refusing path outside target: ${target}`);
  let check = root;
  for (const part of rel.split(sep)) {
    check = join(check, part);
    if (existsSync(check) && lstatSync(check).isSymbolicLink()) throw new Error(`Refusing symlinked path: ${check}`);
  }
  return base;
}
function sourceHashMap() {
  return Object.fromEntries(SOURCE_FILES().map(rel => [rel, sha(readFileSync(join(skillRoot, rel)))]));
}
function checkExisting(plan) {
  if (!existsSync(plan.path)) return { status: 'absent' };
  if (lstatSync(plan.path).isSymbolicLink()) return { status: 'unsafe', reason: 'symlink' };
  if (plan.kind === 'copilot-agent') {
    if (!isFile(plan.path)) return { status: 'unmanaged', reason: 'not a regular file' };
    const current = readFileSync(plan.path, 'utf8');
    const source = readFileSync(copilotSource, 'utf8');
    return current === source ? { status: 'current' } : { status: 'unmanaged', reason: 'customized or foreign coordinator' };
  }
  if (!isDir(plan.path)) return { status: 'unmanaged', reason: 'not a directory' };
  const markerFile = join(plan.path, MARKER);
  if (!isFile(markerFile)) return { status: 'unmanaged', reason: 'no BRAD install marker' };
  try {
    const marker = JSON.parse(readFileSync(markerFile, 'utf8'));
    if (marker.tool !== 'brad' || !marker.files || typeof marker.files !== 'object') return { status: 'unmanaged', reason: 'invalid BRAD marker' };
    const actual = allFiles(plan.path).filter(p => p !== MARKER);
    if (actual.length !== Object.keys(marker.files).length || actual.some(p => marker.files[p] !== sha(readFileSync(join(plan.path, p))))) return { status: 'modified', version: marker.version };
    if (marker.version !== version()) return { status: 'outdated', version: marker.version };
    const upstream = sourceHashMap();
    if (Object.keys(upstream).length !== actual.length || actual.some(p => upstream[p] !== marker.files[p])) return { status: 'modified', version: marker.version };
    return { status: 'current', version: marker.version };
  } catch {
    return { status: 'unmanaged', reason: 'unreadable/invalid marker' };
  }
}

function copyNew(plan, tmp) {
  if (plan.kind === 'copilot-agent') {
    cpSync(copilotSource, tmp);
    return;
  }
  cpSync(skillRoot, tmp, { recursive: true, filter: p => !p.split(sep).includes('__pycache__') && !p.endsWith('.pyc') });
  writeFileSync(join(tmp, MARKER), JSON.stringify({ tool: 'brad', version: version(), files: sourceHashMap() }, null, 2) + '\n');
}
function moveWithRollback(plan, options) {
  ensureInside(options.global ? homedir() : options.dir, plan.path);
  const before = checkExisting(plan);
  if (before.status === 'unsafe') throw new Error(`Refusing symlink: ${plan.path}`);
  const isConflict = ['unmanaged', 'modified'].includes(before.status);
  if (isConflict && !options.force) throw new Error(`Refusing to overwrite ${plan.path} (${before.status}). Use --force to create a backup and replace.`);
  if (options.command === 'update' && before.status === 'absent') return { ...plan, action: 'skipped', reason: 'not installed' };
  if (before.status === 'current') return { ...plan, action: 'unchanged' };
  if (options.dryRun) return { ...plan, action: before.status === 'absent' ? 'would-install' : 'would-update', previous: before.status };
  const parent = dirname(plan.path);
  mkdirSync(parent, { recursive: true });
  const staged = join(parent, `.brad-staging-${randomUUID()}`);
  const backup = join(parent, `.brad-backup-${randomUUID()}`);
  let backed = false;
  try {
    if (plan.kind === 'skill') mkdirSync(staged); // cp on an existing directory copies contents into it
    copyNew(plan, staged);
    if (existsSync(plan.path)) { renameSync(plan.path, backup); backed = true; }
    try { renameSync(staged, plan.path); }
    catch (e) { if (backed && !existsSync(plan.path)) renameSync(backup, plan.path); throw e; }
    if (backed && !isConflict) rmSync(backup, { recursive: true, force: true });
    return { ...plan, action: before.status === 'absent' ? 'installed' : 'updated', ...(backed && isConflict ? { backup } : {}) };
  } finally {
    if (existsSync(staged)) rmSync(staged, { force: true, recursive: true });
  }
}

function uninstall(plan, options) {
  ensureInside(options.global ? homedir() : options.dir, plan.path);
  const before = checkExisting(plan);
  if (before.status === 'absent') return { ...plan, action: 'not-installed' };
  if (before.status === 'unsafe') throw new Error(`Refusing symlink: ${plan.path}`);
  if (['modified', 'unmanaged'].includes(before.status) && !options.force) throw new Error(`Cannot remove modified/unmanaged path without --force: ${plan.path}`);
  if (options.dryRun) return { ...plan, action: 'would-uninstall' };
  const backup = join(dirname(plan.path), `.brad-uninstall-backup-${randomUUID()}`);
  if (['modified', 'unmanaged'].includes(before.status)) { renameSync(plan.path, backup); return { ...plan, action: 'backed-up', backup }; }
  rmSync(plan.path, { recursive: true, force: true });
  return { ...plan, action: 'uninstalled' };
}

function bmadCheck(root) {
  const found = ['_bmad', '_bmad-output', '.bmad'].filter(p => existsSync(join(root, p)));
  let git = false;
  try { execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, timeout: 2500, stdio: 'pipe' }); git = true; } catch { /* no git */ }
  return { detected: found.length > 0, paths: found, git, note: found.length ? 'BMAD-like paths detected, exact workflow availability unverified' : 'BMAD Method not detected; install it separately with npx bmad-method install' };
}
export function execute(argv) {
  const options = parse(argv);
  if (options.help || options.command === 'help') return { help };
  if (options.command === 'version') return { version: version() };
  if (!isDir(options.dir) && !options.global) throw new Error(`Project directory does not exist: ${options.dir}`);
  const plans = pathsFor(options);
  if (options.command === 'doctor') {
    return { command: 'doctor', version: version(), root: options.global ? homedir() : options.dir, hosts: selectedAgents(options), results: plans.map(x => ({ ...x, ...checkExisting(x) })), bmad: options.global ? null : bmadCheck(options.dir) };
  }
  // Preflight all paths before performing any writes, so collisions are detected early.
  for (const p of plans) {
    ensureInside(options.global ? homedir() : options.dir, p.path);
    const s = checkExisting(p);
    if (s.status === 'unsafe') throw new Error(`Refusing symlinked install: ${p.path}`);
    if (['modified', 'unmanaged'].includes(s.status) && !options.force) throw new Error(`${p.path} is ${s.status}. Use --force to back it up and replace.`);
  }
  const results = plans.map(p => options.command === 'uninstall' ? uninstall(p, options) : moveWithRollback(p, options));
  return { command: options.command, version: version(), root: options.global ? homedir() : options.dir, hosts: selectedAgents(options), results, ...(options.global ? {} : { bmad: bmadCheck(options.dir) }) };
}
export async function main(argv) {
  let json = argv.includes('--json');
  try {
    const result = execute(argv);
    if (json) process.stdout.write(JSON.stringify({ ok: true, ...result }, null, 2) + '\n');
    else if (result.help) process.stdout.write(result.help);
    else if (result.command === undefined) process.stdout.write(`BRAD ${result.version}\n`);
    else {
      process.stdout.write(`BRAD v${result.version} — ${result.command}\n`);
      for (const r of result.results) process.stdout.write(`  ${r.action || r.status}: ${r.path}${r.backup ? ` (backup: ${r.backup})` : ''}\n`);
      if (result.bmad && !result.bmad.detected) process.stdout.write(`\nNote: ${result.bmad.note}\n`);
      if (['init', 'update'].includes(result.command)) process.stdout.write('\nRestart your coding agent if BRAD is not discovered automatically.\n');
    }
  } catch (e) {
    if (json) process.stdout.write(JSON.stringify({ ok: false, error: e.message }, null, 2) + '\n');
    else process.stderr.write(`BRAD error: ${e.message}\n`);
    process.exitCode = 1;
  }
}
