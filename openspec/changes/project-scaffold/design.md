## Context

The repository has code (`rules/`) and 20 passing `node:test` tests but no `package.json`. The OpenSpec CLI is reachable only through a global install, and on the development machine that install belongs to nvm's Node 24 while `PATH` resolves fnm's Node 26, so the running Node cannot locate it. There is no `.gitattributes`. Analysis candidates: cand-017, cand-009, cand-018.

## Goals / Non-Goals

**Goals**
- A manifest that states the runtime and gives every tool one way to run tests and checks.
- A deterministic, shell-free path to the OpenSpec CLI for later changes and for CI.
- LF in the repository regardless of a contributor's git configuration.

**Non-Goals**
- A linter, a formatter, a test framework, or any runtime dependency.
- Upgrading OpenSpec (1.13.1 exists) — a separate change.
- Editing `.kbd-orchestrator/project.json`; the owner re-runs `/kbd-init --force` afterwards.

## Decisions

- **Pin `@fission-ai/openspec` to exactly `1.10.0`** — it is the version that ran `openspec init` here and has been exercised all phase; an exact pin makes `node_modules/@fission-ai/openspec/bin/openspec.js` a stable path. *Alternative considered:* a caret range — rejected, the generated skill files are version-coupled.
- **npm, with a committed lockfile** — `npm ci` is what CI will run and it is present wherever Node is. *Alternative considered:* pnpm — not installed by default on the runners or on Windows.
- **`node --test` with no framework** — the 20 existing tests already use it; discovery skips `node_modules/`.
- **`* text=auto eol=lf`** — normalises on both commit and checkout, which `core.autocrlf` alone cannot guarantee across contributors.

## Risks / Trade-offs

- `package-lock.json` is large and generated; it is already in `rules/line-limit-allowlist.txt`.
- Whether `node --test` really skips `node_modules/` on Node 22 and 24 is asserted by a scenario, not assumed.
- The pin will drift from the globally installed CLI the agent harness commands use; that is acceptable because scripts and CI use the pinned copy.
