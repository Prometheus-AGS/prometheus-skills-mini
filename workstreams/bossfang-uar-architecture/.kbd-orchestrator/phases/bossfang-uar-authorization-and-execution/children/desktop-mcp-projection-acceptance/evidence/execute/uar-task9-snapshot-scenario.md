# Task 9: snapshot fixture source investigation

2026-10-07. Read-only author investigation at restored revision 249. Only this evidence document was written. No product/fixture edits, runtime requests, tests, builds, compilers, private logs, or service/default/config changes.

## Observation and counter meaning

`G2-09-finite-failure.json` snapshot outcome is failed. It records streams 1, changed 2, textEvents 2, snapshot 0, chunks 3, textDeltas 0, textLength 0, storedAssistantRecords 1, and no stream error. Secret-absence and persistence predicates pass; `textRedacted`, `exactText`, and `snapshotObserved` are false.

**`snapshot: 0` is not a count of MESSAGES_SNAPSHOT frames.** Boss `scripts/gates/bauar-secret-projection-events.ts:74–79` increments it only when a MESSAGES_SNAPSHOT contains an assistant message whose content is a string and the fixture rewrites that content. An empty snapshot does not increment it. `snapshotObserved` at line 187 is merely `capture.snapshot > 0`. Likewise `streams` increments only after the special branch's two physical stream requests (`40–45`), so the recorded value 1 does not mean only one network stream opened.

No runtime frame payload was opened in this investigation. Event-frame absence must not be inferred from this counter.

## Exact source mismatch

Boss source root: `/Users/gqadonis/.claude/worktrees/bauar-boss`.
UAR source root: `/Users/gqadonis/.claude/worktrees/bauar-uar`.

1. Boss `UarRuntimeConnection.ts:260–275` opens `created.stream_url?stream_mode=agui_spec` with `last-event-id: '0'` on its initial attempt. A reconnect normally uses the adapter's actual replay cursor.
2. The snapshot fixture (`bauar-secret-projection-events.ts:38–44`) consumes the entire first response with `arrayBuffer()`, then calls `original(request, init)` again **without changing that initial cursor**. It does not use the normal reconnect cursor logic or derive a cursor from the consumed response.
3. UAR `src/uar/api/routes.rs:794–821` reads the explicit last-event-id header, partitions replay after that cursor, and constructs a snapshot through that cursor. The explicit zero prevents the default latest-history cursor from applying.
4. `src/uar/api/sse.rs:135–159` builds assistant snapshot text only from ChatDelta history whose source event ID is <= cursor. With cursor zero, normal positive source IDs contribute no text. Nevertheless `replay_snapshot_events` always emits MESSAGES_SNAPSHOT (`304–317`), including an empty messages array.
5. All later history is replayed again. The fixture explicitly sets every snapshot-scenario content delta to empty (`events.ts:56–73`, especially 64). The empty snapshot contains no assistant message to replace. Hence the observed two rewritten text events, zero snapshot replacements, and no emitted text deltas are exactly consistent with this source sequence.

This is a concrete fixture cursor error; it does not require a UAR production snapshot change. It is not evidence of lost control IDs, failed cancellation, or secret leakage. The gate's subsequent abort and warm close (`bauar-secret-projection.ts:387–395`) occur after `runTurn` returns and do not request a snapshot. `bauar-secret-projection-turn.ts:100–105` issues its active cancellation only for the separate cancel scenario. `bauar-secret-projection-lifecycle.ts:5–17` closes a session to rehydrate persisted history; it does not select a stream replay cursor.

## Minimal fixture correction proposed, not implemented

Proposed write scope: only existing Boss `scripts/gates/bauar-secret-projection-events.ts`, inside the special snapshot branch plus its finite counters/assertions if needed. Root owns authorization and assignment.

Keep the original first response drain, but parse its actual SSE framing in memory to obtain a **real source cursor after all assistant text and completed steps, strictly before the successful terminal source event**. A suitable bounded choice is the last distinct nonterminal SSE source ID actually observed before RUN_FINISHED, provided actual prior text and completed-step ordering are confirmed. Validate that cursor and terminal source differ and are ordered; do not calculate or fabricate an ID. Preserve the actual stream URL, run, principal, generation, headers other than this cursor, signal, event types, event IDs, and sequences.

Reissue the same stream operation with a cloned header set whose `last-event-id` is that observed cursor. The UAR then creates a real messages snapshot including the completed assistant text and replays the original terminal event after the cursor. The existing rewrite may replace only that real assistant snapshot content with the controlled canary; leave all authority and correlation fields untouched. Preserve all existing exact-text, secret absence, persistence, and control checks. Add separate finite counts for snapshot frames and matching assistant snapshot messages so an empty snapshot is distinguishable from no snapshot. No raw event content or IDs need be emitted as evidence.

Do not simply remove the cursor or set it to the terminal event: the default latest cursor includes the terminal in the snapshot boundary, while routes replay only events strictly after the cursor. The snapshot itself does not mark the Boss adapter terminal, so that shortcut can leave the real consumer awaiting terminal completion.

Do not choose the last text cursor without checking subsequent step events. Boss `UarAguiAdapter.ts:217–233` requires a matching active step for STEP_FINISHED. A fresh adapter receiving only a trailing finish after a mid-step cursor may reject it. Selecting an actually observed boundary after all step finishes and before RUN_FINISHED avoids that artificial partial-step replay. UAR `src/uar/api/adapters.rs:235–240,282–295` maps run completion and runtime steps as distinct source events. If the drained sequence supplies no suitable boundary, refuse this fixture setup with a fixed category and report the unmet precondition; do not synthesize events or change product behavior to force it.

The adapter already consumes real MESSAGES_SNAPSHOT (`UarAguiAdapter.ts:150–152,208–214`), selects its assistant string when no text has yet been seen, and sends it through normal text projection. This is the actual intended path to exercise. Snapshot output remains subject to real profile/run/ordering validation (`125–129,428–442`). No replacement executor, fake snapshot, new endpoint, or product API is needed.

## Remaining evidence and limits

The minimum correction is source-backed, but the proposed real cursor boundary and successful snapshot projection have not been exercised here. Root must first approve/assign the fixture amendment and later run only the appropriate failed acceptance work at the authorized delivery boundary. This investigation does not duplicate the independent restart failure work or resolve the pending reasoning/cancellation amendments.

Only explicit named source paths and their referenced adapter/stream helpers were inspected. Neither excluded `tests/bauar_session_owner.rs` nor `src/uar/mcp_server.rs` was opened or hashed; no D0 diagnostic/reroute occurred. The earlier Task 7 accidental partial source exposure remains recorded separately. The initial reminder-read command in this followup had a JavaScript syntax typo, was corrected, and then read revision 249; it performed no runtime diagnostic or mutation.

## Source hashes

| Root | Relative path | SHA-256 |
| --- | --- | --- |
| Boss | `scripts/gates/bauar-secret-projection-events.ts` | `bf1ebe8951094e1e927163b14f3f642a9797845d885b192078746bf8c91a9cec` |
| Boss | `scripts/gates/bauar-secret-projection-turn.ts` | `ad26130120d4c6f6a269e2c8d502de7982aefe415bdbdae46e839484048fc528` |
| Boss | `scripts/gates/bauar-secret-projection-lifecycle.ts` | `aa89f82c774e3ee5839b5d0b379a0f08ae5258ed4677a4a63dff9219f1016dd7` |
| Boss | `src/main/ai/runtime/uar/UarRuntimeConnection.ts` | `5b0e002e326761eb9ea59f71bbc072bb86a57b995f0dd5ff68fc791e0109df3e` |
| Boss | `src/main/ai/runtime/uar/UarAguiAdapter.ts` | `d233bc2074337d8d84142c45232d4c41bf8d0a10c7a25a197832fc81ce0f178b` |
| UAR | `src/uar/api/routes.rs` | `239904c15f76e335e656a653a8ba0274f4cf9b9aa6ddb705ee3c163b318d0df4` |
| UAR | `src/uar/api/sse.rs` | `0eefc7542b68262e359697b2f10147f8de29e7a789a830d06f0dbbdc4af762d4` |
| UAR | `src/uar/api/adapters.rs` | `a10638164fa4c62e2d1334d2088b49f0d32cf92bd5cc468cf72db24698a642df` |
