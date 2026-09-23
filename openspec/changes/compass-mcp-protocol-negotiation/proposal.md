## Why

Compass refuses the initialize lifecycle used by The Boss, preventing MCP integration on every platform. The Boss's installed SDK 1.27.1 requests 2025-11-25; widening Compass is the operator-approved A1 prerequisite to Windows release and bundling.

## What Changes

- Complete and verify the inherited Compass patch for 2025-11-25, 2025-06-18 and 2025-03-26 initialization while retaining 2026-07-28 discovery.
- Verify legacy HTTP session bootstrap and subsequent tools/list, preserving authentication and discovery metadata requirements.
- Carry the explicitly authorized test compilation repairs and finish the SSE regression test.
- Record the requested Rust skills in integration repositories and their active worktrees.

## Capabilities

### New Capabilities
- `compass-mcp-protocol-negotiation`: compatibility between Compass transports and The Boss's MCP client.

### Modified Capabilities
None.

## Impact

Planning lives in this mini repository; implementation is explicitly authorized in the Compass fork worktree at /private/tmp/compass-fix. No dependency upgrade, database change, new service, or The Boss implementation change. A2–A5 and UAR implementation remain out of scope. Tagging, publishing and versions.toml updates are separate operator-gated steps.
