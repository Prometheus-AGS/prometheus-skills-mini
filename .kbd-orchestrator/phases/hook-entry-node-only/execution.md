EXECUTION: hook-entry-node-only
Project: prometheus-skills-mini
Date: 2026-09-21
Backend: **openspec** (`project.json.specBackend`; two validated changes under `openspec/changes/`)
Driver: `/kbd-apply` per task — never bare `/opsx:apply`, which has no KBD awareness
Agent: claude-code (this session)
Changes: 2 · Tasks: 50 (21 + 29)
Canonical registration: `prometheus kbd change register` at revision 7; `activePath.phaseId` = `hook-entry-node-only`

## Owner decisions carried into execution

- **Trailer:** `Assisted-by:` only. No `Co-Authored-By`, no `Signed-off-by` (A-15).
- **artifact-refiner is IN the QA contract** (operator, 2026-09-21), closing `platform-foundation/reflection.md`
  corrective action 3. It is change 2 of this phase.
- **Scope of the refiner port:** the measured 661-line core, the 17 carried `.mjs`, and the 20 skills /
  5 agents / 11 schemas. The 7 scaffolders (2,879 lines) and 17 installers (1,540 lines) are a
  follow-up change, not this one. Operator confirmed this scoping.
- **Sequencing:** hooks first, refiner second.

## Dispatch contract

| # | Change | Tasks | Starts when | Gate after |
|---|---|---|---|---|
| 1 | `hook-entry-node-only` | 21 | now (goal 1 is met) | constraints + adversarial diff review — see below |
| 2 | `artifact-refiner-node` | 29 | **change 1 is green and archived** | `/refine-validate` + adversarial diff review |

Change 2's start condition is a **rule, not a preference**. The two changes write no file in common but
are not independent: both write into `scripts/` (change 1 `scripts/hook-entry.mjs`, change 2 carries 17
`.mjs`), and `.github/workflows/ci.yml:45` is a bare `node --test` that walks the whole tree. A carried
file that fails to parse at collection turns change 1's green CI red, and it surfaces twice — under
`node --test` and again under `npm run coverage`, which re-runs it as a child
(`scripts/coverage-report.mjs:29`). A-10 therefore applies to the `scripts/` tree and to `ci.yml`, not
only to `lib/refiner/`.

**Attribution rule:** any CI failure appearing after change 2's task 5.1 is attributed to the carry
until proven otherwise. The hooks were green before it.

## QA gate — AS CONTRACTED, AND WHAT RAN

The contracted gate is `/refine-validate <change-id>` → on PASS
`/adversarial-review --mode diff <change-id>` → on PASS `openspec validate` then archive.

### Change 1 — the QA half could not run, and that was declared in advance

`/refine-validate` is delivered **by change 2**. It did not exist when change 1 was gated, so what ran
was: the 13 constraints (10 automated `check:` expressions, all clean) → the adversarial diff review →
`node scripts/spec-validate.mjs` → archive.

**This paragraph was written before change 1 ran, not after.** That is the whole correction: last phase
the identical substitution was made *silently* for all six changes and surfaced only at reflection
(`platform-foundation/reflection.md` Delta 2). Declaring a narrower gate in advance is honest; letting
one be discovered afterwards is not.

The diff review earned its place: it returned BLOCK on a real CRITICAL — a self-invocation guard built
by string concatenation that made every hook a silent no-op on a path containing `#` or `?`.

### Change 2 — the full gate runs, and from here on it always does

`/refine-validate` exists as `scripts/refine-validate.mjs` over `lib/refiner/validate.mjs`. Verified
end to end before wiring: a valid manifest PASSes, a manifest naming a missing file FAILs with the file
named and exit 2, a hookless blocking constraint is a WARN that does **not** block, and an absent
manifest SKIPs rather than failing.

**Delta 2 is closed from this change's completion onward.** It is not closed retroactively: change 1 was
never gated by `/refine-validate`, and no amount of wiring changes that. That is the honest cost of the
operator's sequencing choice, recorded here rather than discovered in the next reflection.

## Per-task rules (binding)

- Behaviour is added **RED commit → GREEN commit**, with the failing output pasted under the RED task.
- Tiers (A-9): T0 `node --check` per edit; T1 `node --test <file>` per unit; T2 at change completion
  (`node --test`, `node rules/build.mjs --check`, `node scripts/spec-validate.mjs`). T3 is CI only.
  Running a higher tier earlier than its point is a rule violation, not diligence.
- **Self-review by mutation before every `dispatch-judge` call** (corrective action 1): revert the
  implementation and confirm the test fails.
- A change reaching **review round 3 stops**; `plan.md` and `platform-foundation/reflection.md` are
  re-read before continuing.
- No change edits `.kbd-orchestrator/project.json` or `constraints.md` (owned by `/kbd-init`).
- `progress.json` is a runtime projection (`generatedBy: kbd-runtime`) and is **never hand-edited**;
  state moves through typed `prometheus kbd` commands.
- Every count reported to the operator cites the command that produced it (corrective action 5).
- Commits are local with an `Assisted-by` trailer. Nothing is pushed without the operator saying so.

## The first task is a stop condition

Change 1 task 1.1 registers one trivial exec-form hook and observes whether it fires. **If it does not
fire, no payload is written, no shell-string fallback is adopted, and change 1 is re-planned.** A shell
string would put `sh -c`/PowerShell back in the hook path, which C1 and C3 forbid. This is the phase's
one unresolved question and it is deliberately answered first, before any design depends on it.

## Known weakening of the gate, stated up front

Every review in this phase — analyze, spec, plan, and the goal-1 re-review — ran against a
**same-model-family judge**. The liter-llm gateway answers `/health` with 200 but rejects `/v1/models`
and `/v1/chat/completions` with "Missing or invalid Authorization header", and no credential is present
in the environment or in any config path the bridge reads. Critic isolation (E-2) held every time, but
`cross_model_check` is **not** `verified-distinct`. This is a real weakening and needs a credential to
resolve; it is recorded in every findings file rather than mentioned once.

## What completion means for this run

Change 1 complete is not the phase complete: `artifact-refiner-node` is what closes Delta 2, and the
phase's exit evidence requires the Windows cold-start measurement for all **three** 1000 ms hooks —
including `precompact-kbd-control`, which `goals.md` does not name but which the port brings under the
same budget.
