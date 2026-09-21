PLAN: hook-entry-node-only
Project: prometheus-skills-mini
Date: 2026-09-21
Backend: **openspec** (`project.json.specBackend`)
Changes: 2 · Tasks: 50 (21 + 29) · Driver: `/kbd-apply` per task, never bare `/opsx:apply`

## Ordering, and why

| # | Change | Tasks | Depends on | Gate after |
|---|---|---|---|---|
| 1 | `hook-entry-node-only` | 21 | goal 1 (**met**) | QA + adversarial diff review |
| 2 | `artifact-refiner-node` | 29 | **change 1 green and archived** (shared `scripts/` tree and CI test collection — see below) | QA + adversarial diff review |

The two changes write **no file in common**, but they are **not independent** — an earlier draft of this
plan called them "disjoint", which review showed to be false in the way that matters:

- **They share the `scripts/` tree.** Change 1 writes `scripts/hook-entry.mjs`; change 2 task 5.1 carries
  17 `.mjs` into `scripts/` and `scripts/lib/`.
- **They share what CI collects.** `.github/workflows/ci.yml:45` is a bare `node --test` with no path
  argument, so Node's runner walks the whole tree. The live hazard is a carried file **failing to parse
  at collection**, which fails the run before any test executes. (An earlier draft also claimed a carried
  file might be "picked up as a test"; review showed that is not a live risk — no carried filename
  matches Node's test-file glob, verified against the source.) That failure surfaces **twice**:
  `node --test` and again `npm run coverage`, which re-runs `node --test --experimental-test-coverage`
  as a child (`scripts/coverage-report.mjs:29`) and reports as a separate job step.
- **They both edit `ci.yml`** — change 1 at tasks 5.1–5.2, change 2 not at all, but the jobs change 1
  hardens are the jobs change 2's carry runs inside.

**Ordering rule, therefore, not a preference:** change 2 does not start until change 1 is green and
archived. A-10 (single-writer discipline) applies to the `scripts/` tree and to `ci.yml`, not only to
`lib/refiner/`. **Attribution rule:** any CI failure appearing after task 5.1 of change 2 is attributed
to the carry until proven otherwise — the hooks were green before it.

The operator chose hooks first: they are the phase's named goal and carry its one measurable unknown.

**The honest cost of that order:** change 2 wires the QA gate, so change 1 is never gated by it. Stated
here, in change 2's `design.md`, and as task 7.2 — not discovered in the reflection.

**`execution.md` does not exist yet for this phase.** `find .kbd-orchestrator -name execution.md` returns
only `phases/platform-foundation/execution.md`. It is written by `/kbd-execute` at the start of phase
execution, which runs **before** either change's tasks. Change 2's task 7.1 therefore edits a file that
exists by the time it runs — but that was an unstated assumption until review caught it, and an
unresolvable path in a task is the exact root cause the spec stage recorded. Task 7.1 now verifies the
file exists as its first action.

## Prerequisite — MET before planning

**Goal 1 (the four unreviewed `lib/platform/` fixes) is done.** All 8 `UNREVIEWED` markers are cleared.
Each fix was verified by **mutation against the live repository**, not by re-reading the claim:

| Fix | How it was tested | Verdict |
|---|---|---|
| paths exemption (R4) | added a module calling `os.tmpdir()` — **caught**; exemption permits exactly the 2 documented calls | SOUND |
| coverage spec narrowing (R3) | threshold raised to 101 → `npm run coverage` exit 1; restored → exit 0 at 100.00% | SOUND |
| reverted gate-loosening (R2) | check has **no** test-file exemption; a real `console.log` in `lib/` — **caught** | SOUND |
| Windows evidence (R2) | all 9 cited test names matched verbatim in the suite; run 35585743561 confirmed `success` on both jobs via the GitHub API | SOUND |

No defect found. `lib/platform/` is cleared to build on.

**Qualifier, carried from the findings rather than left in a footnote:** this re-review was performed by
the same model family that wrote the fixes, so it is **not** the independent check E-2 prefers. It is
stronger than a re-read — every claim was tested by mutation or against the live GitHub API rather than
accepted — but a cross-model judge was unavailable (risk 4).

## Change 1 — `hook-entry-node-only`

Order within the change is forced by one fact: **task 1 can invalidate the design**, so it runs before
any payload exists.

1. **1.1–1.2 — the exec-form probe.** Register one trivial exec-form hook, trigger it, observe. This is
   a **stop condition**, not a checkpoint: if it does not fire, no payload is written, no shell-string
   fallback is adopted, and the change is re-planned. Everything below assumes it fires.
2. **2.x — entry point and dispatch.** `scripts/hook-entry.mjs` with the static import map, keyed on the
   `--hook` argument (never the matcher-level `id`, which is per-matcher and present on 4 of 14 entries).
3. **3.x — the manifest and its resolution test.** The test derives its list from `hooks.json`, and the
   requirement forbids it passing vacuously: the resolved-path count must equal the hook count.
4. **4.x — the six payloads**, each exiting 0 on a missing dependency.
5. **5.x — CI.** Manifest check on every job; Windows cold start for **all three** 1000 ms hooks.
6. **6.x — exit evidence** from both Node 22 and 24, as `platform-foundation` established.

## Change 2 — `artifact-refiner-node`

Sections 1–4 are the 661-line core port and are independent of each other; they run in listed order
because they share `lib/refiner/` and A-10 serialises a single writer. Section 5 carries the payload —
including 17 of the 19 upstream `.mjs`, without which section 6 would edit absent files. Section 6 reviews them and
fixes the one Windows hazard. Section 7 wires the gate.

**The carry in 5.1 is load-bearing.** This project has two `.mjs` under `scripts/`; the 19 are upstream, of which 17 are carried.
Review round 2 caught a spec that reviewed files this repository does not contain.

## Per-task rules (binding, from the specs and A-9)

- Behaviour is added **RED commit → GREEN commit**, with the failing output pasted under the RED task.
- Tiers: T0 `node --check` per edit; T1 `node --test <file>` per unit; T2 at change completion
  (`node --test`, `node rules/build.mjs --check`, `node scripts/spec-validate.mjs`). T3 is CI only.
  Running a higher tier earlier than its point is a rule violation, not diligence.
- **Self-review by mutation before every `dispatch-judge` call** — revert the implementation and confirm
  the test fails. This is corrective action 1, and it caught three worthless tests last phase.
- A change reaching **review round 3 stops**; this plan and `platform-foundation/reflection.md` are
  re-read before continuing.
- No change edits `.kbd-orchestrator/project.json` or `constraints.md` (owned by `/kbd-init`).
- **Every count reported to the operator cites the command that produced it** (corrective action 5). The
  task counts in this plan come from `grep -c '^- \[ \]' openspec/changes/<id>/tasks.md`; the payload
  figures (19 `.mjs`, 20 skills, 5 agents, 11 schemas) from `git ls-files` in the upstream source named
  in change 2's task 5.1.
- **Corrective action 4 (a Node review-packet builder) remains OPEN**, owned by the `adversarial-review-node`
  phase. Until it lands, review packets are hand-assembled — see risk 6.
- Commits are local with an `Assisted-by` trailer; nothing is pushed without the operator saying so.

## QA gate per change

`/refine-validate <change-id>` → on PASS `/adversarial-review --mode diff <change-id>` → on PASS
`/opsx:verify` then `/opsx:archive`.

**`/refine-validate` does not exist in this project until change 2 lands.** For change 1 the gate is the
13 constraints plus the adversarial diff review, and that substitution is declared here rather than made
silently — which is precisely the Delta 2 failure being corrected.

## Risks

1. **The exec-form probe fails.** Highest-impact, and it is deliberately first and cheap. Consequence is
   a re-plan of change 1; change 2 is unaffected.
2. **The Windows tail exceeds 1000 ms.** Then the budget is raised and the measurement stated — a
   compiled dispatcher is forbidden (C7). The median has ~94% headroom on macOS; the tail is the unknown.
3. **Review rounds exceed the cap again.** Four of six changes did last phase. Mitigation is
   self-review by mutation before submitting, which is now a per-task rule rather than an aspiration.
4. **No cross-model judge.** The liter-llm gateway rejects authentication this session, so every review
   in this phase has been same-family. This is a real weakening of the gate and needs a credential to fix.
5. **Change 2 is scheduled against a spec whose latest corrections no reviewer has seen.** The spec stage
   hit its 2-round cap; change 2's round-2 fixes are UNREVIEWED and were self-reviewed only. 29 tasks
   are being ordered against that. Mitigation is task-level: the RED/GREEN and mutation rules apply per
   task, so a wrong spec surfaces as a failing test rather than at archive time.
6. **The review-packet builder is still unbuilt** (reflection corrective action 4, owned by a later
   phase). Every review in this phase used the hand-assembly workaround, which `.prometheus/gotchas.md`
   records as having cost roughly three extra rounds last phase. That is the *cause* of risk 3, and
   risk 3's mitigation is incomplete while it stands.

PLAN COMPLETE
