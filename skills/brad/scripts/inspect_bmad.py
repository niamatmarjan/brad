#!/usr/bin/env python3
"""Read-only BMAD workspace capability inventory; does not run BMAD.

Usage: python inspect_bmad.py --root path/to/repo [--pretty]
Only inspects well-known project-local directories and git status.
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

# Match the project-local native skill roots already inspected by the BRAD CLI.
# Antigravity's official BMAD installer uses singular .agent/skills; the
# shared .agents/skills is often BRAD's own host-neutral installation.
# The inventory is read-only, and these paths do not prove host registration.
SKILL_PARENTS = (
    ".agents/skills",
    ".agent/skills",
    ".github/skills",
    ".claude/skills",
    ".codex/skills",
)
SIGNALS_V6 = ("bmad-help", "bmad-sprint-planning", "bmad-create-epics-and-stories")
SIGNALS_V7 = ("bmad", "bmad-agent-po")


def inspect(root: Path) -> dict:
    root = root.resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Project root does not exist or is not a directory: {root}")
    definitions: dict[str, list[str]] = {}
    for rel in SKILL_PARENTS:
        directory = root / rel
        if not directory.is_dir():
            continue
        for entry in sorted(directory.iterdir()):
            if entry.is_dir() and (entry / "SKILL.md").is_file():
                definitions.setdefault(entry.name, []).append(str(entry / "SKILL.md"))
    skills = sorted(definitions)
    output = root / "_bmad-output"
    bmad = root / "_bmad"
    ticket_trees = []
    # Cap recursive search to avoid enormous scans and symlink loops.
    if output.is_dir():
        for p in output.rglob("tickets.toml"):
            if p.is_file() and len(ticket_trees) < 20:
                ticket_trees.append(str(p.relative_to(root)))
            if len(ticket_trees) >= 20:
                break
    sprint_status_files = []
    if output.is_dir():
        for p in output.rglob("sprint-status.yaml"):
            if p.is_file() and len(sprint_status_files) < 20:
                sprint_status_files.append(str(p.relative_to(root)))
            if len(sprint_status_files) >= 20:
                break

    v7_marker = (bmad / "method/scripts/tickets.py").is_file()
    v6_markers = [s for s in SIGNALS_V6 if s in definitions]
    v7_markers = [s for s in SIGNALS_V7 if s in definitions]
    if sprint_status_files:
        v6_markers.append("sprint-status.yaml")
    if ticket_trees or v7_marker:
        v7_markers.append("ticket-tree")
    if v6_markers and v7_markers:
        version_hint = "mixed_or_migrating"
    elif v6_markers:
        version_hint = "v6_likely"
    elif v7_markers:
        version_hint = "v7_likely"
    else:
        version_hint = "unknown"

    git = {"present": (root / ".git").exists(), "status": None, "error": None}
    if git["present"]:
        try:
            proc = subprocess.run(
                ["git", "status", "--short"],
                cwd=root, capture_output=True, text=True, timeout=5, check=False,
            )
            if proc.returncode == 0:
                git["status"] = proc.stdout.strip().splitlines()
            else:
                git["error"] = proc.stderr.strip() or f"exit {proc.returncode}"
        except (OSError, subprocess.TimeoutExpired) as exc:
            git["error"] = str(exc)

    return {
        "root": str(root),
        "version_hint_not_proof": version_hint,
        "evidence": {"v6": v6_markers, "v7": v7_markers},
        "bmad_runtime_present": bmad.is_dir(),
        "bmad_config_present": [str(p.relative_to(root)) for p in (
            bmad / "config.toml", bmad / "config.yaml",
            bmad / "bmm/config.yaml", bmad / "config.user.toml"
        ) if p.is_file()],
        "installed_project_skill_definitions": definitions,
        "duplicate_skill_names": {k: v for k, v in definitions.items() if len(v) > 1},
        "optional_module_hints": {
            "tea": any("testarch" in x or x == "bmad-agent-tea" for x in skills),
            "gds": any(x.startswith(("gds-", "bmgd-")) for x in skills),
            "cis": any("cis" in x for x in skills),
        },
        "sprint_status_files_sample": sprint_status_files,
        "ticket_tree_files_sample": ticket_trees,
        "git": git,
        "warnings": [
            "Read-only inventory only: inspect runtime and exact SKILL.md contents before selecting a workflow.",
            "Global/user-installed skills and host subagent permissions are not inspected.",
            "Version hint is NOT a guaranteed BMAD version identification.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()
    try:
        report = inspect(args.root)
    except ValueError as exc:
        parser.error(str(exc))
    print(json.dumps(report, indent=2 if args.pretty else None, sort_keys=True))


if __name__ == "__main__":
    main()
