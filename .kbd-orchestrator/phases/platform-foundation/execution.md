EXECUTION: platform-foundation
Project: prometheus-skills-mini
Date: 2026-09-21
Backend: **openspec** (`project.json.specBackend`; six validated changes under `openspec/changes/`)
Driver: `/kbd-apply` per task — never bare `/opsx:apply`, which has no KBD awareness
Agent: claude-code (this session)
Changes: 6 · Tasks: 65

## Owner decisions carried into execution
- **Trailer:** `Assisted-by:` only. No `Co-Authored-By`, no `Signed-off-by` (A-15, and the `commit-msg` intent recorded in `constraints.md`). Confirmed by the owner 2026-09-21 in preference to a harness default.
- **Scope at dispatch:** rounds 1–4 (changes 1–5), with `windows-evidence` blocked on prerequisite P2.
- **SUPERSEDED 2026-09-21:** P2 was met mid-phase — the operator confirmed the remote, the repository was pushed, and CI ran. `windows-evidence` was therefore executed and archived, and all six changes are complete. The paragraph below about what completion means was written under the old scope and is superseded by `reflection.md`.

## Dispatch contract
| # | Change | Tasks | Gate after |
|---|---|---|---|
| 1 | `project-scaffold` | 10 | QA + adversarial diff review |
| 2 | `ci-three-os` | 8 | QA + adversarial diff review (workflow unrunnable — P2) |
| 3 | `platform-paths-and-text` | 14 | QA + adversarial diff review |
| 4 | `platform-atomic-write-and-lock` | 13 | QA + adversarial diff review |
| 5 | `platform-spawn` | 12 | QA + adversarial diff review |
| 6 | `windows-evidence` | 8 | dispatched after P2 was met; QA + adversarial diff review; archived |

Changes 4 and 5 are independent in the plan; this session runs them sequentially (one agent, and both touch `package.json`/CI in change 5).

## Per-task rules (from the specs, binding on every task)
- Behaviour is added **RED commit → GREEN commit**. The failing output is pasted under the RED task in `tasks.md`; that is the tests-first evidence the `project-tooling` spec requires.
- Tiers (A-9): T0 `node --check <file>` per edit; T1 `node --test <file>` per unit; T2 at change completion (`node --test`, `node rules/build.mjs --check`, spec validation). T3 is CI only — not run locally.
- No change edits `.kbd-orchestrator/project.json` or `constraints.md` (owned by `/kbd-init`).
- Commits are local. Nothing is pushed (A-16).

## QA gate per change — AS PLANNED, AND AS IT ACTUALLY RAN

**Planned:** `/refine-validate <change-id>` → on PASS `/adversarial-review --mode diff <change-id>` → on PASS `/opsx:verify` then `/opsx:archive`.

**What actually ran (corrected 2026-09-21 during reflect):** artifact-refiner was **never invoked**; `.refiner/artifacts/` does not exist. The gate that ran for every change was (1) the ten automated checks in `constraints.md` plus the three command constraints, then (2) the adversarial diff review, then (3) `openspec archive`. That is narrower than the plan — it checks project constraints, not artifact quality — and the substitution was made silently rather than declared. Recorded in `reflection.md` as Delta 2.

A CRITICAL finding marked the change BLOCKED and it was fixed and re-gated. Known tool limitation in `.prometheus/gotchas.md`: the installed packet builder reads only the native-kbd layout, so diff-mode packets were assembled from the OpenSpec layout by hand.

## What completion means for this run — RESOLVED
Written at dispatch: completion of changes 1–5 would NOT have meant the phase was done, because "three-OS CI" and "exit evidence" would have stayed NOT MET without P2.

**P2 was met.** The remote `Prometheus-AGS/prometheus-skills-mini` was pushed on 2026-09-21, 19 CI runs executed, and `windows-evidence` ran and archived. Both goals are MET with per-claim evidence in `evidence/windows.md`. The phase is complete; see `reflection.md` for the delta.
