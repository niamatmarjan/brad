# Releasing BRAD

BRAD uses SemVer: `MAJOR.MINOR.PATCH`; pre-1.0 versions signal evolving APIs. `VERSION` is the source of truth for release tag names. Update `CHANGELOG.md` and `docs/releases/vX.Y.Z.md` on each release.

1. Modify code and tests in a PR; run `python -m unittest discover -s skills/brad/tests -v`, `npm test`, `npm pack --dry-run`, and `python tools/build_release.py`, `python tools/check_repository.py`. Check `package.json` version equals `VERSION`.
2. Merge after review and CI passes. The `.github/workflows/ci.yml` workflow runs on `main`.
3. After successful checks, if `vX.Y.Z` has not been released, the workflow invokes GitHub CLI to create a tag and a GitHub Release with the deterministic distribution ZIP.
4. Verify the created GitHub Release and its attached ZIP under the repository Releases tab. If GitHub Actions lacks `contents: write` or is disabled, a maintainer must create the tag/release manually after the same tests. **Do not claim a release exists without checking GitHub.**
5. Never rewrite an already published version/tag; increment `VERSION` instead.

The workflow intentionally does not publish a new release on every push: only when the current `VERSION` tag does not already exist.

The release workflow also attaches a GitHub-installable npm tarball to GitHub Releases. **This does not publish to npmjs.com.** npm registry publication is a separate, optional maintainer decision requiring registry credentials or trusted publishing.

## Required release review

- Confirm MIT `LICENSE` has not been unexpectedly replaced; preserve upstream notices and correct attribution for external contributions.
- Run the repository quality check, real CLI smoke tests and CI matrix; record the difference between static/unit tests and actual host-native BMAD invocation.
- Verify that `VERSION`, `package.json`, `CHANGELOG.md`, `docs/releases/vX.Y.Z.md`, installer quick starts and the release tag agree.
- The workflow computes and uploads `SHA256SUMS.txt` for both distribution assets. Review a tagged release before recommending it publicly.
- Prefer GitHub release tags over moving `main` as an installer target; do not publish the same tag twice or rewrite a published release.
- For v0.5.0 demos, follow [demo publication](../evaluation/demo-publication.md) and require a separate review of privacy, evidence integrity and user consent.

## Repository-level controls

The checked-in CODEOWNERS file indicates the maintainer for reviews but **does not itself enforce branch protection**. A repository administrator should enable required status checks, protected `main`, restrictions on force pushes/deletions, and private vulnerability reporting as appropriate in GitHub Settings. We do not claim these settings are enabled just because the files exist.
