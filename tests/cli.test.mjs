import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { execute, version, packageRoot } from '../cli/core.mjs';
const fixture = fn => {
  const dir = mkdtempSync(join(tmpdir(), 'brad-cli-test-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test('package and release versions match', () => assert.equal(version(), '0.2.0'));
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
  mkdirSync(join(root, '.claude')); mkdirSync(join(root, '.github'));
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
test('symlinked targets are rejected without touching targets', () => fixture(root => {
  const external = mkdtempSync(join(tmpdir(), 'brad-symlink-test-'));
  try {
    mkdirSync(join(root, '.agents/skills'), { recursive: true });
    symlinkSync(external, join(root, '.agents/skills/brad'), 'dir');
    assert.throws(() => execute(['init', '--dir', root, '--force']), /symlink/i);
    assert.equal(readdirSync(external).length, 0);
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
  assert.equal(data.version, '0.2.0');
  assert.equal(data.results[0].action, 'installed');
}));
test('distribution contains files required by the npm CLI', () => {
  const r = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: packageRoot, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(r.stdout)[0];
  const names = data.files.map(x => x.path);
  assert.ok(names.includes('cli/brad.mjs'));
  assert.ok(names.includes('skills/brad/SKILL.md'));
  assert.ok(names.includes('.github/agents/brad.agent.md'), 'Copilot coordinator must be published');
});
