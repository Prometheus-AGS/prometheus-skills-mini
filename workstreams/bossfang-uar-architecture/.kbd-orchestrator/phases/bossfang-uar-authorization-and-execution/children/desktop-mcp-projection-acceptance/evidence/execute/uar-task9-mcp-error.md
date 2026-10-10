# Task 9: ordinary MCP error projection

2026-10-07, canonical task 9 revision 245. Bounded read-only source investigation by the existing author. This document is the sole write. No runtime scenario, endpoint, compiler, build, formatter, diagnostic, raw log inspection, product change, or gate change was performed.

## Observed input and limits

The root reports that G2-04's mounted MCP error profile returned a correlated model tool result and passed effect, revision, exact-approval, and source assertions. Its aggregate redaction-marker predicate was false while success/isError predicates passed. At dispatch time the actual per-mode `canaryAbsent` and `markerPresent` diagnostics were still being added by the Boss author and were not observed here.

Therefore the source can explain a legitimate marker-free error, but cannot establish that explanation as the measured cause of the G2-04 aggregate failure. In particular, marker absence must not be equated with canary absence, a leak, or successful sanitization without the corresponding finite runtime observations.

## Exact source flow

Source paths below are relative to `/Users/gqadonis/.claude/worktrees/bauar-uar`.

1. `src/llm/orchestrator.rs:1091-1123` selects the actual tool branch, checks the HostMcp admission kind, and dispatches through captured MCP preflight when present. Its fallback goes directly to the registry. The omission behavior below belongs specifically to the prepared MCP branch; it is not asserted for every fallback path.
2. `src/mcp/preflight.rs:115-128` resolves the exact projected tool/prepared server and propagates `server.call_tool(...).await?`.
3. `src/mcp/runtime.rs:872-907` validates the descriptor against the prepared catalog and uses the ready bound registry. At **898-901**, any registry call error is mapped with `map_err(|_| McpRuntimeError::ToolFailed { server, tool })`. The underlying error payload is discarded at this boundary.
4. `McpRuntimeError::ToolFailed` at `runtime.rs:439-441` displays exactly the template `MCP tool {tool:?} failed on server {server:?}`. This retains the projected server/tool identifiers, not the downstream transport error message, error data, or body. Timeout has its own bounded template at 433-438 and 903-907.
5. The underlying registry at `src/mcp/registry.rs:2348-2353` receives the transport result. Bound-service errors return at 2398-2399; the higher runtime mapping above then omits their details. Successful MCP CallToolResult values serialize at 2467-2468, including an `isError` response returned as an ordinary successful transport result. That response-content case is distinct from transport/RPC Err.
6. `orchestrator.rs:679-701` selects MCP provenance for an external MCP tool. On error it calls `preserve_terminal_tool_failure` with `error.to_string()` and returns `(content, content, false)` after preservation succeeds.
7. `orchestrator.rs:1033-1064` creates the correlated failure JSON: `status:"error"`, exact `tool_call_id`, exact tool name, provenance `{source, terminal_state:"failed", observed_by:"trusted_host"}`, and `message:error`. It preserves that JSON through `preserve_canonical_tool_result`.
8. `orchestrator.rs:1002` projects the copied receipt **before** either the no-store return at 1003-1004 or durable canonical save at 1024. `turn/host/receipt_projection.rs:24-48` applies value projection and records whether a replacement actually occurred. It does not manufacture a marker when no replacement occurred.
9. Once terminal finish succeeds, `orchestrator.rs:2849-2877` emits the tool result with the exact call ID; at 2889-2899 it adds the result to ordinary and canonical tool-message histories. `prepare_attempt` at 862-873 projects provider-request message copies again before destination preparation. This is the source path to the next provider request. A preservation/finish error instead emits `TERMINAL_RESULT_PERSISTENCE_FAILED` and returns at 2852-2861; it does not produce the ordinary correlated tool-result continuation.

## Why a safe error can have no marker

`src/uar/runtime/turn/host/secret_projection.rs:9` defines the actual marker as **`[REDACTED]`**. It is not `<redacted>`. The projection captures finite original/JSON-escaped/percent/base64 variants at 17-37. In `prefix`, the replacement is appended only on an actual captured-pattern match (approximately 61-95); unmatched characters are copied. `value` recursively projects strings, arrays, and object keys/values without adding a generic success marker.

Consequently, if the prepared runtime first substitutes the generic `ToolFailed` template and its server/tool identifiers contain no captured value, receipt/provider projection has nothing to replace. The original canary-bearing error can be absent **and** `[REDACTED]` can be absent. This is intentional detail omission in the observed source path. It is a source-grounded possible explanation for the aggregate predicate, not an observed per-mode G2-04 result.

Conversely, successful result content or `isError` result content can retain an ordinary response shape while matching strings are replaced. Marker presence is meaningful for a deliberately retained canary-bearing payload, but is not a universal requirement for every safe transport-failure representation.

## Narrow finite runtime oracle

Use only the existing provider-captured, call-correlated tool result in the ordinary gate. Do not fetch another endpoint, replay the operation, weaken ownership, or record raw content. Separate these in-memory checks and emit fixed booleans per mode:

- `canaryAbsent`: none of the gate's captured canary variants appear in that correlated provider-facing tool content.
- `markerPresent`: whether the exact `[REDACTED]` marker appears; report independently rather than treating it as equivalent to `canaryAbsent`.
- For the transport-error mode, `genericMcpFailure`: parse the correlated tool JSON and compare its message with the exact source-derived generic ToolFailed template instantiated using the already-known fixture server/tool identifiers. Record only the boolean, not the identifiers or message.
- `failureProvenanceMatches`: fixed `status:error`, MCP source, `terminal_state:failed`, `observed_by:trusted_host`, and exact existing call correlation. Preserve the already-required single effect, exact approval, revision, and source checks.

If the observed error result has `canaryAbsent:true`, `genericMcpFailure:true`, and matching failure provenance, then marker absence is explained by source-backed omission on this actual result. If those observations are absent or false, do not infer omission and do not relax the gate based on this document. No gate change or passing result is authorized or claimed here; the root owns that decision and actual observation.

## Static source snapshot

| Path | SHA-256 |
| --- | --- |
| src/llm/orchestrator.rs | c0e6186b949ad587f4c17f55bde95f8c85e4f0d17abbacee62c8fa526921d8a7 |
| src/mcp/runtime.rs | 2107903dc1fea8bdbbd341b180e11ac9f4a2be1720995003d15093ceb614888a |
| src/mcp/preflight.rs | dfc1e8ce8f3421953183339857a4b9c4a477a2191d0797ac0922dac1fdfeb798 |
| src/mcp/registry.rs | 668056c132d2beaabfe997729225aacc959cb3c40b3f0b80db91e2713237f162 |
| src/uar/runtime/turn/host/receipt_projection.rs | 26eb43b226f28457cd8c38dabeaf8f387b2fc9d1ef779dceb33bab4c61b06350 |
| src/uar/runtime/turn/host/secret_projection.rs | 47558fea97a13c1c3f24e1c5591f3e00bd3f1bea3cb18b17a28d4a3e332b8e87 |

Only explicit allowed source paths and their named helpers were read/hashed. Neither excluded source file was opened or hashed for this question; no rejected diagnostic was retried or rerouted. The earlier task 7 accidental partial exposure remains disclosed in its existing evidence; this document makes no contrary session-wide claim.
