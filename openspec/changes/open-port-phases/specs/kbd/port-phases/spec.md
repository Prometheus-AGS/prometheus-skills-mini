## ADDED Requirements

### Requirement: The two port phases exist canonically, seeded from this child's evidence, and are ordered
`adversarial-review-node` and `deep-research-node` SHALL be registered with `prometheus kbd phase create` and SHALL appear in `prometheus kbd status --json` `phaseDefinitionOrder` and `phases`, each with `goals.md` seeded from `analysis.md` Q6a/Q6b and `prior-context.md` holding the relevant evidence excerpts. Neither SHALL be activated by this change, and `.kbd-orchestrator/project.json` SHALL NOT be written by it (`phaseDefinitionOrder` is runtime state; `activePhase` stays as it is). `deep-research-node`'s goals SHALL state that it may not start before `adversarial-review-node` is complete.

#### Scenario: Canonical and file state agree
- **WHEN** `prometheus kbd status --json` is read after the change
- **THEN** both phase ids are in `phaseDefinitionOrder`, both have `status: pending`, `activePath.phaseId` is unchanged, `git diff --quiet -- .kbd-orchestrator/project.json` succeeds, and both directories contain `goals.md`, `progress.json` and `prior-context.md`

#### Scenario: The order is written down
- **WHEN** `deep-research-node/goals.md` is read
- **THEN** it names `adversarial-review-node` as a prerequisite and `sycophancy-correction-vendored` before that
