# Goals

- Carried from `platform-foundation` reflection, before any new code: re-review as one batch the four unreviewed final fixes in `platform-paths-and-text`, `platform-atomic-write-and-lock`, `platform-spawn` and `windows-evidence` — this phase consumes `lib/platform/`, so it must not build on unreviewed foundations.
- `hooks/hooks.json` in exec form (`"command": "node"`, `"args": [...]`, never a shell string) plus `scripts/hook-entry.mjs` that dispatches in-process by importing `lib/hooks/<id>.mjs` — no bash, no compiled dispatcher, no `MISSING_SHELL` probe.
- Every file `hooks.json` names is present and resolvable, enforced by a test that reads the manifest and resolves each path — the source pack shipped a payload whose entry file was never packaged, which broke every hook event in Node's loader before any of its own code ran.
- A hook that touches a service or a missing dependency **always exits 0** with a degraded result; a missing service is never a failed hook.
- Measure hook cold start on `windows-latest` against the source pack's 1 s budget for `sessionstart-kbd-control` and `taskcompleted-kbd-receipt`, and record the measurement. If Node cannot meet it, say so and raise the budget rather than reaching for a compiled dispatcher (C7).
- Exit evidence: every claim this phase makes about Windows is observed on `windows-latest` CI with a named asserting test, in both Node 22 and 24, as `platform-foundation` established.

## Process goals — from the reflection's corrective actions

- Self-review by mutation before every `dispatch-judge` call: revert each new implementation once and confirm its test fails. A change that reaches review round 3 stops, and this file plus `platform-foundation/reflection.md` are re-read before continuing.
- The QA gate must match reality: either artifact-refiner is wired into `execution.md`'s contract or the contract drops it. **Operator decision, required before `/kbd-execute`.**
- Every count reported to the operator cites the command that produced it.
