# Design

## Context

See proposal.md for motivation and specs/native-tool-admission/spec.md for behavior. This is an additive child of the still-open bauar-02 and bauar-04 changes; their execution and resource authority requirements remain binding. Runtime12 prepared no target and executed no effect. The inspected native terminal mismatch and provider discovery gap are static findings, not a proven explanation of that particular run.

UAR owns the agent loop and local native executor. The Boss owns application configuration, approvals and host admission records. The mounted MCP bridge consumes authority immediately before its transport effect. The controlled provider supplies model proposals only. Bossfang remains the job orchestrator; no Bossfang implementation change is needed for this bounded child.

## Goals / Non-Goals

**Goals:** preserve one authoritative UAR loop, add a real pre-execution native claim, preserve claimed-only terminal handling, and make actual desktop discovery acceptance finite and reproducible.

**Non-Goals:** restart/resume support, external MCP or identity defaults, another credential custodian, dependency upgrades, additional resident services, released installers, parent delivery certification, or the excluded D0 diagnostic. Do not inspect tests/bauar_session_owner.rs or src/uar/mcp_server.rs. No product edits are authorized at Spec; Plan and Execute need separate handovers.

## Decisions

### 1. Strict v2 and source-bound execution kind

Use protocol version 2 with required JSON executionKind values runtime_native and host_mcp. This resolves the proposed amendment's spelling into a single owned wire contract. UAR derives kind from its resolved descriptor/executor: NativeSkill and BuiltIn executed by UAR are runtime_native; Mcp is host_mcp. Any sandboxed native execution retains its existing sandbox requirement and adapter capability; classification is not permission to bypass sandboxing or execute an unsupported source.

Bind kind into the original prepared invocation, authority digest construction and recomputation, receipt equality and persisted host record. Return it in preparation and receipts. The authenticated existing host channel is the producer boundary; do not introduce a new signing service or store. Reject v1, missing/unknown kind, kind substitution and mixed artifact versions before dispatch with existing fixed protocol errors. Do not infer a default from missing data.

Alternative: treating every non-MCP request as native or adding an optional kind preserves ambiguity and can turn caller input into executor authority. A strict cutover was explicitly authorized. Updating every owned protocol author is required; transitive consumers need inspection, not gratuitous edits.

### 2. Separate consuming native claim from MCP revalidation

Version the existing host admission paths to /uar/admission/v2. Add POST /uar/admission/v2/claim-native with the existing claim body shape {admissionId, invocation, receipt}; return the exact bound receipt including executionKind after durable consumption. /claim remains nonconsuming revalidation. /finish still requires claimed state. Actual MCP tools/call consumes only host_mcp authority before transport; claim-native consumes only runtime_native authority.

Reuse the existing owner/run/invocation, policy/source revision, exact approval, lease, budget and receipt checks. The host record owner serializes authorized-to-claimed transition and persists before publishing it to memory. A repeated claim cannot supply a new dispatch acknowledgment. Native search needs its own admission and approval under the current Ask policy; it does not borrow the later MCP grant. Native execution must not resolve an MCP resource credential.

Alternative: allowing finish from prepared/authorized would make a terminal report an approval bypass. Making /claim consuming for all tools would conflict with receiver-side MCP consumption and erase the pre-effect transport boundary.

### 3. Preserve durable uncertainty and cancellation

Order: resolve/prepare and exact approval; current envelope/host/Cedar/lease/budget/cancellation checks; durable UAR claim intent; host consuming native claim; positive acknowledgment; final cancellation observation; native execution; claimed-only terminal persistence. Dispatch-kind consistency applies to both NativeSkill and BuiltIn branches, including the existing built-in registry route through call_mcp_tool. That method name alone is not executor ownership.

| Boundary | Required disposition |
|---|---|
| Before durable UAR claim, cancellation or refusal | No dispatch; existing cancellation/invalidation |
| Host refuses consumption and cancellation is confirmed | No dispatch; cancelled/invalidated |
| Host consumed, response lost, or cancellation cannot be confirmed | Retain durable intent and outcome_unknown; no dispatch retry |
| Cancellation observed after acknowledgment before dispatch | Prevent dispatch; retain truthful consumed/unknown state |
| Execution completed, terminal write failed | Preserve TERMINAL_RESULT_PERSISTENCE_FAILED and unresolved effect; no replay |
| Teardown or restart with prior live authority | Existing interrupted/unknown reconciliation; no authority hydration |

Use the existing lifecycle critical section and persistence mechanisms, not a second ledger or an automatic retry loop. Private native claim acknowledges authorization to execute, not proof the effect occurred. Recovery remains explicitly unsupported/unknown as the user selected.

### 4. One finite controlled provider conversation

The existing controlled provider follows received advertised schemas and assistant tool-call IDs paired with tool_call_id results. Eager: request the actual advertised target, then finish only after its matching result. Deferred: request advertised discovery with one unique target query; require its correlated result and the target in a subsequent advertised catalog; request the target once; finish only after its matching result. Missing advertisement/history/correlation or unexpected branches produce fixed failure categories. Do not dump received model bodies or tool payloads.

Use actual selected-server catalog filtering before the existing eager cap (32), search-result cap (8) and query bound (512 Unicode characters). Keep normal tool visibility and approvals. For deferred acceptance register 32 short, unique eligible fillers that sort before the target, on that selected server; the target's unique query must match only the target. Fillers refuse dispatch before target-effect counters. Preserve the current target-only default for other fixture consumers.

Counters distinguish source and actual target identity: eager discovery 0, target prepare/approval/effect 1; deferred discovery prepare/approval 1 plus target prepare/approval/effect 1, total prepare/approval 2. All existing revision checks apply to every admission. Never weaken positive target counts to accept zero preparation or effects.

Alternative: Hidden visibility, auto-approval, increasing the cap, unconditional provider target requests, or replacing the UAR loop with fixture execution would certify different behavior.

### 5. Bounded ownership and file scope

Plan assigns separate writers; implementation reviewers remain dormant until the complete child delivery boundary. Potential production edits are limited to:

| Owner | Files / responsibility |
|---|---|
| UAR admission | src/uar/runtime/tool_admission/{mod,http,lifecycle,standalone}.rs: v2 wire/authority, port and consuming native claim |
| UAR dispatcher | src/llm/orchestrator.rs: surgical resolved-kind consistency and pre-native cancellation/claim ordering |
| Boss host | src/main/ai/runtime/uar/UarHostToolAdmission.ts, uarHostClaimRevalidation.ts, UarHostMcpBridge.ts: v2, record owner and receiver-side rejection |
| Boss wire partition | NEW feature-local wire/types/decoder module, exact path settled in Plan: existing host file is 493 lines; partition by responsibility before exceeding 500, preserving one record owner |
| Owned manual clients | UAR tests/tool_admission_integration.rs and tests/bauar_inline_revision.rs; Boss scripts/gates/uar-exact-tool-admission.ts and projection gate family; tests/e2e/gates/bauarHostAdmissionDiagnostic.ts: coordinated protocol migration |
| Projection acceptance | Existing controlled provider, selected-server preparation, MCP fixture handler and projection/revision counters; retain other fixture consumers |

Inspect UarRuntimeConnection, UarToolApprovalController, UarApprovalLifecycleStore and shared inspection types for propagation/persistence compatibility. They are not blanket edit authorization; add an edit in Plan only if a concrete contract propagation requires it. No schema migration makes old history executable. No Bossfang edits. Exact owned fixture filenames must be enumerated in Plan from the actual tree.

Source anchors (current worktrees, stable conceptual boundaries rather than future line promises): UAR tool_admission/mod.rs preparation 178–214; lifecycle.rs claim/terminal 392–453; orchestrator.rs 547–625; UAR persistence/tool_admission.rs 50. Boss UarHostToolAdmission.ts prepare 208–242, claim 289–292, finish 314–329, persistence 386–410; uarHostClaimRevalidation.ts 25–43; UarHostMcpBridge.ts authenticated host 131–172. Analyze's inventory and analysis.md contain the source ledger. These are inspected code findings, not executed proof.

### 6. Complete delivery, then source-bound acceptance

Finish all coordinated production behavior and owned callers before compiler, builds, executable scenario authoring or gates. Restore isolated locked prerequisites only in Execute. Isolated Boss node_modules is absent; another checkout's installation is reference-only. Preserve Node 24.14.1, declared MCP SDK 1.27.1, existing Electron ABI artifacts and dependency pins. Build new Boss main bundle and genuine UAR production-feature sidecar; old payload03/bundle09 cannot certify new source. Serialize writers per target directory.

verification.md declares the exact existing entry points and required behavior oracles. The actual Electron gate is the child completion evidence; host protocol HTTP/MCP scenarios supplement it. No mock-only, unit-only or compiler success substitutes for the complete real path. Retain all original projection negative branches; record unreachable/unrun branches explicitly. Evidence contains finite categories, booleans, counts and source/artifact hashes, never credentials or raw received messages.

## Risks / Trade-offs

- [Strict cutover rejects mixed versions] → rebuild and deliver matching owned pairs; fixed refusal with no legacy fallback.
- [Native consumption acknowledged but no effect occurred] → preserve consumed/unknown evidence; reconcile rather than replay.
- [Fixture succeeds while historical runtime12 cause remains unknown] → claim only new source-bound behavior; do not retrospectively label runtime12 diagnosed.
- [Unavailable isolated dependencies or native ABI payload] → retain a named prerequisite block; no foreign installation reuse or package bypass certification.
- [New code would exceed existing host file limit] → cohesive wire/decoder partition, no parallel ledger.
- [Child passes while other parent gates fail] → parent tasks, D0, formatting, packaging and remote deployed-receiver evidence remain open.

## Migration Plan

After separately approved Plan and Execute, update UAR/Boss protocol authors together; reject old live calls and preserve nonexecutable history. Build fresh development artifacts from recorded complete trees, run the child acceptance once, and rerun only a failed gate after its fix. Rollback uses matching prior source/artifact pairs; it does not revive consumed claims or silently reinterpret v1 history. There is no published deployment action authorized here.

## Open Questions

The exact runtime12 advertisement/proposal branch remains unknown. It can be investigated by finite new acceptance receipts without changing these requirements. Execute must measure locked-prerequisite availability and retain an explicit block if unavailable. Neither unknown permits relaxation of claims, approvals, sandboxing or acceptance counts.

## Selected candidate evidence at Plan

Decision: cand-001 **adapt** from [/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/library-candidates.json](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/library-candidates.json), inspected2026-10-07. Reuse the controlled provider and native discovery, correlating actual advertised proposal and result identities. This covers F1/F2; finite branch counters preserve F3 uncertainty. The pinned MCP SDK1.27.1 is reference-only for existing fixture catalog/name dispatch (F4); no dependency or runtime/tool runner is adopted. Application-specific durable native host consumption is build-required F5. Current split-package examples are not instructions to upgrade the pinned SDK. Planned build work is exactly the ten pending tasks; scoped assignments live in [/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/plan.md](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/plan.md#task-model-assignments).
