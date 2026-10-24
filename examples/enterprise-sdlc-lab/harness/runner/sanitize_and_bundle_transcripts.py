#!/usr/bin/env python3
"""[PORTABLE TRANSCRIPT SANITIZER & BUNDLER]
Operation Ironclad — Evidence Sanitization & Bundling Tool.

Sanitizes host-specific paths, environment usernames, and local system details
from Antigravity disk transcripts to produce portable, sanitized evidence
suitable for open-source distribution and compliance review.

OUTPUT DIRECTORY:
examples/enterprise-sdlc-lab/evidence/certification-package/sanitized-transcripts/
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CERT_DIR = BASE_DIR / "evidence" / "certification-package"
SANITIZED_DIR = CERT_DIR / "sanitized-transcripts"
MANIFEST_FILE = CERT_DIR / "evidence-manifest-sha256.json"

SANITIZED_DIR.mkdir(parents=True, exist_ok=True)


def get_default_brain_dir() -> Path:
    if "ANTIGRAVITY_BRAIN_DIR" in os.environ:
        return Path(os.environ["ANTIGRAVITY_BRAIN_DIR"])
    home = os.environ.get("USERPROFILE") or os.environ.get("HOME")
    return Path(home) / ".gemini" / "antigravity" / "brain"


def sanitize_text(text: str) -> str:
    """Sanitizes absolute local user paths and platform-specific strings."""
    # Replace Windows user profile paths
    user = os.environ.get("USERNAME") or os.environ.get("USER") or "NiamatMarjan"
    sanitized = text.replace(f"C:\\Users\\{user}", "<USER_HOME>")
    sanitized = sanitized.replace(f"C:/Users/{user}", "<USER_HOME>")
    sanitized = sanitized.replace(f"/Users/{user}", "<USER_HOME>")
    sanitized = sanitized.replace(f"/home/{user}", "<USER_HOME>")

    # Replace local repository roots
    sanitized = sanitized.replace("C:\\Projects\\Personal\\brad-labs\\phase3-vertical-slice\\workspace-v6-stable", "<WORKSPACE_V6_STABLE>")
    sanitized = sanitized.replace("C:/Projects/Personal/brad-labs/phase3-vertical-slice/workspace-v6-stable", "<WORKSPACE_V6_STABLE>")
    sanitized = sanitized.replace("C:\\Projects\\Personal\\brad", "<BRAD_REPO>")
    sanitized = sanitized.replace("C:/Projects/Personal/brad", "<BRAD_REPO>")

    return sanitized


def sanitize_session_transcript(session_id: str, case_id: str, brain_dir: Path) -> Path | None:
    """Sanitizes a single session transcript and writes to sanitized directory."""
    raw_path = brain_dir / session_id / ".system_generated" / "logs" / "transcript.jsonl"
    if not raw_path.is_file():
        print(f"Warning: Raw transcript not found for session {session_id} ({case_id})")
        return None

    out_file = SANITIZED_DIR / f"{case_id}_{session_id[:8]}_sanitized.jsonl"
    line_count = 0

    with open(raw_path, "r", encoding="utf-8") as fin, open(out_file, "w", encoding="utf-8") as fout:
        for line in fin:
            if not line.strip():
                continue
            sanitized_line = sanitize_text(line)
            fout.write(sanitized_line.strip() + "\n")
            line_count += 1

    return out_file


def bundle_all_sessions(session_manifest: list[dict[str, str]]) -> dict[str, str]:
    """Sanitizes all sessions in manifest and generates SHA-256 package manifest."""
    brain_dir = get_default_brain_dir()
    hashes: dict[str, str] = {}

    print(f"Sanitizing {len(session_manifest)} transcripts into {SANITIZED_DIR}...")
    for item in session_manifest:
        sid = item["session_id"]
        cid = item["case_id"]
        out_path = sanitize_session_transcript(sid, cid, brain_dir)
        if out_path and out_path.is_file():
            h = hashlib.sha256(out_path.read_bytes()).hexdigest()
            rel_name = f"sanitized-transcripts/{out_path.name}"
            hashes[rel_name] = h
            print(f"  [SANITIZED] {cid:7} ({sid[:8]}): {out_path.stat().st_size:6} bytes -> {h[:12]}")

    return hashes


if __name__ == "__main__":
    from build_authentic_vertical_slice import AUTHENTIC_SESSION_MANIFEST
    hashes = bundle_all_sessions(AUTHENTIC_SESSION_MANIFEST)
    print(f"\nSanitized {len(hashes)} transcripts successfully.")
