# Task 7: UAR fault-control feasibility

Implementation feasibility investigation, 2026-10-07, canonical task 7 revision 237. Initially read-only; root subsequently recorded the exact gate-only fixture path/command scope before creation. Same recorded backend author/model assignment as tasks 1/3/4; this is not independent verification or runtime acceptance. Root owns gate execution.

## Result

| Control | Current result |
| --- | --- |
| FC-UAR-PERSISTENCE: local claim-intent save | Source-grounded offline schema-assertion fixture authored; uncompiled, runtime behavior UNRUN. |
| FC-UAR-PERSISTENCE: local terminal save | Same proposal with a distinct rejected state and fresh profile; UNRUN. |
| FC-POSTACK-CANCEL: accepted acknowledgment before actual body | BLOCKED under current unchanged-production/control scope. Existing real cancel API is usable, but no deterministic externally controllable postack/prebody interval was found in the inspected allowed paths. |

No product code, dependencies, configuration, database, OS fault, service, or build output was changed. Writes are limited to this evidence document and the newly authorized `tests/bauar_native_admission_storage_fixture.rs`. No compiler, build, formatter, executable scenario, or acceptance gate ran.

## Grounded persistence proposal

The genuine Boss launcher chooses the embedded endpoint from its application's feature data directory, `runtime.db`, in `src/main/ai/runtime/uar/UarSidecarService.ts:290-324`. It starts the actual binary at 341-348. Its storage change path at 172-193 stops/restarts the process, so settings changes do not provide a per-write fault. The gate must obtain the actual fresh profile data path through the real application setup; a guessed home override is insufficient.

In UAR, `src/uar/persistence/providers/surreal.rs:75` connects the actual embedded SDK. Namespace/database selection is at 115-118 (default `uar`/`uar`). Migration application at 144-148 calls `check()`. The entire admission migration is `migrations/surrealdb/tool_admission_evidence.surql:1-5`: a SCHEMALESS table and two indexes, all using IF NOT EXISTS.

The actual write at `surreal.rs:1505-1548` uses CREATE with top-level `state` equal to the Rust Debug spelling. On database statement failure it queries durable records; only an already existing, exactly equal invocation/state record makes the operation idempotently succeed. A fresh profile/invocation prevents that reconciliation from concealing the intended rejected write. Reads remain available at 1551-1567.

Proposed bounded control: while the genuine sidecar is stopped, open only a fresh gate-owned embedded store using the pinned Rust SDK and install a field assertion on this existing table. Close the helper process before the genuine sidecar opens the database. Two separate profiles prevent cross-case history:

1. Claim-intent profile: require `state != 'ClaimIntent'`.
2. Terminal profile: require `state != 'Succeeded' AND state != 'Failed'`.

Candidate schema shape, pending pinned-engine execution:

```surql
DEFINE TABLE IF NOT EXISTS tool_admission_evidence SCHEMALESS;
DEFINE FIELD state ON TABLE tool_admission_evidence TYPE string
  ASSERT $value != 'ClaimIntent';
```

For the terminal profile replace the ASSERT expression with `$value != 'Succeeded' AND $value != 'Failed'`. These are database-enforced failures of the production provider's actual local save, not simulated host callback failures. They reject only the named evidence state; other evidence states and unrelated tables remain writable. No live file modification, disk filling, volume attachment, server, or replacement executor is needed.

This proposal has a local source precedent for process isolation: `tests/bauar_skill_selection.rs:33-41` opens a private SurrealKV store with the same SDK; 64-69 opens the actual provider; 226-239 runs seed/API/inspect in separate processes. That existing test was read only and was not run or changed. It is a precedent for a small gate utility, not acceptance evidence for these fault cases.

Root authorized one new gate-only file, `tests/bauar_native_admission_storage_fixture.rs`, before creation. The 141-line source uses existing pinned dependencies and one libtest entry, `storage_fixture`. It implements no runtime, admission port, native tool body, or standalone acceptance test. It receives the gate-owned canonical absolute feature directory, requires the exact ownership marker, seeds only an absent `runtime.db`, and inspects only an existing nonsymlink database directory. All fallible setup/query paths report fixed categories, never raw errors, rows, IDs, paths, or credentials. Output contains only normalized schema-assertion identity and fixed state counts.

The Node G2 author confirmed it can resolve `feature.agents.uar.data` through the genuine application in a fresh profile without starting a UAR session, close Electron, seed, then launch the genuine sidecar. Actual scope is `uar`/`uar`: `src/config.rs:922-929` defaults both optional settings to None, and the provider resolves both to `uar` at 115-118. The fixture requires these exact values.

### Authored utility contract (unrun)

Root will build the new target in the existing serialized caller gate and stage its emitted executable at `child-development-payload/bauar-native-admission-storage-fixture`. Node receives that path through `THE_BOSS_UAR_STORAGE_FIXTURE_PATH`.

- Arguments: `--exact storage_fixture --nocapture`.
- `BAUAR_STORAGE_FIXTURE_MODE`: `seed-claim-intent`, `seed-terminal`, or `inspect`.
- `BAUAR_STORAGE_FIXTURE_ROOT`: realpath of the owned feature directory; database is its fixed `runtime.db` child.
- `BAUAR_STORAGE_FIXTURE_NS=uar`; `BAUAR_STORAGE_FIXTURE_DB=uar`.
- Node-created marker: `.bauar-native-storage-fixture.json`, exactly `{"version":1,"purpose":"bauar-native-admission-storage-fixture"}`.
- Success line prefix: `BAUAR_STORAGE_FIXTURE_JSON=`; JSON fields `version:1`, `ok:true`, `mode`, `assertion` (`claim-intent` or `terminal`), `stateCounts`, `totalRows`.
- `stateCounts` has only `AwaitingApproval`, `ClaimIntent`, `Succeeded`, `Failed`, `Denied`, `Cancelled`, `Invalidated`, `Interrupted`, `OutcomeUnknown`, and `Other`.
- Failure summary: the same prefix with `version:1`, `ok:false`, and a fixed `code`, followed by a fixed panic/nonzero libtest outcome. No raw engine errors are emitted by authored code.
- Seed outputs require zero existing rows. INFO FOR TABLE must expose the expected state assertion. The caller must await successful utility process exit before genuine sidecar startup and confirm sidecar shutdown before `inspect`; the marker alone is not evidence that the process is stopped.

The helper inspects actual schema metadata and row counts; its success alone is not acceptance. The genuine sidecar must produce the required runtime effects/failures below. Schema survival and pinned engine semantics remain unrun.

Required future gate observations:

- Capture a fresh profile identity and actual endpoint; prove the helper exited before the genuine sidecar opened the same store.
- Capture the installed field assertion and actual sidecar startup success. Confirm startup migrations did not remove it. If startup fails, the case remains setup-failed/UNRUN, not a persistence acceptance pass.
- Claim-intent case: genuine prompt/approval path; rejected local ClaimIntent save; zero native body effects; no successful consuming native acknowledgment; no false successful terminal result. Claim save precedes consuming host call at `lifecycle.rs:215-223`.
- Terminal case: genuine accepted consuming acknowledgment and actual native effect exactly once; local terminal save rejection; explicit terminal-persistence failure/uncertainty; no replay; no durable Succeeded/Failed record for that invocation. The local save at `lifecycle.rs:264-273` precedes the runtime's host finish callback, so making the host callback fail would not prove this case.
- Capture durable rows after safe stop and correlate by the immutable invocation identity. Preserve the expected ClaimIntent and uncertainty history; do not manufacture terminal rows.

Current Context7 official docs were consulted for field assertions and table definition behavior. [SCHEMALESS fields with ASSERT](https://github.com/surrealdb/docs.surrealdb.com/blob/main/src/content/reference/query-language/statements/define/table.mdx) show invalid CREATE rejection. The same source describes IF NOT EXISTS as defining only an absent table, but its prose also says an existing table produces an error. Consequently neither schema survival across actual UAR startup nor the exact pinned 3.3.0 execution outcome is claimed proven here. Local production migrations already use this clause; the actual gate must settle the outcome. An offline CLI endpoint was not established by documentation, so no CLI command is proposed.

## Postack cancellation boundary

The real owner-bound cancel route exists at `src/uar/api/routes.rs:1034-1053`. It calls the manager context-bound cancellation path. `src/uar/runtime/manager.rs:1739-1751` cancels the stored token; 1763-1771 applies the context check. The same run cancellation token reaches ToolAdmissionRuntime at 3706-3711.

The actual accepted acknowledgment boundary is `src/uar/runtime/tool_admission/lifecycle.rs:223-242`: await the consuming host receipt, enforce exact equality, then mark NativeClaimed. There is no durable local ack record, external event, or gate-owned async pause at that point. ClaimIntent evidence is earlier and cannot be an accepted-ack oracle.

`src/llm/orchestrator.rs:560-574` returns the admitted invocation only after claim succeeds. Its actual branch guard at 577-606 checks the current cancellation token and kind. NativeSkill invokes it immediately before `execute_native` at 636-643; BuiltIn invokes it immediately before `call_native_with_context` at 1098-1103. There is no controlled external await between successful guard and body in these branches. An incidental registry lock/scheduling delay is not a deterministic gate control.

Holding the Boss acknowledgment response, observing the Boss consumed ledger, or cancelling before releasing that response establishes a pre-UAR-accepted-ack condition. It does not establish FC-POSTACK-CANCEL. Polling admission evidence also cannot identify this interval; the existing evidence API has only the earlier ClaimIntent at this point. Repeated timing races cannot become deterministic evidence.

The smallest instrumentation that would establish the exact interval is an invocation-correlated marker plus an asynchronous gate barrier immediately after the accepted exact native receipt at lifecycle.rs:242, before returning to body dispatch; while it is held, the root would call the real owner-bound cancel route and then release the barrier. The gate would require canceled/unknown lifecycle evidence plus a real native zero-effect oracle. Such instrumentation is not present and would alter production/control scope; a production debug switch, replacement executor, or new sidecar is explicitly disallowed. This document does not authorize or implement that proposal. Under the current scope the case is precisely BLOCKED and unrun.

## Source snapshot

Paths below are relative to `/Users/gqadonis/.claude/worktrees/bauar-uar`, except Boss which is relative to `/Users/gqadonis/.claude/worktrees/bauar-boss`.

| Path | SHA-256 |
| --- | --- |
| src/uar/persistence/providers/surreal.rs | fabdb3b6b1fbc09d1cb07dbe03b02b2bcdd47d6c9e4b4a54b837251286f8a32a |
| migrations/surrealdb/tool_admission_evidence.surql | b37c8450a70e8fe24f8ec5ebecca3285e79bd865d1ed547f28913dc725111a41 |
| tests/bauar_skill_selection.rs | 7259b7f716f68bf90abc3bf9530fe8ca0a6e40796d7db60ce2bda5933f3a212a |
| src/uar/runtime/tool_admission/lifecycle.rs | 89cd799a49f4fae80a8acf8fc82d5eab62aa327c364ab4fd1c9718c7faeff33f |
| src/uar/runtime/tool_admission/mod.rs | ed74ec7865fe92352726d4874e647da85f09f928d2c545c37e5d761eb187d1d9 |
| src/llm/orchestrator.rs | c0e6186b949ad587f4c17f55bde95f8c85e4f0d17abbacee62c8fa526921d8a7 |
| src/uar/api/routes.rs | 239904c15f76e335e656a653a8ba0274f4cf9b9aa6ddb705ee3c163b318d0df4 |
| src/uar/runtime/manager.rs | a786f4830611f92b0c718c474ae392efda8eb89ccf1fb4ca59e0947a1db40d17 |
| Boss src/main/ai/runtime/uar/UarSidecarService.ts | 847283ac6633807249f5f42b03312a0209c969f0016ceb592157e37828d5aa0e |
| tests/bauar_native_admission_storage_fixture.rs (new, 141 lines) | 6261b88e9ece9e73aac91b55bf866e5d5936e03c8e5cb0826d0224df3fb4c141 |

## Inspection limit and exclusion incident

This investigation included an accidental partial source exposure: a broad multi-root rg content scan returned one source line from the excluded `tests/bauar_session_owner.rs` despite its root-qualified exclusion argument. The scan was stopped, the parent was informed, and the excluded file was not subsequently opened, hashed, inspected, or used for this proposal. No diagnostic retry or alternate route was attempted. The excluded content is not reproduced here. Subsequent reads/hashes used explicit allowed files only. The other excluded file, `src/uar/mcp_server.rs`, was not opened or hashed during this investigation.

This is not a claim of no excluded access. Both paths remain excluded from the source manifest and future commands. The final verification limitation must retain this incident. The findings above rely only on the explicit allowed anchors and hashes listed here.
