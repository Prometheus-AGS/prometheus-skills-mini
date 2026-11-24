---
title: Phase completion contract
sidebar_label: Completion contract
description: Adopted phase completion contract — canonical adoption, Plan→Execute readiness, terminal evaluation and successor refusal (mini #60 + #59).
---

# Phase completion contract

Mini enforces an adopted, finite completion contract at the Plan→Execute boundary and
at phase close. This is the customer-safe port of the qualified full-pack workflow
(full-pack commit `ebc8f687`), covering mini issues #60 and #59's active amendment.

## What a phase gets

- **Adoption** — a phase contract is adopted through the canonical decision writer
  (`prometheus kbd decision record`); amendments append with `--supersedes` lineage,
  and adopted bytes are never edited in place.
- **Readiness** — `kbd-phase-readiness-check` answers READY only when the contract,
  its live adoption digest, identity (project/run/phase) and scenario task coverage
  all hold; otherwise BLOCKED with the minimal missing list, REJECT-IDENTITY, or
  REJECT-STALE.
- **Gate enforcement** — the real Plan→Execute transition validates the handoff
  semantically; a blocked readiness gate (exit 2) is never treated as success, and a
  CLOSED phase refuses execute dispatch.
- **Terminal evaluation** — `kbd-phase-close-eval` consumes only scenario-result
  evidence. FAIL prevents a successful qualification; missing, stale or wrong-run evidence is BLOCKED;
  missing budget accounting is BLOCKED; exceeding budget blocks qualification while
  at-ceiling closes completed in-budget work; unknown token telemetry stays UNKNOWN.
- **No unauthorized successor** — reflection alone never creates the next phase;
  continuation requires explicit operator authorization.

## When the scope changes

Suppose a project adopted two export formats and the operator withdraws one midway. Keep the signed, adopted scope and the observed result for each exercised scenario. The operator supplies a signed supersession manifest naming the withdrawals, their destinations and the budget basis. The evaluator reads the terminal disposition back from canonical state. Report its actual label, including `CLOSED_UNMET` when no scenario was exercised. An exercised failure remains visible.

```text
node <pack-root>/scripts/kbd-phase-close-eval.mjs --phase <id> --superseded <manifest> --signature <signature>
```

After the execute handoff and reflection review have been accepted, run the following from the consumer project to persist accepted lessons and dispatch eligible completion actions. Retry the same command if an action remains pending. Starting a successor is a separate signed operator decision.

```text
node <pack-root>/scripts/kbd-reflection-finalize.mjs --phase <id> --accepted
```

## Commands

```text
node scripts/kbd-contract-adopt.mjs <contract.json> [--supersedes <decision-id>]
node scripts/kbd-phase-readiness-check.mjs --phase <phase-id>
node scripts/kbd-phase-close-eval.mjs --phase <phase-id>
```

The same scripts ship in both the Claude and Codex plugin payloads under
`dist/plugins/*/prometheus-skills-mini/scripts/`.

Full behavior, the paired full/mini scenario matrix (RC-01…RC-08), evidence bindings,
deferred successor requirements (the #59 M1–M6 addendum), and install/rollback notes
live in the repository document
[docs/phase-completion-contract.md](https://github.com/Prometheus-AGS/prometheus-skills-mini/blob/main/docs/phase-completion-contract.md).
