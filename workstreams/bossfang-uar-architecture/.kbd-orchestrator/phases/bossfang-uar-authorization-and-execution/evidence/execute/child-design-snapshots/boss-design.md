# Design: Exact UAR approval client identity

## Context

See proposal.md. Source checkpoint e2ae2ce21245030293c0bea96ed02ae853b820a7 has a single observed Boss root-approval POST in src/main/ai/runtime/uar/UarToolApprovalController.ts:131. UarAguiAdapter.ts:246 forwards uar.tool.approval_required events to it. The controller requires admissionId but permits absent approvalId, creates a UI identity from approvalId or toolCallId, records the host decision, and conditionally includes approval_id in the HTTP body.

The runtime-neutral AgentRuntimeToolApprovalRequest (src/main/ai/runtime/types.ts:101), ApprovalDecision and AiToolApprovalRespondRequest (src/shared/ai/transport/stream.ts:232), and IPC ai.tool.respond_approval schema already require an approvalId. Those fields are the opaque UI registry key; the controller closure must retain the raw UAR identity separately. No response-type expansion is required on that path.

rawPendingApproval requires approvalId, but projectRuntimePending drops it. UarApprovalLifecycleInspection has no approvalId member. Its invocationId currently substitutes admissionId; the provider pending snapshot has no invocation_id field. This child retains a separate raw approvalId and does not rename a surrogate to an authoritative invocation. Actual invocation binding is supplied by UAR's immutable pending state and the host prepared admission.

UarAdministrationAdapter.ts:163,170 contains capability metadata, projected by readUarAdministrationSnapshot. It does not implement generic request forwarding. UarOperationalAdministrationAdapter.ts:299 reads pending approvals; the settings UI displays them. No administrative root-approval sender was found in the scoped source search. The parent inventory's generic-forwarding assertion is corrected here.

## Goals / Non-Goals

Goals: carry exact approval identity across the existing controller flow and lifecycle inspection; provide actionable incompatibility for legacy events; preserve existing one-claim behavior.

Non-goals: adding an approval UI or admin sender, changing neutral approval types, inventing full-harness task revision fields in the root client, adding remote receiver/custody integration, repairing unrelated admission behavior, or changing configured application services. Secret projection is the serially later bauar-04 child.

## Decisions

1. Validate a nonempty raw approvalId before ensureToolInput, host decision recording or UI registration. Use that required string for both namespaced UI key and the approval_id HTTP member. A generic optional-ID shim would violate the approved strict cutover, so none is retained. An unsupported event emits a clear incompatibility error through the existing error channel and cannot authorize a pending effect.
2. Retain approvalId as its own optional member of UarApprovalLifecycleInspection, populated by runtime-pending projection. Host-only lifecycle records legitimately lack a runtime approval ID; do not fabricate one from admissionId. Existing consumers are display-only and need no UI changes. Existing persistence stores host snapshots, not pending UAR decisions, and remains unchanged.
3. Keep cancellation and edited-input rejection intact. A decision after cancellation cannot restore host authority; an edited input is rejected under the original identity and must not authorize changed arguments. Reconnect reuses the same event identity; no current-pending lookup replaces it.
4. Preserve claim-before-effect unchanged unless the completed-boundary scenario exposes a concrete delta. UarHostMcpBridge.ts:146 calls claimToolCall before transport dispatch at 158; UarHostToolAdmission.ts:139-145 synchronously records claimed state first. Teardown maps claimed to outcome-unknown. A transport-loss result never authorizes an automatic retry.
5. User selected coordinated strict cutover with owned callers migrated together. Older external callers remain explicitly incompatible after cutover; no local exception is approved. Installed The Boss.app reports 2.2.12 while this source package reports 2.2.4; metadata does not establish the installed payload's approval shape. Joint provider/client checkpoint and payload acceptance must therefore name exact source and binary identity.

## Exact file claims and parent mapping

All paths below are relative to /Users/gqadonis/.claude/worktrees/bauar-boss. Owner is boss-runtime with boss-security contract; driver accepts these claims before production. Shared-file ownership is serial, never concurrent.

| Parent backend task | Child task | Proposed write paths | Disposition |
|---|---|---|---|
| bauar-02-execution-authorization/1 | 1.1 | This child documentation and parent evidence/execute/boss-prerequisites.md | Caller inventory, strict cutover, accepted SHA, installed/external unknowns |
| bauar-02-execution-authorization/3 | 2.1 | src/main/ai/runtime/uar/UarToolApprovalController.ts | Required event identity, no optional HTTP fallback |
| bauar-02-execution-authorization/3 | 2.2 | src/main/ai/runtime/uar/uarApprovalLifecycle.ts; src/shared/types/prometheusIntegration.ts | Retain approvalId on pending projection and shared inspection type |
| bauar-02-execution-authorization/3 and /4 | 2.3 | scripts/gates/bauar-approval-client.ts (new); scripts/gates/uar-exact-tool-admission.ts (only concurrent/lost-response scenario additions) | Real-boundary scenario authoring, no execution during production |
| bauar-02-execution-authorization/7 | 3.1 | No product mutation; driver-owned evidence destination | Combined completed-boundary acceptance, deferred V1 |
| bauar-02-execution-authorization/8 | 3.2 | No manifests/configuration mutation; driver-owned evidence destination | Required checks and exact package validation, deferred V2 |

Read-only references: UarAguiAdapter.ts, UarRuntimeConnection.ts, UarAdministrationAdapter.ts, UarOperationalAdministrationAdapter.ts, UarApprovalLifecycleStore.ts and UarHostToolAdmission.ts/UarHostMcpBridge.ts under src/main/ai/runtime/uar; src/main/ai/runtime/types.ts; src/shared/ai/transport/stream.ts; src/shared/ipc/schemas/ai.ts; src/main/ipc/handlers/ai.ts; src/main/ai/AiService.ts; src/main/ai/agentSession/AgentSessionRuntimeService.ts; src/main/ai/toolApproval/ToolApprovalRegistry.ts; renderer approval consumers; package.json and scripts/validate-release-package.cjs. An observed need outside these write claims requires a driver-approved binding extension.

The nested OpenSpec root resolves its allowedEditRoots to workstreams/bauar. Driver must register an explicit product-root implementation scope before kbd-apply; these documents alone do not authorize escaping that edit root. Child UUID is 1778473f-37c3-4dff-af17-e967c84499e2. Numeric child backend IDs are assigned by driver registration; displayed 1.1–3.2 are not asserted as those backend IDs.

## Migration Plan

Accept provider event/root response checkpoint and owned client migration together. Complete all selected production and scenario authoring before V1. Use the actual application controller, IPC/registry, UAR router and host bridge with synthetic credentials and a safe counted effect. No mock-only/controller-only result closes acceptance. Integration authoring must use the existing isolated application gate conventions and current payload; do not add a second execution path just for tests.

At V1 exercise missing/empty event identity, exact approve/deny, no-user rejection, stale/foreign/replayed decisions, cancellation, reconnect, edited input, concurrent claims and lost effect response. UAR owns the negative root-route enforcement cases; link its joint receipt instead of duplicating a broad run. At V2 run the repository-required lint and build/package boundary once, with no prior/partial acceptance. The installed Node 24.21.0 used for OpenSpec is outside package.json's >=24.11.1 <24.16.0 pin: resolve an already installed compatible interpreter before package checks. Rollback disables affected admission; it never restores run-only fallback.

## Risks / Trade-offs

- Installed and external clients are not enumerated completely → explicit incompatibility and coordinated payload checkpoint; no unsupported compatibility claim.
- Graph freshness unavailable and controller absent from bounded graph queries → source-derived call chain is the evidence; static discovery is not runtime proof.
- Existing pending lifecycle invocationId is a display surrogate → retain raw approvalId separately and never use the projected surrogate to authorize an effect.
- Required product-root task scope and UAR dependency checkpoint are not yet registered → production remains unstarted until driver supplies them.
