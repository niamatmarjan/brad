#!/usr/bin/env python3
"""Run Layer B validation and Layer C scoring on vertical slice events."""
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "harness" / "validators"))
sys.path.insert(0, str(BASE_DIR / "harness" / "runner"))

from evidence_validator import validate_batch
from score_benchmark import score_events_file

ev_file = BASE_DIR / "evidence" / "routing" / "phase3-authentic-execution" / "vertical-slice-events.jsonl"
scored_file = BASE_DIR / "evidence" / "routing" / "phase3-authentic-execution" / "vertical-slice-scored.json"

print("=== LAYER B EVIDENCE VALIDATION ===")
val_res = validate_batch(ev_file)
print(f"Total: {val_res['total_records']}, Valid: {val_res['valid_records']}, Invalid: {val_res['invalid_records']}")
if val_res['errors']:
    print("Errors:")
    for err in val_res['errors']:
        print("  -", err)

print("\n=== LAYER C INDEPENDENT SCORING ===")
score_res = score_events_file(ev_file, scored_file)
print(f"Evaluated: {score_res['total_evaluated']}")
for k, v in score_res['status_counts'].items():
    print(f"  {k}: {v}")
print(f"Pass Rate: {score_res['pass_rate_pct']:.1f}%")
print("Dimensional Metrics:")
for dim, pct in score_res['dimensional_metrics'].items():
    if dim != "raw_counts":
        print(f"  {dim}: {pct:.1f}%")
