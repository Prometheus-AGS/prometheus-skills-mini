# Gate-only post-ack cancellation control: bounded design

Status: DESIGN ONLY, 2026-10-07, execute/task 9 revision 245. Read `post-ack-cancellation-scope-proposal.md`. The user approval requested by root is pending in this author context. No instrumentation, feature, source change, test, build, gate, dependency, service, or configuration change is authorized by this document. The only write is this design.

## Result and important constraint

A gate-only feature can hold the real admitted `search_tools` invocation after UAR accepts the exact consuming acknowledgment, and can directly count entry into the existing native body. It needs a dedicated artifact, explicit per-orchestrator observer, bounded gate-owned file protocol, and final observer snapshot after the real orchestrator stream has ended.

However, the real manager cancellation loop may drop the held dispatch future before the gate releases it. `src/uar/runtime/manager.rs:6117-6126` uses a biased select on cancellation versus `stream.next()`, and the cancellation branch breaks. **Do not alter, suppress, delay, or bypass this cancellation path just to force the final dispatch guard to execute.** The gate can establish cancellation in the actual accepted-ack/prebody interval and zero body entries, but must distinguish `dropped_while_held` from `released_then_guard_observed`. It cannot promise to execute `ensure_tool_dispatch`'s cancellation guard after the HTTP cancellation response while preserving the existing biased select.

If approval requires that specific guard branch to run, rather than cancellation anywhere in the demonstrated postack/prebody interval, that is an unresolved constraint. This design does not claim to satisfy it through a timing race or altered scheduler. Root must retain that limitation in approval and evidence.

## Observed anchors

- `tool_admission/lifecycle.rs:215-220` persists ClaimIntent; 223 awaits the real host consumption; 225 requires exact receipt equality; 242 marks NativeClaimed only after acceptance; 244 returns.
- `llm/orchestrator.rs:560-574` returns an admitted invocation only after claim succeeds. `ensure_tool_dispatch` begins at 577 and checks the current token at 590. The proposed hold is at function entry before this check, restricted to the exact target RuntimeNative invocation.
- Actual discovery is `native_skills/search_tools.rs`: ToolSource is BuiltIn at 66-68, while registration at `orchestrator.rs:1838-1839` places it in the native-skill registry. The real executor path is `orchestrator.rs:636-643` through `native_skill::execute_native`, then the trait's contextual dispatch. The actual search body begins at `search_tools.rs:83`, before query extraction and `exposure.search` at 88. Instrument this body, not a host acknowledgment or registry dispatch attempt.
- Cancellation can concurrently trigger the existing watcher at `lifecycle.rs:335-361`. A previously acknowledged native call remains consumed and records OutcomeUnknown via 298-330. Preserve that uncertainty.
- The ordinary real cancellation route and token behavior are already source-anchored in `task7-uar-fault-feasibility.md` and `uar-task9-stream404.md`; use the existing authenticated owner-bound POST `/api/uar/runs/{run_id}/cancel`. Do not add a control endpoint or send a different principal.

## Exact proposed UAR edit scope

All paths are beneath `/Users/gqadonis/.claude/worktrees/bauar-uar`. These are requested future scope, not already-approved edits.

| Path | Minimal purpose |
| --- | --- |
| `Cargo.toml` | Add one empty, nondefault feature `bauar-native-admission-gate`; add no dependency or pin. Require `server-full` when this feature is compiled, through a cfg compile error in the gate module. |
| `src/uar/runtime/native_skills/mod.rs` | One cfg-gated module declaration for the new cohesive observer/control module. |
| `src/uar/runtime/native_skills/search_tools_gate.rs` (new) | Typed bounded file protocol, per-run observer state, checkpoint future/drop outcome, native-entry count, and final snapshot. No executor implementation. Keep below 500 lines. |
| `src/llm/orchestrator.rs` | Cfg-only observer field initialized per orchestrator and shared by its clones; pass observer to registered SearchToolsTool; call checkpoint at exact guard entry; expose a cfg-only observer clone to the manager finalizer. Existing oversized file receives only these surgical integrations. |
| `src/uar/runtime/native_skills/search_tools.rs` | Cfg-only optional observer field/builder and one first-statement native-body counter call inside the existing `execute` implementation. Preserve the entire original query/search/result body. |
| `src/uar/runtime/manager.rs` | Cfg-only observer capture before the ordinary `chat_with_history` stream; finalize the observer after that stream scope has ended and existing cleanup has completed, before terminal publication around 6680. Existing oversized file receives only this integration. |

No change to `NativeExecutionContext`, public tool/admission protocol, lifecycle.rs, native_skill.rs, cancellation routes, auth, runtime admission policies, or MCP registry is needed. Existing constructor initialization for SearchToolsTool at 22-26 can initialize the cfg-only observer field without changing nongate construction.

The manager finalizer is necessary: an absent body-entry file is not reliable evidence of zero entries. The observer must emit an explicit completed count after the dispatch future can no longer enter the body. If this extra exact source path is not approved, the zero-entry oracle remains insufficient and the gate remains BLOCKED.

The Boss/Node scenario consumer remains root-owned. This author does not invent or authorize a new Boss source file; root must identify the existing scenario file in its separate scope record before implementation. Its exact required interface is described below.

## Artifact and cfg separation

- Gate module, observer fields, constructors/builders, method calls, and manager finalizer all use `#[cfg(feature = "bauar-native-admission-gate")]`. Do not use `cfg(test)` alone: a separately built genuine sidecar does not compile the library as a libtest crate.
- Production artifact retains its existing complete `server-full` feature selection and excludes the gate feature. The gate artifact uses the same full feature selection plus `bauar-native-admission-gate`; no feature downgrade, substitute binary source, new daemon, or new executor.
- Build/stage separately with distinct artifact names and record source revision/hash, features, emitted binary SHA-256, and selected path. Never overwrite or relabel the ordinary production artifact. Gate evidence must explicitly say instrumented full-feature sidecar.
- New feature must not be included in default/minimal/server-full/desktop-full feature closures or release packaging. Nongate code has no runtime switch, environment lookup, file polling, or observer state. The control protocol exists only in the separately identified gate artifact.
- Compilation, feature-isolation checks, and real gate execution remain root-owned after approval and complete authoring. No commands are run by this design task.

## Explicit state and proposed interfaces

New names below are proposed interfaces, not existing APIs.

`NativeAdmissionGateObserver` is an `Arc` owned by each orchestrator instance and its already-existing clones. It is passed explicitly into the chat-local SearchToolsTool. Its finite state contains one immutable bound correlation, checkpoint outcome, a native-body-entry count, and any observer failure category. No process-global singleton, task-local implicit state, environment mutation, business authority, or retry ledger is introduced. The in-memory observer has an inspectable gate-owned snapshot/journal counterpart.

Proposed methods:

```text
checkpoint(admitted, actual_execution_kind) -> bounded async Result
record_native_body_entry() -> Result
finalize(run_cancelled, run_failed) -> Result<finite snapshot>
```

`checkpoint` does nothing for an unarmed run. For an armed run it requires the exact prepared/receipt correlation from the manifest, RuntimeNative kind, and provider tool `search_tools`. It binds once only; another invocation or a second checkpoint is a gate failure, never a new authority grant. The observer is attached to the real registered SearchToolsTool before the first model step; it is armed with the exact actual invocation only at this checkpoint.

`record_native_body_entry` increments the shared count as the first statement of the actual native `execute` body, before its first existing operation. It observes the already-bound invocation and never consults model tool arguments to choose correlation. The scenario permits exactly one discovery invocation; extra body entries are counted and fail the scenario. It cannot fabricate a search result or skip the native body. Unbound/foreign use in the armed scenario becomes an explicit gate failure, not a zero count.

`finalize` seals the observer once after the manager's orchestrator-stream scope has ended. On the ordinary cancellation branch the pinned stream is dropped before this point; no native search body spawned an independent worker. Snapshot the actual count, not a default inferred from file absence. Any late counter use, duplicate finalization, protocol I/O error, timeout, panic, forced process termination, or missing final snapshot means failed/unknown gate evidence. Never turn it into zero. The manager still completes its existing cancellation/cleanup behavior; the observer does not replace it.

## Gate-owned file protocol, no service or auth bypass

Use the existing host-resolved `working_directory`/prepared workspace for this dedicated fresh scenario. Node creates a canonical, nonsymlink, gate-owned `.bauar-post-ack-gate` directory beneath that workspace. This avoids adding an env passthrough to the actual sidecar launcher. Nothing reads this directory in the ordinary artifact.

Only four fixed bounded JSON documents are needed: `arm.json`, `reached.json`, `release.json`, and `final.json`. Require version 1, exact allowed keys/types, exclusive fresh ownership marker, a random gate control ID, and a fixed correlation digest computed from the actual run ID, invocation ID, model call ID, runtime epoch, host epoch, execution kind, and admission ID. Both Node and UAR compute/compare this digest from their existing exact admission data. Do not include raw receipts, credentials, arguments, user content, owner identifiers, or token values. The digest is correlation only, never an authorization input.

Node writes `arm.json` during the genuine host preparation/approval interval, after it learns the invocation and before releasing the real approval. It includes a bounded deadline and target discovery kind/name. No host receipt is fabricated or altered. Atomic temporary-write/rename and fixed maximum document size keep partial writes from being interpreted as control. Only the gate-owned directory is touched; no symlinks, arbitrary paths from manifest fields, shared roots, or resource exhaustion.

At checkpoint, UAR writes `reached.json` only after successful real claim returned. It reports the correlation digest, `phase:"post_ack_pre_guard"`, and initial body-entry count. Publication must succeed before waiting. This is the evidence missing from a held-host-response case. Node first requires the ordinary host's consumed receipt exactly once, then requires this matching UAR checkpoint.

The checkpoint awaits only `release.json` with matching version/control/correlation, or its bounded deadline. A small bounded asynchronous filesystem poll is a control-channel wait, not an admission/tool retry. It must hold no admission lifecycle mutex and must not block the runtime's cancellation/HTTP worker. No new server, socket listener, long-lived daemon, or endpoint is introduced.

Malformed/mismatched control or deadline expiry is a gate failure. It must fail closed through the existing cancellation path and typed pre-dispatch blocked disposition, never call `finish(false)` as though a native body executed. No raw I/O/JSON errors are exposed. The gate's own failure is reported separately from genuine lifecycle evidence.

## Sequence and cancellation-drop semantics

1. Launch the separately identified gate artifact through the genuine Boss launcher in a fresh isolated profile/workspace. Arm one exact discovery call through its actual host preparation. Approve it through the existing real approval flow.
2. Require actual host consumption once and matching UAR `reached.json`. A held host response or host ledger alone cannot satisfy checkpoint arrival.
3. While the UAR checkpoint is held, Node calls the real authenticated cancel route for that exact run. Require HTTP success with `cancelled:true`. Record only finite status/correlation booleans.
4. **Only after that response** Node atomically writes the correlated `release.json`. A release file is not proof of cancellation by itself; the real HTTP response and UAR lifecycle evidence remain required.
5. Preserve the existing cancellation select. Two outcomes must be distinguishable: the checkpoint was dropped by manager cancellation while held; or release was observed and the existing guard subsequently saw cancellation. Never claim the second from the first. A checkpoint guard's Drop may update only the in-memory outcome; the manager finalizer writes the reliable final snapshot later.
6. Require an explicit `final.json` for the same correlation with completed observer state, `bodyEntries:0`, no observer error, genuine cancellation, and the exact checkpoint outcome. Also require the ordinary terminal/cancellation evidence, one consumed native claim, no claimed-success finish, retained OutcomeUnknown where consumption cannot be rolled back, no second model dispatch/replay, and full process cleanup.
7. Missing finalization, timeout, cancellation API false/error, unexpected body entry, instrumentation I/O failure, or process kill is a failed/unrun case, never passing evidence.

A separate tightly bounded positive calibration on the **same gate artifact** must release an otherwise valid single discovery invocation without cancelling and observe an explicit final body count of one plus the actual correlated discovery result. This demonstrates that the body hook is connected. It is a test-control calibration, not a repeat of all already-passing acceptance profiles. Root must include this bounded calibration in the approved scenario scope before running it.

## What this proves and does not prove

The proposed successful negative case proves that an exact accepted native claim reached a checkpoint inside the genuine UAR dispatch path, the real cancellation API acknowledged cancellation while dispatch was held, and the actual built-in discovery body was never entered. It preserves the existing executor and authority checks. It does not prove that every native tool body has a counter or that the final cancellation guard ran if the existing manager select dropped the stream first.

This explicitly measures SearchToolsTool's real body despite its BuiltIn descriptor using the NativeSkill registry executor. It is not a host-claim proxy, replacement native implementation, or generated tool result. Other NativeSkill and registry BuiltIn implementations remain outside this one counter's coverage unless separately named and approved; do not silently generalize the result.

## Cleanup and exclusions

The gate owns the fresh workspace/profile and these fixed files only. Always issue real cancellation on failure if the run remains live, then await existing orderly sidecar/application shutdown; release a held control in finally only as cleanup, never count such a release as successful protocol ordering. Retain a finite sanitized summary and clean only verified gate-owned scratch. No detached watcher/process may survive. If orderly shutdown cannot be confirmed, report cleanup failure without a passing final snapshot.

The excluded `src/uar/mcp_server.rs` and `tests/bauar_session_owner.rs` remain excluded. No D0 test/diagnostic is needed or proposed. No excluded file was opened/hashed for this design. The historical task 7 partial-exposure incident remains disclosed in its existing artifact.

## Source hashes at design time

| Path | SHA-256 |
| --- | --- |
| Cargo.toml | eac8203e6273e382e8eb6128560e7d63f45ffee8bda51596eae563f2a83be95a |
| src/llm/orchestrator.rs | c0e6186b949ad587f4c17f55bde95f8c85e4f0d17abbacee62c8fa526921d8a7 |
| src/uar/runtime/manager.rs | a786f4830611f92b0c718c474ae392efda8eb89ccf1fb4ca59e0947a1db40d17 |
| src/uar/runtime/native_skills/mod.rs | 2ee3a1fccfab1946988fde4d7d3092fc25f9beb5b602f31b359d9ba34d70509d |
| src/uar/runtime/native_skills/search_tools.rs | 29753bf07b131960667e9fe1d3ae2610bd6fcb9f97fd7f57a7e5769b814f5b97 |
| src/uar/runtime/tool_admission/lifecycle.rs (read-only) | 89cd799a49f4fae80a8acf8fc82d5eab62aa327c364ab4fd1c9718c7faeff33f |

No implementation or runtime verification has occurred. Pending decisions are user approval, root's exact scope record (including manager finalization and the existing Node consumer file), and acceptance of truthful dropped-checkpoint evidence rather than a claim that the later guard necessarily executed.
