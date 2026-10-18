# Phase completion contract (mini #60 + #59)

Mini port of the qualified full-pack phase completion workflow. Adopted scope is the
**active amendment** of mini issues
[#60](https://github.com/Prometheus-AGS/prometheus-skills-mini/issues/60) (contract
adoption + Plan→Execute readiness) and
[#59](https://github.com/Prometheus-AGS/prometheus-skills-mini/issues/59) (bounded
execution/exit, refusal, continuation behavior), as a customer-safe equivalent of
full-pack commit `ebc8f687` (qualification note `9a7c4bbf`, repo
`Prometheus-AGS/prometheus-skill-system`, full issues #184/#186).

The #59 research addendum (M1–M6) explicitly states it is *proposed successor scope*
and that the current RC-01–RC-07 work stays unchanged. M1–M6 are therefore **deferred**;
see [Deferred requirements](#deferred-requirements).

## Entry points

All entry points are Node LTS (≥22), dependency-free, offline-capable, and work with
both optional services (surreal-memory, liter-llm) down. No Bash, jq, Python, daemons,
or new ports.

| Role | Source | Packaged (per plugin payload) |
| --- | --- | --- |
| Adopt / amend a contract | `scripts/kbd-contract-adopt.mjs` | `dist/plugins/{claude,codex}/prometheus-skills-mini/scripts/kbd-contract-adopt.mjs` |
| Plan→Execute readiness | `scripts/kbd-phase-readiness-check.mjs` | `…/scripts/kbd-phase-readiness-check.mjs` |
| Terminal close evaluator | `scripts/kbd-phase-close-eval.mjs` | `…/scripts/kbd-phase-close-eval.mjs` |
| Gate enforcement (library) | `lib/kbd/stage-gate.mjs` (`stageGate`) | shipped transitively via `lib/kbd/` |
| Pure cores | `lib/kbd/adopted-contract.mjs`, `contract-adopt.mjs`, `phase-readiness.mjs`, `phase-close-eval.mjs` | same, transitive |
| Successor guard | `scripts/kbd-next-phase.mjs` (reflection gate) | `…/scripts/kbd-next-phase.mjs` |
| Schemas/templates | `skills/kbd-process-orchestrator/references/{schemas,templates}/` | same |

Skill docs updated in the same change: `skills/kbd-{assess,analyze,spec,plan,execute,reflect}/SKILL.md`.

## Behavior

### Adoption (`kbd-contract-adopt.mjs <contract.json> [--supersedes <id>]`)

- Canonical writer only: state mutation goes through
  `prometheus kbd decision record --command-id --id --summary [--supersedes]`.
  No second ledger, no hand-written journals, no rewritten history.
- Contract digest = `sha256(stableStringify(contract minus identity.contractDigest,
  identity.planRevision))` (Node `stableStringify`, the jq `-S -c` equivalent).
- Re-adopting identical bytes is `ALREADY-ADOPTED` (idempotent no-op, exit 0).
- Amending without `--supersedes <latest-adoption-id>` exits 4 with zero writes;
  with it, the amendment is appended with lineage. Adopted bytes are never edited
  in place.
- Multiple non-superseded adoptions for one path are refused and routed to operator
  adjudication (`prometheus kbd conflicts`).
- Exit codes: 0 adopted/already-adopted · 1 usage/io · 2 invalid contract ·
  3 identity mismatch · 4 amendment without `--supersedes`.

### Readiness (`kbd-phase-readiness-check.mjs --phase <id>`)

- Read-only against canonical state; never writes success evidence.
- READY (0) requires: adopted contract present, adoption decision live (latest
  non-superseded digest == recomputed digest), identity match
  (projectId/runId/phaseId), and every scenario's `ownerTask` covered in the
  phase's `tasks.json`.
- BLOCKED (2) prints the minimal missing list. REJECT-IDENTITY (3) on
  project/run/phase disagreement. REJECT-STALE (4) on digest drift.
  Malformed contract (5).

### Plan→Execute gate (`lib/kbd/stage-gate.mjs`)

- The real transition used by kbd-plan/kbd-execute now validates the plan handoff
  semantically: identity fields must be present and phase-consistent; a handoff
  without identity that previously passed now blocks (each missing field named).
- Execute dispatch against a CLOSED phase is refused.
- The readiness gate's exit status 2 (BLOCKED) is never treated as success (#59).

### Terminal evaluator (`kbd-phase-close-eval.mjs --phase <id>`)

- Consumes only the adopted scenario **results** evidence
  (`boundary-results.json` beside the contract) — never task counters,
  `implementationComplete`, or READY.
- Verdict FAIL ⇒ exit 3, never closes. Missing/stale/wrong-run/digest-mismatched
  evidence ⇒ BLOCKED (2) — stale evidence is refused even when a bound historical
  closure exists. `NOT_EXERCISED` never counts as PASS.
- Missing budget accounting ⇒ BLOCKED. Budget **exceeded** ⇒ BLOCKED (cannot
  qualify). Budget **at ceiling** closes completed in-budget work with an
  exhaustion note and admits no more. Unknown-class values (e.g. token telemetry)
  stay UNKNOWN and are not enforced; time/toolCalls bounds govern.
- Amendment fields distinguish additive allowance, replacement ceiling, and
  unchanged settings; an additive extension cannot silently rewrite an unchanged
  threshold.
- Closure records `PHASE-CLOSED` via the canonical writer with the evidence
  sha256 bound in the summary. Replay against a bound historical closure is
  `ALREADY-CLOSED` (idempotent). Refusals record `PHASE-CLOSURE-REFUSED` and
  never mark success, close, or create tasks/successors.

### No unauthorized successor (`scripts/kbd-next-phase.mjs`)

- Without a reflection-complete stage and a present `reflection.md`, the command
  refuses with zero mutation; recommendation text alone never creates or
  activates a phase.
- `--allow-incomplete-reflection` is the only continuation path and records
  explicit operator authorization.

### Disclosed fixture seams

`statusFile`/`decisionSink` context fields and the `--status-file`,
`--decision-sink`, `--phase-dir`, `--contract`, `--evidence-file` flags exist for
scratch isolation in tests. They are disclosed seams: the sink records summaries
only (no supersedes linkage), and fixtures never touch canonical state.

## Paired full/mini scenario matrix

Bound to: full-pack `ebc8f687` (implementation) + `9a7c4bbf` (qualification note),
scenario source `shared/scripts/tests/test-kbd-readiness-gate.sh`; mini branch
`setup/issue-60-completion-contract` at implementation commit `dba7f86`, canonical decisions
`contract-adoption-issue-60-completion-contract-94e64f68` (contract sha256
`94e64f68…bfba2f`) and `phase-closure-issue-60-completion-contract-5eca3554`
(evidence sha256 `5eca3554…b466e439`), receipts
`.kbd-orchestrator/phases/issue-60-completion-contract/boundary-results.json`
(RC-01…RC-08 all PASS). Full-pack receipts (37/37 gate) are reference-only;
mini evidence is independent.

| Mini scenario | Full-pack counterpart | Mini evidence |
| --- | --- | --- |
| RC-01 valid adoption + readiness + gate + closure | RC-01 valid progression/closure | BG-01/02/18 + own-phase canonical ADOPTED/PHASE-CLOSED decisions |
| RC-02 missing mandatory criteria block readiness | RC-02 missing criteria | BG-03/04 + phase-readiness unit tests |
| RC-03 stale digest rejection + amendment lineage | RC-03 staleness + amendment sub-cases | BG-05/08 + contract-adopt/readiness tests |
| RC-04 identity rejection (project/run/phase) | RC-04 wrong identity | BG-06/07 |
| RC-05 Plan→Execute gate semantics | full gate transition cases; guard status 2 ≠ success | BG-14/15 + stage-gate tests (32) |
| RC-06 terminal refusal classes + budget predicate | full budget sub-cases; unresolved adopted-critical findings ⇒ BLOCKED | BG-09…13/16 + phase-close-eval tests (26) |
| RC-07 no unauthorized successor | full #59 reflection/no-successor case | BG-17 + kbd-next-phase tests (9) |
| RC-08 source/generated/installed payload parity | full generated/installed parity | dist `--check` no drift (100 skills) + packaged-script smoke + distribution tests (14) |

Test receipts: adopted-contract 14, contract-adopt 10, phase-readiness 13,
phase-close-eval 26, stage-gate 32, kbd-next-phase 9, boundary integration
(BG-01…BG-18, spawned real CLIs) 18, distribution parity 14 — 136 boundary-packet
tests, all green. Repo-wide `node --test` shows 16 failures that are
**pre-existing on clean main** (same files/counts); none caused by this work.

## Deferred requirements

Not claimed by this change (moved to successor issue
[#62](https://github.com/Prometheus-AGS/prometheus-skills-mini/issues/62) when
#59/#60 were closed via PR #61):

- **#59 addendum M1–M6** (proposed successor scope, deferred per the issue itself):
  - M1 shared two-claim/two-configuration claim×cell fixture corpus with stable
    oracle/check/fixture/owner IDs.
  - M2 full freshness semantics: dependency-graph invalidation, service-restart
    endpoint reacquisition, dirty/generated input accounting.
  - M3 full diagnosis classification (product vs fixture/environment/permission)
    beyond the current status vocabulary.
  - M4 complete numeric envelope corpus (e.g. 270-under-240 rejection,
    protected verification reserve counted once, child aggregation without
    double-counting parallel wall time). Mini *does* implement cumulative
    accounting, additive/replacement/unchanged amendment fields, at-ceiling and
    exceeding semantics, and unknown-token honesty.
  - M5 cross-harness installed parity beyond the Claude/Codex payloads;
    Windows-host qualification (CI-shaped but not executed on Windows here).
  - M6 adapter capability conformance reporting/refusal (#185 trusted-host
    mediation is a separate adoption).
- Token telemetry: UNKNOWN by design (no telemetry exists); governed by
  time/toolCalls fallback.
- Phase Exit / Know Decision model loop: separate scope.
- Push/merge/publication: not part of the adopted contract scope; a subsequent
  operator instruction authorized branch push and a pull request. The issues
  remain open pending the deferred items above.

## Install, migration, rollback

- **Install**: `node scripts/generate-skill-system-distribution.mjs` regenerates
  both plugin payloads; `--check` must report no drift. The three new scripts and
  `lib/kbd` cores ride the existing `LIFECYCLE_ENTRIES` packaging. Install the
  payload through the normal harness installer (see
  [maintenance](maintenance.md)).
- **Migration**: none. Canonical decision state is machine-local runtime data
  owned by the `prometheus` CLI; this change adds writers/readers but no schema
  migration. Existing pending state (e.g. the-boss phases) is untouched and
  remains readable by the runtime's legacy import.
- **Rollback**: revert this change's commits and regenerate dist. Mini has no
  full-pack `--rollback` API; restore payloads through their owning installer per
  [maintenance](maintenance.md). Recorded ADOPTED/CLOSED decisions are
  append-only history and remain valid records after a rollback.

## Change record

Recorded in `.prometheus/decisions.md` (2026-10-18 entry) and git history; mini
has no CHANGELOG file convention.
