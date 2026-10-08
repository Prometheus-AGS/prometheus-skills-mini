# UAR resource R1/R2 source handoff

Author: uar_resource. Date: 2026-10-06. Source root: `/Users/gqadonis/.claude/worktrees/bauar-uar`. This receipt is source authoring, not execution or certification. Child resource inventory task1 exited revision78; grant task2 began80; stdio task3 began82. Root owns lifecycle acceptance.

## Exact authored paths and SHA-256

Paths below are relative to source root. Hashes cover complete files at handoff, including earlier authors' preserved content.

| Path | SHA-256 |
| --- | --- |
| `src/mcp/stdio_process.rs` | `f26d78d63102e0e65ed1d0c13a0cd0cf996d0ae22c053ee6b753decec70f1044` |
| `src/mcp/registry.rs` | `668056c132d2beaabfe997729225aacc959cb3c40b3f0b80db91e2713237f162` |
| `tests/bauar_resource_grants.rs` | `4c078449b1ed06e9c9ef047e56ee42de711026687b2d5f1f01824da9816cf863` |
| `tests/support/bauar_resource_peer.rs` | `86ad1c6dccdda3407aa59f6434bd3c435468fd3c3096e66e10fb191ac4f78c66` |
| `tests/bauar_stdio_boundary.rs` | `9822c669fe75cbae05395ea3deda0be3ff77fa36b1868a32cfdd8ab73f63d92a` |
| `tests/fixtures/bauar_mcp_stdio.mjs` | `cf4564582ddd42b7756863ae9f623994004dca64874f7837d2d4a6c19f0ef704` |

## R1: existing invariants, newly authored scenarios

No changes were necessary to accepted `src/uar/runtime/turn/host/mcp.rs`, `src/uar/runtime/turn/host/mod.rs`, or `src/mcp/runtime.rs`: inventory traced existing private trusted-host provenance, registered destination and required-scope checks, owner/config/auth/environment identity, per-run resource isolation, immutable expiry/revocation, same-destination narrowed renewal, and action authorization through effective policy/projected descriptors/prepared call. Destination scopes are not interpreted as a universal tool-name convention.

New scenario `grants_pin_owner_run_destination_revision_lease_and_action` uses the actual sidecar server, agent/run/approval/revoke/resume routers, selected workspace `mcp.json`, a synthetic model fixture, and an HTTP MCP receiver which independently rejects unknown bearer values before recording an effect. A successful direct receiver control proves reachability before denial assertions. Cases authored:

- Concurrent same-owner two runs and a different owner: unique run IDs, distinct receiver sessions, correct credential labels, exactly one effect per input.
- Expired admission, missing registered required scope, and unregistered destination do not reach the receiver effect.
- Foreign-owner resume, unchanged-revision expiry extension, widened grant scopes, and alternate selected destination are rejected; valid changed-revision renewal produces a fresh run/session/effect.
- Exact approval holds an admitted call until its immutable lease expires; receiver effect count remains unchanged.
- A foreign owner cannot revoke; owner revocation cancels a pending call without releasing its approval or causing an effect.
- A valid destination credential cannot execute a tool removed by effective artifact policy.
- Explicit fixture configuration coexists with an unchanged empty shipped `mcp.json` assertion.

The synthetic receiver is not an external JWT issuer, deployment, or receiver certification. No D0 fixture or session-manager source was touched. New scenario/helper sizes are 146/213 lines including trailing empty line.

## R2: actual production delta and scenarios

`StdioProcessSupervisor::spawn` now sets child stderr to null before spawning. The supervised stdin/stdout pipes, captured environment, admission lock, cancellation, kill/reap tasks, shutdown join barrier, and sticky cleanup error are preserved.

The pinned dependency source `/Users/gqadonis/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/rmcp-3.1.2/src/transport/child_process.rs` was inspected: `TokioChildProcess::new` constructs a builder whose stderr defaults to inherit, and `spawn` overwrites the underlying Command stdio. Therefore setting Command.stderr alone is ineffective. Both actual registry constructors, `connect_server` (reconnect) and `connect_configured_server` (configured startup), now use `TokioChildProcess::builder(cmd).stderr(Stdio::null()).spawn()`. Environment and existing rmcp lifecycle semantics remain unchanged. Uncompiled/unreferenced `stdio_client.rs` is excluded.

`stdio_boundary_captures_environment_owns_children_and_discards_raw_stderr` launches its `child_host_helper` subprocess with synthetic stdin/environment and captures real stdout/stderr. The helper exercises:

- `snapshot_lifetime`: successful initial discovery, retirement, cached lazy preflight without launch, one later call and fresh process, shutdown and closed admission; declared values come from capture while unrelated ambient/captured provider values and host stdin stay out.
- `cancelled_lifetime`: cancellation while initialization is held and while a tool call is held; the Node peer deliberately ignores EOF, requiring process termination and join; no heartbeat after returned cleanup and no automatic restart/effect replay.
- `configured_constructor`: real configured registry startup and successful effect, declared ambient value only, no inherited host stdin.
- `required_sandbox`: unsupported required sandbox rejected by catalog construction and configured registry before spawn.
- Early raw stderr canary emitted before MCP handshake is absent from host helper stdout/stderr.

Fixture launches explicitly use `/opt/homebrew/opt/node@24/bin/node`. New Rust/Node sources are 193/41 lines including trailing empty line. This proves no runtime result yet and does not claim OS sandbox or descendant-process containment.

## Verification boundary and limits

Only source/dependency reads, edits, source line counts, and SHA-256 receipt generation were performed. No test, build, compiler, formatter, lint, dependency command, service, publication, commit, D0 execution, or production QA was run. All new scenario compile compatibility, timing behavior, actual event/error status assertions, and runtime outcomes remain unverified until the complete delivery gate authorized by root. R1/R2 exact source files are released for root acceptance and later coordinated work.

## Proposal only: smallest truthful R3 canonical receipt contract

Observed boundary: `src/llm/orchestrator.rs::preserve_canonical_tool_result` currently returns raw value when no receipt store is attached, otherwise passes raw value/segments to `CanonicalToolReceipt::acquire_with_segments` before save. Native terminal segments already contain independently retained base64 bytes, byte lengths, and SHA-256 digests (`src/uar/tools/terminal_exec.rs::take_canonical_receipt_data`). Projecting only display JSON or the final emitter cannot protect these sinks.

Proposed handoff after capture-owner release:

1. Project value and raw segments at the first line of preservation, before the no-store early return, acquisition, or save. Return projected value on the no-store branch. Keep execution argument authority and raw private credentials separate from model/output projection.
2. Add optional serde-default `secret_projection` metadata on `CanonicalToolReceipt`, omitted for legacy/unprojected receipts. Small typed payload: `version: 1`, `redacted: bool`, `omitted_raw_segments: u64`. Presence states the finite captured-secret policy was applied, not an absolute secret-free guarantee. The flag counts actual replacements in value or UTF-8 raw/name; omitted count reports opaque or unavailable streams. Complete remains completeness of the represented projected payload, explicitly not lossless original output. Acquisition failure/limits remain separate and must not silently become complete.
3. Verify each retained raw segment with existing `verified_bytes` before transformation. For UTF-8, apply the same finite projector and reconstruct with `CanonicalRawSegment::new(projected_name, projected_bytes)` to recompute actual base64, length, and SHA-256. Do not retain old bytes, old original hashes, or original lengths alongside transformed bytes. For non-UTF-8 or unavailable bytes, omit the segment entirely and increment omission metadata; no lossy UTF-8 rewrite, hidden archive, invented digest, or placeholder advertised as original. Existing source `acquisition_complete == false` must remain false. Complete source with opaque data can retain projected typed value with explicit omission metadata; that receipt is complete only for its declared projected view.
4. Recompute typed-value hash/length and retained-byte accounting by acquiring only the projected payload. Existing original acquisition-limit counters remain diagnostic acquisition evidence and must be labeled as such, rather than reused as hashes or lengths of projected data.
5. Include `secret_projection` in `same_canonical_payload` so replay with a different projection/disposition conflicts even when remaining payload hashes coincide. Validate version and the projected disposition. Older serialized receipts deserialize with absent metadata; do not infer that they were projected. Schema remains additive version1 only if root accepts that compatibility contract; otherwise version2 needs explicitly dual-version validation. Neither choice is written yet.

Exact extra paths proposed: `src/uar/persistence/agent_threads.rs` (field, constructor default, validation/equality and comments); new `src/uar/runtime/turn/host/secret_projection.rs` (finite string/value projector); new `src/uar/runtime/turn/host/secret_stream.rs` (bounded fragment carry); new `src/uar/runtime/turn/host/receipt_projection.rs` (verified raw disposition and typed metadata); `src/uar/runtime/turn/host/mod.rs` (preserve existing extend/from_values/scrub API, delegate implementations); `src/llm/orchestrator.rs` (preservation ingress and model-bound payload use, after exclusive capture writer releases); `src/uar/runtime/manager.rs` (event projection before persistence/emission, after exclusive capture writer releases); new `tests/bauar_secret_projection.rs` (authored finite encoding, split-fragment, canonical hash/disposition, no-store and store scenarios). No directory wildcard. Each new module below500 lines.

Material constructor callers found: production acquisition only `preserve_canonical_tool_result`; `CanonicalToolReceipt::acquire` delegates to `acquire_with_segments`; other acquire callers are scenario helpers in `agent_threads.rs`, memory provider tests and `tests/context_history_integrity.rs`. Surreal persistence serializes the full receipt as JSON text; Postgres serializes receipt data; memory retains the typed struct. No provider schema migration or provider source claim is currently needed. `NativeCanonicalReceiptData` and terminal acquisition stay raw at their private acquisition seam; projection owns transition to ordinary retention/model/event sinks.

Uncomfortable limitation: finite capture-based replacement cannot certify arbitrary transformations or encodings of credentials; withholding non-UTF-8 raw streams deliberately sacrifices original-byte completeness. The indicator must expose that sacrifice. Structured schema keys and routing identities must not be rewritten by generic serialization; typed event payload projection must target actual user/tool content. Cross-fragment projection needs per-stream carry and terminal flush, bounded by the longest finite variant. R3 remains proposal-only, with no shared-file writes before handshake.

### Exact consumer additions and finite projection policy

Additional exact claim proposed: `src/llm/anthropic_driver.rs`, only the pre-UAR stream warning at the reqwest error arm (currently around390): replace raw `warn!("SSE stream error: {e}")` with a static warning; retain typed failure propagation so request-bound projection still handles downstream diagnostics. This adapter has no run capture dictionary and must not dump an error before that dictionary can act. No other provider redesign is proposed.

Finite string variants proposed for each captured nonempty value: raw UTF-8; JSON-escaped string body; percent-encoded UTF-8 (upper/lower hex spellings); standard base64 padded/unpadded; URL-safe base64 padded/unpadded. Bare bearer bytes are captured by the ingress owner, not guessed from arbitrary output. Variants are deduplicated, longest match takes precedence, and replacements scan original input once so replacement text is never recursively matched. Do not claim arbitrary encodings, hashing, compression, unknown credentials, or unlimited transformations. Structured arbitrary tool values project string values and content keys; collisions after key projection must produce an explicit non-lossless payload representation rather than silently overwrite one field. Typed envelopes keep their control keys.

`secret_stream.rs` owns run/stream-local suffix carry up to longest_variant_bytes minus one, yielding only prefixes that cannot start an incomplete match. UTF-8 boundaries are respected; terminal/end-of-stream flushes the remaining suffix through the same projector. Distinct text/thinking/reasoning/tool-argument streams cannot share carry. This is content projection on a copy, never mutation of the accumulator used to authorize or execute a tool. The raw execution accumulator must not be persisted or returned as ordinary event/history content.

Precise manager consumers requiring post-handoff edits: initial `session.add_user_message(&input)` around3441 before `RunDialogue` copy around3449; initial message assembly around4803–4817 before model input; graph final output before `dialogue.record` around5903; normalized stream mapping before `accumulated_content` append around6043 and copied `ToolCallComplete` arguments around6189–6203; tool-result `dialogue.record` around6239 and output publication; final assistant/tool-call history around6441 and6493. Preserve live input/arguments used by authorization/execution, while storing projected history copies. `RunEventEmitter::emit` around279 applies typed payload projection before event history/persistence and serialization; this covers copied `ToolStart.input`, `ToolDelta.delta`, `ToolEnd.output`, approval arguments/risk reason, errors/diagnostics, text, memory text and artifact/citation content. Preserve run/call/approval/admission/thread IDs, numeric control fields, tool targets, signatures and live capabilities. A new exact `src/uar/runtime/turn/host/event_projection.rs` can hold this typed mapping below500 lines rather than growing manager.

Precise orchestrator consumers requiring post-handoff edits: `preserve_canonical_tool_result` before its optional-store branch; driver event loop around2112–2193 before ordinary yielded content; assistant/model message JSON around2234–2283 projects the copied assistant text and tool-call argument history while raw accumulators still feed prepared admission; tool result/model history call sites already pass the projected return of preservation. Initial incoming model message copies also need projection immediately before model invocation so custom callers without manager cannot bypass it. Do not scrub a live prepared/claimed invocation or modify an artifact/tool authority revision.

This proposal does not authorize edits. Root must accept the exact canonical metadata compatibility and opaque-raw disposition, then transfer manager/orchestrator ownership from the active capture author. Existing `RunSecretScrubber::extend`, `from_values`, and `scrub` signatures stay compatible with that author's in-flight integration.
