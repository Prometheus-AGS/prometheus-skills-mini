## Why

This project ships no hook. `hooks/`, `scripts/hook-entry.mjs` and `lib/hooks/` are all absent, so KBD
has no lifecycle signal on any harness. The source pack supplies 31 hook ids, but most serve services
this project does not ship, and every payload is bash that invokes `python3` — both forbidden here (C1,
C3, C4).

Analyze answered the scope question by inventorying all 31 ids against what this project actually has:
**6 PORT, 22 DEFER, 3 DROP**, each row cross-checked against `hooks.json` for id, event and declared
timeout and against `hook-dispatch-v1.sh` for payload. The 6 are KBD's own lifecycle and depend on
nothing absent.

Three of those 6 are declared at a **1000 ms** timeout. Node cold start measured 59 ms median on macOS
with three `lib/platform` imports — about 6% of budget — but the Windows figure is unmeasured, and a
1 s timeout punishes the tail, not the median. That is this change's real risk.

## What Changes

- Add `hooks/hooks.json` in **exec form** (`"command": "node"`, `"args": [...]`), never a shell string:
  a shell string is run by `sh -c` on POSIX and PowerShell on Windows, which C1 and C3 forbid.
- Add `scripts/hook-entry.mjs`: a single entry point that dispatches **in-process** through a static
  import map from hook id to `lib/hooks/<id>.mjs`. No bash, no compiled dispatcher, no `MISSING_SHELL`
  probe.
- Add the 6 payloads under `lib/hooks/`, each exiting 0 on a missing dependency.
- Add a manifest-resolution test that derives its file list **from `hooks.json`** and resolves every
  path. The source pack shipped a payload whose entry file was never packaged, breaking every hook in
  Node's loader before any of its own code ran; a hand-kept list is what allowed it.
- Measure hook cold start on `windows-latest` as a distribution and record it.

## Decisions carried from analyze

- **Dispatch keys on the `--hook` argument, never the matcher-level `id`.** `id` is per-matcher and
  present on only 4 of 14 matcher entries, while all 31 hooks pass `--hook`. Keying on `id` would cover
  4 hooks and silently miss the rest. The two spellings also differ (`sessionstart:kbd-control` vs
  `sessionstart-kbd-control`).
- **A static import map, not lazy `await import()`.** The budget allows either; only a static map lets
  the manifest test assert that every id in `hooks.json` has an entry without executing the dispatch.
- **Zero runtime dependencies.** `tinybench` and `mitata` were rejected on fit — they measure
  in-process throughput, and what matters here is *process* start, which only `spawnSync` round-trips
  measure.

## Capabilities

### New Capabilities
- `hooks/dispatch`: the manifest contract, in-process dispatch, the degradation rule, and the cold-start budget.

### Modified Capabilities
- `continuous-integration`: the "Verification commands" requirement gains a hook-manifest check and the
  Windows cold-start measurement. A MODIFIED delta MUST repeat every scenario of the requirement it
  replaces — the defect CI caught last phase.

## Impact

- New `hooks/hooks.json`, `scripts/hook-entry.mjs`, `lib/hooks/*.mjs`; edits `.github/workflows/ci.yml`.
- Consumes all five `lib/platform/` modules and re-implements none of them.
- **Blocked on:** the goal-1 re-review of the four unreviewed `lib/platform/` fixes (8 UNREVIEWED
  markers). Every hook imports that code; reviewing it after building on it inverts the order.

## Open question — blocking, and the first task

**Does this harness accept exec form in a project `hooks.json`?** The source pack's plugin manifest uses
it for all 31 entries; the 6 live settings entries inspected on this machine use a shell string with no
`args`. Those are different surfaces, so this is neither confirmation nor refutation, and no research
tier settles a property of the harness.

Task 1 is an empirical probe: register one trivial exec-form hook and observe whether it fires, before
any payload is written. **If exec form is unsupported the design inverts** — a shell string puts
`sh -c`/PowerShell back in the path, and the fallback is a single-token command with arguments encoded
elsewhere. That is a re-plan, not a workaround.

## Non-goals

- The 25 deferred and dropped hook ids. Each names its destination phase or the reason.
- The artifact-refiner port: a separate change in this phase, sequenced after this one.
- Editing `.kbd-orchestrator/project.json` or `constraints.md` — reserved to `/kbd-init`.

## Unresolved review findings

Two adversarial rounds ran; the cap is 2. **This change was found sound in both rounds** — round 1
raised one SUGGESTION against it (a process step encoded as a spec scenario, since removed) and round 2
confirmed it: "its requirements all have implementing tasks, no task does unauthorized work, the
vacuity fixes genuinely close their attack surfaces, and the blocking open question is correctly
sequenced as task 1 with a stop condition." The MODIFIED `continuous-integration` delta was checked for
regression in both rounds and repeats all 4 current scenarios.

**Carried, not resolved:**
- The exec-form harness question is unresolved by design and is task 1.1, a probe with an explicit stop
  condition. If it fails, this change is re-planned rather than patched.
- Task 0.1 (the goal-1 re-review of 4 unreviewed `lib/platform/` fixes) blocks every other task here.
- The QA gate from `artifact-refiner-node` applies from that change's completion onward and does **not**
  retroactively gate this one. That is the stated cost of the operator's sequencing choice.
- **Judge caveat:** same model family as the producer, because the liter-llm gateway rejected
  authentication this session. Weaker than a cross-model check.
