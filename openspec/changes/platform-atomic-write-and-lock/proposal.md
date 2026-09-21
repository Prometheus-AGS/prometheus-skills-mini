## Why

State files must never be observed half-written, and on Windows a rename over a file that antivirus or the indexer holds open fails with `EPERM` / `EBUSY`. The phase goal names a bounded retry for exactly that. `rules/build.mjs` has a private six-line atomic write with no retry and no tests — it is absent from the coverage report entirely.

## What Changes

- Add `lib/platform/atomic-write.mjs`: temp file in the same directory, then rename. Retry on `win32` only, for `EPERM` / `EBUSY` / `EACCES` only, a fixed small number of attempts with backoff; any other error rethrown at once; temp file removed on final failure. File-system calls injected so the retry is unit-tested on every OS.
- A `win32`-only test holds the destination open and asserts the rename eventually succeeds — the real behaviour, validated by CI.
- Add `lib/platform/lock.mjs`: `acquireLock(path)` via `fs.open(path, 'wx')`, returning a release function. No stale-lock recovery.
- `rules/build.mjs` uses the platform atomic write and holds the lock for a write run (single writer). `rules/build.mjs` comes under test.

## Capabilities

### New Capabilities
- `platform/atomic-write`: the atomicity guarantee and the exact bounds of the Windows retry.
- `platform/lock`: exclusive-create locking and its explicit non-guarantees.

### Modified Capabilities
<!-- none — openspec/specs/ is empty; no existing requirement changes -->

## Impact

- New files under `lib/platform/`; edits `rules/build.mjs`. Serialised after `platform-paths-and-text`, which edits the same file.
- Line coverage over `lib/platform/` and `rules/` reaches 80% or more.
- Known weak point, stated in the plan: the lock's real consumers arrive in a later phase; here its only consumer is the build guard.

## Non-goals

- Anything outside the `platform-foundation` phase goals: OKF v0.2 io, the Karpathy recorder, the knowledge-sources registry and log tiers, skill ports, hooks, Docker services.
- Editing `.kbd-orchestrator/project.json` or `.kbd-orchestrator/constraints.md` — reserved to `/kbd-init`.

## Source

KBD phase `platform-foundation` — `.kbd-orchestrator/phases/platform-foundation/plan.md` (this change's entry carries scope, dependencies, candidates and the done-when criteria) and `library-candidates.json`.
