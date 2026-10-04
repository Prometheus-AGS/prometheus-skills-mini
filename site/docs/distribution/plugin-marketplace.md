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
| `codex-hooks.mjs` | Renders the Codex `hooks/hooks.json` from the same source as Claude's (`hooks/hooks.json`) — see [Codex hooks](#codex-hooks). |
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

## Codex hooks

The Codex package ships `hooks/hooks.json`, generated from the Claude hook source by
`codex-hooks.mjs`. Codex discovers a plugin's `hooks/hooks.json` by convention, so the Codex
`plugin.json` still carries **no `hooks` key** (Codex rejects a manifest that has one). Until this
was added the Codex package shipped no hooks and none of them ever fired for Codex users.

Three Codex behaviours shape the generated file (verified on codex-cli 0.158.0, and recorded by the
full pack in its commit `abf0ade`):

- **Codex ignores `args`.** Each hook is a single `command` string:
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.mjs --hook <id> --harness codex`. The generator
  refuses any token that is not fixed and whitespace-free, so no user input, quoting or shell
  metacharacter can reach it. Claude keeps exec form (`command` + `args`).
- **`timeout` is milliseconds in Codex, seconds in Claude Code.** The Claude value is multiplied by
  1000 with a 5000 ms floor (starting `hook-entry.mjs` alone takes about a second).
- **Hook stdout opening with `{` is parsed as a structured response.** Mini's hooks report on stderr
  only, so none is affected.

| Hook | Codex |
|---|---|
| `sessionstart-kbd-control`, `sessionstart-detect-project-context` (SessionStart) | shipped |
| `posttool-write-position-reminder` (PostToolUse, `Write\|Edit`) | shipped |
| `subagent-fallback-checkpoint` (SubagentStop) | shipped |
| `precompact-kbd-control` (PreCompact) | shipped |
| `taskcompleted-kbd-receipt` (TaskCompleted) | **omitted** — TaskCompleted is a Claude Code event with no Codex equivalent, so the entry could never fire (the full pack filters the same hook out) |

The same `${CLAUDE_PLUGIN_ROOT}` targets ship in both packages; `skill-system-distribution.test.mjs`
checks that every file the Codex `hooks.json` references is present with matching bytes.

Codex runs plugin hooks only in a trusted project with `[features] hooks = true`, after a one-time
trust prompt. To check firing without touching your real Codex home, use a scratch `CODEX_HOME`
and `HOME`, then:

```bash
codex plugin marketplace add <repo>
codex plugin add prometheus-skills-mini@prometheus-skills-mini
codex exec --skip-git-repo-check --dangerously-bypass-hook-trust "echo hi" </dev/null
# stderr shows two `hook: SessionStart Completed` lines
```

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
