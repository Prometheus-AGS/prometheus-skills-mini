## Why

`openspec/config.yaml:88-90` binds `deep-research` and `adversarial-review` to be "each as its own phase". The analysis decided their shapes (Q6a, Q6b; candidates 303, 305, 308, 314–319) and the operator confirmed they open as sibling phases rather than being built in this child. Opening them is process work with a real failure mode this repository has already recorded: `/kbd-new-phase` wrote files but did not register the phase canonically (`.prometheus/gotchas.md`).

## What Changes

- Create top-level phases `adversarial-review-node` and `deep-research-node` with `prometheus kbd phase create` (no parent) and their `goals.md`/`progress.json`, without activating either — the active path stays on this child until it reflects.
- Seed each `goals.md` from the analysis (Q6a / Q6b), the audit paragraphs of `assessment.md`, and the relevant `assessment-evidence.md` excerpts (E60–E70 for review; the deep-research excerpts) copied into each phase's `prior-context.md` so their assess stages start from evidence, not memory.
- Record the dependency order in both: `sycophancy-correction-vendored` → `adversarial-review-node` → `deep-research-node`; `deep-research-node` may not start until `adversarial-review-node` is complete.

## Capabilities

### New Capabilities
- `kbd/port-phases`: the two phases exist canonically, seeded, unactivated, ordered.

### Modified Capabilities
<!-- none -->

## Impact

- `.kbd-orchestrator/phases/{adversarial-review-node,deep-research-node}/{goals.md,progress.json,prior-context.md}`; canonical runtime events appended by `prometheus kbd phase create` (the owning KBD runtime command). **`.kbd-orchestrator/project.json` is not written**: `phaseDefinitionOrder` lives in the runtime's `status --json`, not in `project.json`, and `activePhase` is unchanged because neither phase is activated.
- No code.

## Non-goals

- Any implementation of either port.
- Activating either phase (the parent reflects first).
