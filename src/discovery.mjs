// Project files are installation hints, never proof of host registration.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOTS = ['.agents/skills', '.agent/skills', '.github/skills', '.claude/skills', '.codex/skills'];
const isFile = path => {
  try { return statSync(path).isFile(); } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
};

export function inspectProject(projectRoot = '.') {
  const root = resolve(projectRoot);
  const definitions = {};
  const conflicts = [];
  const warnings = [];
  for (const parent of ROOTS) {
    let entries;
    try { entries = readdirSync(join(root, parent)); } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) warnings.push(`Cannot inspect ${parent}: ${error.code}`);
      continue;
    }
    for (const name of entries.sort()) {
      if (name !== 'bmad' && !name.startsWith('bmad-')) continue;
      const path = join(root, parent, name, 'SKILL.md');
      try {
        if (isFile(path)) (definitions[name] ||= []).push(path);
      } catch (error) { warnings.push(`Cannot inspect ${name}: ${error.code}`); }
    }
  }
  for (const [name, paths] of Object.entries(definitions)) {
    try {
      if (new Set(paths.map(path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n'))).size > 1) conflicts.push(name);
    } catch (error) { conflicts.push(name); warnings.push(`Cannot read ${name}: ${error.code}`); }
  }
  const nativeSkills = Object.keys(definitions).sort();
  const v6 = nativeSkills.includes('bmad-help') || isFile(join(root, '_bmad-output/implementation-artifacts/sprint-status.yaml'));
  const v7 = nativeSkills.includes('bmad') || nativeSkills.includes('bmad-agent-po') ||
    isFile(join(root, '_bmad/method/scripts/tickets.py')) ||
    ['_bmad-output/tickets.toml', '_bmad/tickets.toml'].some(path => isFile(join(root, path)));
  const configured = ['_bmad/config.toml', '_bmad/config.yaml', '_bmad/core/config.yaml',
    '_bmad/bmm/config.yaml', '_bmad/config.user.toml'].some(path => isFile(join(root, path)));
  return { nativeSkills, definitions, conflicts, configured,
    stateHints: { v6, v7, mixed: v6 && v7 },
    version_hint_not_proof: v6 && v7 ? 'mixed_or_migrating' : v6 ? 'v6_likely' : v7 ? 'v7_likely' : 'unknown',
    warnings };
}
