# Launch readiness and cross-host acceptance — BRAD v0.5.2

BRAD is already published at [v0.5.2](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2). This is a **post-release product-readiness plan**, not a promise of universal compatibility or an authorization for a new version. Do not move or rewrite the existing release tag.

## Verified evidence and remaining work

| Area | Known evidence (2026-10-24) | Required before claiming broader compatibility |
|---|---|---|
| Stable BMAD v6 | Windows first-run v6.12.4/BMM/TEA installation; bounded host Skill-tool pilot | Recheck with new upstream installers and each supported coding host |
| CLI/package | v0.5.2 [CI/release](https://github.com/niamatmarjan/brad/actions/runs/39999668437) passed; ZIP, tarball and checksums published | Independent downloaded-file hash check on releases |
| Windows safety | 54/54 tests on Windows Node 22/24; local 5/5 and 100-init checks reported after fixes | Preserve transient error tests; investigate regressions without masking with retries |
| **BMAD v7 alpha** | Routing hints and documentation only | **Host-native v7 Build/ticket/review test NOT_RUN**; no claim of full parity |
| **Claude Code v0.5.2** | v0.5.1 native Build/TEA observations | Replay exact v0.5.2 tagged release and capture actual host invocation |
| **Antigravity host v0.5.2** | Official BMAD installed into disposable workspace | Actually open that workspace in fresh GUI host; live skill catalog and native invocation **NOT_VERIFIED** |
| **Codex** | Shared skill path and CLI setup/doctor | Real Codex v0.5.2 skill discovery and bounded v6/v7 native execution |
| **GitHub Copilot** | Packaged skills and optional agent file | Authenticated VS Code/Copilot CLI Skill invocation + test result |
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
