# Boss task 9 — G2-06 event diagnostic

Observed G2-06: event_assertions/split failure with no completed event receipt, all native cases unrun. Earlier finite results persisted: catalog_list has 12 spans, six with input canary; target_call has six, all canary-free and all redacted inputs; other_mcp zero. Both transport-error modes have canaryAbsent, genericMcpFailure and failureProvenanceMatches true. The split-specific failed predicate was not captured.

Source review: original fixture rewrites actual TEXT_MESSAGE_CONTENT and REASONING_MESSAGE_CONTENT by exact eventId and per-type/message ordinal, placing halves on first and second events. Original split assertions require >=2 text/reasoning events, exact projected text and reasoning, persistent assistant records, expected stream completion, and preserved control correlation. UarAguiAdapter.ts:179-205 consumes those event types and uses messageId:step identity; :378-390 flushes respective projection streams. uarSecretProjection.ts:84-110 buffers known partial secrets and emits replacement at matches/terminal partial. No mismatch in those contracts was established from source alone. Event cardinality/coalescing remains a hypothesis, not diagnosis. No speculative fixture correction.

Owned changes only:
- -events.ts adds eventAssertionDiagnostic with fixed counts and boolean/null fieldMatches mirroring every existing helper assertion plus main persistence/stream/approval predicates. It counts streams/changed/text/reasoning/snapshot/run-error events, content IDs, approvals/decisions, chunks, text/reasoning deltas and lengths, starts and stored assistant rows; it exports no actual text, chunks, IDs, errors or canary.
- main records that diagnostic before its first event assertion and includes it in the finite failure packet. Every original assertion and fixture behavior remains unchanged. Pending catalog/oracle amendment remains untouched.

Static readback/hash only. No tests/builds/compiler/gates/formatter/services/defaults/dependencies changed. No D0/private logs/raw fixtures accessed. Production source read-only; no leak fix, split success, or acceptance claimed. Root owns rebind/compiler/failed G2 rerun. Frozen source; UAR emission source anchors may follow independently.

Bindings:
[
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection-events.ts",
    "sha256": "634c3c92fa9be9a0e5c05647241b5eb263b606a186f4433ba37bc8346db4d5d8",
    "lines": 232
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/scripts/gates/bauar-secret-projection.ts",
    "sha256": "a0e7d5161b9c757c8871e0924b12a5bd0601535226985019c94495070e8eff96",
    "lines": 481
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/UarAguiAdapter.ts",
    "sha256": "d233bc2074337d8d84142c45232d4c41bf8d0a10c7a25a197832fc81ce0f178b",
    "lines": 486
  },
  {
    "path": "/Users/gqadonis/.claude/worktrees/bauar-boss/src/main/ai/runtime/uar/uarSecretProjection.ts",
    "sha256": "26f7468574dc8e6d3162188607ebb0bb5ef622422aeebd30a7892b3399d15ffd",
    "lines": 125
  },
  {
    "path": "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/G2-06-finite-failure.json",
    "sha256": "0f681460ff2f183502a46d147d6793667ab4b5e778e3728e18cd5aaaef34753e"
  }
]
