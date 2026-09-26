## Why

A corrected worktree does not correct installers while the source and binary manifests still point at an older UAR. The parent needs an immutable feature checkpoint and truthful acceptance handoff.

## What Changes

- Publish actual corrected payload provenance.
- Preserve parent scope and acceptance.

## Capabilities

### New Capabilities
- `approval-delivery-checkpoint`: Publish corrected native inputs and return to parent delivery.

### Modified Capabilities
None; this unarchived cross-repository integration has no existing main capability with these requirements.

## Impact

Dependency-order source commits, native UAR payloads for win32-x64/darwin-arm64, Boss source/binary selectors and parent KBD handoff; installers and site publication remain parent tasks.
