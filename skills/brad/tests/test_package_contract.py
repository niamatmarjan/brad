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

    def test_pr_is_gated_and_merge_not_default(self):
        md = (ROOT / "SKILL.md").read_text()
        delivery = (ROOT / "references" / "ticket-to-pr.md").read_text()
        self.assertIn("No force push", md)
        self.assertIn("Never merge", delivery)
        self.assertIn("--pr", md)
        self.assertIn("--plan", md)


if __name__ == "__main__":
    unittest.main()
