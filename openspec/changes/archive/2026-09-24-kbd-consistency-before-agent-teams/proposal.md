## Why
The agent-team phase exposed conflicting KBD instructions and misattributed state. The operator explicitly requested correcting these inconsistencies before proceeding.

## What Changes
- Complete project metadata and lifecycle hook postconditions in runtime-mode phase creation.
- Separate phase completion from run-wide evidence and distinguish stage from lifecycle.
- Reconcile authoritative mutation, stage-gate, verification and scoped publication guidance.
- Preserve prior event history, unrelated work and protected tests.

## Capabilities
### New Capabilities
- `kbd-phase-consistency`: consistent phase creation, scoped projection and current workflow instructions.
### Modified Capabilities
- `project-tooling`: replace contradictory test-first history requirements with completed-behavior integration evidence.

## Impact
Only the two authorized repositories. No new runtime dependency or service. Canonical history and unrelated work remain intact.
