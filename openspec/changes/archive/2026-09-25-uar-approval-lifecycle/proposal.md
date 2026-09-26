## Why

Live renderer replay, SSE reconnection and process restart have different semantics, but current acceptance conflates them and memory-only grants cannot establish crash outcomes.

## What Changes

- Reconnect to the same pending continuation.
- Cancellation and narrower authority.
- Durable evidence without crash replay.

## Capabilities

### New Capabilities
- `uar-approval-lifecycle`: Make approval reconnect and interruption explicit.

### Modified Capabilities
None; this unarchived cross-repository integration has no existing main capability with these requirements.

## Impact

Existing UAR pending broker, run events/persistence, root-child cancellation; Boss stream, sidecar lifecycle and localized pending/result presentation.
