---
title: Plugin Distribution
sidebar_label: Overview
---

# Plugin Distribution

`lib/distribution/` and the `skill-system.json` manifest at the repo root generate installable
plugin packages and marketplace listings for Claude Code and Codex, purely from the real `skills/`
tree (97 distributed skill directories) — copy-mode throughout, never symlink.

## `lib/distribution/` modules

| Module | Role |
|---|---|
| `skill-system.mjs` | Reads and validates `skill-system.json`, and scans its declared inventory roots for distributable skills. Ported from the full pack's `scripts/lib/skill-system.js`, scaled down to this repo's single-root, copy-only inventory. |
| `frontmatter.mjs` | Reads the `name` and `description` scalars out of a `SKILL.md`'s YAML frontmatter without a YAML dependency — the mini has none, and adding one for two scalar fields would be more surface than the problem needs. Handles a plain inline scalar and a folded block scalar (`>`), which is the only block style actually used across this repo's `SKILL.md` files (confirmed by sampling every frontmatter block before writing the module). Literal style (`\|`) is not implemented and fails loudly rather than silently mis-joining. |
| `canonical-bytes.mjs` | The bytes git stores for a file, independent of how the host checked it out — see [Installation](/docs/getting-started/installation) for why this matters on a Windows `core.autocrlf=true` checkout. |
| `manifest.mjs` | Builds the Claude and Codex `plugin.json` content, matching the exact schemas captured from the full pack's own generated plugin packages. Claude's manifest carries no `hooks` field (Claude Code auto-discovers a sibling `hooks/hooks.json`) and no `agents` field. Codex's manifest adds an `interface` block (capabilities, category, `defaultPrompt`, `developerName`, `displayName`, `longDescription`, `shortDescription`, `websiteURL`) and explicitly omits `hooks` — Codex rejects a manifest that has one. |
| `marketplace.mjs` | Builds `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`. This pack lists exactly one plugin — itself — unlike the full pack's ten sibling plugin trees. Codex's copy additionally carries a `policy: {installation, authentication}` block, matching the full pack's own Codex marketplace. |
| `package-builder.mjs` | Materializes the Claude and Codex plugin packages plus both marketplace files from `skill-system.json`, building into a temp directory first and atomically swapping it into the real output path — see [Installation](/docs/getting-started/installation). |

## The two generator scripts

```bash
node scripts/generate-skill-system-distribution.mjs           # writes dist/ and the marketplaces
node scripts/generate-skill-system-distribution.mjs --check   # verifies, exits non-zero on drift

node scripts/generate-commands.mjs                             # writes Claude Code slash commands
```

`generate-commands.mjs` is what actually makes `/kbd-analyze` (and every other ported skill)
typeable as a Claude Code slash command — independent of, and in addition to, the plugin/
marketplace listing. It writes one command file per skill under `~/.claude/commands/` (overridable
via `--output`), each pointing at an absolute path to that skill's `SKILL.md`.

## Copy-mode vs symlink-mode

The full pack symlinks 11 of its 13 install targets. This pack's own constitution forbids symlinks
outright — a real, repo-wide rule, not specific to distribution — because creating a symlink on
Windows needs Developer Mode or elevation, exactly the kind of privileged setup step this pack
exists to avoid requiring. `lib/distribution/package-builder.mjs`'s copy-then-atomic-swap pattern is
the one deliberate divergence from the full pack's own generator that this repo's rules force.

## See also

- [Installation](/docs/getting-started/installation) — `skill-system.json`'s full shape and the install-scope rule.
- [Doctor](/docs/platform/doctor) — checks the home-directory skill copies distribution produces.

## Project UI routing and teams

Distribution makes skill payloads available. Project adoption also needs managed instructions,
the UI protocol and an active-team record. Follow [UI/UX routing and adoption](/docs/ui-ux/overview)
for bootstrap or separate UI/creator commands. The current inventory includes 40 portable UI
entries from the shared 41-entry catalog. Local helpers run directly with Node 22+ and bundled
assets; they need neither optional service. The full-pack anti-shadowing constraint still applies.

Proposal-only creator `export` does not install a project team; normal project creation finishes
with `install-project`. Writing definitions does not prove native discovery or invocation.
