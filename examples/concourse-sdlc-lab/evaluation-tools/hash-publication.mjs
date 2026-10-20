import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const prefix = 'examples/concourse-sdlc-lab/';
const target = `${prefix}reports/current/PUBLICATION_HASHES.json`;
const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', prefix], {
  cwd: repoRoot, encoding: 'utf8',
}).split('\0').filter(path => path && path !== target))].sort();
const files = {};
for (const path of paths) {
  files[path] = createHash('sha256').update(await readFile(resolve(repoRoot, path))).digest('hex').toUpperCase();
}
await writeFile(resolve(repoRoot, target), `${JSON.stringify({
  schemaVersion: 1,
  algorithm: 'SHA-256',
  scope: 'Sanitized published example; excludes this manifest to avoid self-reference.',
  files,
}, null, 2)}\n`);
console.log(`Hashed ${paths.length} publication artifacts.`);
