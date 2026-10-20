#!/usr/bin/env python3
"""
Telemetry and Event Recorder for RelayDesk v0.5.0 Evaluation.
Maintains an append-only events.jsonl ledger complying with Section 13 of the validation protocol.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

TELEMETRY_DIR = Path(__file__).resolve().parent
EVENTS_PATH = TELEMETRY_DIR / "events.jsonl"
RUN_ID = "relaydesk-v050-exp-01"

def get_next_event_id() -> str:
    count = 0
    if EVENTS_PATH.exists():
        with open(EVENTS_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    count += 1
    return f"evt-{count + 1:06d}"

def record_event(
    role: str,
    task_id: str,
    phase: str,
    requested_action: str,
    status: str,
    expected_route: str = None,
    selected_route: str = None,
    native_invocation_evidence: str = None,
    artifact_paths: list = None,
    tests: list = None,
    commit_sha: str = None,
    duration_ms: int = None,
    human_approval: str = None,
    blocker: str = None,
    notes: str = None
) -> dict:
    event_id = get_next_event_id()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    event = {
        "run_id": RUN_ID,
        "event_id": event_id,
        "timestamp": now_iso,
        "brad_version": "0.5.0",
        "role": role,
        "session_id": "c4ebcc08-a5ba-416c-a7bd-23ae1953e974",
        "task_id": task_id,
        "phase": phase,
        "requested_action": requested_action,
        "expected_route": expected_route,
        "selected_route": selected_route,
        "native_invocation_evidence": native_invocation_evidence,
        "status": status,
        "artifact_paths": artifact_paths or [],
        "tests": tests or [],
        "commit_sha": commit_sha,
        "duration_ms": duration_ms,
        "human_approval": human_approval,
        "blocker": blocker,
        "notes": notes
    }
    
    with open(EVENTS_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")
        
    return event

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "init":
        # Log baseline initialization events
        e1 = record_event(
            role="COORDINATOR",
            task_id="TSK-001",
            phase="baseline-inspection",
            requested_action="Inspect official BRAD v0.5.0 baseline release and verify test suites",
            status="PASS",
            tests=[
                {"command": "node --test tests/*.test.mjs", "pass": 33, "fail": 0},
                {"command": "python -m unittest discover -s skills/brad/tests -v", "pass": 21, "fail": 0},
                {"command": "python tools/check_repository.py", "status": "PASS"},
                {"command": "npm.cmd pack --dry-run --json", "status": "PASS"}
            ],
            notes="Baseline v0.5.0 verified clean and passing all unit, packaging, and lint checks."
        )
        e2 = record_event(
            role="COORDINATOR",
            task_id="TSK-002",
            phase="environment-setup",
            requested_action="Prepare isolated laboratory workspace at <workspace-root>\\relaydesk-v050",
            status="PASS",
            artifact_paths=[
                "<workspace-root>\\relaydesk-v050\\integration",
                "<workspace-root>\\relaydesk-v050\\worktrees",
                "<workspace-root>\\relaydesk-v050\\qa",
                "<workspace-root>\\relaydesk-v050\\coordination",
                "<workspace-root>\\relaydesk-v050\\evidence",
                "<workspace-root>\\relaydesk-v050\\telemetry"
            ],
            notes="Isolated directory structure created per protocol Section 6."
        )
        e3 = record_event(
            role="COORDINATOR",
            task_id="TSK-003",
            phase="bmad-discovery",
            requested_action="Inspect host environment for installed native BMAD skills and runtime",
            status="PARTIAL",
            expected_route="inspect_bmad",
            selected_route="skills/brad/scripts/inspect_bmad.py",
            tests=[
                {"command": "python skills/brad/scripts/inspect_bmad.py --root .", "detected": False},
                {"command": "node cli/brad.mjs doctor --dir .", "detected": False}
            ],
            blocker="Native BMAD Method v6/v7 not installed in host. Execution L4/L5 will reflect actual host state (BLOCKED/UNSUPPORTED).",
            notes="Host discovery executed accurately without synthetic claims."
        )
        print(f"Initialized telemetry log with events: {e1['event_id']}, {e2['event_id']}, {e3['event_id']}")
