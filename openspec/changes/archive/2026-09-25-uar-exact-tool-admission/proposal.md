## Why

Boss can weaken UAR Ask and the host bridge consumes permissions by tool and argument FIFO, so identical calls cannot establish which invocation was authorized.

## What Changes

- Restrictive policy composition.
- Exact prepared execution identity.
- Authenticated paired transport.
- Safe consent and idempotent acknowledgment.
- **BREAKING**: the private paired bridge rejects identity-free tool calls; Boss and UAR are updated together.

## Capabilities

### New Capabilities
- `uar-exact-tool-admission`: Bind approval to one prepared tool invocation.

### Modified Capabilities
None; this unarchived cross-repository integration has no existing main capability with these requirements.

## Impact

UAR orchestrator/runtime broker/MCP adapter; Boss managed bridge, controller, registry, IPC, approval presentation and all affected locales. BREAKING private paired bridge protocol: missing admission identity is rejected.
