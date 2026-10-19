#!/usr/bin/env python3
"""Read-only git/gh delivery preflight; no network calls or writes.

Usage: python delivery_preflight.py --root . [--pretty]
Does not fetch GitHub PR/CI or claim push/auth will work.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
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
    is_windows = sys.platform == "win32"
    npm_bin = shutil.which("npm.cmd" if is_windows else "npm")
    npx_bin = shutil.which("npx.cmd" if is_windows else "npx")
    result = {"root": str(root), "git_available": bool(git),
              "windows_cmd_required": is_windows,
              "npm_available": bool(npm_bin), "npx_available": bool(npx_bin),
              "gh_available": bool(gh), "git_repo": False,
              "current_branch": None, "dirty": None, "remotes": [],
              "gh_authenticated": None, "warnings": [], "remediations": [],
              "npm_version": None, "npm_git_policy": "not_checked"}
    if is_windows:
        result["warnings"].append("Windows PowerShell: prefer npm.cmd/npx.cmd if .ps1 execution is blocked; do not change execution policy.")
    # Optional best-effort diagnostic only. Never change npm config globally or
    # claim all npm 12 installations have the same policy.
    if npm_bin:
        npm_v = _cmd(root, [npm_bin, "--version"])
        if npm_v["exit"] == 0:
            result["npm_version"] = npm_v["stdout"].splitlines()[0] if npm_v["stdout"] else None
            try:
                major = int(result["npm_version"].split(".")[0])
            except (ValueError, AttributeError):
                major = 0
            if major >= 12:
                policy = _cmd(root, [npm_bin, "config", "get", "allow-git"])
                if policy["exit"] == 0:
                    value = policy["stdout"].strip().lower()
                    # npm may report 'undefined' on versions that do not expose
                    # this setting. Preserve ambiguity, do not invent a block.
                    if value not in ("", "undefined", "null"):
                        result["npm_git_policy"] = value
                if result["npm_git_policy"] not in ("all", "not_checked"):
                    result["warnings"].append("npm Git-source policy may restrict GitHub-backed npx packages.")
                    result["remediations"].append(
                        "If the trusted pinned GitHub package is blocked, inspect the npm error and "
                        "use an explicit one-command policy override supported by your npm version; "
                        "do not weaken global npm policy automatically."
                    )
    if not git:
        result["warnings"].append("Git unavailable: no local commit or branch operations.")
        result["remediations"].append("Install Git or use read-only/local non-Git workflows.")
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
            result["remediations"].append("Use a supported authenticated host GitHub connector or log in with gh auth login; never echo tokens.")
    else:
        result["warnings"].append("GitHub CLI unavailable; host may provide another PR tool.")
        result["remediations"].append("Check host-native GitHub access or use --local; do not claim a PR exists without its remote URL.")
    if not result["remotes"]:
        result["warnings"].append("No git remote: cannot push/create PR from this checkout.")
        if result["current_branch"]:
            result["remediations"].append(
                "Optional local handoff: git bundle create <safe-output-path> " + result["current_branch"] +
                " (run only with user approval and verified commits)."
            )
    if result["dirty"]:
        result["warnings"].append("Dirty worktree: preserve existing user changes.")
        result["remediations"].append("Preserve edits; prefer a clean, isolated worktree after confirming branch and ownership.")
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
