EXECUTION: platform-foundation
Project: prometheus-skills-mini
Date: 2026-09-21
Backend: **openspec** (`project.json.specBackend`; six validated changes under `openspec/changes/`)
Driver: `/kbd-apply` per task — never bare `/opsx:apply`, which has no KBD awareness
Agent: claude-code (this session)
Changes: 6 · Tasks: 65

## Owner decisions carried into execution
- **Trailer:** `Assisted-by:` only. No `Co-Authored-By`, no `Signed-off-by` (A-15, and the `commit-msg` intent recorded in `constraints.md`). Confirmed by the owner 2026-09-21 in preference to a harness default.
- **Scope this run:** rounds 1–4 (changes 1–5). `windows-evidence` is NOT executed — it is blocked on prerequisite P2.
- **P2 (git remote + Actions) is still open.** The owner chose to proceed without it. Consequence, stated here so it cannot be lost: `ci-three-os` is written but **never runs**, and every Windows-specific branch in changes 3–5 is written **unobserved**. Under A-6 every such behaviour stays **self-reported** until `windows-evidence` runs. This is the situation the CI-first ordering existed to avoid; proceeding is the owner's call, not a silent default.

## Dispatch contract
| # | Change | Tasks | Gate after |
|---|---|---|---|
| 1 | `project-scaffold` | 10 | QA + adversarial diff review |
| 2 | `ci-three-os` | 8 | QA + adversarial diff review (workflow unrunnable — P2) |
| 3 | `platform-paths-and-text` | 14 | QA + adversarial diff review |
| 4 | `platform-atomic-write-and-lock` | 13 | QA + adversarial diff review |
| 5 | `platform-spawn` | 12 | QA + adversarial diff review |
| 6 | `windows-evidence` | 8 | NOT DISPATCHED — blocked on P2 |

Changes 4 and 5 are independent in the plan; this session runs them sequentially (one agent, and both touch `package.json`/CI in change 5).

## Per-task rules (from the specs, binding on every task)
- Behaviour is added **RED commit → GREEN commit**. The failing output is pasted under the RED task in `tasks.md`; that is the tests-first evidence the `project-tooling` spec requires.
- Tiers (A-9): T0 `node --check <file>` per edit; T1 `node --test <file>` per unit; T2 at change completion (`node --test`, `node rules/build.mjs --check`, spec validation). T3 is CI only — not run locally.
- No change edits `.kbd-orchestrator/project.json` or `constraints.md` (owned by `/kbd-init`).
- Commits are local. Nothing is pushed (A-16).

## QA gate per change
`/refine-validate <change-id>` → on PASS `/adversarial-review --mode diff <change-id>` → on PASS `/opsx:verify` then `/opsx:archive`. A CRITICAL finding marks certification BLOCKED in `progress.json` and the change is fixed and re-gated. Known tool limitation recorded in `.prometheus/gotchas.md`: the packet builder reads only the native-kbd layout, so diff-mode packets are assembled from the OpenSpec layout by hand.

## What completion means for this run
`implementation_status: COMPLETE` for changes 1–5 does **not** mean the phase is done. Goals "three-OS CI" and "exit evidence on windows-latest" remain **NOT MET** until P2 exists and `windows-evidence` runs. `/kbd-reflect` must not report this phase complete.
