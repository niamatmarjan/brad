import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, mkdirSync, renameSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, resolve, sep, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync, spawn } from 'node:child_process';

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = join(packageRoot, 'skills', 'brad');
const copilotSource = join(packageRoot, '.github', 'agents', 'brad.agent.md');
const AGENTS = ['claude', 'codex', 'copilot', 'antigravity'];
const HOST_CHOICES = [...AGENTS, 'portable'];
const MARKER = '.brad-install.json';

export const KNOWN_BMAD_TOOLS = [
  'claude-code', 'codex', 'cursor', 'github-copilot', 'antigravity', 'antigravity-cli',
  'adal', 'auggie', 'goose', 'cline', 'codebuddy', 'codewhale', 'command-code', 'crush',
  'droid', 'firebender', 'gemini', 'grok', 'hermes', 'bob', 'iflow', 'junie', 'kilo',
  'kimi-code', 'kiro', 'kode', 'mistral-vibe', 'mux', 'neovate', 'ona', 'openclaw',
  'opencode', 'openhands', 'pi', 'pochi', 'polytoken', 'qoder', 'qwen', 'replit',
  'roo', 'rovo-dev', 'cortex', 'amp', 'trae', 'warp', 'windsurf', 'zcode', 'zencoder'
];

export function detectTerminal(options = {}) {
  if (options.nonInteractive) {
    return { mode: 'non-interactive', isTTY: false, reason: 'explicit-flag' };
  }
  if (typeof options.isTTY === 'boolean') {
    return options.isTTY ? { mode: 'interactive', isTTY: true } : { mode: 'headless', isTTY: false, reason: 'option-override' };
  }
  const stdinTTY = Boolean(process.stdin && process.stdin.isTTY);
  const stdoutTTY = Boolean(process.stdout && process.stdout.isTTY);
  if (stdinTTY && stdoutTTY) {
    return { mode: 'interactive', isTTY: true };
  }
  if (!stdinTTY) {
    return { mode: 'headless', isTTY: false, reason: 'no-stdin-tty' };
  }
  return { mode: 'unreliable', isTTY: false, reason: 'no-stdout-tty' };
}

export function terminateProcessTree(child, signal = 'SIGTERM') {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill.exe', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' });
    } catch {}
  } else {
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {}
    }
  }
}

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
  const o = {
    command: 'init', agent: 'auto', dir: process.cwd(), global: false, force: false,
    dryRun: false, json: false, yes: false, help: false, withBmad: false,
    bmadChannel: 'stable', bmadChannelSpecified: false,
    bmadModules: null, bmadTools: null, bmadTimeout: 180000, nonInteractive: false
  };
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
    else if (token === '--with-bmad') o.withBmad = true;
    else if (token.startsWith('--bmad-channel=')) { o.bmadChannel = token.substring(15); o.bmadChannelSpecified = true; }
    else if (token === '--bmad-channel') { o.bmadChannel = rest.shift() || ''; o.bmadChannelSpecified = true; }
    else if (token.startsWith('--bmad-modules=')) { o.bmadModules = token.substring(15); }
    else if (token === '--bmad-modules') { o.bmadModules = rest.shift() || ''; }
    else if (token.startsWith('--bmad-tools=')) { o.bmadTools = token.substring(13); }
    else if (token === '--bmad-tools') { o.bmadTools = rest.shift() || ''; }
    else if (token.startsWith('--bmad-timeout=')) { o.bmadTimeout = Number(token.substring(15)); }
    else if (token === '--bmad-timeout') { o.bmadTimeout = Number(rest.shift() || ''); }
    else if (['--non-interactive', '--noninteractive'].includes(token)) o.nonInteractive = true;
    else if (token.startsWith('--agent=')) o.agent = token.substring(8);
    else if (token === '--agent') o.agent = rest.shift() || '';
    else if (token.startsWith('--dir=')) o.dir = token.substring(6);
    else if (token === '--dir') o.dir = rest.shift() || '';
    else throw new Error(`Unknown option: ${token}`);
  }
  if (o.global && o.dir !== process.cwd()) throw new Error('--global cannot be combined with --dir');
  if (o.withBmad && o.global) throw new Error('--with-bmad is project-local; --global is unsupported');
  if (o.withBmad && o.command !== 'setup') throw new Error('--with-bmad is only supported with brad setup');
  if (o.bmadChannelSpecified && !o.withBmad) throw new Error('--bmad-channel requires --with-bmad');
  if (o.bmadModules !== null && !o.withBmad) throw new Error('--bmad-modules requires --with-bmad');
  if (o.bmadTools !== null && !o.withBmad) throw new Error('--bmad-tools requires --with-bmad');
  if (o.bmadTimeout !== 180000 && !o.withBmad) throw new Error('--bmad-timeout requires --with-bmad');
  if (!['stable', 'preview'].includes(o.bmadChannel)) throw new Error('--bmad-channel must be stable or preview');
  if (o.bmadChannel === 'preview' && (o.bmadModules !== null || o.bmadTools !== null)) {
    throw new Error('--bmad-modules and --bmad-tools are not supported with --bmad-channel preview');
  }
  if (!Number.isFinite(o.bmadTimeout) || o.bmadTimeout <= 0) {
    throw new Error('--bmad-timeout must be a positive number of milliseconds');
  }
  if (o.bmadModules !== null) {
    const trimmed = o.bmadModules.trim();
    if (!trimmed || !/^[a-z0-9_-]+(,[a-z0-9_-]+)*$/.test(trimmed)) {
      throw new Error(`Invalid BMAD module list: "${o.bmadModules}". Use comma-separated lowercase module identifiers (e.g. bmm,tea).`);
    }
    o.bmadModules = trimmed;
  }
  if (o.bmadTools !== null) {
    const trimmed = o.bmadTools.trim();
    if (!trimmed || !/^[a-z0-9_-]+(,[a-z0-9_-]+)*$/.test(trimmed)) {
      throw new Error(`Invalid BMAD tool list: "${o.bmadTools}". Use comma-separated tool identifiers (e.g. antigravity,claude-code).`);
    }
    const tools = trimmed.split(',').map(t => t.trim());
    for (const t of tools) {
      if (!KNOWN_BMAD_TOOLS.includes(t)) {
        throw new Error(`Unknown BMAD tool identifier: "${t}". Use a supported tool (e.g. antigravity, claude-code, codex, github-copilot).`);
      }
    }
    o.bmadTools = trimmed;
  }
  if (o.withBmad && o.json && !o.dryRun) throw new Error('Interactive BMAD setup cannot use --json; use --dry-run --json to preview the plan.');
  if (!o.dir) throw new Error('--dir needs a path');
  if (!['init', 'setup', 'prompt', 'update', 'doctor', 'uninstall', 'version', 'help'].includes(o.command)) throw new Error(`Unknown command: ${o.command}`);
  o.dir = resolve(o.dir);
  return o;
}

const help = `BRAD — BMAD Routing & Agent Delegation

Usage:
  brad setup [--agent auto|portable|claude|codex|copilot|antigravity|all] [--dir PATH]
  brad setup --with-bmad [--bmad-channel stable|preview] [--bmad-modules <list>] [--bmad-tools <list>] [--non-interactive] [--bmad-timeout <ms>] [--agent HOST] [--dir PATH]
  brad prompt [--agent ...] [--dir PATH]   # copy instructions to your AI
  brad init [--agent ...] [--dir PATH]     # installer-only alias
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
  --with-bmad     Explicitly authorize upstream BMAD setup when absent
  --bmad-channel  Select latest stable (default) or v7 preview (alpha)
  --bmad-modules  Comma-separated module IDs for unattended setup (e.g. bmm,tea)
  --bmad-tools    Comma-separated tool IDs for unattended setup (e.g. antigravity)
  --non-interactive Run setup without terminal prompts; fails if config missing
  --bmad-timeout  Upstream installer timeout in milliseconds (default: 180000)

Examples:
  npx --yes "github:niamatmarjan/brad#v${version()}" setup
  npx --yes "github:niamatmarjan/brad#v${version()}" setup --agent claude
  npx --yes "github:niamatmarjan/brad#v${version()}" doctor
  npx --yes "github:niamatmarjan/brad#v${version()}" setup --with-bmad --bmad-modules bmm --bmad-tools antigravity

Normal BRAD setup installs only BRAD. --with-bmad explicitly runs the official
installer in this project when BMAD is absent (not an upgrade). In headless or
non-TTY terminals, unattended stable setup requires --bmad-modules and
--bmad-tools to prevent hanging on prompts. V7 preview requires an interactive
terminal and host completion.
`;

function detectAgents(root) {
  const detected = [];
  if (isDir(join(root, '.claude'))) detected.push('claude');
  // Many repositories have .github/workflows for CI; that alone is not a Copilot signal.
  if (isDir(join(root, '.github/agents')) || isDir(join(root, '.github/skills')) || isFile(join(root, '.github/copilot-instructions.md'))) detected.push('copilot');
  if (isDir(join(root, '.codex'))) detected.push('codex');
  if (isDir(join(root, '.gemini'))) detected.push('antigravity');
  // .agents/skills is shared by multiple coding hosts, so never label it Codex by guess.
  if (!detected.length) detected.push('portable');
  return detected;
}
function selectedAgents(opts) {
  if (opts.agent === 'auto') {
    const found = detectAgents(opts.dir);
    if (opts.global && found.includes('portable')) throw new Error('Cannot infer a user-global coding host. Choose --agent claude, codex, antigravity, or copilot.');
    return found;
  }
  if (opts.agent === 'all') return AGENTS;
  const names = [...new Set(opts.agent.split(',').map(s => s.trim().toLowerCase()))];
  for (const name of names) if (!HOST_CHOICES.includes(name)) throw new Error(`Unknown agent: ${name}. Choose ${HOST_CHOICES.join(', ')}, all, or auto`);
  if (!names.length) throw new Error('No agents selected');
  return names;
}

function pathsFor(opts) {
  const root = opts.global ? homedir() : opts.dir;
  const selected = selectedAgents(opts);
  const plans = new Map();
  const universal = selected.includes('codex') || (!opts.global && selected.some(x => ['portable', 'copilot', 'antigravity'].includes(x)));
  if (universal) plans.set(join(root, '.agents', 'skills', 'brad'), { kind: 'skill', agents: selected.filter(x => x !== 'claude') });
  if (selected.includes('claude')) plans.set(join(root, '.claude', 'skills', 'brad'), { kind: 'skill', agents: ['claude'] });
  if (opts.global && selected.includes('portable')) throw new Error('Choose an explicit --agent for global installation');
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
function renameWithRetry(from, to) {
  for (let i = 0; i < 5; i++) {
    try {
      renameSync(from, to);
      return;
    } catch (err) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES', 'EBUSY'].includes(err.code) && i < 4) {
        const deadline = Date.now() + 50;
        while (Date.now() < deadline) {}
        continue;
      }
      throw err;
    }
  }
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
    if (existsSync(plan.path)) { renameWithRetry(plan.path, backup); backed = true; }
    try { renameWithRetry(staged, plan.path); }
    catch (e) { if (backed && !existsSync(plan.path)) renameWithRetry(backup, plan.path); throw e; }
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

// Report observed facts, not assumptions that an installed BMAD agent has actually run.
function bmadCheck(root) {
  const paths = ['_bmad', '_bmad-output', '.bmad'].filter(p => existsSync(join(root, p)));
  const configured = ['_bmad/config.toml', '_bmad/config.yaml', '_bmad/core/config.yaml'].some(p => isFile(join(root, p)));
  const roots = ['.agents/skills', '.agent/skills', '.claude/skills', '.codex/skills', '.github/skills'];
  const installedSkillNames = new Set();
  for (const skillDir of roots) {
    const path = join(root, skillDir);
    if (!isDir(path)) continue;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory() && (entry.name.startsWith('bmad-') || entry.name === 'bmad') && isFile(join(path, entry.name, 'SKILL.md'))) installedSkillNames.add(entry.name);
    }
  }
  const hasRuntime = isDir(join(root, '_bmad'));
  const detected = hasRuntime || installedSkillNames.size > 0;
  const warnings = [];
  if (!detected) warnings.push('Official BMAD Method not detected; ask your agent to offer an official BMAD setup.');
  else if (!configured) warnings.push('BMAD-like files/skills present, but shared runtime configuration was not verified.');
  if (!installedSkillNames.size) warnings.push('No native bmad-* SKILL.md discovered in common project locations; check the coding host skill catalog.');
  // Doctor is read-only: provide a recovery *suggestion*, never run the BMAD installer.
  // Workspace-local files cannot tell us whether the active coding host loaded a skill.
  const recovery = !detected ? {
    status: 'OFFICIAL_BMAD_INSTALL_REQUIRED',
    installCommand: `${process.platform === 'win32' ? 'npx.cmd' : 'npx'} bmad-method install`,
    bradSetupCommand: 'brad setup --with-bmad',
    previewSetupCommand: 'brad setup --with-bmad --bmad-channel preview',
    requiresApproval: true,
    guidance: 'Choose a supported BMAD version with the user before installing official BMAD into the intended project.'
  } : !configured ? {
    status: 'VERIFY_BMAD_CONFIGURATION',
    installCommand: null,
    requiresApproval: false,
    guidance: 'Inspect the current BMAD runtime configuration; do not reinstall or migrate automatically.'
  } : !installedSkillNames.size ? {
    status: 'VERIFY_NATIVE_SKILL_INSTALLATION',
    installCommand: null,
    requiresApproval: false,
    guidance: 'Runtime configuration exists but no project-local native BMAD skills were found. Inspect the installed version and host-specific skill paths.'
  } : {
    status: 'VERIFY_HOST_SKILL_DISCOVERY',
    installCommand: null,
    requiresApproval: false,
    guidance: 'Project-local BMAD files are present. Check this session\'s actual host skill catalog and restart the session if it was loaded before installation.'
  };
  const v6 = existsSync(join(root, '_bmad-output/implementation-artifacts/sprint-status.yaml'));
  const v7 = existsSync(join(root, '_bmad-output/tickets.toml')) || existsSync(join(root, '_bmad/tickets.toml'));
  if (v6 && v7) warnings.push('Both v6 and v7 state hints exist; ask user which native state system owns this task before writing.');
  return { detected, configured, runtime: hasRuntime, paths, nativeSkills: [...installedSkillNames].sort(),
    discovery: {
      workspaceSkillInventory: installedSkillNames.size ? 'FOUND' : 'NOT_FOUND',
      externalCaches: 'NOT_INSPECTED',
      hostSkillCatalog: 'NOT_VERIFIED',
      nativeWorkflowInvocation: 'NOT_VERIFIED',
      note: 'External caches and files on disk are not proof the active host registered or invoked skills. Verify in the host.'
    },
    recovery,
    stateHints: { v6, v7, mixed: v6 && v7 }, warnings,
    note: detected ? 'BMAD installation hints found. Native routing and subagent execution must still be checked in the coding host.' : 'BMAD Method not detected. Install it separately using the official npx bmad-method install or v7 skills setup.' };
}
function binaryPresence(command) {
  try {
    // Windows .cmd shims are not reliably spawnable by execFileSync without a shell.
    // Use where.exe rather than invoking them or bypassing execution policy.
    if (process.platform === 'win32' && command.toLowerCase().endsWith('.cmd'))
      execFileSync('where.exe', [command], { timeout: 2500, stdio: 'pipe', windowsHide: true });
    else execFileSync(command, ['--version'], { timeout: 2500, stdio: 'pipe', windowsHide: true });
    return true;
  }
  catch { return false; }
}
function npmGitDiagnostic() {
  // Read-only, bounded probes. npm policy varies by version/environment.
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const details = { version: null, gitSourcePolicy: 'unknown', recommendation: null };
  try {
    // Running .cmd directly without a shell is unreliable on Windows; let the
    // user's terminal / AI agent inspect npm config there instead.
    if (process.platform === 'win32') {
      details.recommendation = 'Use npm.cmd/npx.cmd from PowerShell; if Git source fetch fails, inspect npm config without changing global security settings.';
      return details;
    }
    const v = execFileSync(cmd, ['--version'], { encoding: 'utf8', stdio: 'pipe', timeout: 2500 }).trim();
    details.version = v;
    if (Number(v.split('.')[0]) >= 12) {
      const policy = execFileSync(cmd, ['config', 'get', 'allow-git'], { encoding: 'utf8', stdio: 'pipe', timeout: 2500 }).trim();
      if (policy && !['undefined', 'null'].includes(policy.toLowerCase())) details.gitSourcePolicy = policy;
      if (!['all', 'unknown'].includes(details.gitSourcePolicy.toLowerCase()))
        details.recommendation = 'A Git-source policy may block the pinned GitHub package. Diagnose the failure; consider a temporary per-command override only if supported, never a silent global config change.';
    }
  } catch { /* npm unavailable or this option unsupported; preserve unknown */ }
  return details;
}
function readinessSummary(results, bmad) {
  const current = results.length > 0 && results.every(r => r.status === 'current' || r.action === 'installed' || r.action === 'unchanged' || r.action === 'updated');
  return {
    bradFiles: current ? 'VERIFIED' : 'INCOMPLETE',
    nativeBmad: bmad?.configured && bmad?.nativeSkills.length ? 'LOCAL_CONFIG_AND_SKILLS_FOUND' : 'NOT_VERIFIED',
    hostInvocation: 'NOT_VERIFIED',
    specialistDelegation: 'NOT_VERIFIED',
    githubPR: 'NOT_VERIFIED',
    ci: 'NOT_VERIFIED',
    note: 'BRAD installer checks are not proof of runtime agent invocation or remote delivery.'
  };
}
function diagnostics(root) {
  const powershellCmd = process.platform === 'win32';
  const npxName = powershellCmd ? 'npx.cmd' : 'npx';
  const npmName = powershellCmd ? 'npm.cmd' : 'npm';
  const git = binaryPresence('git');
  return {
    platform: process.platform, node: process.version, nodeSupported: Number(process.versions.node.split('.')[0]) >= 20,
    git, npm: binaryPresence(npmName), npx: binaryPresence(npxName), npmGit: npmGitDiagnostic(),
    python: binaryPresence(powershellCmd ? 'python' : 'python3') || binaryPresence('python'),
    uv: binaryPresence('uv'), gh: binaryPresence('gh'),
    windowsCommandHint: powershellCmd ? 'Use npx.cmd and npm.cmd in PowerShell if npm.ps1 execution is blocked.' : null,
    verificationBoundary: 'File integrity and local executable checks only; not proof of agent invocation, GitHub authorization, PR creation, or CI passing.'
  };
}
function aiPrompt(options) {
  const host = options.agent === 'auto' ? 'detect which coding host this project uses' : `target host(s): ${selectedAgents(options).join(', ')}`;
  const program = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const command = `${program} --yes "github:niamatmarjan/brad#v${version()}"`;
  return `Set up BRAD (BMAD Routing & Agent Delegation) in this repository.

` +
    `Project root: ${options.dir}
Host: ${host}.

` +
    `1. Read https://github.com/niamatmarjan/brad/blob/v${version()}/docs/AI_SETUP.md and inspect this repository without altering unrelated files.
` +
    `2. Run ${command} doctor --dir "${options.dir}" --json, and explain gaps.
` +
    `3. Run ${command} setup --dir "${options.dir}"${options.agent === 'auto' ? '' : ` --agent ${options.agent}`} --json to install BRAD. Use --dry-run first if an existing skill installation is detected.
` +
    `4. If official BMAD Method is missing, explain the stable v6.12 versus preview v7 choice, ask which to use, and then use the official installer with permission; do not silently migrate or upgrade.
` +
    `5. Rerun doctor, confirm SKILL.md discovery in the coding host, and perform a read-only skill routing smoke test. Restart the agent session if discovery needs refresh.
` +
    `6. Summarize files changed, detected BMAD version, commands/results, supported capabilities, limitations, and a safe example to try. Never claim PRs, tests, subagents, or installations ran unless verified.
`;
}
function nextSteps(options, bmad, plans) {
  const messages = [];
  if (!bmad.detected) messages.push('With explicit consent, run brad setup --with-bmad to install official BMAD Method (latest stable), or --with-bmad --bmad-channel preview (v7 alpha). In non-interactive/agent environments, provide --bmad-modules and --bmad-tools.');
  else if (!bmad.configured) messages.push('Ask your agent to inspect and finish the native BMAD project setup; runtime configuration was not verified.');
  messages.push('Restart or reload your coding agent if its skill catalog was cached.');
  messages.push('In your AI coding chat, ask: "Use the BRAD skill to inspect this project and preview the next ticket workflow; do not change files."');
  messages.push('For PR delivery, separately verify a GitHub remote, credentials, and real CI checks before enabling publish.');
  if (plans.some(p => p.kind === 'copilot-agent')) messages.push('For GitHub Copilot, select the BRAD coordinator agent if automatic skill discovery is not available.');
  return messages;
}
// Plan only; native BMAD remains owned by the official upstream installer.
export function officialBmadSetupPlan(bmad, options) {
  if (!options.withBmad) return null;
  if (bmad?.detected) return {
    status: 'SKIPPED_EXISTING', channel: options.bmadChannel,
    command: null, args: [], explanation: 'BMAD runtime or skills already exist. Preserve and inspect the existing installation; do not reinstall or upgrade.'
  };

  const terminal = detectTerminal(options);
  const stable = options.bmadChannel === 'stable';
  const hasHeadlessConfig = Boolean(options.bmadModules && options.bmadTools);

  if (!stable) {
    if (!terminal.isTTY && !options.dryRun) {
      return {
        status: 'BLOCKED_NO_TTY',
        channel: 'preview',
        command: null,
        args: [],
        explanation: 'BMAD v7 preview (Skills CLI) requires an interactive terminal and cannot run unattended in a headless environment. Finish native bmad setup in your host.',
        suggestedCommands: {
          foreground: 'brad setup --with-bmad --bmad-channel preview'
        }
      };
    }
    return {
      status: options.dryRun ? 'WOULD_INSTALL' : 'READY_TO_INSTALL',
      channel: 'preview',
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: ['--yes', 'skills', 'add', 'bmad-code-org/BMAD-METHOD'],
      upstreamInstaller: 'official-skills-cli-preview',
      interactive: true,
      authorizedByFlag: true,
      timeout: options.bmadTimeout || 180000,
      nextStep: 'Select host and skills in the Skills CLI; restart your coding host, invoke the native bmad skill to run bmad setup, then run bmad status.'
    };
  }

  // Stable channel
  // In a headless / non-interactive environment without complete headless configuration:
  if (!terminal.isTTY && !hasHeadlessConfig && (!options.dryRun || options.nonInteractive)) {
    const missing = [];
    if (!options.bmadModules) missing.push('--bmad-modules <modules>');
    if (!options.bmadTools) missing.push('--bmad-tools <tools>');
    const fallbackTool = options.agent && options.agent !== 'auto' && KNOWN_BMAD_TOOLS.includes(options.agent)
      ? options.agent : 'antigravity';
    return {
      status: 'MISSING_HEADLESS_CONFIG',
      channel: 'stable',
      command: null,
      args: [],
      missingConfig: missing,
      explanation: `Official BMAD stable installation in a non-interactive/headless terminal requires explicit configuration to avoid hanging on terminal input. Missing: ${missing.join(', ')}.`,
      suggestedCommands: {
        interactive: 'brad setup --with-bmad',
        headless: `brad setup --with-bmad --bmad-modules bmm --bmad-tools ${fallbackTool}`
      }
    };
  }

  // If complete headless configuration is provided:
  if (hasHeadlessConfig) {
    const args = [
      '--yes', 'bmad-method@latest', 'install',
      '--yes',
      '--directory', '.',
      '--modules', options.bmadModules,
      '--tools', options.bmadTools
    ];
    return {
      status: options.dryRun ? 'WOULD_INSTALL' : 'READY_TO_INSTALL',
      channel: 'stable',
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args,
      upstreamInstaller: 'official-npm-stable',
      interactive: false,
      authorizedByFlag: true,
      timeout: options.bmadTimeout || 180000,
      nextStep: 'Restart your coding host and verify BMAD configuration and its actual skill catalog.'
    };
  }

  // Default interactive stable install:
  return {
    status: options.dryRun ? 'WOULD_INSTALL' : 'READY_TO_INSTALL',
    channel: 'stable',
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['--yes', 'bmad-method@latest', 'install'],
    upstreamInstaller: 'official-npm-stable',
    interactive: true,
    authorizedByFlag: true,
    timeout: options.bmadTimeout || 180000,
    nextStep: 'Complete official v6 installer prompts. Restart your coding host and verify BMAD configuration and its actual skill catalog.'
  };
}

export function execute(argv, overrides = {}) {
  const options = { ...parse(argv), ...overrides };
  if (options.help || options.command === 'help') return { help };
  if (options.command === 'version') return { version: version() };
  if (!isDir(options.dir) && !options.global) throw new Error(`Project directory does not exist: ${options.dir}`);
  const plans = pathsFor(options);
  if (options.command === 'doctor' || options.command === 'prompt') {
    if (options.command === 'prompt') return { command: 'prompt', version: version(), prompt: aiPrompt(options) };
    const bmad = options.global ? null : bmadCheck(options.dir);
    const results = plans.map(x => ({ ...x, ...checkExisting(x) }));
    return { command: 'doctor', version: version(), root: options.global ? homedir() : options.dir,
      hosts: selectedAgents(options), results, bmad, environment: diagnostics(options.dir),
      readiness: readinessSummary(results, bmad),
      nextSteps: bmad ? nextSteps(options, bmad, plans) : ['Verify your coding host sees BRAD from its user-level skill directory.'] };
  }
  // Preflight all paths before performing any writes, so collisions are detected early.
  for (const p of plans) {
    ensureInside(options.global ? homedir() : options.dir, p.path);
    const s = checkExisting(p);
    if (s.status === 'unsafe') throw new Error(`Refusing symlinked install: ${p.path}`);
    if (['modified', 'unmanaged'].includes(s.status) && !options.force) throw new Error(`${p.path} is ${s.status}. Use --force to back it up and replace.`);
  }
  const results = plans.map(p => options.command === 'uninstall' ? uninstall(p, options) : moveWithRollback(p, options));
  const bmad = options.global ? null : bmadCheck(options.dir);
  return { command: options.command, version: version(), root: options.global ? homedir() : options.dir, hosts: selectedAgents(options), results,
    ...(options.global ? {} : { bmad }),
    ...(options.withBmad ? { bmadSetup: officialBmadSetupPlan(bmad, options) } : {}),
    nextSteps: bmad ? nextSteps(options, bmad, plans) : [],
    readiness: readinessSummary(results, bmad), executionVerified: false };
}
export async function main(argv) {
  let json = argv.includes('--json');
  try {
    const result = execute(argv);
    if (result.bmadSetup?.status === 'MISSING_HEADLESS_CONFIG' && !argv.includes('--dry-run') && !argv.includes('-n')) {
      const plan = result.bmadSetup;
      process.stdout.write(`BRAD v${result.version} — ${result.command}\n`);
      for (const r of result.results) process.stdout.write(`  ${r.action || r.status}: ${r.path}${r.backup ? ` (backup: ${r.backup})` : ''}\n`);
      process.stdout.write(`  BMAD: MISSING_HEADLESS_CONFIG (${plan.channel})\n`);
      process.stderr.write(`\nBRAD error: Missing headless BMAD configuration.\n${plan.explanation}\n\nSupported foreground command:\n  ${plan.suggestedCommands.interactive}\n\nSupported headless command:\n  ${plan.suggestedCommands.headless}\n`);
      process.exitCode = 1;
      return;
    }
    if (result.bmadSetup?.status === 'BLOCKED_NO_TTY' && !argv.includes('--dry-run') && !argv.includes('-n')) {
      const plan = result.bmadSetup;
      process.stdout.write(`BRAD v${result.version} — ${result.command}\n`);
      for (const r of result.results) process.stdout.write(`  ${r.action || r.status}: ${r.path}${r.backup ? ` (backup: ${r.backup})` : ''}\n`);
      process.stdout.write(`  BMAD: BLOCKED_NO_TTY (${plan.channel})\n`);
      process.stderr.write(`\nBRAD error: Cannot run BMAD installer without an interactive terminal.\n${plan.explanation}\n\nSupported foreground command:\n  ${plan.suggestedCommands.foreground}\n`);
      process.exitCode = 1;
      return;
    }
    if (result.bmadSetup?.status === 'READY_TO_INSTALL') {
      const plan = result.bmadSetup;
      process.stdout.write(`BRAD installed. Starting official BMAD ${plan.channel} installer in ${result.root}.\n`);
      if (plan.channel === 'preview') process.stdout.write('BMAD preview is alpha; finish native bmad setup from the coding host after skill installation.\n');
      
      const timeout = plan.timeout || 180000;
      const spawnCmd = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : plan.command;
      const spawnArgs = process.platform === 'win32' ? ['/d', '/s', '/c', plan.command, ...plan.args] : plan.args;
      const spawnEnv = process.platform === 'win32'
        ? { ...process.env, NoDefaultCurrentDirectoryInExePath: '1' }
        : process.env;
      const spawnOpts = {
        cwd: result.root,
        stdio: plan.interactive ? 'inherit' : ['ignore', 'inherit', 'inherit'],
        shell: false,
        windowsHide: true,
        detached: process.platform !== 'win32' && !plan.interactive,
        env: spawnEnv
      };
      
      const run = await new Promise(resolveRun => {
        let child;
        try {
          child = spawn(spawnCmd, spawnArgs, spawnOpts);
        } catch (err) {
          resolveRun({ error: err, status: null, signal: null, pid: null });
          return;
        }

        let timedOut = false;
        let cancelledSignal = null;
        let timer = null;
        let forceTimer = null;

        const cancelTimers = () => {
          if (timer) { clearTimeout(timer); timer = null; }
          if (forceTimer) { clearTimeout(forceTimer); forceTimer = null; }
        };

        const onSignal = sig => {
          const effectiveSignal = sig || 'SIGINT';
          if (cancelledSignal) {
            terminateProcessTree(child, 'SIGKILL');
            return;
          }
          cancelledSignal = effectiveSignal;
          cancelTimers();
          terminateProcessTree(child, effectiveSignal);
          const grace = plan.escalationGrace || Math.min(2500, Math.max(200, Math.floor(timeout / 2) || 200));
          forceTimer = setTimeout(() => {
            terminateProcessTree(child, 'SIGKILL');
          }, grace);
        };

        const onSigInt = () => onSignal('SIGINT');
        const onSigTerm = () => onSignal('SIGTERM');

        process.on('SIGINT', onSigInt);
        process.on('SIGTERM', onSigTerm);

        const cleanup = () => {
          cancelTimers();
          process.removeListener('SIGINT', onSigInt);
          process.removeListener('SIGTERM', onSigTerm);
        };

        if (timeout && timeout > 0) {
          timer = setTimeout(() => {
            timedOut = true;
            terminateProcessTree(child, 'SIGTERM');
            const grace = plan.escalationGrace || Math.min(2500, Math.max(200, Math.floor(timeout / 2) || 200));
            forceTimer = setTimeout(() => {
              terminateProcessTree(child, 'SIGKILL');
            }, grace);
          }, timeout);
        }

        child.on('error', err => {
          cleanup();
          resolveRun({ error: err, status: null, signal: null, pid: child.pid });
        });

        child.on('close', (status, signal) => {
          cleanup();
          if (timedOut) {
            const err = new Error('timed out');
            err.code = 'ETIMEDOUT';
            resolveRun({ error: err, status, signal, pid: child.pid });
          } else if (cancelledSignal) {
            resolveRun({ error: null, status, signal: signal || cancelledSignal, pid: child.pid });
          } else {
            resolveRun({ error: null, status, signal, pid: child.pid });
          }
        });
      });
      
      if (run.error) {
        if (run.error.code === 'ETIMEDOUT') {
          result.bmadSetup = { ...plan, status: 'UPSTREAM_INSTALLER_TIMED_OUT', exitCode: null, timeout };
          throw new Error(`BRAD installed, but the official BMAD installer timed out after ${timeout}ms and was terminated. BRAD did not replace any existing BMAD files.`);
        }
        result.bmadSetup = { ...plan, status: 'UPSTREAM_INSTALLER_FAILED', exitCode: null, error: run.error.message };
        throw new Error(`BRAD installed, but the official BMAD installer failed (${run.error.message}). BRAD did not replace any existing BMAD files.`);
      }
      
      if (run.signal) {
        result.bmadSetup = { ...plan, status: 'UPSTREAM_INSTALLER_CANCELLED', signal: run.signal, exitCode: null };
        throw new Error(`BRAD installed, but the official BMAD installer was cancelled (${run.signal}). BRAD did not replace any existing BMAD files.`);
      }
      
      if (run.status !== 0) {
        result.bmadSetup = { ...plan, status: 'UPSTREAM_INSTALLER_FAILED', exitCode: run.status };
        throw new Error(`BRAD installed, but the official BMAD installer failed (exit code ${run.status ?? 'unknown'}). See the upstream error; BRAD did not replace any existing BMAD files.`);
      }
      
      result.bmad = bmadCheck(result.root);
      result.readiness = readinessSummary(result.results, result.bmad);
      result.bmadSetup = { ...plan, status: 'UPSTREAM_INSTALLER_EXITED_SUCCESS',
        exitCode: run.status, runtimeConfigured: result.bmad.configured,
        hostDiscovery: 'NOT_VERIFIED' };
      result.nextSteps = [...nextSteps({ dir: result.root }, result.bmad, []), plan.nextStep];
    }
    if (json) process.stdout.write(JSON.stringify({ ok: true, ...result }, null, 2) + '\n');
    else if (result.help) process.stdout.write(result.help);
    else if (result.command === 'prompt') process.stdout.write(result.prompt + '\n');
    else if (result.command === undefined) process.stdout.write(`BRAD ${result.version}\n`);
    else {
      process.stdout.write(`BRAD v${result.version} — ${result.command}\n`);
      for (const r of result.results) process.stdout.write(`  ${r.action || r.status}: ${r.path}${r.backup ? ` (backup: ${r.backup})` : ''}\n`);
      if (result.bmadSetup) process.stdout.write(`  BMAD: ${result.bmadSetup.status} (${result.bmadSetup.channel})\n`);
      if (result.bmad && !result.bmad.detected) process.stdout.write(`\nNote: ${result.bmad.note}\n`);
      if (result.nextSteps?.length) { process.stdout.write('\nNext steps for your AI agent:\n'); for (const step of result.nextSteps) process.stdout.write(`  - ${step}\n`); }
    }
  } catch (e) {
    if (json) process.stdout.write(JSON.stringify({ ok: false, error: e.message }, null, 2) + '\n');
    else process.stderr.write(`BRAD error: ${e.message}\n`);
    process.exitCode = 1;
  }
}
