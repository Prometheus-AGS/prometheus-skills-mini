---
title: Installation
sidebar_label: Installation
---

# Installation

`skill-system.json` at the repository root is the distribution manifest. It declares one
inventory root and nine possible harness targets:

```json
{
  "schemaVersion": "prometheus-mini-skill-system-v1",
  "name": "prometheus-skills-mini",
  "releaseVersion": "0.1.0",
  "platforms": { "skills": ["darwin", "linux", "win32"] },
  "inventory": {
    "roots": [{ "id": "core", "path": "skills", "scan": "children" }]
  },
  "targets": [
    { "id": "claude", "path": ".claude/skills", "mode": "copy" },
    { "id": "codex", "path": ".codex/skills", "mode": "copy" },
    { "id": "opencode", "path": ".opencode/skills", "mode": "copy" },
    { "id": "agents", "path": ".agents/skills", "mode": "copy" },
    { "id": "cursor", "path": ".cursor/skills", "mode": "copy" },
    { "id": "gemini", "path": ".gemini/skills", "mode": "copy" },
    { "id": "windsurf", "path": ".windsurf/skills", "mode": "copy" },
    { "id": "zed", "path": ".zed/skills", "mode": "copy" },
    { "id": "cline", "path": ".cline/skills", "mode": "copy" }
  ]
}
```

Every target's `mode` is `"copy"` — **never `"symlink"`**. This is a deliberate, repo-wide rule:
symlinks need Developer Mode or elevation on Windows, exactly what this pack exists to avoid
requiring. Each target also carries a `detect` list (e.g. `[".claude", "command:claude"]`) so the
generator only materializes a harness's skill directory when that harness is actually present.

## Generating the distribution

```bash
node scripts/generate-skill-system-distribution.mjs           # writes dist/ and both marketplaces
node scripts/generate-skill-system-distribution.mjs --check   # verifies, exits non-zero on drift
```

This reads `skill-system.json`, scans `skills/` (50 directories), and produces:

- `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` — one plugin listed
  (itself), per `lib/distribution/marketplace.mjs`.
- `dist/plugins/claude/prometheus-skills-mini/` and `dist/plugins/codex/prometheus-skills-mini/` —
  full plugin packages, including `.claude-plugin/plugin.json` / the Codex manifest, the copied
  `skills/`, `hooks/hooks.json`, `scripts/hook-entry.mjs`, and a `.mcp.json`.

Every copy in the package builder (`lib/distribution/package-builder.mjs`) builds into a temp
directory first and only then atomically swaps it into the real output path — the same
build-then-replace pattern the full pack's own generator uses, so a failed or interrupted
generation never leaves a half-written `dist/` tree.

Byte stability across a Windows checkout is handled by `lib/distribution/canonical-bytes.mjs`:
when `core.autocrlf=true` has rewritten a tracked file's line endings, this module proves the
on-disk bytes are exactly the committed blob with CRLF folded to LF, and substitutes the original
LF blob so a Windows rebuild does not rewrite hundreds of files no one actually edited.

## Making skills into slash commands

`skill-system.json` and the plugin packages make skills *available*; they don't by themselves make
`/kbd-analyze` typeable in Claude Code. That's a separate generator:

```bash
node scripts/generate-commands.mjs                  # writes to ~/.claude/commands (default)
node scripts/generate-commands.mjs --output <dir>    # override, e.g. for tests
node scripts/generate-commands.mjs --uninstall
```

It reads every `SKILL.md`'s frontmatter and writes one command file per skill, each pointing at an
absolute path to that skill's `SKILL.md`.

## The install-scope rule

`openspec/config.yaml` states a binding constraint: **this pack is never installed natively on a
machine that already has the full skill pack installed** — not into `$HOME/.agents`,
`$HOME/.claude`, or anywhere else on that machine. A full install is recognized by any of: the
`prometheus` CLI on `PATH`, `~/.prometheus/setup-state.json`, a `kbd-process-orchestrator` skill
directory under `~/.claude/skills` or `~/.agents/skills`, or an `ai.prometheus.*` service unit. On
such a machine, this pack may run only inside the-boss application's own internal data directory.
`lib/platform/full-pack.mjs` implements the detection (read-only by construction — it decides
whether writing is safe, so it must never write itself), and `lib/doctor/scope.mjs` reports a
violation as a doctor failure with no auto-fix, since removing a user's files is not an idempotent
operation.

## Copying skills into a project's home-directory tree

`lib/doctor/skills.mjs` documents the companion concern: this pack's skills should also live under
`<home>/.agents/skills/<name>` and `<home>/.claude/skills/<name>` so tools other than the-boss can
find them. Because this writes under the user's home directory, it only ever writes to those two
roots, only for names the pack actually has, refuses any name that is not a single plain directory
component, never deletes, and refuses outright when `lib/platform/full-pack.mjs` detects a native
full-pack install.
