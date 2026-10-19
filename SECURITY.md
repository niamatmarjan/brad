# BRAD security policy

## Supported releases

BRAD is a **supervised preview**. Security fixes target the latest patch release within the current active minor series; older releases may not receive backports. Versions below 1.0 do not imply production autonomy certification.

## Reporting a vulnerability

**Please do not post vulnerability details, exploit demonstrations, passwords, or tokens in public issues or PRs.** Prefer the repository's GitHub **Private Vulnerability Reporting** feature if it is enabled: visit the **Security → Advisories → Report a vulnerability** interface for this repository. If that feature is unavailable, use a private contact method listed by the repository owner on GitHub, when available. We do not currently advertise an unverified security email address or guarantee a particular response time.

Include an affected BRAD version/commit, host and OS, minimal reproduction, likely impact, and sanitized proof of concept. Avoid tests against third-party accounts or production systems. We will acknowledge reports as maintainer capacity permits, investigate and coordinate a fix before public disclosure when possible.

## Threat model

BRAD is an *instructional skill and local installer*, not a privileged daemon or sandbox. Depending on the user's authorized coding host, native BMAD tools can invoke code-writing, shell, filesystem, Git, and remote API tools. The project does not promise containment if the host grants untrusted instructions broad permissions.

Trust boundaries to test: skill-source integrity, package installation and overwrite rules, native workflow discovery, untrusted task text and repository instructions, permission gates, arbitrary shell invocation, log redaction, remote publication, and resumable Git operations.

## Safe operating defaults

- Install pinned public releases; inspect changes before updating.
- Use least-privilege host permissions and isolated worktrees for experimental agents.
- Never skip native approval, Git branch protection, CI, or host safety prompts automatically.
- Never put secrets, personal data, proprietary code, or raw model transcripts into public demos.
- Never auto-merge, force-push, deploy, or alter global npm/PowerShell security settings as an installer side effect.
- `brad doctor` is a local diagnostic, **not** a guarantee of host safety or a security audit.

For supported behavior and known testing gaps, see [docs/validation.md](docs/validation.md).
