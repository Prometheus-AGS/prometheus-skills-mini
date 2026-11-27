# Design

## Context

See `proposal.md` for motivation. Constraints that shape the approach:

- Next-work order (in-progress, then blocked, then sequence) is computed by the
  shared Rust `prometheus kbd` runtime, which Full owns. Mini only reads
  `nextChange` / `nextTask` (`lib/kbd/waypoint.mjs`, `lib/kbd/handoff/state.mjs`).
- Full #256 is unimplemented, so no Full field names or behaviour exist to copy.
- `adopted-contract.v2` already defines, per scenario: `actor`, `usefulOutcome`,
  `reasonNow`, `productionEntry`, `oracle`, `sourceRequirement`, `evidence`.
- The `## Selected-method recovery and authority` section is byte-identical
  across 11 stage skills and checked by `npm run check:selected-method`.
- Packaged `kbd-plan` / `kbd-execute` example command lines are parsed and run
  by `scripts/tests/kbd-installed-helpers.integration.test.mjs`.
- `kbd-process-orchestrator/SKILL.md` is 478 lines; the limit is 500.
- The bootstrap template has a 900-word resident budget.
- Node only; no new service; everything works with both services down.

## Goals / Non-Goals

**Goals:**
- Outcome-first presentation and judgement in Mini's own text and Node helpers.
- Identical behaviour with and without the `prometheus` helper.
- Each slice independently shippable and reviewable.

**Non-Goals:**
- Changing the runtime's selection order or any runtime state field.
- Changing `adopted-contract.v2` or any other schema.
- Flipping a default; the outcome-ranked scope stays opt-in.
- Comparing results with Full (not possible until #256 exists).

## Decisions

1. **Reuse the scenario-matrix field names; add no schema.** The outcome a
   session presents is the adopted contract's scenario fields. Hard dependencies
   and ranking reasons are prose in the plan. *Alternative:* add phase-level
   outcome fields — rejected: it changes a contract shared with Full before Full
   has chosen names, and the issue forbids contract changes.

2. **Leave runtime order alone; change what the text says it means.** #256
   itself keeps ledger order within an adopted slice. `kbd-apply` keeps its two
   lookup steps but frames them as ordering inside the slice, after the outcome
   is stated. *Alternative:* a Mini-side selector that overrides `nextChange` —
   rejected: it would be substitute authority and diverge from the runtime.

3. **One new module per behaviour, pure where possible.**
   `lib/kbd/recall.mjs` performs the bounded lookup; `lib/kbd/blocker-advice.mjs`
   is a pure classifier over attempt records. Both are called by the existing
   scripts (`kbd-memory-recall.mjs` gains `--outcome` / `--blocker`;
   `kbd-bottleneck-detector.mjs` gains `advise`). *Alternative:* extend
   `kbd-apply.mjs` (430 lines) — rejected on the line limit and cohesion.

4. **Recall reuses existing transports.** Surreal through `createMemoryProbe`
   (`lib/kbd/memory.mjs`, REST, 2 s health probe); `pk search` through the
   `PK_BIN` convention in `lib/karpathy/transport.mjs`, with a timeout (the
   existing call in `build-review-packet.mjs` has none). Results are wrapped in
   the untrusted fence from `lib/learning/file-tier.mjs`. Promotion is screened
   with `secretPattern()` from `lib/karpathy/validate.mjs`. Every path resolves;
   none throws to the caller.

5. **Advice needs attempt records the operator or session supplies.** The
   classifier reads a small JSON list (blocker id, completed flag, waiting-on
   approval flag, evidence reference). It does not infer attempts from logs.
   Without records it returns "no recommendation". *Alternative:* derive from
   `prometheus kbd status` blockers — rejected: that requires the helper and
   blockers there have no attempt or evidence fields.

6. **Audit extends the existing `--audit`; it gains no fix.** New discovery goes
   in a sibling module beside `existing-project.mjs` (296 lines). Installed
   version comes from the doctor's managed-copy receipts and `releaseVersion`.

7. **Tier clarification lives in `references/boundaries.md`,** next to the
   existing "a tier label … never confers authority" sentence, not in the
   orchestrator SKILL.md.

8. **Qualification reuses `evals/vlbv-protocol`.** It already builds a scratch
   project from packaged skills with an isolated home and supports a harness
   list; new cases are added to its corpus and remain opt-in.

## Risks / Trade-offs

- [Full later picks different field names] → Mini uses names already in the
  shared v2 contract; a rename would be text-only.
- [Outcome statement adds words to every resume] → state it once per start or
  resume, not per task.
- [Recall text could carry injected instructions] → untrusted fence, evidence
  only rule, no authority granted; scenario covers stale and conflicting recall.
- [Attempt records are self-reported] → advice is advisory and never stops work.
- [Editing 11-skill shared sections by accident] → the shared section is not
  touched; `check:selected-method` runs at each slice boundary.
- [Qualification uses paid model sessions] → run only on operator go-ahead.

## Migration Plan

Four pull requests in task-group order. Each regenerates `dist/` with
`npm run build:distribution`. Rollback is a revert of that slice's commit; no
state or schema migration exists. Version bump follows existing release tooling
when a slice ships.

## Open Questions

- Whether #98 closes on Mini-only evidence or waits for Full #256 — an operator
  decision at the end; it does not change what is built.
