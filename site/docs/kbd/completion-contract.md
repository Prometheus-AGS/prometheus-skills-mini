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
  evidence. FAIL never closes; missing, stale or wrong-run evidence is BLOCKED;
  missing budget accounting is BLOCKED; exceeding budget blocks qualification while
  at-ceiling closes completed in-budget work; unknown token telemetry stays UNKNOWN.
- **No unauthorized successor** — reflection alone never creates the next phase;
  continuation requires explicit operator authorization.

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
