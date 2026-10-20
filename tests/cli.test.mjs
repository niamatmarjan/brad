import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, symlinkSync, lstatSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePackMetadata } from './pack-metadata.mjs';
import { spawnSync } from 'node:child_process';
import { execute, version, packageRoot } from '../cli/core.mjs';
const fixture = fn => {
  const dir = mkdtempSync(join(tmpdir(), 'brad-cli-test-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test('package and release versions match', () => assert.equal(version(), readFileSync(join(packageRoot, 'VERSION'), 'utf8').trim()));
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
test('doctor provides machine-readable installCommand when BMAD is not detected', () => fixture(root => {
  const r = execute(['doctor', '--dir', root]);
  assert.equal(r.bmad.detected, false);
  assert.equal(r.bmad.installCommand, 'npx bmad-method install');
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
