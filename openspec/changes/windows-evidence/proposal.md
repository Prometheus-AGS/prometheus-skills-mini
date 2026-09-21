## Why

The phase exit criterion is that every Windows behaviour it claims is observed on `windows-latest`, not self-reported from macOS. Until the matrix has run, every such claim stays labelled self-reported.

## What Changes

- Run the matrix and record, in `.kbd-orchestrator/phases/platform-foundation/evidence/windows.md`, for each claimed behaviour — rename retry with the destination held open, `spawnNodeCli` with no shell, CRLF checkout under `autocrlf=true`, the `wx` lock, `npm ci` + `node --test` on Node 22 and 24 — the run URL, the job, and the asserting test name.
- Fix what Windows breaks at the root cause, each as a failing-test commit followed by the fix commit.
- Move the `README.md` §9 entries this phase settles from "unverified" to the evidence link; leave the rest.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- none — openspec/specs/ is empty; no existing requirement changes -->

This change declares no capability: it produces evidence and fixes. A fix that changes a requirement updates the owning capability's delta spec in the same commit.

## Impact

- Size unknown in advance: it is the size of what Windows breaks.
- BLOCKED on plan prerequisite P2 (a git remote with GitHub Actions). The owner pushes; the agent never does.
- A claim with no run stays labelled self-reported.

## Non-goals

- Anything outside the `platform-foundation` phase goals: OKF v0.2 io, the Karpathy recorder, the knowledge-sources registry and log tiers, skill ports, hooks, Docker services.
- Editing `.kbd-orchestrator/project.json` or `.kbd-orchestrator/constraints.md` — reserved to `/kbd-init`.

## Source

KBD phase `platform-foundation` — `.kbd-orchestrator/phases/platform-foundation/plan.md` (this change's entry carries scope, dependencies, candidates and the done-when criteria) and `library-candidates.json`.
