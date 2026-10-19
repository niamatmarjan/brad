import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'scripts' / 'audit_routing_results.py'
spec = importlib.util.spec_from_file_location('routing_audit', p)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
CASES = json.loads((ROOT/'evals/routing-cases.json').read_text())['cases']


class RoutingAuditTests(unittest.TestCase):
    def test_cannot_count_missing_observations_as_passes(self):
        r=mod.summarize(CASES, [])
        self.assertEqual(r['observed'], 0)
        self.assertEqual(r['selection']['NOT_RUN'], 85)
    def test_flags_misrouted_cases_in_uploaded_report(self):
        r=mod.summarize(CASES, json.loads((ROOT/'evals/reported-regressions.json').read_text()))
        bad={x['id'] for x in r['cases'] if x['selection']=='FAIL'}
        self.assertTrue({'V6-01','V6-09','V6-10','V7-02','QA-02','QA-04','QA-06'}.issubset(bad))
        self.assertEqual(r['invocation']['NOT_RUN'], 85)
    def test_route_alone_is_not_agent_invocation(self):
        r=mod.summarize(CASES, [{'id':'V6-01','selected':'bmad-create-epics-and-stories', 'delivery':{'status':'PASS'}}])
        row=r['cases'][0]
        self.assertEqual(row['selection'],'PASS')
        self.assertEqual(row['invocation'],'NOT_RUN')
        self.assertEqual(row['delivery'],'UNVERIFIED')
    def test_invocation_requires_explicit_evidence(self):
        r=mod.summarize(CASES, [{'id':'V6-01','selected':'bmad-create-epics-and-stories', 'invoked':[{'skill':'bmad-create-epics-and-stories','evidence':'logs/01.json'}]}])
        self.assertEqual(r['cases'][0]['invocation'],'EVIDENCE_REPORTED')
    def test_duplicate_or_unknown_results_rejected(self):
        with self.assertRaises(ValueError):mod.summarize(CASES,[{'id':'V6-01'},{'id':'V6-01'}])
        with self.assertRaises(ValueError):mod.summarize(CASES,[{'id':'DNE'}])

if __name__ == '__main__':unittest.main()
