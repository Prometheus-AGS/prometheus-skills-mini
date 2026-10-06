# Design: Run-owned secret projection

## Context

This child supplies the Boss slice of parent bauar-04/4 at accepted base e2ae2ce21245030293c0bea96ed02ae853b820a7. The explicit requirement is to remove known credentials before ordinary model/event/log projection. Source discovery found that filtering the final runtime event is too late: McpRuntimeService logs and traces results before createMcpBridgeServer returns them, and the host MCP response reaches UAR before the AG-UI result returns to Boss.

## Goals / Non-Goals

Cover a finite run-owned set: selected provider API key and transport base URL when supplied by Boss, generated bridge bearer and private routes, and explicit header/environment values in the selected application MCP snapshots. Capture only nonempty values, without copying them into evidence or persisted state. The application remains the custodian. Actual authenticated requests retain credentials.

This is exact known-value projection, not universal DLP. It does not detect encodings, fragments presented as unrelated content, unknown provider-side keys, unrelated application secrets, or later OAuth refresh values absent from the captured snapshot. Shared MCP transport notifications/stderr and sidecar service credentials have separate owners; their existing coverage is not certified by this child. No application server setting, default, custody integration, IdP or remote receiver is changed. The UAR owner alone removes its root mcp.json defaults.

## Decisions

### Explicit run lifetime

Construct a small immutable projector before starting the corresponding tool or run request, after resolving the selected assignment and MCP snapshots. Add bridge-generated private values before exposing its listener. Pass behavior through explicit per-run/per-call options, not a global registry or renderer state. Drop references on teardown. Reuse the existing literal-redaction primitive; retain existing structural redaction where appropriate. Project before truncating error content, since truncation may otherwise reveal a secret prefix.

### Earliest ordinary consumer

Pass an optional projection callback through agentMcpServers and createMcpBridgeServer to McpRuntimeService for this UAR call only. Project trace inputs separately from real tool arguments, results before trace serialization, and errors before the per-call logger and rethrow. Include progress payloads before forwarding. Other runtime callers keep their existing behavior; never overwrite callbacks on shared cached MCP clients.

Use the installed SDK 1.27.1 public Transport contract at UarHostMcpBridge's server connection to project outgoing result/error/content payloads for built-in and external tools. Preserve JSON-RPC IDs, correlation, send options, cancellation, session lifecycle and protocol version forwarding. No private SDK patch or dependency change. This closes the model-bound response boundary, not logs generated internally by arbitrary built-in tools.

Project AG-UI text, reasoning, tool results, error diagnostics and human-readable approval descriptions before emitting ordinary runtime events. Preserve opaque IDs, profile/version discriminants and exact approval identity. Reject malformed control fields with safe diagnostics instead of rewriting control authority. Consecutive text deltas require per-stream suffix retention sufficient for the longest known literal; flush safely at stream termination so a credential split across deltas does not leak. This does not promise matching across unrelated events.

Project loaded host history content before the next run request while retaining tool-call/result relationships. Do not rewrite historical database rows. UarRuntimeConnection must also project pre-adapter exceptions, HTTP diagnostics and its MCP error callback; UarAguiAdapter and UarToolApprovalController must project errors before their own log/emit paths. Persistence and renderer callers then receive the already-projected event.

### Preserve admission semantics

The host bridge continues to claim the exact invocation before dispatching any effect. Projection does not alter request arguments, approval IDs, decision lookup, claim receipts or unknown-outcome handling. The approval controller extension is serialized after boss-bauar-approval-client/2; it only adds the projection seam and must preserve its strict cutover.

## Exact proposed claims

These are proposed extensions, not current production authorization. Driver acceptance and canonical task begin are required before edits.

| Path | Purpose |
| --- | --- |
| src/main/ai/runtime/uar/uarSecretProjection.ts | New finite run projector and streaming content projection |
| src/main/ai/runtime/uar/uarProjectedMcpTransport.ts | New public SDK transport delegation and content projection |
| src/main/ai/runtime/uar/UarRuntimeConnection.ts | Capture, lifetime, history, HTTP and top-level error wiring |
| src/main/ai/runtime/uar/UarHostMcpBridge.ts | Project outgoing MCP response and safe bridge errors |
| src/main/ai/runtime/uar/UarAguiAdapter.ts | Project ordinary event content and adapter diagnostics |
| src/main/ai/runtime/uar/UarToolApprovalController.ts | Serialize after approval child; project human content/errors |
| src/main/ai/runtime/agentMcpServers.ts | Pass per-call option to external MCP builder |
| src/main/ai/mcp/createMcpBridgeServer.ts | Pass projector; sanitize progress and bridge error before log |
| src/main/ai/mcp/McpRuntimeService.ts | Surgical per-call result/error/trace projection wiring |
| src/main/ai/mcp/types.ts | Main-process optional projection callback contract |
| scripts/gates/bauar-secret-projection.ts | New real-boundary scenario authoring |

New responsibilities stay in small modules. Existing oversized wiring files are not broadly refactored. No shared redaction utility, persistence module, sidecar service, mcpTransport, app config or custody file is claimed.

## Risks / Trade-offs

- Exact replacement can hide legitimate content equal to a known private value; this is the selected confidentiality trade-off and must not rewrite control IDs.
- Run scope cannot safely sanitize shared server logging with credentials it does not own. Separate application transport work would require explicit ownership and current source evidence. This child cannot close all parent secret scenarios by itself.
- Captured snapshots may differ from dynamically materialized launch environments or refreshed OAuth credentials. Such values remain outside the proven matcher set.
- Public transport delegation must preserve cancellation and response correlation. The real tool gate will catch response loss and claim-order regressions.
- Packaged acceptance has an observed prerequisite: the docs commit hook attempted pnpm install with Node 26 and failed for a missing Rolldown native binding (driver report). No installation is authorized here.

## Validation and rollout

Author all production and canary scenarios before running gates. At the driver-declared complete boundary, use a real mounted MCP transport and application event/persistence path: place an explicit canary in a captured credential, echo it through tool result, structured content, trace/error, progress and split AG-UI text; show absence from model request, ordinary events, persisted output and applicable logs. Also assert authentic headers still work, benign text and opaque IDs survive, and exact claim-before-effect still allows one dispatch. Capture negative scope explicitly; unknown/transformed credentials are not certified.

V1 maps parent04/9; V2 maps parent04/10 and requires the actual packaged app. No test/build/service/install runs during authoring. Rollback is reverting the isolated feature diff; no data migration or configuration rollback is required.

## Open Questions

Driver must accept the listed extensions before implementation. Parent acceptance must either retain an explicit limited scope for shared transport/sidecar-owned secrets or separately assign those boundaries; do not mark those canaries passed from this run-owned design.
