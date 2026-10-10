# Independent adjudication of six review claims

Date: 2026-10-08. Scope: approved desktop child task 10, change `bauar-05-native-discovery-admission`, existing `findings.json` in this directory. This is bounded source adjudication, not a replacement formal review, acceptance run, or certification. The selected assignment was boss-verifier / gpt-6-astra / high; exact served identity is unknown and no verified cross-model claim is made.

Disposition: **0 upheld, 5 contradicted, 1 unresolved**. All four CRITICAL claims are contradicted. The unresolved WARNING is limited below; this document neither changes the original BLOCK verdict nor closes the formal review gate.

Evidence roots (line numbers refer to the inspected working files):

- **UAR:** `/Users/gqadonis/.claude/worktrees/bauar-uar`
- **Boss:** `/Users/gqadonis/.claude/worktrees/bauar-boss`
- **Spec:** `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/openspec/changes/bauar-05-native-discovery-admission`

## C1 — Confirmed preclaim cancellation allegedly remains ClaimedUnknown

**Contradicted.** In UAR `src/uar/runtime/tool_admission/lifecycle.rs:288`, `cancel()` holds the invocation mutex. A host-confirmed `Cancelled` outcome selects durable `Cancelled` or `Invalidated` evidence at lines 310–314. The temporary in-memory assignment at line 320 is followed by evidence persistence at lines 321–326 and an explicit assignment to `LiveState::Cancelled` at lines 327–328. The mutex remains held across these operations. A subsequent claim requires `AwaitingApproval` at lines 210–214, so neither the completed cancellation nor the temporary/failed-persistence unknown state permits claim reuse.

The finding overlooks the successful-persistence branch it itself mentions. If persistence fails, the function returns an error and retains uncertainty; that is distinct from its claim that normal confirmed preclaim cancellation remains unknown. Spec `design.md:39–42` differentiates confirmed cancellation from unconfirmed cancellation/consumption, and `specs/native-tool-admission/spec.md:58` requires prevention of dispatch. No runtime reproduction was attempted.

## C2 — Host cancellation error allegedly conflicts with retained uncertainty

**Contradicted as a specification defect.** The described return behavior exists: UAR `lifecycle.rs:298–308` preserves acknowledged native consumption as `AlreadyClaimed`; lines 315–326 persist `OutcomeUnknown`; lines 327–332 retain unknown state and propagate an unsuccessful host cancellation response. Recording local uncertainty does not confirm the remote cancellation. Reporting that cancellation is unconfirmed is truthful, not a rollback or retry.

Spec `design.md:41–42` explicitly requires durable uncertainty when cancellation cannot be confirmed and after cancellation following acknowledgment. `specs/native-tool-admission/spec.md:58–66` requires uncertainty and no replay; neither requires `Ok(AlreadyClaimed)` after a failed remote response. UAR `src/llm/orchestrator.rs:616–624` returns a dispatch-blocking error, and lines 632–635 preserve that disposition without a success/failed execution finish. Also, the finding's `claim()` cancellation-error example occurs after unsuccessful consumption (`lifecycle.rs:230–240`), before `NativeClaimed` is assigned at line 242; it is not the acknowledged-native branch.

## C3 — Nonconsuming /claim allegedly permits native execution

**Contradicted.** Boss `src/main/ai/runtime/uar/UarHostToolAdmission.ts:279–285` revalidates and responds without a state transition. Native consumption separately revalidates and requires `runtime_native` at lines 288–307 before transition to `claimed`. MCP consumption requires `host_mcp` at lines 113–127. Finish requires claimed state at lines 338–340.

UAR `lifecycle.rs:409–448` deliberately calls common revalidation before lifecycle claim; native lifecycle claim then requires consuming host acknowledgment and exact receipt equality at lines 215–242. `/claim` returning a receipt alone cannot satisfy this code path. Spec `design.md:27–29` explicitly keeps `/claim` nonconsuming and separates the two consuming operations. `specs/native-tool-admission/spec.md:21` prohibits revalidation from permitting execution, not revalidation of native records. The suggested host_mcp-only restriction would reject this approved native revalidation sequence.

## C4 — Native claim allegedly must be restricted to builtin search_tools

**Contradicted.** The review transfers a specific acceptance oracle into the generic production contract. Spec `design.md:19` assigns both `NativeSkill` and `BuiltIn` to `runtime_native`; line 35 explicitly covers both dispatch routes. The approved amendment `verification.md:130` says the post-ack body counter proves `search_tools` only, not every native implementation.

UAR `src/uar/runtime/tool_admission/mod.rs:42–47,194–213` derives execution kind and source identity from the resolved descriptor. Boss preparation clones the invocation (`UarHostToolAdmission.ts:214–218`). `src/main/ai/runtime/uar/uarHostClaimRevalidation.ts:35–42` requires deep equality of the entire prepared invocation and receipt, current policy/approval, and live facts. `claimNative` invokes those checks before its kind check and consuming transition (`UarHostToolAdmission.ts:288–307`). Changed source fields therefore fail equality. No requirement mandates a generic native allowlist containing only `builtin/search_tools/search_tools`; imposing that would exclude explicitly supported native sources.

## W1 — Tool outcome Error messages allegedly leak secrets

**Unresolved as the broader warning; contradicted for the cited new dispatch-refusal path.** UAR `src/llm/orchestrator.rs:138–143` defines `ToolDispatchBlocked` with a static string payload and directly displays it. Every constructor in the inspected dispatch guard uses fixed literals (`591–595,597–623`); the graph cancellation constructor at line 1230 is also fixed. Admission terminal persistence errors are replaced with the fixed message at lines 640–641. Thus the new refusal/terminal mapping does not itself supply a secret-bearing string to the emissions at lines 2639–2645 or 2882–2888.

However, it would be too strong to conclude that every outcome reaching those emissions is static: `finish_tool_execution` returns the original outcome at line 642 after successful admission finish. `execute_direct_tool` can propagate canonical-result preservation errors at lines 683–694. `preserve_canonical_tool_result` propagates projection/acquisition/store errors at lines 1022,1042,1044, including an `anyhow::Result` persistence boundary (`src/uar/persistence/mod.rs:396–399`). The separate refusal-result preservation error emission is at `orchestrator.rs:2723–2728`. Tool error payloads themselves pass through projection at lines 1053–1083 and 1022; that is distinct from an error raised by persistence.

This establishes an unnormalized error route, **not a demonstrated secret-bearing error or a newly introduced leakage regression**. The review supplies no concrete sensitive value, failing receipt, or reproducible failure from that route. No fault injection, raw log inspection, or test was authorized here. The blanket recommendation is therefore not upheld as a reproduced defect, and the broader warning remains unresolved rather than dismissed using an incorrect “all errors are static” assertion. Spec `verification.md:89–95` and `specs/native-tool-admission/spec.md:102–106` remain the leakage requirements.

## W2 — Canonical workspace restriction allegedly rejects valid acceptance workspaces

**Contradicted as an acceptance defect; the narrower input restriction is real.** UAR `src/uar/runtime/native_skills/search_tools_gate.rs:291–296` rejects a workspace whose supplied path differs from its canonical path. This is a gate-only control: `src/uar/runtime/native_skills/mod.rs:17–18` and `src/llm/orchestrator.rs:585–586` compile/use it only with `bauar-native-admission-gate`. UAR `Cargo.toml:205,209,299` keeps that feature outside the default and server-full lists.

The actual Boss post-ack fixture canonicalizes its workspace before use (`scripts/gates/bauar-post-ack-cases.ts:174`), verifies the control directory (`215–217`), and passes that workspace to the control installer (`220`). The installer also requires exact workspace/source binding and canonical paths (`scripts/gates/bauar-native-admission-controls.ts:81–88`). Thus the reviewed predicate matches the supplied acceptance inputs; no rejected supported input was identified. The spec amendment `verification.md:130–131` explicitly scopes the mechanism to the separately built nondefault acceptance artifact. It does not require accepting alternate spellings of workspace paths. This conclusion does not depend on the review's unverified assertion about Rust path equality for dots or redundant separators.

## Verification and limits

Read-only source and approved-document inspection only; no product edits, tests, builds, services, lifecycle changes, D0 retry, excluded-file access/search/hash, raw/private logs or snapshots, or process listings. The sole write is this adjudication. No security hardening was added. Existing findings remain intact. The formal review owner must decide gate disposition using this contrary evidence; broader parent, package, deployment and runtime claims are unaffected.
