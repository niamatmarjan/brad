# Launch readiness and cross-host acceptance — BRAD v0.5.3

BRAD [v0.5.3](https://github.com/niamatmarjan/brad/releases/tag/v0.5.3) adds the verified read-only native skill inventory fix for Antigravity and Codex project paths. This is a **post-release compatibility and product-readiness plan**, not proof of universal AI-host or BMAD v7 execution. Do not rewrite published release tags.

## Verified evidence and remaining work

| Area | Known evidence (2026-10-24) | Required before claiming broader compatibility |
|---|---|---|
| Stable BMAD v6 | Windows first-run v6.12.4/BMM/TEA installation; bounded host Skill-tool pilot | Recheck with new upstream installers and each supported coding host |
| CLI/package | v0.5.2 [release CI](https://github.com/niamatmarjan/brad/actions/runs/39999668437) passed; v0.5.3 [candidate CI 40013336127](https://github.com/niamatmarjan/brad/actions/runs/40013336127) 8/8 PASS and a Windows operator tested an unpacked v0.5.3 npm tarball (39 native v6 skills + TEA found) | Final candidate release note review and **separate release authorization** before version-bump merge; current v0.5.2 asset hash recheck when required |
| Windows safety | 54/54 tests on Windows Node 22/24; local 5/5 and 100-init checks reported after fixes | Preserve transient error tests; investigate regressions without masking with retries |
| **BMAD v7 alpha** | Antigravity 1.1.12 rendered native `bmad-build` with `uv`, implemented an inline synthetic `ping` task (**3/3 tests PASS**) and dispatched an independent reviewer subagent. v7 Skills CLI still skipped `bmad-retrospective` due to confirmed YAML typo; native setup initially failed transient Windows `WinError 5` | **PARTIAL:** no demonstrated complete v7 ticket lifecycle or native TEA dispatch; upstream defects remain; see [#32](https://github.com/niamatmarjan/brad/issues/32) |
| **Claude Code v0.5.2** | v0.5.1 native Build/TEA observations; new v0.5.2 Windows binary + doctor checked but CLI session **not logged in** | Authenticate in authorized disposable workspace and capture an actual native invocation; new run BLOCKED |
| **Antigravity host v0.5.2** | Live catalog showed BRAD and stable v6 skills, inline v6 `/health` had **2/2** PASS; separate v7 inline Build `ping` had **3/3** PASS, with a genuine separate reviewer subagent | `render_skill.py` is an official instruction renderer **not** conclusive host Skill-tool dispatch; subagent review is independent context but not proof official native TEA dispatched |
| **Codex** | Supported path and deterministic CLI tests; Codex CLI absent in latest tested Windows shell | Install/authenticate Codex where permitted, then run actual v6/v7 native skill flow; **NOT_RUN** |
| **GitHub Copilot** | Copilot CLI 1.0.99-2 skill list found BRAD and 31 v7 entries under `.agents/skills`; no native invocation demonstrated | Run authenticated native Build/QA from selected skill, not just `skill list` |
| **ChatGPT web/Work** | Supported connected GitHub operations in eligible surfaces | Don't equate connector access with local skill execution |
| Security/privacy | Policy gates, public history audit | Recheck current repo for secrets; old metadata retained under [#16](https://github.com/niamatmarjan/brad/issues/16) |
| Stakeholder usability | Ten guides and prompt recipes | New-user walkthrough for PM, BA, Architect, Dev, QA, Delivery |

## Repeatable acceptance protocol per host

1. Record host/version/OS, source BRAD tag/commit, BMAD version/module set, runtime dependencies, user permissions and **exact disposable project root**.
2. Test `brad setup`, `doctor`, dry-run and non-destructive reinstall; capture exact exit codes. For official BMAD installation, obtain explicit approval and follow [v6/v7 selection](../getting-started/choose-bmad-version.md).
3. Restart the actual coding host **in the exact test workspace**; observe registered `brad` and native BMAD skills. A directory count is **NOT** host registration proof.
4. Execute one **read-only native** workflow; classify observed execution as `HOST_NATIVE_INVOKED`, `NATIVE_WORKFLOW_INLINE`, or `NOT_VERIFIED`.
5. If explicitly authorized, run one fictional ticket through bounded Build, focused real tests and an appropriately separate review/TEA. Log exact git diff, real test output, PR/CI only if approved.
6. Check no forced migrations, foreign-directory overwrites, fabricated independent agents, global installs, unapproved pushes/merges or production actions.
7. Preserve private raw logs, post sanitized command/exit and evidence, including all failures and BLOCKED/NOT_RUN cases. A single successful run is not certification of all future host releases.

## Documentation quality and release process

- [ ] User can distinguish **CLI `brad setup`** (files/install) from **chat `/brad setup`** or “use BRAD skill” (workflow planning, if host supports it).
- [ ] v6 stable vs v7 preview directions stay aligned with the [official upstream docs](https://docs.bmad-method.org/start/install-bmad/) rather than an expired preview ETA.
- [ ] README links route new users directly to host, version and role guides; role guides preserve their distinct human decision owners.
- [ ] Skill contract, `AGENTS.md` and host references avoid unconditional claims for ChatGPT, Claude.ai, Codex, Copilot and Antigravity.
- [ ] Versioned install examples use an actual tag; historical release notes are **not rewritten**.
- [ ] All Markdown links, required files, Node/Python tests, `npm pack`, CLI smoke and repository audit pass on the exact change.
- [ ] Any new runtime bug ships in its own reviewed and **version-bumped** release; a docs-only cleanup does not silently republish v0.5.2.

## Maintainer commands

```bash
npm test
python -m unittest discover -s skills/brad/tests -v
python -m unittest discover -s tests -p 'test_repository_quality.py' -v
python tools/check_repository.py
python tools/build_release.py
npm pack --dry-run --json
```

GitHub CI covers configured tests, **not** live IDE skill registration or v7 parity. Review [compatibility evidence](../reference/compatibility-matrix.md), [host setup](../getting-started/host-support.md), [all role guides](../roles/README.md), and [agent contribution instructions](../../AGENTS.md).
