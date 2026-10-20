# Reproduction Guide — RelayDesk v0.5.0 Evaluation

To reproduce the verified evaluation metrics:

### 1. Audit Canonical Routing Cases
```powershell
python ..\..\skills\brad\scripts\audit_routing_results.py --cases ..\..\skills\brad\evals\routing-cases.json --observed evaluation\observed-for-audit.json --pretty
```

### 2. Run RelayDesk Server Test Suite
```powershell
cd app\server
npm test
```

### 3. Verify Candidate Improvements
In the candidate worktree:
```powershell
node --test tests/*.test.mjs
python -m unittest discover -s skills/brad/tests -v
python tools/check_repository.py
npm pack --dry-run --json
```

### 4. View Master Evaluation Report
Open `report/MASTER_REPORT.html` in any web browser (self-contained, offline-compatible).
