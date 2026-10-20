import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(labRoot, '..', '..');
const prefix = 'examples/concourse-sdlc-lab/';
const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', prefix], {
  cwd: repoRoot, encoding: 'utf8',
}).split('\0').filter(Boolean))].sort();
const hashPath = `${prefix}reports/current/PUBLICATION_HASHES.json`;
const hashes = JSON.parse(await readFile(resolve(repoRoot, hashPath), 'utf8'));
const expectedPaths = paths.filter(path => path !== hashPath);
assert.deepEqual(Object.keys(hashes.files).sort(), expectedPaths, 'Publication hash file set differs from publishable files');
const forbiddenPath = /(?:^|\/)(?:node_modules|dist|\.next|\.git|\.agents|\.claude|_bmad|_bmad-output|\.worktrees|\.test-data|test-results|playwright-report|coverage|__pycache__)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:sqlite(?:-.*)?|db(?:-.*)?|log|zip|tgz|pyc|tsbuildinfo)$/i;
const sensitive = [
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /[A-Za-z]:\\+(?:Users|Projects|Windows)\\/i,
  /\/(?:Users|home)\/[A-Za-z0-9_.-]+\//,
  /["'](?:sessionId|session_id|probeSessionId)["']\s*:\s*["'][0-9a-f-]{36}/i,
  /ghapp:\/\/|file:\/\/\//i,
];
let markdownLinks = 0;
for (const path of paths) {
  assert.ok(!forbiddenPath.test(path), `Disallowed publication path: ${path}`);
  const bytes = await readFile(resolve(repoRoot, path));
  if (path !== hashPath) {
    assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(), hashes.files[path], `Artifact hash changed: ${path}`);
  }
  if (!/\.(?:md|json|jsonl|csv|html|mjs|ts|tsx|css|svg)$/.test(path)) continue;
  const text = bytes.toString('utf8');
  for (const pattern of sensitive) assert.ok(!pattern.test(text), `Potential sensitive data in ${path}: ${pattern.source}`);
  if (path.endsWith('MASTER_REPORT.html')) {
    const ids = new Set([...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const link = match[1];
      if (link.startsWith('#')) assert.ok(ids.has(link.slice(1)), `Broken report anchor: ${path} -> ${link}`);
      else if (!/^(?:https?:|mailto:|data:)/.test(link)) {
        await stat(resolve(dirname(resolve(repoRoot, path)), decodeURIComponent(link.split('#')[0].split('?')[0])));
      }
    }
  }
  if (!path.endsWith('.md')) continue;
  const prose = text.replace(/```[\s\S]*?```/g, '');
  for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1];
    if (/^(?:https?:|mailto:|#)/.test(link)) continue;
    const target = resolve(dirname(resolve(repoRoot, path)), decodeURIComponent(link.split('#')[0]));
    const rel = relative(repoRoot, target);
    assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`), `Link escapes repository: ${path} -> ${link}`);
    await stat(target);
    markdownLinks++;
  }
}
console.log(`Publication PASS: ${paths.length} files; ${expectedPaths.length} SHA-256 hashes; ${markdownLinks} local Markdown links; privacy/path checks.`);
