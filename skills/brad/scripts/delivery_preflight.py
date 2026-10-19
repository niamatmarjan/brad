#!/usr/bin/env python3
"""Read-only git/gh delivery preflight; no network calls or writes.

Usage: python delivery_preflight.py --root . [--pretty]
Does not fetch GitHub PR/CI or claim push/auth will work.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


def _cmd(root: Path, argv: list[str]) -> dict:
    try:
        p = subprocess.run(argv, cwd=root, capture_output=True, text=True,
                           check=False, timeout=6)
        return {"exit": p.returncode, "stdout": p.stdout.strip(),
                "stderr": p.stderr.strip()}
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {"exit": None, "stdout": "", "stderr": str(exc)}


def inspect(root: Path) -> dict:
    root = root.resolve()
    if not root.is_dir():
        raise ValueError(f"Not a directory: {root}")
    git = shutil.which("git")
    gh = shutil.which("gh")
    result = {"root": str(root), "git_available": bool(git),
              "gh_available": bool(gh), "git_repo": False,
              "current_branch": None, "dirty": None, "remotes": [],
              "gh_authenticated": None, "warnings": []}
    if not git:
        result["warnings"].append("Git unavailable: no local commit or branch operations.")
        return result
    probe = _cmd(root, [git, "rev-parse", "--is-inside-work-tree"])
    if probe["exit"] != 0 or probe["stdout"] != "true":
        result["warnings"].append("Not inside a git working tree.")
        return result
    result["git_repo"] = True
    branch = _cmd(root, [git, "branch", "--show-current"])
    result["current_branch"] = branch["stdout"] if branch["exit"] == 0 else None
    status = _cmd(root, [git, "status", "--porcelain=v1"])
    if status["exit"] == 0:
        result["dirty"] = bool(status["stdout"])
    remotes = _cmd(root, [git, "remote"])
    if remotes["exit"] == 0:
        result["remotes"] = remotes["stdout"].splitlines() if remotes["stdout"] else []
    if gh:
        auth = _cmd(root, [gh, "auth", "status"])
        result["gh_authenticated"] = (auth["exit"] == 0)
        if not result["gh_authenticated"]:
            result["warnings"].append("gh auth status did not succeed; PR access unverified.")
    else:
        result["warnings"].append("GitHub CLI unavailable; host may provide another PR tool.")
    if not result["remotes"]:
        result["warnings"].append("No git remote: cannot push/create PR from this checkout.")
    if result["dirty"]:
        result["warnings"].append("Dirty worktree: preserve existing user changes.")
    result["warnings"].append("Read-only preflight, NOT proof of remote write or CI permissions.")
    return result


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", type=Path, default=Path.cwd())
    p.add_argument("--pretty", action="store_true")
    a = p.parse_args()
    try:
        data = inspect(a.root)
    except ValueError as exc:
        p.error(str(exc))
    print(json.dumps(data, sort_keys=True, indent=2 if a.pretty else None))


if __name__ == "__main__":
    main()
