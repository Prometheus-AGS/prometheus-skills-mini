# Real reasoning event support: bounded scope proposal

Status: read-only Task 9 author investigation, not implementation or acceptance. Canonical position restored at revision 247. The parent reports G2-07 observed `textEvents=2`, `reasoningEvents=0`; text projection, secret absence, persistence, and control-ID predicates passed. This report does not rerun that gate or reinterpret those passing predicates as reasoning coverage.

## Finding

The currently vendored Liter SDK already preserves the real OpenAI-compatible `reasoning_content` field as typed data. UAR's `LiterLlmDriver` ignores that field when converting each SDK choice into normalized events. A dependency update, vendored patch, new parser, or raw transport channel is unnecessary for the reported fixture input. The smallest proposed production correction is confined to the existing per-choice mapping in `src/llm/liter_driver.rs`.

This is source-grounded localization consistent with the observed zero reasoning events. No raw response or runtime driver-internal diagnostic was collected; therefore this report does not independently prove which bytes were received in G2-07.

## Actual selected source path

Boss root: `/Users/gqadonis/.claude/worktrees/bauar-boss`.
UAR root: `/Users/gqadonis/.claude/worktrees/bauar-uar`.

1. Boss `scripts/gates/bauar-secret-projection.ts:194–209` configures a custom provider with `openai-chat-completions`, a `projection-model`, a UAR agent, and `uar_model_assignment.source='boss'`. Selection is established by source configuration, not inferred from event absence.
2. Boss `src/main/ai/runtime/uar/uarModelAssignments.ts:38–70,91–96` resolves that Boss model, maps the chat-completions endpoint to `provider_kind='openai_compatible'`, and supplies its endpoint and credential. `UarRuntimeConnection.ts:188–206` resolves this assignment and places its credential in the actual run's `run_credentials`.
3. UAR `src/uar/runtime/turn/host/credentials.rs:92–94,166–203` accepts that kind and binds `host_provider_kind`, the requested model, and the host-supplied connection into `LlmConfig`. `src/uar/runtime/manager.rs:4458–4497` applies `credentials.config_for` to the selected run config.
4. UAR `src/llm/orchestrator.rs:100–131` prioritizes `host_provider_kind`; only the explicit `anthropic` branch selects the native Anthropic driver. This OpenAI-compatible route constructs `LiterLlmDriver`.
5. `src/llm/liter_driver.rs:103–110` constructs `DefaultClient` with the model hint. SDK `vendor/git/liter-llm/crates/liter-llm/src/client/mod.rs:984–1004` selects the generic `OpenAiCompatibleProvider` for an explicit custom endpoint and this non-special model hint. The Azure/Anthropic/DashScope exceptions do not match `projection-model`.

## Typed stream path and the precise omission

- UAR `src/llm/liter_driver.rs:12–15` imports the SDK `ChatCompletionChunk`; `606–610` obtains `chat_stream`; `618–637` receives and iterates its typed chunks.
- SDK `src/client/mod.rs:1068–1111` uses the selected provider's `parse_stream_event` for its SSE stream. Generic `OpenAiCompatibleProvider` at `src/provider/mod.rs:699–721` does not override that parser. The default parser at `483–518` deserializes ordinary event data into `ChatCompletionChunk` at `513`.
- SDK `src/types/chat.rs:353–384` defines `StreamChoice.delta: StreamDelta`; `StreamDelta` derives `Deserialize` and has `reasoning_content: Option<String>` at `384`, with serde default handling. Thus no extension map is needed. The SDK's existing deserialization test at `576–583` is supporting source precedent only; it was not run here.
- UAR `src/llm/liter_driver.rs:637–689` maps `delta.content`, tool calls, and finish reasons but never reads `delta.reasoning_content`. Existing reasoning fields in the SDK do not automatically produce UAR events.
- Downstream support already exists, as traced in `uar-task9-split-events.md`: normalized `ReasoningDelta` traverses the existing reasoning secret stream (`src/uar/runtime/turn/host/secret_stream.rs:41`), manager domain mapping (`src/uar/runtime/manager.rs:6148–6167`), and real AG-UI reasoning event conversion (`src/uar/api/adapters.rs:101–107`). `ThinkingDelta` is a separate omitted event at adapter line 100 and is not an acceptable substitute.

## Proposed minimal scope, subject to approval

Proposed production write scope: **only** `/Users/gqadonis/.claude/worktrees/bauar-uar/src/llm/liter_driver.rs`, inside the existing `for choice in &chunk.choices` conversion.

For each present, nonempty `choice.delta.reasoning_content`, increment the existing `event_count` and yield the already-defined `NormalizedEvent::ReasoningDelta { text: reasoning.clone() }`. Match the current nonempty content mapping convention. Recommend emitting reasoning immediately before content when both occur in the same choice, so both real fields are represented with explicit deterministic ordering. Preserve provider chunk/choice order and the relative order of all existing content, tool, finish, and usage events. Do not add buffering, timers, retries, parsing heuristics, model-name detection, `<think>` substitution, synthetic events, or payload logging.

This changes observable production behavior: genuine provider reasoning supplied through the typed field becomes visible to the existing secret projection, persistence, and AG-UI event pipeline. It introduces no new wire field, persistence schema, authority, endpoint, credential handling, provider selection, or default. The actual untrusted-provider-output/secret-projection boundary remains in the existing downstream projection; it must not be bypassed.

The existing driver is oversized (1,019 newline-split lines at inspection). The proposal is a surgical mapping addition in its existing cohesive stream conversion, not an unrelated refactor or a new module. Parent must record the precise scope decision before any write. No new source path is proposed.

Options:

- Approve this one-file typed mapping correction, then let the root complete authorized delivery and run the failed real split-event gate at the proper boundary. Preserve its finite event counts, exact projected output, secret absence, durable persistence, and control-ID checks. This investigation does not authorize any build or rerun.
- Leave production unchanged: reasoning projection through this custom OpenAI-compatible Liter route remains unsupported, and the real reasoning acceptance condition remains unmet. Increasing delays cannot fix the omitted mapping.

Neither option requires changing SDK pins or vendored code. Raw SDK streaming exists but is unnecessary and would expand scope. Previous pending approvals concerning other controls do not imply approval of this driver change.

## Source snapshot (SHA-256)

Paths below are relative to the roots above; hashes are from exact explicitly allowed files only.

| Root | Path | SHA-256 |
| --- | --- | --- |
| UAR | `src/llm/liter_driver.rs` | `ee25a3547a774694225f183af5ad2047f8aae523e2c9e0742c8e6a430d9d837f` |
| UAR | `src/llm/orchestrator.rs` | `c0e6186b949ad587f4c17f55bde95f8c85e4f0d17abbacee62c8fa526921d8a7` |
| UAR | `src/uar/runtime/manager.rs` | `a786f4830611f92b0c718c474ae392efda8eb89ccf1fb4ca59e0947a1db40d17` |
| UAR | `src/uar/runtime/turn/host/credentials.rs` | `032bfa38a9aa25236eb7f69c089e3509816423b4183c0494bedff955c42a83f1` |
| UAR | `vendor/git/liter-llm/crates/liter-llm/src/types/chat.rs` | `d10f434b14c12dbfd43ba8825c6a69b84420f43d75491d1e21520b6624ad6b88` |
| UAR | `vendor/git/liter-llm/crates/liter-llm/src/provider/mod.rs` | `21e8eb563368198baf4ad50410f1366d1768895ffecc77d2e1a4e5d45073bb82` |
| UAR | `vendor/git/liter-llm/crates/liter-llm/src/client/mod.rs` | `3dba810817b36e7712f0ada80a22f7c7e8f27e30ea68a6b062b488cab4bce79c` |
| Boss | `src/main/ai/runtime/uar/uarModelAssignments.ts` | `6a4625504d3aaa977772547574bdfb60ab7cf2852481b3b56785b88ff850b907` |
| Boss | `src/main/ai/runtime/uar/UarRuntimeConnection.ts` | `5b0e002e326761eb9ea59f71bbc072bb86a57b995f0dd5ff68fc791e0109df3e` |
| Boss | `scripts/gates/bauar-secret-projection.ts` | `a115d87dae95435e168205d2e10092edd48c64653aecb248fe8f99437ee12934` |

## Limits and completion check

Only this evidence document was written for this assignment. No source edit, test, compiler/build, formatter, gate, endpoint request, service/default/pin/dependency mutation, raw runtime log, or D0 diagnostic was performed. No excluded file was opened or hashed in this bounded investigation. The earlier Task 7 accidental partial source exposure remains disclosed in its incident artifact; this statement does not erase that session-wide limitation. This is author source inspection, not independent review or runtime acceptance. Root retains scope approval and execution authority.
