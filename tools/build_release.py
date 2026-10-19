#!/usr/bin/env python3
"""Create a deterministic install ZIP from canonical skills/brad sources.

Requires only Python stdlib; run from any working directory.
"""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import sys

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
if not VERSION or any(ch not in "0123456789." for ch in VERSION):
    raise SystemExit(f"Invalid VERSION: {VERSION!r}")

source = ROOT / "skills" / "brad"
required = [source / "SKILL.md", source / "evals" / "routing-cases.json", ROOT / "LICENSE"]
for path in required:
    if not path.is_file():
        raise SystemExit(f"Missing required distribution file: {path}")

files = []
for item in sorted(source.rglob("*")):
    if not item.is_file() or "__pycache__" in item.parts or item.suffix == ".pyc":
        continue
    files.append((item, "brad/" + item.relative_to(source).as_posix()))
for p, name in [
    (ROOT / ".github/agents/brad.agent.md", "copilot/brad.agent.md"),
    (ROOT / "brad.policy.example.yaml", "brad.policy.example.yaml"),
    (ROOT / "LICENSE", "LICENSE"),
    (ROOT / "docs/AI_SETUP.md", "AI_SETUP.md"),
    (ROOT / "VERSION", "VERSION"),
]:
    files.append((p,name))

out = ROOT / "dist" / f"brad-v{VERSION}.zip"
out.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(out,"w") as zipf:
    for path, name in sorted(files,key=lambda pair: pair[1]):
        info = ZipInfo(name, date_time=(2026,1,1,0,0,0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = (0o644 << 16)
        zipf.writestr(info,path.read_bytes(),compress_type=ZIP_DEFLATED)
print(f"Created {out} ({out.stat().st_size:,} bytes; {len(files)} files)")
