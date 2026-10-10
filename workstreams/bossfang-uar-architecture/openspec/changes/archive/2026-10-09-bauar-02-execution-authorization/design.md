# Design: execution-bound authorization

## Context

See proposal.md and [analysis](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/analysis.md). Existing exact host admission is cand-005; retain it. F6 is a hypothesis about legacy HTTP MCP sessions, not an observed disclosure. The Boss [approval controller](/Users/gqadonis/Projects/prometheus/the-boss/src/main/ai/runtime/uar/UarToolApprovalController.ts:139) currently makes approval_id optional in its root request. This is a concrete migration caller, not an assumed complete client inventory.

## Goals / Non-Goals

Bind root decisions to the existing prepared invocation. Test HTTP session ownership using real authentication. Do not replace host admission, upgrade rmcp, infer a remote tenant from a session ID, or turn a fixture pass into full product acceptance.

## Decisions

1. Preserve approval identity through UAR pending state, events, client lifecycle and response routing. Require exact approval ID on migrated root paths; derive invocation/payload identity from the immutable pending admission, not a caller's mutable tool name. Full-harness calls continue to require expected task revision. Reject missing/stale/foreign IDs without consuming a different pending decision. Cancellation closes pending authority.
2. Client-before-enforcement migration: inventory all callers of the root approval route and response event; fix owned clients to retain required identity, then enforce strictness. Remote/new harness never get run-only compatibility. Any local exception must have an operator-approved caller list and removal checkpoint before activation. If no exception is approved, use a coordinated strict cutover and report old clients incompatible.
3. Keep existing host claim-before-effect. The UI decision, UAR decision and host claim are separate authorities with the same prepared invocation; none substitutes for the other. Do not restore authorization by reconnecting a UI or retrying an effect.
4. F6 reproduction uses production /mcp/uar with JWT middleware enabled, pinned rmcp 3.1.2 and legacy session mode. Compose an in-process router fixture, loopback port 0 only if SSE requires it, private temporary data, no real provider/shared service. Mint valid A/B JWTs with distinct subject/tenant, ordinary roles, test issuer/audience/expiry using the existing wrapper fixture. The generic tests/common/test_server.rs disables JWT and cannot be copied unchanged.
5. Capture A's initialized session and event cursor; initialize B independently. Attempt B POST, GET, replay and DELETE with A's identifiers; retain positive A controls after each attempted mutation. Require explicit 403/non-disclosing404 and no A result/effect/deletion. Missing/expired credentials must be rejected earlier. If existing code denies the complete matrix, name its enforcing layer and close F6 without edits. If it fails, record failure before correcting all session operations at UAR's integration boundary, not a speculative SDK fork.

## Scope and sequencing

After 01: UAR src/uar/api/routes.rs, src/uar/runtime/{actor/messages.rs,thread/approvals.rs,tool_admission/}, and full_harness/handlers.rs only where shared identity propagation needs it. Conditional F6 scope: src/uar/mcp_server.rs and its integration middleware, plus the isolated production-router scenario. The Boss scope: src/main/ai/runtime/uar/{UarToolApprovalController.ts,UarAguiAdapter.ts,UarRuntimeConnection.ts,uarApprovalLifecycle.ts,UarApprovalLifecycleStore.ts} and directly used approval registry response types. Existing UarHostToolAdmission.ts/UarHostMcpBridge.ts are preservation/verification surfaces; edit only for an observed contract mismatch.

03 consumes this approval contract; 04 follows for secret projection and receiver integration. If any shared client file is needed by both, serialize 02 → 04. C05 provider/shared executor ownership and the original shipping gate remain intact.

### F6 closure receipt

The denial-layer receipt records route/method, authenticated test principal, session-owner label, expected and actual status, safe response/event capture, effect/session-state observations, successful owner controls, and source revision/module/function/line for the production owner comparison or equivalent tenant-bound namespace lookup that produced the denial. Correlate the code branch with the valid A/B request trace (non-secret instrumentation or existing diagnostics in the isolated fixture). Do not assume JWT middleware supplies ownership: it is sufficient only if it actually compares session ownership after validating B's token. If no such enforcing branch can be identified, static inference or generic protocol failure cannot close F6.

### Concrete caller inventory

The [Spec caller inventory](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/approval-client-inventory.md) identifies additional owned migration surfaces: The Boss UarAdministrationAdapter.ts generic approval operation forwarding; UAR tests/remote_mcp_run_grants.rs, tests/support/principal_host.rs and tests/support/sidecar_process.rs contain run-only positive approval helpers. Include these helpers in the identity migration. Preserve the intent of negative owner/retention scenarios rather than letting missing approval IDs mask their assertions. The inventory is static and does not establish installed/external-client compatibility.

## Risks / Trade-offs

- Caller inventory is incomplete → ROOT-APPROVAL-COMPATIBILITY blocks cutover and final Plan dispatchability until recorded.
- Valid B could be rejected for an unrelated malformed request → require valid protocol inputs and successful A/B controls.
- Cancellation cannot undo external effects → preserve unknown/actual outcome; no automatic retry.

## Migration Plan

Link repository-local deltas to this change, record caller compatibility and isolate source worktrees. Implement all selected production approval changes before their integrated gate. F6 diagnosis is a reproduction boundary on unchanged baseline, not partial-implementation certification; conditional remediation receives its final proof only after completion. Roll back strict remote availability by disabling admission, never by silently allowing run-only approvals.

## Verification

Run the spec's stale/absent/replayed/cross-owner decision matrix, changed payload/destination/lease scenarios, cancellation race and concurrent host claim with production routing and safe effect counter. Preserve the prior bridge fixture as historical evidence; run current acceptance only at the agreed completed-production boundary. Record F6 as reproduced-and-fixed or disproved-with-enforcement-evidence, never silently passed.

## Operator scope correction — 2026-10-08T23:39:17.118Z

The operator instructed: “Forget about this and move forward. There is no vulnerability.” F6/D0 session-owner investigation and conditional remediation are removed from this release phase’s acceptance scope. Tasks02/5 and02/6 are withdrawn/cancelled, not passed or evidence-backed disproved. Task02/7 now covers exact approval/claim/cancellation only. Do not inspect, execute or retry the excluded diagnostic. No assertion of a demonstrated vulnerability or a verified absence of one follows. Application/service credentials on the selected Bossfang→UAR path and configured resource credentials on outbound MCP connections remain the accepted architecture. Other identity, exact-decision/effect, formatting, package/platform and independent-review requirements remain in force. This supersedes earlier F6 dependency and blocker statements in historical plans/reports.
