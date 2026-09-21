## Why

Every later port needs home, temp and state paths without `$HOME`, `~` or `/tmp`, and needs to read text that may arrive as CRLF. Today CRLF tolerance is one untested line in `rules/build.mjs`, and `splitFrontmatter` in `rules/lib/render.mjs` rejects CRLF input outright (probed directly: it throws "has no `paths:` frontmatter").

## What Changes

- Add `lib/platform/paths.mjs`: `homeDir()`, `tempDir()`, `stateDir(...parts)`, `join`, with injectable roots so no test touches the real home directory.
- Add `lib/platform/text.mjs`: `readText(path)` normalises CRLF to LF; it is the only way a parser reads a file.
- Make `splitFrontmatter` accept `\r?\n`.
- `rules/build.mjs` drops its private `readText` and imports the platform one — the first consumer, so nothing is tested before it is in a call graph.
- CRLF fixtures for `readText`, `parseConf`, `splitFrontmatter`, `routingLayer0`, `countLines`.

## Capabilities

### New Capabilities
- `platform/paths`: where home, temp and state directories come from, and what is forbidden.
- `platform/text`: how text files are read, and the CRLF tolerance every parser — including the rules build — must have.

### Modified Capabilities
<!-- none — openspec/specs/ is empty; no existing requirement changes -->

## Impact

- New `lib/platform/`; edits `rules/lib/render.mjs` and `rules/build.mjs`.
- `node rules/build.mjs --check` must be unchanged on LF sources and pass on a CRLF copy of `rules/src/`.

## Non-goals

- Anything outside the `platform-foundation` phase goals: OKF v0.2 io, the Karpathy recorder, the knowledge-sources registry and log tiers, skill ports, hooks, Docker services.
- Editing `.kbd-orchestrator/project.json` or `.kbd-orchestrator/constraints.md` — reserved to `/kbd-init`.

## Source

KBD phase `platform-foundation` — `.kbd-orchestrator/phases/platform-foundation/plan.md` (this change's entry carries scope, dependencies, candidates and the done-when criteria) and `library-candidates.json`.
