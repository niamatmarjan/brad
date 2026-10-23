import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, symlinkSync, lstatSync, realpathSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter, resolve } from 'node:path';
import { parsePackMetadata } from './pack-metadata.mjs';
import { spawnSync, spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { execute, main, version, packageRoot, terminateProcessTree, upstreamInstallerEnvironment, renameWithRetry } from '../cli/core.mjs';
const fixture = fn => {
  const dir = mkdtempSync(join(tmpdir(), 'brad-cli-test-'));
  const clean = () => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  try {
    const res = fn(dir);
    if (res && typeof res.then === 'function') {
      return res.finally(clean);
    }
    clean();
    return res;
  } catch (err) {
    clean();
    throw err;
  }
};

test('package and release versions match', () => assert.equal(version(), readFileSync(join(packageRoot, 'VERSION'), 'utf8').trim()));
test('nested official installer does not inherit outer npm exec package selection', () => {
  const input = { npm_config_package: 'brad-0.5.2.tgz', NPM_CONFIG_PACKAGE: 'also-outer',
    npm_config_registry: 'https://registry.example.invalid', CUSTOM_VAR: 'preserve' };
  const result = upstreamInstallerEnvironment(input);
  assert.equal(Object.keys(result).some(key => key.toLowerCase() === 'npm_config_package'), false);
  assert.equal(result.npm_config_registry, input.npm_config_registry);
  assert.equal(result.CUSTOM_VAR, 'preserve');
  assert.equal(input.npm_config_package, 'brad-0.5.2.tgz', 'must not modify process or caller environment');
  if (process.platform === 'win32') assert.equal(result.NoDefaultCurrentDirectoryInExePath, '1');
});

test('transient Windows rename errors retry for a bounded time without swallowing failures', () => {
  const transient = Object.assign(new Error('locked staging directory'), { code: 'EPERM' });
  let tries = 0;
  const op = () => { tries++; if (tries < 3) throw transient; return 'moved'; };
  if (process.platform === 'win32') {
    assert.equal(renameWithRetry('staged', 'destination', op), 'moved');
    assert.equal(tries, 3);
  } else {
    assert.throws(() => renameWithRetry('staged', 'destination', op), e => e === transient);
    assert.equal(tries, 1);
  }
  const fatal = Object.assign(new Error('permission denied'), { code: 'ENOENT' });
  tries = 0;
  assert.throws(() => renameWithRetry('staged', 'destination', () => { tries++; throw fatal; }), e => e === fatal);
  assert.equal(tries, 1, 'nontransient errors must fail without retrying');
  if (process.platform === 'win32') {
    tries = 0;
    assert.throws(() => renameWithRetry('staged', 'destination', () => { tries++; throw transient; }), e => e === transient);
    assert.equal(tries, 6, 'must stop after five retries and preserve the original error');
  }
});

test('no-flag install targets shared agent skill and can be repeated safely', () => fixture(root => {
  const a = execute(['init', '--dir', root]);
  assert.equal(a.results[0].action, 'installed');
  assert.ok(existsSync(join(root, '.agents/skills/brad/SKILL.md')));
  assert.equal(execute(['init', '--dir', root]).results[0].action, 'unchanged');
  assert.equal(execute(['doctor', '--dir', root]).results[0].status, 'current');
}));
test('Claude install targets .claude and does not modify shared directory', () => fixture(root => {
  execute(['init', '--dir', root, '--agent', 'claude']);
  assert.ok(existsSync(join(root, '.claude/skills/brad/SKILL.md')));
  assert.ok(!existsSync(join(root, '.agents/skills/brad')));
}));
test('Antigravity default installs into .agents; detected Claude plus Copilot installs both', () => fixture(root => {
  mkdirSync(join(root, '.claude')); mkdirSync(join(root, '.github/agents'), { recursive: true });
  const r = execute(['init', '--dir', root]);
  assert.ok(r.hosts.includes('claude'));
  assert.ok(r.hosts.includes('copilot'));
  assert.ok(existsSync(join(root, '.agents/skills/brad/SKILL.md')));
  assert.ok(existsSync(join(root, '.claude/skills/brad/SKILL.md')));
  assert.ok(existsSync(join(root, '.github/agents/brad.agent.md')));
}));
test('explicit copilot installs coordinator and both are stable on repeat', () => fixture(root => {
  execute(['init', '--dir', root, '--agent', 'copilot']);
  assert.equal(execute(['doctor', '--dir', root, '--agent', 'copilot']).results.filter(x => x.status === 'current').length, 2);
}));
test('--dry-run changes nothing', () => fixture(root => {
  const result = execute(['init', '--dir', root, '--dry-run', '--agent', 'all']);
  assert.ok(result.results.every(x => x.action === 'would-install'));
  assert.equal(readdirSync(root).length, 0);
}));
test('unmanaged install is never overwritten by default', () => fixture(root => {
  const p = join(root, '.agents/skills/brad'); mkdirSync(p, { recursive: true }); writeFileSync(join(p, 'SKILL.md'), 'USER DATA');
  assert.throws(() => execute(['init', '--dir', root]), /unmanaged/);
  assert.equal(readFileSync(join(p, 'SKILL.md'), 'utf8'), 'USER DATA');
}));
test('forced overwrite saves backup instead of losing user data', () => fixture(root => {
  const p = join(root, '.agents/skills/brad'); mkdirSync(p, { recursive: true }); writeFileSync(join(p, 'SKILL.md'), 'USER DATA');
  const r = execute(['init', '--dir', root, '--force']);
  assert.equal(r.results[0].action, 'updated');
  assert.equal(readFileSync(join(r.results[0].backup, 'SKILL.md'), 'utf8'), 'USER DATA');
  assert.match(readFileSync(join(p, 'SKILL.md'), 'utf8'), /name: brad/);
}));
test('user-modified managed installs require --force and preserve contents', () => fixture(root => {
  execute(['init', '--dir', root]); const p = join(root, '.agents/skills/brad/SKILL.md');
  writeFileSync(p, 'USER CUSTOMIZATION');
  assert.equal(execute(['doctor', '--dir', root]).results[0].status, 'modified');
  assert.throws(() => execute(['update', '--dir', root]), /modified/);
  assert.equal(readFileSync(p, 'utf8'), 'USER CUSTOMIZATION');
}));
test('update skips targets which are not installed', () => fixture(root => {
  assert.equal(execute(['update', '--dir', root]).results[0].action, 'skipped');
  assert.equal(readdirSync(root).length, 0);
}));
test('uninstall removes managed skill but not unrelated files', () => fixture(root => {
  execute(['init', '--dir', root]); writeFileSync(join(root, 'myfile.txt'), 'safe');
  assert.equal(execute(['uninstall', '--dir', root]).results[0].action, 'uninstalled');
  assert.ok(existsSync(join(root, 'myfile.txt')));
  assert.ok(!existsSync(join(root, '.agents/skills/brad')));
}));
test('uninstall modified managed install requires --force and backs up', () => fixture(root => {
  execute(['init', '--dir', root]); writeFileSync(join(root, '.agents/skills/brad/custom.md'), 'custom');
  assert.throws(() => execute(['uninstall', '--dir', root]), /modified/);
  const result = execute(['uninstall', '--dir', root, '--force']);
  assert.equal(result.results[0].action, 'backed-up');
  assert.ok(existsSync(join(result.results[0].backup, 'custom.md')));
}));
test('linked skill targets are rejected without touching external targets', () => fixture(root => {
  const external = mkdtempSync(join(tmpdir(), 'brad-link-target-'));
  const sentinel = join(external, 'do-not-touch.txt');
  writeFileSync(sentinel, 'untouched');
  try {
    mkdirSync(join(root, '.agents/skills'), { recursive: true });
    const link = join(root, '.agents/skills/brad');
    // Windows junctions avoid elevated symlink privileges; POSIX uses symlinks.
    symlinkSync(external, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(lstatSync(link).isSymbolicLink(), true, 'test fixture must be a filesystem redirect');
    assert.equal(realpathSync(link), realpathSync(external));
    assert.throws(() => execute(['init', '--dir', root, '--force']), /symlink/i);
    assert.throws(() => execute(['update', '--dir', root, '--force']), /symlink/i);
    assert.throws(() => execute(['uninstall', '--dir', root, '--force']), /symlink/i);
    assert.equal(readFileSync(sentinel, 'utf8'), 'untouched');
  } finally { rmSync(external, { recursive: true, force: true }); }
}));

test('linked parent directories cannot redirect BRAD outside project', () => fixture(root => {
  const external = mkdtempSync(join(tmpdir(), 'brad-link-parent-'));
  const sentinel = join(external, 'do-not-touch.txt');
  writeFileSync(sentinel, 'untouched');
  try {
    const link = join(root, '.agents');
    symlinkSync(external, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(lstatSync(link).isSymbolicLink(), true, 'test fixture must be a filesystem redirect');
    assert.throws(() => execute(['setup', '--dir', root, '--force']), /symlink/i);
    assert.equal(readFileSync(sentinel, 'utf8'), 'untouched');
  } finally { rmSync(external, { recursive: true, force: true }); }
}));
test('unknown agent and command are rejected clearly', () => fixture(root => {
  assert.throws(() => execute(['init', '--dir', root, '--agent', 'vscode2']), /Unknown agent/);
  assert.throws(() => execute(['boop', '--dir', root]), /Unknown command/);
}));
test('doctor reports missing BMAD rather than claiming installation', () => fixture(root => {
  const r = execute(['doctor', '--dir', root]);
  assert.equal(r.bmad.detected, false);
  assert.match(r.bmad.note, /not detected/);
}));
test('CLI script provides machine-readable JSON', () => fixture(root => {
  const r = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), 'init', '--dir', root, '--json'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  assert.equal(data.ok, true);
  assert.equal(data.version, version());
  assert.equal(data.results[0].action, 'installed');
}));
test('distribution contains files required by the npm CLI', () => {
  // npm is a .cmd shim on Windows. Prefer npm_execpath for cross-platform Node invocation.
  const npmCli = process.env.npm_execpath;
  const args = npmCli ? [npmCli, 'pack', '--dry-run', '--json', '--ignore-scripts'] : ['pack', '--dry-run', '--json', '--ignore-scripts'];
  const command = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const r = spawnSync(command, args, { cwd: packageRoot, encoding: 'utf8', shell: !npmCli && process.platform === 'win32' });
  assert.equal(r.status, 0, r.stderr);
  const metadata = parsePackMetadata(r.stdout, JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).name);
  const names = metadata.files.map(x => x.path);
  assert.ok(names.includes('cli/brad.mjs'));
  assert.ok(names.includes('skills/brad/SKILL.md'));
  assert.ok(names.includes('.github/agents/brad.agent.md'), 'Copilot coordinator must be published');
  assert.ok(names.includes('docs/AI_SETUP.md'), 'AI onboarding instructions must ship in npm package');
});
test('npm pack parser supports legacy array and npm 12 name-keyed object responses', () => {
  const name = '@niamatmarjan/brad';
  const entry = { name, files: [{ path: 'cli/brad.mjs' }] };
  assert.deepEqual(parsePackMetadata(JSON.stringify([entry]), name), entry);
  assert.deepEqual(parsePackMetadata(JSON.stringify({ [name]: entry }), name), entry);
  assert.deepEqual(parsePackMetadata(JSON.stringify(entry), name), entry);
});

test('npm pack parser rejects invalid, empty, and misleading responses', () => {
  const name = '@niamatmarjan/brad';
  for (const body of [
    '', 'not json', '{}', '[]', 'null', 'true',
    JSON.stringify([{ name: 'other/pkg', files: [] }]),
    JSON.stringify({ 'other/pkg': { name: 'other/pkg', files: [] } }),
    JSON.stringify({ [name]: { name, files: null } }),
    JSON.stringify({ [name]: { name, files: [{ wrong: 'not a path' }] } }),
    JSON.stringify({ [name]: { name, files: [{ path: '../unsafe' }] } }),
  ]) assert.throws(() => parsePackMetadata(body, name), /npm pack/i, body);
});

test('documentation pins npm GitHub dependency using #tag syntax', () => {
  for (const path of ['README.md', 'docs/installation.md', 'cli/core.mjs']) {
    const content = readFileSync(join(packageRoot, path), 'utf8');
    assert.ok(content.includes(path === 'cli/core.mjs' ? 'github:niamatmarjan/brad#v${version()}' : `github:niamatmarjan/brad#v${version()}`), path);
    assert.ok(!content.includes(`github:niamatmarjan/brad@v${version()}`), path);
  }
});


test('setup is safe, repeatable, and reports guided next actions', () => fixture(root => {
  const first = execute(['setup', '--dir', root, '--agent', 'antigravity']);
  assert.equal(first.command, 'setup');
  assert.equal(first.results[0].action, 'installed');
  assert.equal(first.readiness.bradFiles, 'VERIFIED');
  assert.equal(first.readiness.nativeBmad, 'NOT_VERIFIED');
  assert.equal(first.readiness.hostInvocation, 'NOT_VERIFIED');
  assert.equal(first.executionVerified, false);
  assert.ok(first.nextSteps.some(s => s.includes('official BMAD Method')));
  assert.equal(execute(['setup', '--dir', root, '--agent', 'antigravity']).results[0].action, 'unchanged');
}));

test('agent prompt is read-only, host-specific and never claims remote access', () => fixture(root => {
  const before = readdirSync(root);
  const result = execute(['prompt', '--dir', root, '--agent', 'claude']);
  assert.ok(result.prompt.includes(`github:niamatmarjan/brad#v${version()}`));
  assert.match(result.prompt, /ask which to use/);
  assert.match(result.prompt, /Claude|claude/);
  assert.deepEqual(readdirSync(root), before);
}));

test('doctor gives consent-gated official BMAD recovery without executing it', () => fixture(root => {
  const d = execute(['doctor', '--dir', root, '--json']);
  assert.equal(d.bmad.recovery.status, 'OFFICIAL_BMAD_INSTALL_REQUIRED');
  assert.equal(d.bmad.recovery.requiresApproval, true);
  assert.equal(d.bmad.recovery.installCommand, process.platform === 'win32' ? 'npx.cmd bmad-method install' : 'npx bmad-method install');
  assert.equal(d.bmad.discovery.hostSkillCatalog, 'NOT_VERIFIED');
  assert.equal(d.readiness.hostInvocation, 'NOT_VERIFIED');
  assert.deepEqual(readdirSync(root), [], 'doctor must never install BMAD or mutate the project');
}));

test('doctor does not propose reinstall when BMAD is configured', () => fixture(root => {
  mkdirSync(join(root, '_bmad'), { recursive: true });
  writeFileSync(join(root, '_bmad/config.yaml'), 'project: demo\\n');
  const missingSkill = execute(['doctor', '--dir', root, '--json']);
  assert.equal(missingSkill.bmad.recovery.status, 'VERIFY_NATIVE_SKILL_INSTALLATION');
  assert.equal(missingSkill.bmad.recovery.installCommand, null);
  mkdirSync(join(root, '.agents/skills/bmad-build'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/bmad-build/SKILL.md'), '---\\nname: bmad-build\\n---\\n');
  const installed = execute(['doctor', '--dir', root, '--json']);
  assert.equal(installed.bmad.recovery.status, 'VERIFY_HOST_SKILL_DISCOVERY');
  assert.equal(installed.bmad.recovery.installCommand, null);
  assert.equal(installed.bmad.discovery.hostSkillCatalog, 'NOT_VERIFIED');
  assert.equal(installed.readiness.specialistDelegation, 'NOT_VERIFIED');
}));

test('doctor advises configuration verification for partial BMAD setup', () => fixture(root => {
  mkdirSync(join(root, '_bmad'), { recursive: true });
  const d = execute(['doctor', '--dir', root]);
  assert.equal(d.bmad.recovery.status, 'VERIFY_BMAD_CONFIGURATION');
  assert.equal(d.bmad.recovery.installCommand, null);
  assert.equal(d.bmad.recovery.requiresApproval, false);
}));

test('doctor separates leftover output artifacts from native BMAD install', () => fixture(root => {
  mkdirSync(join(root, '_bmad-output'));
  const d = execute(['doctor', '--dir', root]);
  assert.equal(d.bmad.detected, false);
  assert.equal(d.bmad.configured, false);
  assert.ok(d.environment.nodeSupported);
  assert.match(d.environment.verificationBoundary, /not proof/);
}));

test('doctor discovers configured runtime, native skills, and mixed state hints', () => fixture(root => {
  mkdirSync(join(root, '_bmad'), { recursive: true });
  writeFileSync(join(root, '_bmad/config.toml'), 'version = "6"\n');
  mkdirSync(join(root, '.agents/skills/bmad-build'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/bmad-build/SKILL.md'), '---\nname: bmad-build\n---');
  mkdirSync(join(root, '_bmad-output/implementation-artifacts'), { recursive: true });
  writeFileSync(join(root, '_bmad-output/implementation-artifacts/sprint-status.yaml'), 'development_status: {}\n');
  writeFileSync(join(root, '_bmad-output/tickets.toml'), '[initiatives]\n');
  const d = execute(['doctor', '--dir', root]);
  assert.equal(d.bmad.detected, true);
  assert.equal(d.bmad.configured, true);
  assert.deepEqual(d.bmad.nativeSkills, ['bmad-build']);
  assert.equal(d.bmad.stateHints.mixed, true);
  assert.match(d.bmad.warnings.join(' '), /v6 and v7/);
}));

test('doctor does not mistake cached TEA instructions for native host execution', () => fixture(root => {
  const cache = mkdtempSync(join(tmpdir(), 'brad-external-tea-cache-'));
  try {
    mkdirSync(join(cache, 'bmad-testarch-test-review'), { recursive: true });
    writeFileSync(join(cache, 'bmad-testarch-test-review/SKILL.md'), '---\nname: bmad-testarch-test-review\n---\n');
    const d = execute(['doctor', '--dir', root, '--agent', 'antigravity']);
    assert.equal(d.bmad.detected, false);
    assert.deepEqual(d.bmad.nativeSkills, []);
    assert.equal(d.bmad.discovery.workspaceSkillInventory, 'NOT_FOUND');
    assert.equal(d.bmad.discovery.externalCaches, 'NOT_INSPECTED');
    assert.equal(d.bmad.discovery.hostSkillCatalog, 'NOT_VERIFIED');
    assert.equal(d.bmad.discovery.nativeWorkflowInvocation, 'NOT_VERIFIED');
    assert.equal(d.readiness.specialistDelegation, 'NOT_VERIFIED');
  } finally { rmSync(cache, { recursive: true, force: true }); }
}));

test('setup dry-run leaves no files including auxiliary state', () => fixture(root => {
  const d = execute(['setup', '--dir', root, '--dry-run', '--agent', 'all']);
  assert.ok(d.results.every(r => r.action === 'would-install'));
  assert.deepEqual(readdirSync(root), []);
}));

test('CLI --json prompt works without extra human-only text', () => fixture(root => {
  const out = spawnSync(process.execPath, [join(packageRoot,'cli/brad.mjs'),'prompt','--dir',root,'--json'], {encoding:'utf8'});
  assert.equal(out.status,0,out.stderr);
  assert.match(JSON.parse(out.stdout).prompt,/read/i);
}));


test('ordinary .github workflow directory is not mistaken for Copilot host', () => fixture(root => {
  mkdirSync(join(root, '.github/workflows'), { recursive: true });
  const d = execute(['doctor', '--dir', root]);
  assert.deepEqual(d.hosts, ['portable']);
  const r = execute(['setup', '--dir', root]);
  assert.ok(existsSync(join(root, '.agents/skills/brad/SKILL.md')));
  assert.ok(!existsSync(join(root, '.github/agents/brad.agent.md')));
}));

test('ambiguous global host must be selected explicitly', () => fixture(root => {
  assert.throws(() => execute(['setup', '--global', '--agent', 'portable']), /Choose an explicit --agent for global installation/);
}));


test('all means four real supported hosts and never includes portable', () => fixture(root => {
  const d=execute(['setup','--dir',root,'--agent','all','--dry-run']);
  assert.equal(d.hosts.length,4);
  assert.ok(!d.hosts.includes('portable'));
}));


test('doctor reports independent readiness stages without claiming live native invocation', () => fixture(root => {
  const init = execute(['setup', '--dir', root, '--agent', 'antigravity']);
  assert.equal(init.readiness.bradFiles, 'VERIFIED');
  const d = execute(['doctor', '--dir', root, '--agent', 'antigravity']);
  assert.equal(d.readiness.bradFiles, 'VERIFIED');
  assert.equal(d.readiness.hostInvocation, 'NOT_VERIFIED');
  assert.equal(d.readiness.githubPR, 'NOT_VERIFIED');
  assert.equal(d.readiness.ci, 'NOT_VERIFIED');
  assert.ok(d.environment.npmGit);
}));

test('an uninstalled project is not reported as execution-ready', () => fixture(root => {
  const d = execute(['doctor', '--dir', root]);
  assert.equal(d.readiness.bradFiles, 'INCOMPLETE');
  assert.equal(d.readiness.nativeBmad, 'NOT_VERIFIED');
  assert.equal(d.readiness.specialistDelegation, 'NOT_VERIFIED');
}));

test('upstream BMAD setup requires explicit authorization and supports read-only preview', () => fixture(root => {
  const before = readdirSync(root);
  const normal = execute(['setup', '--dir', root, '--agent', 'antigravity', '--dry-run']);
  assert.equal(normal.bmadSetup, undefined);
  const stable = execute(['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad', '--dry-run']);
  assert.equal(stable.bmadSetup.status, 'WOULD_INSTALL');
  assert.deepEqual(stable.bmadSetup.args, ['--yes', 'bmad-method@latest', 'install']);
  assert.equal(stable.bmadSetup.upstreamInstaller, 'official-npm-stable');
  const preview = execute(['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad', '--bmad-channel=preview', '--dry-run']);
  assert.equal(preview.bmadSetup.status, 'WOULD_INSTALL');
  assert.deepEqual(preview.bmadSetup.args, ['--yes', 'skills', 'add', 'bmad-code-org/BMAD-METHOD']);
  assert.match(preview.bmadSetup.nextStep, /bmad setup/);
  assert.deepEqual(readdirSync(root), before, 'dry-run must not write to disk');
}));

test('BMAD setup blocks accidental installation through other commands and unknown channels', () => fixture(root => {
  assert.throws(() => execute(['setup', '--dir', root, '--bmad-channel', 'preview']), /requires --with-bmad/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-channel', 'unknown']), /stable or preview/);
  assert.throws(() => execute(['doctor', '--dir', root, '--with-bmad']), /only supported with brad setup/);
  assert.throws(() => execute(['setup', '--global', '--with-bmad']), /project-local/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--json']), /cannot use --json/);
  assert.throws(() => execute(['setup', '--dir', root, '--bmad-modules', 'bmm']), /requires --with-bmad/);
  assert.throws(() => execute(['setup', '--dir', root, '--bmad-tools', 'antigravity']), /requires --with-bmad/);
  assert.throws(() => execute(['setup', '--dir', root, '--bmad-timeout', '5000']), /requires --with-bmad/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-channel', 'preview', '--bmad-modules', 'bmm']), /not supported with --bmad-channel preview/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-channel', 'preview', '--bmad-tools', 'antigravity']), /not supported with --bmad-channel preview/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-timeout', '-1']), /positive number/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-modules', 'bmm;rm -rf /']), /Invalid BMAD module list/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-modules', 'bmm&calc.exe']), /Invalid BMAD module list/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-modules', 'bmm|calc.exe']), /Invalid BMAD module list/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-tools', 'antigravity&calc.exe']), /Invalid BMAD tool list/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-tools', 'antigravity|calc.exe']), /Invalid BMAD tool list/);
  assert.throws(() => execute(['setup', '--dir', root, '--with-bmad', '--bmad-tools', 'unsupported-tool-id']), /Unknown BMAD tool identifier/);
}));

test('BRAD --yes alone cannot silently authorize or configure upstream BMAD', () => fixture(root => {
  const normal = execute(['setup', '--dir', root, '--agent', 'antigravity', '--yes']);
  assert.equal(normal.bmadSetup, undefined, '--yes alone must not authorize BMAD setup');
  const headlessNoConfig = execute(['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad', '--yes'], { isTTY: false });
  assert.equal(headlessNoConfig.bmadSetup.status, 'MISSING_HEADLESS_CONFIG', '--yes must not invent headless configuration');
}));

test('interactive mode preserves correct official installer invocation', () => fixture(root => {
  const r = execute(['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad'], { isTTY: true });
  assert.equal(r.bmadSetup.status, 'READY_TO_INSTALL');
  assert.equal(r.bmadSetup.interactive, true);
  assert.deepEqual(r.bmadSetup.args, ['--yes', 'bmad-method@latest', 'install']);
}));

test('missing TTY with incomplete configuration exits safely without launching an interactive process', () => fixture(root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, '@echo off\r\necho FAIL >> "%CD%\\should-not-run.txt"\r\nexit /b 0\r\n');
  } else {
    writeFileSync(script, '#!/bin/sh\necho FAIL >> "$PWD/should-not-run.txt"\nexit 0\n');
    chmodSync(script, 0o755);
  }
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad'];
  const res = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 5000 });
  assert.equal(res.status, 1, 'must exit with error code 1');
  assert.match(res.stderr, /Missing headless BMAD configuration/);
  assert.match(res.stdout, /installed/i, 'BRAD itself should still install');
  assert.ok(!existsSync(join(root, 'should-not-run.txt')), 'must never launch external installer when headless config is missing');
}));

test('preview v7 blocks in non-interactive environment with clear instructions', () => fixture(root => {
  const r = execute(['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad', '--bmad-channel', 'preview'], { isTTY: false });
  assert.equal(r.bmadSetup.status, 'BLOCKED_NO_TTY');
  assert.match(r.bmadSetup.explanation, /interactive terminal/);
}));

test('opt-in setup invokes a fake official installer exactly once and reports only verified local state', () => fixture(root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, [
      '@echo off',
      'if defined npm_config_package (echo leaked npm_config_package 1>&2 & exit /b 89)',
      'echo %* >> "%CD%\\upstream-calls.txt"',
      'if not exist "%CD%\\_bmad" mkdir "%CD%\\_bmad"',
      'echo [core] > "%CD%\\_bmad\\config.toml"',
      'exit /b 0',
      ''
    ].join('\r\n'));
  } else {
    writeFileSync(script, [
      '#!/bin/sh',
      'test -z "${npm_config_package:-}" || exit 89',
      'printf "%s\\n" "$*" >> "$PWD/upstream-calls.txt"',
      'mkdir -p "$PWD/_bmad"',
      'printf "%s\\n" "[core]" > "$PWD/_bmad/config.toml"',
      'exit 0',
      ''
    ].join('\n'));
    chmodSync(script, 0o755);
  }
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  env.npm_config_package = 'unrelated-brad-candidate.tgz';
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad', '--bmad-modules', 'bmm', '--bmad-tools', 'antigravity'];
  const first = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 20000 });
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.match(first.stdout, /UPSTREAM_INSTALLER_EXITED_SUCCESS/);
  assert.match(first.stdout, /host|skill catalog/i);
  const log = join(root, 'upstream-calls.txt');
  assert.ok(existsSync(log), 'the official installer command must actually be invoked');
  assert.match(readFileSync(log, 'utf8'), /bmad-method@latest install --yes --directory \. --modules bmm --tools antigravity/);
  const second = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 20000 });
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.match(second.stdout, /SKIPPED_EXISTING/);
  assert.equal(readFileSync(log, 'utf8').trim().split(/\r?\n/).length, 1, 'must never reinstall');
}));

test('simulated installer waiting indefinitely is terminated by the configured timeout', () => fixture(root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, [
      '@echo off',
      'echo HANGING >> "%CD%\\timeout-invoked.txt"',
      ':loop',
      'goto loop',
      ''
    ].join('\r\n'));
  } else {
    writeFileSync(script, [
      '#!/bin/sh',
      'echo HANGING >> "$PWD/timeout-invoked.txt"',
      'while true; do sleep 1; done',
      ''
    ].join('\n'));
    chmodSync(script, 0o755);
  }
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad',
    '--bmad-modules', 'bmm', '--bmad-tools', 'antigravity', '--bmad-timeout', '500'];
  const res = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 5000 });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /timed out after 500ms and was terminated/);
  assert.ok(existsSync(join(root, 'timeout-invoked.txt')));
}));

test('terminateProcessTree cleanly terminates child process and its descendants', () => fixture(async root => {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{}, 1000)'], {
    stdio: 'ignore',
    detached: process.platform !== 'win32'
  });
  assert.ok(child.pid > 0);
  terminateProcessTree(child, 'SIGTERM');
  let isAlive = true;
  for (let i = 0; i < 50; i++) {
    if (process.platform === 'win32') {
      const task = spawnSync('tasklist.exe', ['/FI', 'PID eq ' + child.pid], { encoding: 'utf8' });
      isAlive = task.stdout.includes(String(child.pid));
    } else {
      try {
        process.kill(child.pid, 0);
        isAlive = true;
      } catch {
        isAlive = false;
      }
    }
    if (!isAlive) break;
    await new Promise(r => setTimeout(r, 20));
  }
  assert.equal(isAlive, false, 'process must be dead after terminateProcessTree');
}));

test('nested installer descendant processes are terminated when timeout fires', () => fixture(async root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const pidFile = join(root, 'descendant.pid');
  const runnerScript = join(bin, 'runner.cjs');
  writeFileSync(runnerScript, [
    'const cp = require("child_process");',
    'const fs = require("fs");',
    'const child = cp.spawn(process.execPath, ["-e", "setInterval(()=>{}, 1000)"], { stdio: "ignore" });',
    `fs.writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));`,
    'setInterval(() => {}, 1000);'
  ].join('\n'));
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, `@echo off\r\n"${process.execPath}" "${runnerScript}"\r\n`);
  } else {
    writeFileSync(script, `#!/bin/sh\nexec "${process.execPath}" "${runnerScript}"\n`);
    chmodSync(script, 0o755);
  }
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad',
    '--bmad-modules', 'bmm', '--bmad-tools', 'antigravity', '--bmad-timeout', '600'];
  const res = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 5000 });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /timed out after 600ms and was terminated/);
  assert.ok(existsSync(pidFile), 'grandchild PID file must exist');
  const descendantPid = Number(readFileSync(pidFile, 'utf8').trim());
  assert.ok(descendantPid > 0);

  let isAlive = true;
  for (let i = 0; i < 50; i++) {
    if (process.platform === 'win32') {
      const task = spawnSync('tasklist.exe', ['/FI', 'PID eq ' + descendantPid], { encoding: 'utf8' });
      isAlive = task.stdout.includes(String(descendantPid));
    } else {
      try {
        process.kill(descendantPid, 0);
        isAlive = true;
      } catch {
        isAlive = false;
      }
    }
    if (!isAlive) break;
    await new Promise(r => setTimeout(r, 20));
  }
  assert.equal(isAlive, false, 'descendant process must not be left running after timeout');
}));

test('stubborn installer process ignoring SIGTERM is terminated by escalation', () => fixture(root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const runnerScript = join(bin, 'stubborn.cjs');
  writeFileSync(runnerScript, [
    'process.on("SIGTERM", () => { /* ignore */ });',
    'setInterval(() => {}, 1000);'
  ].join('\n'));
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, `@echo off\r\n"${process.execPath}" "${runnerScript}"\r\n`);
  } else {
    writeFileSync(script, `#!/bin/sh\nexec "${process.execPath}" "${runnerScript}"\n`);
    chmodSync(script, 0o755);
  }
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad',
    '--bmad-modules', 'bmm', '--bmad-tools', 'antigravity', '--bmad-timeout', '400'];
  const start = Date.now();
  const res = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 5000 });
  const elapsed = Date.now() - start;
  assert.equal(res.status, 1);
  assert.match(res.stderr, /timed out after 400ms and was terminated/);
  assert.ok(elapsed < 4000, `must terminate within bounded time, took ${elapsed}ms`);
}));

test('stubborn grandchild ignoring SIGTERM is terminated by escalation when direct child exits on SIGTERM', () => fixture(async root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const pidFile = join(root, 'grandchild.pid');

  const grandchildScript = join(bin, 'grandchild.cjs');
  writeFileSync(grandchildScript, [
    'const fs = require("fs");',
    `fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));`,
    'process.on("SIGTERM", () => { /* stubbornly ignore SIGTERM */ });',
    'setInterval(() => {}, 1000);'
  ].join('\n'));

  const directScript = join(bin, 'direct-installer.cjs');
  writeFileSync(directScript, [
    'const cp = require("child_process");',
    `const grandchild = cp.spawn(process.execPath, [${JSON.stringify(grandchildScript)}], { stdio: "ignore" });`,
    'process.on("SIGTERM", () => { process.exit(0); });',
    'setInterval(() => {}, 1000);'
  ].join('\n'));

  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, `@echo off\r\n"${process.execPath}" "${directScript}"\r\n`);
  } else {
    writeFileSync(script, `#!/bin/sh\nexec "${process.execPath}" "${directScript}"\n`);
    chmodSync(script, 0o755);
  }

  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad',
    '--bmad-modules', 'bmm', '--bmad-tools', 'antigravity', '--bmad-timeout', '400'];

  const start = Date.now();
  const res = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 8000 });
  const elapsed = Date.now() - start;

  assert.equal(res.status, 1);
  assert.match(res.stderr, /timed out after 400ms and was terminated/);
  assert.ok(elapsed < 6000, `must terminate within bounded escalation time, took ${elapsed}ms`);

  assert.ok(existsSync(pidFile), 'grandchild must have started and written PID');
  const grandchildPid = Number(readFileSync(pidFile, 'utf8').trim());
  assert.ok(grandchildPid > 0);

  let isAlive = true;
  for (let i = 0; i < 50; i++) {
    if (process.platform === 'win32') {
      const task = spawnSync('tasklist.exe', ['/FI', 'PID eq ' + grandchildPid], { encoding: 'utf8' });
      isAlive = task.stdout.includes(String(grandchildPid));
    } else {
      try {
        process.kill(grandchildPid, 0);
        isAlive = true;
      } catch {
        isAlive = false;
      }
    }
    if (!isAlive) break;
    await new Promise(r => setTimeout(r, 20));
  }
  assert.equal(isAlive, false, 'stubborn grandchild process must be terminated and not orphaned');
}));

test('installer execution interrupted by signal reports cancellation and cleans up child', () => fixture(async root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const pidFile = join(root, 'installer.pid');
  const runnerScript = join(bin, 'slow-installer.cjs');
  writeFileSync(runnerScript, [
    'const fs = require("fs");',
    `fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));`,
    'setInterval(() => {}, 1000);'
  ].join('\n'));
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, `@echo off\r\n"${process.execPath}" "${runnerScript}"\r\n`);
  } else {
    writeFileSync(script, `#!/bin/sh\nexec "${process.execPath}" "${runnerScript}"\n`);
    chmodSync(script, 0o755);
  }

  const harnessScript = join(root, 'run-interrupt-harness.mjs');
  writeFileSync(harnessScript, [
    `import { main } from ${JSON.stringify(pathToFileURL(resolve(packageRoot, 'cli/core.mjs')).href)};`,
    'import { existsSync } from "node:fs";',
    `const pidFile = ${JSON.stringify(pidFile)};`,
    `const args = ['setup', '--dir', ${JSON.stringify(root)}, '--agent', 'antigravity', '--with-bmad', '--bmad-modules', 'bmm', '--bmad-tools', 'antigravity', '--bmad-timeout', '10000'];`,
    'const mainPromise = main(args);',
    'for (let i = 0; i < 50; i++) {',
    '  if (existsSync(pidFile)) break;',
    '  await new Promise(r => setTimeout(r, 50));',
    '}',
    'process.emit("SIGINT");',
    'await mainPromise;'
  ].join('\n'));

  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');

  const res = spawnSync(process.execPath, [harnessScript], {
    env, cwd: root, encoding: 'utf8', timeout: 10000
  });

  assert.equal(res.status, 1, 'must set exit code 1 on cancellation');
  assert.match(res.stderr, /cancelled \(SIGINT\)/i, 'stderr must report cancellation');

  assert.ok(existsSync(pidFile), 'installer must have written PID');
  const installerPid = Number(readFileSync(pidFile, 'utf8').trim());

  let isAlive = true;
  for (let i = 0; i < 50; i++) {
    if (process.platform === 'win32') {
      const task = spawnSync('tasklist.exe', ['/FI', 'PID eq ' + installerPid], { encoding: 'utf8' });
      isAlive = task.stdout.includes(String(installerPid));
    } else {
      try {
        process.kill(installerPid, 0);
        isAlive = true;
      } catch {
        isAlive = false;
      }
    }
    if (!isAlive) break;
    await new Promise(r => setTimeout(r, 20));
  }
  assert.equal(isAlive, false, 'child installer process must be terminated on interrupt');
}));

test('nonzero upstream exit codes are reported accurately', () => fixture(root => {
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, '@echo off\r\nexit /b 42\r\n');
  } else {
    writeFileSync(script, '#!/bin/sh\nexit 42\n');
    chmodSync(script, 0o755);
  }
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad',
    '--bmad-modules', 'bmm', '--bmad-tools', 'antigravity'];
  const res = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /exit code 42/);
}));

test('Windows paths containing spaces and shell characters are handled safely by headless installer', () => fixture(temp => {
  const root = join(temp, 'folder with spaces & (special) ^ chars');
  mkdirSync(root, { recursive: true });
  const bin = join(root, 'mock-bin');
  mkdirSync(bin, { recursive: true });
  const script = join(bin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  if (process.platform === 'win32') {
    writeFileSync(script, [
      '@echo off',
      'echo %* >> "%CD%\\upstream-calls.txt"',
      'if not exist "%CD%\\_bmad" mkdir "%CD%\\_bmad"',
      'echo [core] > "%CD%\\_bmad\\config.toml"',
      'exit /b 0',
      ''
    ].join('\r\n'));
  } else {
    writeFileSync(script, [
      '#!/bin/sh',
      'printf "%s\\n" "$*" >> "$PWD/upstream-calls.txt"',
      'mkdir -p "$PWD/_bmad"',
      'printf "%s\\n" "[core]" > "$PWD/_bmad/config.toml"',
      'exit 0',
      ''
    ].join('\n'));
    chmodSync(script, 0o755);
  }
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k];
  env.PATH = bin + delimiter + (process.env.PATH || process.env.Path || '');
  const args = ['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad',
    '--bmad-modules', 'bmm,tea', '--bmad-tools', 'antigravity'];
  const res = spawnSync(process.execPath, [join(packageRoot, 'cli/brad.mjs'), ...args],
    { env, cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /UPSTREAM_INSTALLER_EXITED_SUCCESS/);
  const log = join(root, 'upstream-calls.txt');
  assert.ok(existsSync(log));
  assert.match(readFileSync(log, 'utf8'), /--directory \. --modules bmm,tea --tools antigravity/);
}));

test('setup detects native BMAD in the Antigravity singular .agent skill folder', () => fixture(root => {
  const native = join(root, '.agent', 'skills', 'bmad-build');
  mkdirSync(native, { recursive: true });
  writeFileSync(join(native, 'SKILL.md'), '---\nname: bmad-build\n---\n');
  const r = execute(['setup', '--dir', root, '--agent', 'antigravity', '--with-bmad']);
  assert.equal(r.bmadSetup.status, 'SKIPPED_EXISTING');
  assert.ok(r.bmad.nativeSkills.includes('bmad-build'));
  assert.equal(r.bmad.discovery.hostSkillCatalog, 'NOT_VERIFIED');
}));
