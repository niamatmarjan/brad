# Getting started with BRAD

Start with [BMAD v6 stable vs v7 preview](choose-bmad-version.md), then [choose your AI coding host](host-support.md). For hands-on setup use the [AI onboarding guide](ai-setup.md) or [terminal CLI reference](installation.md).

**Two different setups:** the terminal `brad setup` installs BRAD's skill; a host-chat `/brad setup` request (if that host supports the syntax) plans/coordinates BMAD and project settings. Official BMAD is a separate runtime. The stable v6.12 installation may be explicitly delegated to BRAD's `--with-bmad` option with user approval. v7 preview uses the official Skills CLI and a native `bmad setup` flow. Don't run chat slash commands in a shell.

Once installed, start with a **read-only skill routing request** and check actual host discovery. Next read [stakeholder examples](../roles/quick-reference.md), [what's validated](../reference/compatibility-matrix.md), and the [documentation index](../README.md).
