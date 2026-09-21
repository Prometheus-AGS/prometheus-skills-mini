# Current waypoint

- **Phase:** platform-foundation — **COMPLETE** (6/6 changes, reflection written and reviewed)
- **Next:** `/kbd-new-phase hook-entry-node-only`
- **Updated:** 2026-09-21T10:11:08Z by claude-code

## Phase outcome
All 5 goals MET. 88 tests on windows/ubuntu/macos × node 22 and 24, nothing skipped on Windows.
Seven capabilities live. Per-claim Windows evidence: `phases/platform-foundation/evidence/windows.md`.

## Carried into the next phase — read `reflection.md` first
1. Four changes' final fixes are **UNREVIEWED** (they exceeded the 2-round cap). Re-review as one
   batch before new work builds on `lib/platform/`.
2. The artifact-refiner QA gate named in `execution.md` **never ran**. The operator decides whether
   it is wired in or dropped from the contract, before the next `/kbd-execute`.
3. Self-review by mutation (revert the implementation, confirm the test fails) before every
   `dispatch-judge` call. A change reaching round 3 stops and re-reads the reflection.
