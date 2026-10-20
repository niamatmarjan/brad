import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PackageContractTests(unittest.TestCase):
    def test_references_and_scripts_present(self):
        md = (ROOT / "SKILL.md").read_text()
        names = ["version-routing.md", "ticket-to-pr.md", "epics-and-stories.md",
                 "quality-and-release.md", "clarification-and-risk.md",
                 "hosts-and-handoffs.md"]
        for name in names:
            self.assertIn(name, md)
            self.assertTrue((ROOT / "references" / name).is_file())
        self.assertTrue((ROOT / "scripts" / "delivery_preflight.py").is_file())

    def test_scenarios_unique_and_delivery_coverage(self):
        scenarios = json.loads((ROOT / "evals" / "routing-cases.json").read_text())
        ids = [case["id"] for case in scenarios["cases"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreaterEqual(sum(x.startswith("DEL-") for x in ids), 20)

    def test_increment_lane_is_visible_in_primary_skill(self):
        skill = (ROOT / "SKILL.md").read_text()
        self.assertIn("/brad increment <module>", skill)
        self.assertIn("Do not create a replacement PRD or imply approval", skill)

    def test_incremental_changes_preserve_approved_artifacts(self):
        planning = (ROOT / "references" / "epics-and-stories.md").read_text()
        self.assertIn("do not regenerate the whole PRD", planning)
        self.assertIn("read-only PRD, architecture, or backlog review", planning)
        self.assertIn("second authoritative backlog", planning)

    def test_review_intent_never_authorizes_delivery(self):
        delivery = (ROOT / "references" / "ticket-to-pr.md").read_text()
        self.assertIn("Strict review-only boundary", delivery)
        self.assertIn("even when repository policy normally enables", delivery)
        self.assertIn("Do **not** change code, create a branch", delivery)

    def test_native_execution_modes_are_not_conflated(self):
        hosts = (ROOT / "references" / "hosts-and-handoffs.md").read_text()
        skill = (ROOT / "SKILL.md").read_text()
        for label in ("HOST_NATIVE_INVOKED", "NATIVE_WORKFLOW_INLINE",
                      "SEPARATE_SPECIALIST_INVOKED", "HELPER_SCRIPTS_ONLY",
                      "NOT_VERIFIED"):
            self.assertIn(label, hosts)
        self.assertIn("not operating-system shell commands", hosts)
        self.assertIn("never assume the script exists in all", hosts)
        self.assertIn("A proposed route is NOT evidence an agent ran", skill)
        self.assertIn("same-session native workflow execution", skill)

    def test_pr_is_gated_and_merge_not_default(self):
        md = (ROOT / "SKILL.md").read_text()
        delivery = (ROOT / "references" / "ticket-to-pr.md").read_text()
        self.assertIn("No force push", md)
        self.assertIn("Never merge", delivery)
        self.assertIn("--pr", md)
        self.assertIn("--plan", md)


if __name__ == "__main__":
    unittest.main()
