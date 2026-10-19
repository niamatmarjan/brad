# Releasing BRAD

BRAD uses SemVer: `MAJOR.MINOR.PATCH`; pre-1.0 versions signal evolving APIs. `VERSION` is the source of truth for release tag names. Update `CHANGELOG.md` and `docs/releases/vX.Y.Z.md` on each release.

1. Modify code and tests in a PR; run `python -m unittest discover -s skills/brad/tests -v`, `npm test`, `npm pack --dry-run`, and `python tools/build_release.py`. Check `package.json` version equals `VERSION`.
2. Merge after review and CI passes. The `.github/workflows/ci.yml` workflow runs on `main`.
3. After successful checks, if `vX.Y.Z` has not been released, the workflow invokes GitHub CLI to create a tag and a GitHub Release with the deterministic distribution ZIP.
4. Verify the created GitHub Release and its attached ZIP under the repository Releases tab. If GitHub Actions lacks `contents: write` or is disabled, a maintainer must create the tag/release manually after the same tests. **Do not claim a release exists without checking GitHub.**
5. Never rewrite an already published version/tag; increment `VERSION` instead.

The workflow intentionally does not publish a new release on every push: only when the current `VERSION` tag does not already exist.

The release workflow also attaches a GitHub-installable npm tarball to GitHub Releases. **This does not publish to npmjs.com.** npm registry publication is a separate, optional maintainer decision requiring registry credentials or trusted publishing.
