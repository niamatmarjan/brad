#!/usr/bin/env python3
"""[CROSS-PLATFORM BENCHMARK INTEGRITY TESTS]
Operation Ironclad — Cross-Platform Benchmark Integrity Unit Tests.

Runs in GitHub Actions (Linux) and locally on Windows/macOS.
Uses temporary portable test fixtures with injected transcript roots.
Tests all anti-gaming and anti-fabrication gates in Layer B and Layer C.
"""
from __future__ import annotations

import copy
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

# Adjust path so harness can be imported
TESTS_DIR = Path(__file__).resolve().parent
LAB_ROOT = TESTS_DIR.parent
import sys
sys.path.insert(0, str(LAB_ROOT / "harness" / "validators"))
sys.path.insert(0, str(LAB_ROOT / "harness" / "runner"))

from evidence_validator import (
    validate_evidence_record,
    validate_batch,
    REQUIRED_RECORD_FIELDS,
)
from score_benchmark import score_evidence_record


class PortableBenchmarkIntegrityTests(unittest.TestCase):
    """Cross-platform unit tests for Layer B Evidence Validator and Layer C Scorer."""

    def setUp(self):
        # Create portable temporary fixture directory
        self.temp_dir = tempfile.TemporaryDirectory()
        self.tmp = Path(self.temp_dir.name)

        # 1. Create portable mock workspace fixture
        self.mock_fixture = self.tmp / "workspace"
        self.mock_fixture.mkdir()
        skill_dir = self.mock_fixture / ".agent" / "skills" / "bmad-prd"
        skill_dir.mkdir(parents=True)
        self.skill_file = skill_dir / "SKILL.md"
        self.skill_file.write_text("# bmad-prd skill definition\n", encoding="utf-8")

        # 2. Create portable mock brain directory with valid transcript
        self.mock_brain = self.tmp / "brain"
        self.session_id = "test-session-uuid-001"
        transcript_dir = self.mock_brain / self.session_id / ".system_generated" / "logs"
        transcript_dir.mkdir(parents=True)
        self.transcript_file = transcript_dir / "transcript.jsonl"

        mock_events = [
            {
                "created_at": "2026-10-24T02:00:00Z",
                "type": "SYSTEM_MESSAGE",
                "content": "Stakeholder Request: Maya Chen (PM) - 'We need a PRD for AegisFlow.'",
            },
            {
                "created_at": "2026-10-24T02:01:00Z",
                "type": "PLANNER_RESPONSE",
                "tool_calls": [
                    {
                        "name": "run_command",
                        "args": {"CommandLine": "python .agent/skills/bmad-prd/scripts/memlog.py init"},
                    }
                ],
            },
            {
                "created_at": "2026-10-24T02:02:00Z",
                "type": "GENERIC",
                "content": "Command exited with code 0.\nCommand output:\nInitialized",
            },
        ]
        with open(self.transcript_file, "w", encoding="utf-8") as f:
            for ev in mock_events:
                f.write(json.dumps(ev) + "\n")

        # 3. Create canonical valid evidence record referencing portable temp fixture
        self.sample_valid_record = {
            "run_id": "RUN-PORTABLE-TEST-001",
            "case_id": "R01-01",
            "prompt": "We need a PRD for AegisFlow.",
            "host_platform": "Google Antigravity",
            "brad_version": "0.5.3",
            "bmad_version": "v6.12",
            "fixture_dir": str(self.mock_fixture),
            "discovered_catalog": ["bmad-prd"],
            "session_id": self.session_id,
            "entrypoint_selected": "brad",
            "observed_route": "bmad-prd",
            "native_skill_invoked": True,
            "native_skill_name": "bmad-prd",
            "native_skill_path": str(self.skill_file),
            "tool_call_linkage": [
                {
                    "name": "run_command",
                    "args": {"CommandLine": "python memlog.py init"},
                    "status": "RECORDED_FROM_DISK_TRANSCRIPT",
                    "output_excerpt": "Command exited with code 0.",
                }
            ],
            "start_time": "2026-10-24T02:00:00Z",
            "end_time": "2026-10-24T02:05:00Z",
            "observed_artifacts": ["requirements/prd.md"],
            "authorization_decision": "AUTHORIZED",
            "side_effects_detected": ["M requirements/prd.md"],
            "provenance": "SUBAGENT_DISPATCHED",
            "error_or_timeout": None,
        }

    def tearDown(self):
        self.temp_dir.cleanup()

    # --- Layer B Validator Tests ---

    def test_valid_record_passes(self):
        res = validate_evidence_record(
            self.sample_valid_record,
            antigravity_brain_dir=self.mock_brain,
            enforce_manifest_identity=True,
        )
        self.assertTrue(res["valid"])
        self.assertEqual(res["validated_provenance"], "SUBAGENT_DISPATCHED")
        self.assertEqual(len(res["errors"]), 0)

    def test_missing_required_fields_fails_closed(self):
        for field in ["run_id", "case_id", "prompt", "session_id", "provenance"]:
            record = copy.deepcopy(self.sample_valid_record)
            del record[field]
            res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
            self.assertFalse(res["valid"])
            self.assertEqual(res["validated_provenance"], "NOT_VERIFIED")
            self.assertTrue(any("Missing required fields" in e for e in res["errors"]))

    def test_claimed_skill_not_in_discovered_catalog_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["native_skill_name"] = "fictional-magical-skill"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("not in discovered_catalog" in e for e in res["errors"]))

    def test_claimed_skill_with_missing_disk_path_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["native_skill_path"] = str(self.mock_fixture / "nonexistent" / "SKILL.md")
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("does not exist on disk" in e for e in res["errors"]))

    def test_native_invoked_with_empty_tool_calls_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["tool_call_linkage"] = []
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("tool_call_linkage is empty" in e for e in res["errors"]))

    def test_refusal_with_destructive_side_effects_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["authorization_decision"] = "REFUSED"
        record["side_effects_detected"] = ["git push origin main", "drop table audit_log"]
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("destructive side-effect detected" in e for e in res["errors"]))

    def test_inverted_timestamps_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["start_time"] = "2026-10-24T02:05:00Z"
        record["end_time"] = "2026-10-24T02:00:00Z"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("earlier than start_time" in e for e in res["errors"]))

    def test_invalid_provenance_enum_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["provenance"] = "MAGIC_TELEPATHY"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("Invalid provenance" in e for e in res["errors"]))

    def test_missing_transcript_on_disk_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["session_id"] = "nonexistent-session-uuid-999"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("transcript not found on disk" in e.lower() for e in res["errors"]))

    def test_frozen_case_prompt_mismatch_fails_with_invalid_fixture(self):
        record = copy.deepcopy(self.sample_valid_record)
        # R01-01 in frozen manifest expects "We need a PRD for AegisFlow."
        # Alter prompt to test mismatch detection
        record["prompt"] = "Completely different unapproved prompt"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain, enforce_manifest_identity=True)
        self.assertFalse(res["valid"])
        self.assertEqual(res["validated_provenance"], "INVALID_FIXTURE")
        self.assertTrue(any("prompt mismatch" in e for e in res["errors"]))

    def test_batch_duplicate_case_ids_fails_closed(self):
        batch_file = self.tmp / "dup_batch.jsonl"
        with open(batch_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.sample_valid_record) + "\n")
            f.write(json.dumps(self.sample_valid_record) + "\n")

        res = validate_batch(batch_file, antigravity_brain_dir=self.mock_brain)
        self.assertEqual(res["total_records"], 2)
        self.assertEqual(res["valid_records"], 1)
        self.assertTrue(any("Duplicate (run_id, case_id) detected" in e for e in res["errors"]))

    def test_session_id_replay_attack_fails_closed(self):
        batch_file = self.tmp / "replay_batch.jsonl"
        rec2 = copy.deepcopy(self.sample_valid_record)
        rec2["case_id"] = "R02-01"
        rec2["prompt"] = "Work out the business rules."
        # Re-using same session_id across different frozen case_ids!
        with open(batch_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.sample_valid_record) + "\n")
            f.write(json.dumps(rec2) + "\n")

        res = validate_batch(batch_file, antigravity_brain_dir=self.mock_brain)
        self.assertEqual(res["total_records"], 2)
        self.assertEqual(res["valid_records"], 1)
        self.assertTrue(any("Session ID replay attack detected" in e for e in res["errors"]))

    # --- Layer C Scorer Tests ---

    def test_scorer_scores_valid_record_pass(self):
        val_res = validate_evidence_record(self.sample_valid_record, antigravity_brain_dir=self.mock_brain)
        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}

        scored = score_evidence_record(self.sample_valid_record, oracle_entry, manifest_item, val_res)
        self.assertEqual(scored["overall_status"], "PASS")
        self.assertTrue(scored["entrypoint_recognized"])
        self.assertTrue(scored["intent_selected_correctly"])
        self.assertTrue(scored["native_workflow_invoked"])
        self.assertTrue(scored["task_completed"])

    def test_scorer_fails_closed_when_layer_b_fails(self):
        invalid_rec = copy.deepcopy(self.sample_valid_record)
        invalid_rec["discovered_catalog"] = []  # skill missing
        val_res = validate_evidence_record(invalid_rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(val_res["valid"])

        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}

        scored = score_evidence_record(invalid_rec, oracle_entry, manifest_item, val_res)
        self.assertEqual(scored["overall_status"], "NOT_VERIFIED")
        self.assertFalse(scored["intent_selected_correctly"])

    def test_scorer_scores_invalid_fixture_status(self):
        invalid_rec = copy.deepcopy(self.sample_valid_record)
        invalid_rec["prompt"] = "Mismatched prompt"
        val_res = validate_evidence_record(invalid_rec, antigravity_brain_dir=self.mock_brain, enforce_manifest_identity=True)
        self.assertEqual(val_res["validated_provenance"], "INVALID_FIXTURE")

        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}

        scored = score_evidence_record(invalid_rec, oracle_entry, manifest_item, val_res)
        self.assertEqual(scored["overall_status"], "INVALID_FIXTURE")
        self.assertEqual(scored["provenance"], "INVALID_FIXTURE")

    # --- Layer A Host Execution Adapter Tests ---

    def test_host_execution_adapter_portable_extraction(self):
        from host_execution_adapter import HostExecutionAdapter
        adapter = HostExecutionAdapter(fixture_dir=self.mock_fixture, brain_dir=self.mock_brain)

        self.assertIn("bmad-prd", adapter.catalog)
        record = adapter.extract_evidence_from_session(
            session_id=self.session_id,
            case_id="R01-01",
            run_id="RUN-PORTABLE-EXTRACT",
            permitted_context={"prompt": "We need a PRD for AegisFlow."},
        )

        self.assertEqual(record["case_id"], "R01-01")
        self.assertEqual(record["observed_route"], "bmad-prd")
        self.assertTrue(record["native_skill_invoked"])
        self.assertEqual(len(record["tool_call_linkage"]), 1)
        self.assertEqual(record["tool_call_linkage"][0]["name"], "run_command")
        self.assertIn("Command exited with code 0", record["tool_call_linkage"][0]["output_excerpt"])
        self.assertEqual(record["provenance"], "SUBAGENT_DISPATCHED")


if __name__ == "__main__":
    unittest.main()
