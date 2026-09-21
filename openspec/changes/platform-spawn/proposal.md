## Why

npm installs CLIs as `.cmd` shims on Windows, and Node documents that a `.bat` / `.cmd` cannot be launched without a shell at all — so "spawn with `shell: false`" and "resolve the shim" cannot both hold. The phase goal was revised and accepted by the owner on 2026-09-21: npm CLIs run through their JavaScript entry with `process.execPath`; a tool that exists only as `.cmd` is refused.

## What Changes

- Add `lib/platform/spawn.mjs`: `spawnNodeCli(packageName, binName, args)` resolves the package's `bin` entry and spawns `process.execPath` with it, `shell: false`; `spawnExecutable(name, args)` for real executables such as `git` and `docker`. There is deliberately no third function.
- A `.cmd` / `.bat`-only tool is refused with an error that says why and names the alternative. Arguments are always an array.
- Add `scripts/spec-validate.mjs` (entry point only) running `openspec validate --all --no-interactive` through `spawnNodeCli`; add the `spec:validate` npm script; switch the CI validation step to it.

## Capabilities

### New Capabilities
- `platform/spawn`: how child processes are started on every OS, what is refused, and the shell-free invocation of the OpenSpec CLI.

### Modified Capabilities
<!-- none — openspec/specs/ is empty; no existing requirement changes -->

## Impact

- New `lib/platform/spawn.mjs` and `scripts/spec-validate.mjs`; edits `package.json` and one step of `.github/workflows/ci.yml`.
- Must work WITHOUT a global `openspec` on `PATH`.
- After this lands the owner re-runs `/kbd-init --force`.

## Non-goals

- Anything outside the `platform-foundation` phase goals: OKF v0.2 io, the Karpathy recorder, the knowledge-sources registry and log tiers, skill ports, hooks, Docker services.
- Editing `.kbd-orchestrator/project.json` or `.kbd-orchestrator/constraints.md` — reserved to `/kbd-init`.

## Source

KBD phase `platform-foundation` — `.kbd-orchestrator/phases/platform-foundation/plan.md` (this change's entry carries scope, dependencies, candidates and the done-when criteria) and `library-candidates.json`.
