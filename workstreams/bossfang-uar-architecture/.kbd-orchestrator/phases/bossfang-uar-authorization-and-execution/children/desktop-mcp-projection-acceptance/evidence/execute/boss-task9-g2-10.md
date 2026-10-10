# Task 9 / G2-10 snapshot fixture handoff

2026-10-07, restored revision 249. Boss runtime author. Source frozen after this handoff; parent retains compiler, source/artifact binding and failed-gate execution.

## Observation and remaining uncertainty

G2-10 completed exit 1 at final MCP sink assertions. The finite packet reports all seven native cases passed, including restart and both storage cases; authenticated MCP initializations were accepted with HTTP 200. These surfaces were not reopened or edited here. Snapshot still failed: streams 0, snapshotFrames 0, changed 0, chunks 1, streamErrorPresent true, snapshotCursorSelected false. This localizes failure before the fixture increments its post-selection stream counter, but does not identify the exact refusal or establish absence of source frames. Its returned stream error category had not been retained in the event outcome. The exact G2-10 runtime refusal remains unobserved.

Fully read uar-task9-snapshot-cursor-followup.md before changing selection logic. The prior fixture prerequisite requiring a completed step and no active step in the discarded prefix was too strict. UAR orchestrator.rs:2322–2327 forwards provider Done and returns for a text-only run before the later RuntimeStep::Finished at 2356–2360. UAR sse.rs:122–167/267–318 snapshots text/state, not active step state. Boss UarAguiAdapter.ts:208–214 accepts the real assistant snapshot; RUN_FINISHED at 169–172/281–288 calls closeStep, whose 372–375 branch is a no-op when the fresh adapter has no active step. Thus a real text snapshot plus actual terminal replay is supported despite an unfinished step in the discarded prefix. A STEP_FINISHED in the replayed suffix still needs a matching replayed start. These are source facts; they are not a measured explanation of G2-10's particular refusal.

## Exact changes

Paths were sent to root before edits. Only existing owned -events.ts and -turn.ts were changed, plus this evidence document. No main/native/MCP/product source was edited.

- Snapshot selection now retains the drained real source sequence only in memory, chooses its latest observed source string strictly below the actual RUN_FINISHED source, and requires that cursor to include the last observed nonempty assistant text. It uses the actual numeric source ID, never an invented offset, payload eventId, latest/default cursor or timer. Duplicate source IDs are permitted; decreasing source ordering is refused with a fixed category. The actual replay suffix is inspected for an unmatched STEP_FINISHED and refused if present. Prefix step counts remain diagnostic but no longer impose the invalid completed/no-active prerequisite. Header cloning and same-request reissue remain unchanged; no event/ID/type/sequence/terminal is synthesized or dropped from the delivered suffix.
- snapshotSource retains only fixed stage, drain-complete boolean, inspected frame counts by fixed type category, numeric-ID validity/nondecreasing-order booleans, prefix active/unmatched step counts, candidate presence, text-included and cursor-before-terminal booleans, replay frame/terminal/unmatched-finish counts. Counts cover frames inspected through the first terminal or earlier refusal; they do not claim uninspected frames were absent. No raw ID, body, tool/model text or error message is emitted.
- Event diagnostics now pass the returned stream error through the existing safe registrationErrorDiagnostic. The turn helper allowlists exact fixture literals for missing cursor, invalid ordering, source run failure, invalid replay-step order, unavailable nonterminal boundary and absent reopened body. Unknown errors remain unclassified; no raw string is output.

All original assertProjectedEvents, secret absence, exact output, persistence, control correlation, sink, model-input marker and final all-events-passed predicates remain unchanged. Operational errors still fail; returned-error outcomes remain failed and cannot become successful receipts. No retries, timing controls, padding, fake snapshots, product instrumentation, caps, defaults, dependencies or services were added. Main remains 490 lines.

## Frozen files

Boss root: /Users/gqadonis/.claude/worktrees/bauar-boss.

| Changed path | SHA-256 | Physical lines |
| --- | --- | ---: |
| scripts/gates/bauar-secret-projection-events.ts | 0d68158975be327c5e8bee7548d1033f3d0195153b2162fc483737caac797956 | 333 |
| scripts/gates/bauar-secret-projection-turn.ts | 4a9f7b311dfb1a3ffbcdc5805fe63934f7a1dbb3b1468a52896a0e935f14c0bf | 167 |

Read-only unchanged bindings: main 22ecb893c15895df7afbee2e1ebedb0c64e1ae8d8211b1bd9026d0e1e5619675; -mcp.ts 6fa8db9b808099cea6992b2399892727055c8a84f68ef20a33199e89ad3f0462; bauar-native-desktop-cases.ts 6937391c97960cce2181f631275e5b063e9ca62709ac5c0883ecfce06872e26f.

## Verification and limits

Only source/evidence reads, bounded file edits and source hashes were performed. No tests, compilers, builds, gates, formatters, private logs, raw provider bodies, service/default changes, KBD/team mutations or commits. Excluded D0 UAR files were neither opened nor hashed. No acceptance or runtime success is claimed for this correction. Root owns sequential compiler/binding then failed G2. Pending catalog/marker, driver reasoning and post-ack amendments remain unchanged. Guards trace to the observed snapshot failure and explicit real-cursor/replay-contract requirements, not hypothetical adjacent concerns.
