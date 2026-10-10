# Task 9 approved post-ack control — UAR author handoff

Status: source implementation frozen; compilation and genuine-path acceptance **unrun by this author**. This is an implementation handoff, not an independent review or runtime certification. Parent owns the complete-delivery build and gate boundary. Position restored at canonical revision 252. The recorded native model route remains unchanged; exact served model identity is unverified.

## Authority and scope

Implements the approved post-ack amendment in `approved-three-amendments-dispatch.json` and `post-ack-cancellation-test-control-design.md`, coordinated with the native acceptance author. Only the six UAR files below were changed for this amendment. Root owns `src/llm/liter_driver.rs`; Boss gate authors retain their own files. No dependencies, pins, service settings, environment controls, production defaults, owner/auth interfaces, or normal cancellation priority changed.

The nondefault `bauar-native-admission-gate = []` feature does not join any existing feature profile. Its module emits a compile error without `server-full`. The separate acceptance artifact must preserve the actual expanded server-full feature binding and be recorded separately from the ordinary product artifact. Normal builds exclude the observer fields, checkpoint, body hook, finalizer, and module by `cfg`.

## Exact control protocol

The consumer exclusively owns a fresh canonical actual prepared workspace and creates `.bauar-post-ack-gate` there. The runtime neither creates this directory nor reads a path from an environment variable. There are four fixed protocol documents, each limited to 4096 bytes. Fixed output `.tmp` names are transient atomic-publication files, not extra protocol markers. Input objects reject unknown fields.

`arm.json`:

```json
{"version":1,"purpose":"bauar-native-post-ack","controlId":"<UUID>","correlationDigest":"<64 lowercase hex>","executionKind":"runtime_native","toolName":"search_tools","deadlineUnixMs":0}
```

The placeholder deadline must be a future Unix millisecond timestamp at most 120000 ms from checkpoint validation. `reached.json`, `release.json`, and `final.json` must be absent when the arm binds. The consumer writes the arm during the actual native preparation response, using actual prepared values and the actual preparation admission ID, before returning that response or approving it.

The correlation digest is lowercase SHA-256 of UTF-8 compact JSON serialization of this ordered string array, without a newline:

```text
["bauar-post-ack-gate/1", executingRunId, invocationId, modelToolCallId,
 runtimeEpoch, hostEpoch, "runtime_native", admissionId, authorityRevision]
```

The runtime takes the admission ID from the accepted receipt and all remaining bound values from the immutable prepared call. It also checks actual dispatch/preparation/receipt kinds and receipt invocation, runtime epoch, host epoch, and authority revision equality. The preexisting consuming claim remains the authority boundary; this control creates no admission or approval.

`reached.json`:

```json
{"version":1,"controlId":"<UUID>","correlationDigest":"<digest>","phase":"post_ack_pre_guard","bodyEntries":0}
```

`release.json`:

```json
{"version":1,"controlId":"<UUID>","correlationDigest":"<digest>"}
```

`final.json`:

```json
{"version":1,"controlId":"<UUID>","correlationDigest":"<digest>","phase":"final","checkpointOutcome":"dropped_while_held","bodyEntries":0,"runCancelled":true,"runFailed":false,"observerError":null}
```

Final outcomes are `dropped_while_held`, `released_then_guard_observed`, `released_then_guard_allowed`, or `failed`. Release alone only changes an internal state to `released`; it never records observation by the guard. Only the actual existing cancellation branch records `released_then_guard_observed`; only the actual allowed branch records `released_then_guard_allowed`. Internal incomplete states finalize as `failed` with a fixed error. A missing final is not evidence of zero body entries. Any non-null observer error, failed outcome, or `NATIVE_ADMISSION_GATE_FINALIZATION_FAILED` event invalidates acceptance, including if a timed-out write later appears.

## Data flow and anchors

All source paths below are relative to `/Users/gqadonis/.claude/worktrees/bauar-uar`.

- `Cargo.toml:299` declares the nondefault feature; `src/uar/runtime/native_skills/mod.rs:17` gates the new module. Its `search_tools_gate.rs:3` requires server-full.
- `src/llm/orchestrator.rs:283` owns an explicit observer `Arc`; `:788` initializes a fresh instance. Clones share the same per-orchestrator observation, not a global. The getter at `:1471` supplies manager finalization; `:1867` attaches the same observer to the real search tool.
- Existing consuming claim completes at `src/llm/orchestrator.rs:562` before `admit` returns at `:576`. `ensure_tool_dispatch` calls the checkpoint at `:586`, before the existing kind/cancel guard. Its checkpoint failure uses the existing invalidation cancellation and typed `ToolDispatchBlocked`; the existing finish path at `:632` therefore does not invent a body result or finish(false).
- Actual cancelled/allowed guard branches call the observer at `src/llm/orchestrator.rs:606` and `:613`. `search_tools_gate.rs:201` records the branch separately from release.
- `src/uar/runtime/native_skills/search_tools.rs:98` records entry at the first statement of the actual `execute` body. Existing argument handling, exposure search, and real result remain below it. `search_tools_gate.rs:216` increments the explicit body counter, including calibration, and refuses an entry outside the observed allowed dispatch after binding.
- `src/uar/runtime/manager.rs:6119` retains the existing biased run-cancellation select. It can drop the stream while the checkpoint is held. `search_tools_gate.rs:88` records this synchronously as `dropped_while_held`; it does not claim the cancellation guard ran.
- The manager captures the observer at `:6108`; after the stream match scope and ordinary cleanup, `:6684` finalizes before the preexisting terminal event publication. No mutex guard crosses an await. `search_tools_gate.rs:227` joins tracked in-flight control I/O, seals the body count, and publishes final evidence. `:260` runs bounded-size filesystem operations off the async executor and retains their join handles when cancellation drops the receiver. Filesystem waits are deadline-bounded; expiration is failure, not acceptance.
- `search_tools_gate.rs:291` binds only the canonical prepared workspace and fixed gate child; `:319` enforces regular nonsymlink bounded input documents; `:336` uses create-new temporary output and atomic rename. Existing pinned cap-std capability-relative APIs constrain path access. No raw arguments, receipt IDs, filesystem errors, tokens, provider content, or secret values are emitted in control evidence; correlation is a digest.

## Consumer and remaining acceptance

The negative case must observe actual durable host consumption and exact reached evidence, obtain `cancelled:true` from the existing owner-bound cancel HTTP path, then release and require the matching explicit final with bodyEntries zero. The manager may finalize before release if it drops the held future; that is an explicit valid cancellation outcome, not later-guard observation. The positive case uses the same instrumented artifact and a fresh workspace/control, releases without cancelling, requires `released_then_guard_allowed` and bodyEntries one, and separately verifies the actual correlated native search result. No fabricated success counter, substituted executor, fake frame, or host-claim proxy is introduced.

The gate-owned directory must remain exclusively owned by the finite scenario. The bounded file checks and capability-relative access do not claim a separately verified theorem about arbitrary concurrent adversarial filesystem replacement. Missing/invalid controls, I/O errors, deadline expiration, duplicate checkpoints/finalization, or panic/missing final must fail the gate. Root must compile and exercise both calibration and real cancellation before treating any of this as runtime evidence.

## Frozen source hashes

SHA-256 over the exact file bytes after this implementation; existing large files were changed surgically rather than partitioned outside scope. New module has 351 content lines (352 newline-split entries), below the 500-line limit.

| File | SHA-256 |
| --- | --- |
| Cargo.toml | `29d48665cac7ef20f3ff86f343e7ca8af8941defa7b5760601d4ffc5c4f21414` |
| src/uar/runtime/native_skills/mod.rs | `2013b79b08474f3ceba05a15c3f2a1b43a8f9b23c079e7d1663b68a7e3d525a6` |
| src/uar/runtime/native_skills/search_tools_gate.rs | `eac69a18c98d2c1eeba7a079eaa2ecd3e7e030a12e92ab1e67b5e0e63f7ce42d` |
| src/llm/orchestrator.rs | `47c657854ce43a096dfb942989e16b330ea30200a62f33d767451fb73c67072d` |
| src/uar/runtime/native_skills/search_tools.rs | `3978b2edc91c6b4820360130cc76fa7c071d2e5d303e43cbc220f6365dd075d7` |
| src/uar/runtime/manager.rs | `d1a36507cb6449b77f189abc0d44542befb1bb61c5370c5fbf072d5ea740e327` |

## Static limits and instructions

Applied prometheus-rust-workspace, rust-best-practices, and rust-async-patterns instructions. Expected rust-router was absent and disclosed; no installation occurred. Context7 returned no relevant cap-std documentation, so actual pinned local API definitions and the allowed existing capability-file precedent supplied syntax evidence. No build, compiler, formatter, test, gate, process/service mutation, or per-edit runtime check was performed. Source reads and final byte hashes are author evidence only. Parent retains the complete-delivery A-9/A-10 boundary.

The actual boundaries requiring checks are untrusted gate control files and the admitted native execution boundary (A-3), plus the explicitly approved finite cancellation scenario (A-2). No unrelated behavior or authority fallback was added. No excluded path was read, searched, or hashed for this amendment. The earlier session's accidental partial source exposure from the Task 7 broad scan remains a recorded limitation; this statement does not erase or recast that incident. No excluded diagnostic was retried or rerouted.

## Bounded compiler correction — B-sidecar-gate-01

Root reported actual compiler exit 101, E0277 at search_tools_gate.rs:158: the pinned SHA-256 digest Array does not implement LowerHex. Only digest encoding was corrected: iterate actual digest bytes and format each byte with two lowercase hex digits, collecting the String. The canonical JSON input, SHA-256 algorithm, wire digest, feature separation and every other behavior remain unchanged. The source hash table above now binds this correction; subsequent module anchors shift by one line. No dependencies, formatting pass, refactor or other product edits occurred. This author ran no compiler, test or gate; root owns the failed instrumented build rerun and acceptance.
