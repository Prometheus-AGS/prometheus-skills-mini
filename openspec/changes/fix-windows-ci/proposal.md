# Proposal

## Why
Windows Node 22/24 CI on main fails with six failures and one cancellation (runs 43213518211 and 43413734260). Packaging hangs, worktree identity expectations disagree with Windows path spelling, and hook payloads disappear on Windows pipes.

## What Changes
- Normalize the directory-creation walk's path representation so it terminates on Windows.
- Read Windows hook pipes asynchronously with the existing bounded stream reader; retain POSIX FIFO and regular-file semantics.
- Correct platform-specific transport assertions and canonical git-directory expectations without disabling Windows tests.
- Regenerate both shipped payloads and require the complete CI matrix before merging.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- hooks/dispatch: explicitly require bounded delivery through platform-native stdin streams.

## Impact
Distribution builder, hook entry point, identity integration assertion, their tests and generated packages. No dependencies, services, identity algorithm migration, global installations or unrelated local changes.
