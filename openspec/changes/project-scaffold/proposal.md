## Why

The repository has no `package.json`: nothing declares that Node >= 22 is required, there are no `test` / `check` scripts, and the OpenSpec CLI is found only through a global install — which on the development machine belongs to a different Node than the one on `PATH`, so the running Node cannot locate it. There is no `.gitattributes`, so a Windows checkout with `core.autocrlf=true` would rewrite every source file to CRLF.

## What Changes

- Add `package.json`: `"type": "module"`, `"private": true`, `engines.node ">=22"`, scripts `test`, `check`, `coverage`.
- Add exactly one devDependency, `@fission-ai/openspec` pinned to `1.10.0`, with `package-lock.json`. No runtime dependencies, no test framework, no linter.
- Add `.gitattributes`: `* text=auto eol=lf`, image types `binary`.
- Requires a baseline commit first (plan prerequisite P1) so that tests-first is checkable from history.

## Capabilities

### New Capabilities
- `project-tooling`: the package manifest, the supported Node range, the pinned OpenSpec CLI, the npm scripts, and line-ending normalisation.

### Modified Capabilities
<!-- none — openspec/specs/ is empty; no existing requirement changes -->

## Impact

- New files at the repository root only.
- `node --test` must keep reporting the 20 existing tests once `node_modules/` exists.
- After this lands the owner re-runs `/kbd-init --force` so KBD command fields are derived from the npm scripts.

## Non-goals

- Anything outside the `platform-foundation` phase goals: OKF v0.2 io, the Karpathy recorder, the knowledge-sources registry and log tiers, skill ports, hooks, Docker services.
- Editing `.kbd-orchestrator/project.json` or `.kbd-orchestrator/constraints.md` — reserved to `/kbd-init`.

## Source

KBD phase `platform-foundation` — `.kbd-orchestrator/phases/platform-foundation/plan.md` (this change's entry carries scope, dependencies, candidates and the done-when criteria) and `library-candidates.json`.
