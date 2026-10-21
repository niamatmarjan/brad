#!/usr/bin/env python3
"""Read-only release/repository hygiene audit (stdlib, no network calls)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    'LICENSE', 'NOTICE.md', 'BRANDING.md', 'CODE_OF_CONDUCT.md',
    'CONTRIBUTING.md', 'SECURITY.md', 'SUPPORT.md', 'GOVERNANCE.md',
    'ROADMAP.md', 'AGENTS.md', 'README.md', 'CHANGELOG.md',
    'docs/AI_SETUP.md', 'docs/installation.md', 'docs/releasing.md',
    'docs/validation.md', 'docs/demo-publication.md',
    'examples/README.md',
    # Canonical topic directories in addition to legacy compatibility pages.
    'docs/README.md', 'docs/getting-started/ai-setup.md',
    'docs/getting-started/installation.md', 'docs/sdlc/README.md',
    'docs/sdlc/sdlc-playbook.md', 'docs/sdlc/raci-matrix.md',
    'docs/roles/README.md', 'docs/reference/architecture.md',
    'docs/evaluation/README.md', 'docs/evaluation/validation.md',
    'docs/evaluation/demo-publication.md', 'docs/maintainers/releasing.md',
    '.github/PULL_REQUEST_TEMPLATE.md', '.github/CODEOWNERS',
    '.github/ISSUE_TEMPLATE/bug_report.md',
    '.github/ISSUE_TEMPLATE/feature_request.md',
    '.github/ISSUE_TEMPLATE/config.yml',
    '.github/workflows/ci.yml', 'VERSION', 'package.json',
]
CHECK_DOCS = [
    'README.md', 'AGENTS.md', 'NOTICE.md', 'BRANDING.md',
    'CONTRIBUTING.md', 'SECURITY.md', 'SUPPORT.md', 'GOVERNANCE.md',
    'ROADMAP.md', 'docs/AI_SETUP.md', 'docs/installation.md',
    'docs/releasing.md', 'docs/validation.md',
    'docs/demo-publication.md', 'examples/README.md',
    # Validate all maintained and compatibility guides, excluding immutable release notes.
    *[str(p.relative_to(ROOT)) for p in (ROOT / 'docs').rglob('*.md')
      if 'releases' not in p.parts],
]
BAD_SEGMENTS = {'__pycache__', 'node_modules', 'dist', '.venv', '.git', '.next'}


def audit(root: Path = ROOT) -> list[str]:
    errors = []
    for filename in REQUIRED:
        if not (root / filename).is_file():
            errors.append(f'missing required file: {filename}')
    if errors:
        return errors  # avoid cascading errors

    version = (root / 'VERSION').read_text(encoding='utf-8').strip()
    if not re.fullmatch(r'0|[1-9]\d*', version.split('.')[0]) or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', version):
        errors.append(f'invalid SemVer release version: {version!r}')

    try:
        package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
        if package.get('version') != version:
            errors.append('VERSION differs from package.json version')
        if package.get('license') != 'MIT':
            errors.append('package.json license must match the MIT LICENSE')
        if package.get('private') is True:
            errors.append('package is unexpectedly marked private')
        if 'NOTICE.md' not in package.get('files', []):
            errors.append('npm distribution must include NOTICE.md')
    except (ValueError, OSError) as exc:
        errors.append(f'package.json parse failure: {exc}')

    license_text = (root / 'LICENSE').read_text(encoding='utf-8')
    if 'MIT License' not in license_text or 'Copyright' not in license_text or 'Permission is hereby granted' not in license_text:
        errors.append('MIT license text/permission notice is missing')

    changelog = (root / 'CHANGELOG.md').read_text(encoding='utf-8')
    if not changelog.startswith('# Changelog\n'):
        errors.append('CHANGELOG should have one canonical top-level heading')
    if f'## [{version}]' not in changelog:
        errors.append(f'CHANGELOG is missing v{version} entry')
    if not (root / f'docs/releases/v{version}.md').exists():
        errors.append(f'missing release note for v{version}')

    for filename in ['README.md', 'docs/AI_SETUP.md', 'docs/installation.md',
                     'docs/getting-started/ai-setup.md', 'docs/getting-started/installation.md']:
        t = (root / filename).read_text(encoding='utf-8')
        if f'github:niamatmarjan/brad#v{version}' not in t:
            errors.append(f'{filename} missing pinned v{version} install command')

    # Check repository-relative Markdown references, not HTTP URLs or anchors.
    # Ignore code-block markdown by only accepting links whose file target exists;
    # all checked authored documents use regular Markdown links.
    link_pattern = re.compile(r'(?<!!)\[[^\]]+\]\(([^)]+)\)')
    for filename in CHECK_DOCS:
        path = root / filename
        if not path.exists():
            continue
        content = path.read_text(encoding='utf-8')
        for raw in link_pattern.findall(content):
            target = unquote(raw.split(' "', 1)[0].split('#', 1)[0].strip())
            if not target or '://' in target or target.startswith(('mailto:', '#', 'data:')):
                continue
            if not (path.parent / target).resolve().is_file():
                errors.append(f'{filename}: broken relative link: {raw}')

    for f in root.rglob('*'):
        if not f.is_file():
            continue
        rel = f.relative_to(root)
        # Workspaces naturally generate ignored caches; only shipped files matter.
        # A separately tracked-file check can identify accidentally committed caches.
        if any(part in BAD_SEGMENTS for part in rel.parts):
            continue
        if f.suffix == '.pyc':
            errors.append(f'Python bytecode in release tree: {rel.as_posix()}')
    return errors


def main() -> int:
    errors = audit()
    if errors:
        print('BRAD repository audit FAIL:')
        for error in errors:
            print(' -', error)
        return 1
    print(f'BRAD repository audit PASS: version {(ROOT / "VERSION").read_text().strip()}, required policies, links and source hygiene')
    return 0


if __name__ == '__main__':
    sys.exit(main())
