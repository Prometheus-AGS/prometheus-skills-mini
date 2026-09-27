## Why

`scripts/kbd-next-phase.mjs --help` currently treats `--help` as a proposed phase name and enters the phase-transition path, so asking for usage can mutate KBD state and create artifacts. Help must be a read-only CLI operation.

## What Changes

- Recognize `-h` and `--help` before discovering or reading project state.
- Print concise command usage to stdout and exit successfully.
- Add an entry-point regression scenario proving help leaves existing state and artifacts unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `kbd-phase-consistency`: require the next-phase helper's help path to succeed without KBD state or artifact mutation.

## Impact

The change affects only `scripts/kbd-next-phase.mjs`, its spawned entry-point test, and this OpenSpec change. It adds no dependencies, services, persistence formats, or security behavior.
