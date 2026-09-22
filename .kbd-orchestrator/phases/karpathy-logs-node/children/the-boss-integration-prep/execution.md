# Execution — the-boss-integration-prep (child of karpathy-logs-node)

Date: 2026-09-22. Backend: **openspec**. Driver: **`/kbd-apply`**, one task per turn — never a bare
`/opsx:apply`, which runs outside KBD (no hooks, no `progress.json`, no waypoint). Nine changes, 82 tasks,
already registered canonically at plan; this document is the dispatch contract, not a second plan.

## Backend selection

| | |
|---|---|
| Chosen | `openspec` |
| Why | `project.json` `specBackend: openspec`; all nine changes exist as `openspec/changes/<id>/{proposal.md,specs/**,tasks.md}` and validate (`node scripts/spec-validate.mjs`: 21/21); spec-backed traceability is the project's rule, and `config.yaml:21` names native-kbd only as a fallback |
| Rejected | `native-tool` (no `.kbd-orchestrator/changes/` layout exists here), `hybrid` (nothing needs a second decomposer), `manual` (the operator actions are tasks *inside* changes, not a manual phase) |
| Apply driver | `/kbd-apply <change-id>` — fires `task:before`/`task:after` per task, emits the position signal, syncs the ledger and waypoint |

## Dispatch order and state

The order is the plan's, and it is already the canonical `sequence` on each registered change
(`prometheus kbd status --json` → `phases.the-boss-integration-prep.changes[].sequence`):

| seq | change | tasks | may start |
|---|---|---|---|
| 1 | `review-housekeeping` | 7 | now |
| 2 | `pack-doctor` | 9 | now (independent of 1; ordered for the `versions-toml` module it consumes at 2.1) |
| 3 | `the-boss-handoff` | 4 | now |
| 4 | `open-port-phases` | 4 | now |
| 5 | `openspec-fork-submodule` | 15 | **after the gate** |
| 6 | `docs-site` | 8 | 1.1, 1.3, 2.1 now; 1.2, 3.1, 3.2 **after the gate** |
| 7 | `docker-services` | 14 | **after the gate**, and after 5 (`scripts/install.mjs`) |
| 8 | `sycophancy-correction-vendored` | 11 | **after the gate**, after 2, and after the operator's fork + merged PR |
| 9 | `compass-vendored` | 10 | **after the gate**, after 2 and 3, and after the operator's tag + release run |

**The gate** is `versions.toml`, authored by the operator (`CLAUDE.md` §0.2 forbids an agent writing it).
Task 0.1 of changes 5–9 asserts `node --test rules/test/versions-toml.test.mjs` **passes** — not `todo` —
and stops the change otherwise. `/kbd-apply` therefore cannot drift past it: the task fails, the change
halts, and the phase reports the operator action as the blocker.

## Per-task contract (what `/kbd-apply` enforces each turn)

1. `task:before` fires; position signal printed; the task's own text is the instruction.
2. Test first where the task says so; cheap checks only while implementing (`node --check`, the one test
   file). The full battery runs at each change's close task, never per task (A-9).
3. A task marked **Operator:** is never performed by the agent. The turn stops, says which action is
   owed, and the change stays in progress (A-11, A-12).
4. `task:after` fires; `tasks.md` checkbox ticked; `prometheus kbd task transition` moves the canonical
   state (`pending → in-progress → complete`; the state machine refuses a direct jump).
5. Every count cites its command; every mutation pastes its output into the task.

## Standing constraints this phase must not violate

- **Never install the mini natively on a machine with the full skill pack** (`config.yaml`, 2026-09-22).
  **This development host HAS the full pack** (`prometheus` 1.10.0 on PATH, `~/.prometheus/setup-state.json`,
  `kbd-process-orchestrator` under both skills roots, ten `ai.prometheus.*` launch agents). Therefore every
  `--home` path in changes 2 and 5 is exercised **only against an injected temporary home**, never the real
  one; no task writes to `~/.agents/skills` or `~/.claude/skills` in this phase.
- No `.sh`/`.py` outside the exempted vendored trees; `spawn` with `shell: false`; npm by its JavaScript
  entry; copies, never symlinks; no `&&`/`||`/`;` in a CI step; `versions.toml` read, never written.
- Exactly two resident services; compass stdio-only; the gateway the *ports* target is `:4000/v1`.

## QA gate per change (before archive)

`/refine-validate <change-id>` (deterministic, against `.kbd-orchestrator/constraints.md`) →
`/adversarial-review --mode diff <change-id>` (cross-model; the packet carries a `depends_on` manifest of
files the change relies on but does not touch — the 2026-09-21 gotcha) → on PASS, mark implementation
complete for that change, then `openspec archive` through `spawnNodeCli` (never the raw CLI: it is a
`.cmd` on Windows). Any CRITICAL → certification BLOCKED, fix, re-run both. Changes 3 and 4 are
documentation and process and still go through diff review (E-3 exempts only trivial mechanical changes).

## Ledger

`progress.json` for this child was written by `/kbd-new-child` before any change existed and still reads
`implementation 0/0`; the runtime holds the truth (9 changes, 82 tasks). The first ledger write of this
stage reconciles it to `0/9`, and `/kbd-apply` maintains it thereafter. Canonical state
(`prometheus kbd status --json`) remains the source; `progress.json` is a projection.

## First dispatch

`/kbd-apply review-housekeeping` — task 1.1 (commit `COMPARE.md`, `TOOL_ANALYSIS.md` and the completed
analysis change unmodified).
