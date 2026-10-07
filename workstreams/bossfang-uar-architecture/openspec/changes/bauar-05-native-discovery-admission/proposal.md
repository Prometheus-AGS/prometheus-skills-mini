# Proposal

## Why

The desktop projection gate currently completes without preparing its target, and its controlled provider supports only eager tools. Source tracing also shows that native discovery passes host admission but cannot complete Boss's claimed-only terminal protocol because only mounted MCP dispatch consumes the host claim. Runtime12's exact advertisement/proposal branch remains unknown.

## What Changes

- **BREAKING:** Coordinate admission protocol v2 across owned UAR/Boss callers, with required executionKind derived from resolved UAR execution authority and bound to immutable invocation/receipt identity; reject v1, missing and unknown kinds without dispatch.
- Add a consuming native claim before UAR-owned native execution; retain nonconsuming MCP revalidation, receiver-side MCP claim-before-effect, exact approvals and claimed-only finish.
- Preserve durable claim, cancellation, uncertain acknowledgment and terminal failure evidence without replaying an effect.
- Adapt the existing controlled model provider to correlate discovery and target calls/results through the single UAR loop.
- Exercise deterministic eager/deferred application catalog profiles using the actual desktop host and mounted MCP receiver, with finite safe counters and original projection assertions.
- Build fresh affected development artifacts and bind acceptance to their exact sources. Add no library, dependency pin, credential store, service, external server/IdP default or release action.

## Capabilities

### New Capabilities

- `native-tool-admission`: Bound authority, consuming execution claims and terminal outcomes for UAR-executed native tools, including discovery acceptance through the existing harness.

### Modified Capabilities

None in the promoted main-spec inventory (the actual OpenSpec inventory is empty). This additive delta extends active bauar-02 execution-bound-authorization and bauar-04 mcp-resource-authority requirements without replacing them or closing their tasks. Those active specs remain required integration constraints.

## Impact

UAR admission wire, authority construction/equality, HTTP port, lifecycle, standalone port and surgical dispatcher consistency; Boss admission wire/record owner, host revalidation/bridge advertisement and owned callers; existing projection/provider/MCP fixtures and their counters. Exact source ownership is declared in design.md and verification.md.

The user approved the child scope amendment for Spec on2026-10-07. These are planning artifacts only. Plan and Execute handovers remain separately gated; no product code changes, tests, release/package bypass or parent certification occur here. Unrelated parent blockers, including excluded D0, remain unchanged.

