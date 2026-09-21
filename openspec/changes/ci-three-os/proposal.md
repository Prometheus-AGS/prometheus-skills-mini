## Why

Not one behaviour in this repository has been observed on Windows, and the development host runs Node 26 — a Current release, not LTS — so nothing has been observed on a supported Node either. Every Windows claim in `README.md` is reasoning from macOS. CI is the only available source of that evidence, and it must exist BEFORE the Windows-specific code is written so that code is observed as it lands, not written blind.

## What Changes

- Add `.github/workflows/ci.yml`: matrix `windows-latest` / `ubuntu-latest` / `macos-latest` × Node 22 and 24, `fail-fast: false`, triggers push and pull_request.
- Steps: checkout; setup-node; `npm ci`; `node --test`; `node rules/build.mjs --check`; `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` (the JS entry invoked directly — no `.cmd` shim, no shell).
- The Windows leg sets `core.autocrlf true` before checkout, to test `.gitattributes` against the hostile default.
- No secrets, no deploy, read-only permissions.

## Capabilities

### New Capabilities
- `continuous-integration`: which platforms and Node versions are verified, by which commands, and under which line-ending conditions.

### Modified Capabilities
<!-- none — openspec/specs/ is empty; no existing requirement changes -->

## Impact

- One new file. It cannot RUN until the owner adds a git remote with GitHub Actions (plan prerequisite P2); the agent does not create or push one.
- `platform-spawn` later switches the validation step to `node scripts/spec-validate.mjs`.

## Non-goals

- Anything outside the `platform-foundation` phase goals: OKF v0.2 io, the Karpathy recorder, the knowledge-sources registry and log tiers, skill ports, hooks, Docker services.
- Editing `.kbd-orchestrator/project.json` or `.kbd-orchestrator/constraints.md` — reserved to `/kbd-init`.

## Source

KBD phase `platform-foundation` — `.kbd-orchestrator/phases/platform-foundation/plan.md` (this change's entry carries scope, dependencies, candidates and the done-when criteria) and `library-candidates.json`.
