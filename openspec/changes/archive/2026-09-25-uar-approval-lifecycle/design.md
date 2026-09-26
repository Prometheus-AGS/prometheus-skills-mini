## Context

See proposal.md for the observed problem. This is change 3 of the reviewed unified-tool-approval-authority plan. UAR src/uar/runtime/thread/approvals.rs and existing runtime event persistence; Boss UarRuntimeConnection.ts, UarAguiAdapter.ts, UarSidecarService.ts and approval UI projections. Use additive versioned persistence metadata rather than a second database.

## Goals / Non-Goals

Implement this vertical slice through its production entry points. Preserve unrelated WIP and upstream-friendly adapters. No replacement runtime, new daemon, general workflow engine or automatic crash continuation. Parent delivery scope remains intact.

## Decisions

retain one decision across reconnect and terminate safely
- library: cand-004, cand-009; cand-010 deliberately rejected.
- Depends on: uar-exact-tool-admission.
- Scope: UAR broker/root-child cancellation and existing durable events; Boss stream/controller/sidecar lifecycle and pending UI.
- Recommended agent: Codex / GPT-5.6-sol high. Est. complexity: M; complexity score: High; model class: frontier.
- Customer value: HIGH — reconnect cannot duplicate an action; users can see what happened after interruption.
- Details: Reuse existing waiters, cursor and sidecar generation. Persist sanitized lifecycle evidence, not replayable authority. Sidecar or host restart invalidates pending actions and classifies ambiguous dispatched work without retrying it.
- Acceptance: the same pending identity survives renderer detach and separately SSE disconnect; duplicate/stale decisions do not execute. Root cancellation covers descendants. Restart leaves a visible interrupted/outcome-unknown result and never reuses old admission.



Prepared invocation: version 1, random invocation ID, root/executing run IDs, owner/workspace, runtime epoch, host epoch, catalog revision, mounted server identity and native tool name, policy revisions and frozen validated arguments. Attempt 1 only; retries needing a side effect allocate a new invocation. No model/renderer-selected owner or root identity.

Use a private /uar/admission/v1 route on the existing authenticated per-run bridge listener, with prepare, resolve, cancel and inspect operations. It is not an external MCP extension method or another listening port. Existing host/origin/loopback/token checks remain; root/owner/workspace and mount scope are derived from the trusted connection. Child requests are checked against UAR-derived lineage and narrowed grants. UAR core calls a port; the Boss adapter owns this HTTP transport.

Prepare returns an opaque admission ID and host disposition. Both deny/ask/auto policies are joined restrictively. Auto/Auto authorizes without UI; either Ask waits for one human decision; either Deny prevents dispatch. For Ask, Boss main records its authenticated registry decision and UAR records/acknowledges the same approval ID before the host marks authorized. UAR cannot synthesize a human decision merely by asserting Auto. Failed/lost acknowledgment leaves a queryable pending state; inspect/resolve retries return the same state rather than grant another execution.

State transitions: prepared → awaiting-human (when needed) → awaiting-ack → authorized → claimed → succeeded/failed; denied/cancelled/invalidated are preclaim terminal states. Auto may skip awaiting-human. Both participants serialize local transitions; there is no claimed distributed atomic transaction. A lost execution response produces outcome-unknown rather than a new claim. A mismatched repeat decision returns a conflict; same decision returns its current outcome.

Boss computes the argument digest from its parsed host-effective JSON using deterministic ordinal key ordering, array order preserved, no locale sorting. UAR keeps the host digest opaque and freezes the validated argument value; this avoids requiring Rust and JavaScript to independently stringify numeric JSON identically. Host stores the complete main-only prepared argument value and compares the actual tools/call binding/digest against it. No secrets or argument digests are exported as display/audit fields. Digest alone is never an admission identity.

Managed tools/call carries _meta["tools.know-me.the-boss/admission"] = {version, admissionId, invocationId, runtimeEpoch, hostEpoch}; the host compares it with its connection-bound record, current restrictions, mount and arguments, then claims atomically before forwarding. Legacy identity-free tools/call on the managed bridge is refused. Reject batch tools/call on this private bridge to avoid partially consuming multiple admissions; UAR issues individual calls. Ordinary tool schemas and independent MCP servers are unchanged. Negotiate version/capability when pairing Boss and UAR; never silently fall back to FIFO.

Recheck actual catalog/tool availability and narrower permissions at dispatch. A removed/replaced binding invalidates the prepared call; no substitution. General catalog edits apply to new invocations while the existing run remains on its pinned revision unless that revision is explicitly revoked. A new stricter policy or changed effect requires a new preparation/consent; a permissive change does not eliminate already-required consent.

Keep the UAR broker's existing root-level prompt serialization for this release; distinct invocation IDs still distinguish queued identical calls. Do not hold registry/global locks across human/network/tool waits. An atomic admission claim consumes once, but does not guarantee exactly-once arbitrary external effects. Persist claim intent before dispatch using existing storage; after a crash, a persisted claim without terminal receipt is outcome-unknown even if the tool may not have started. Persisting audit failure blocks dispatch with an actionable error.

The main process owns authoritative arguments and decisions. Outbound UI gets an explicit safe action projection and opaque IDs; replies contain only ID + allow/deny. Known tools have meaningful safe target/operation projections; arbitrary argument bodies, headers, credentials and write contents are not dumped as fallback. Unknown tools display safe catalog/tool identity, effect description and a notice when details are unavailable; cancellation stays available. Existing model/transcript logging paths must use the same protected projection at the renderer boundary for this feature. No claim of generic secret detection.


### Reuse and evidence

- cand-004 (reference): Codex Rust prepared execution and correlated approval. Closest inspected Rust reference; adapt concepts within existing UAR after baseline consolidation. Evidence: Local Codex 986ff1cc7ced: core tools/approvals.rs, tools/orchestrator.rs, codex-mcp/binding.rs and app-server/outgoing_message.rs inspected; integrated landscape report includes source links.
- cand-009 (adapt): Live pending replay with cancellation and epoch invalidation. Reuse live continuations and single-consumption decisions; invalidate on process restart, audit interruption, no automatic write replay. Evidence: UAR root/child broker, generation and SSE cursor exist; Codex outgoing request map and pending replay inspected.
- cand-010 (reject): Transparent durable restart and approval-time mutation. Defer transparent crash continuation; new invocation for edited actions or intentional retry. Evidence: Inspected Codex replay concerns live callbacks, not a universal durable external-effects transaction.

## Risks / Trade-offs

- Dirty source or pin drift → preserve first and bind evidence to commits and binaries.
- Approval result mistaken for execution result → retain separate decision, claim and terminal identities.
- Cross-process failure → interrupted/outcome-unknown, never automatic write replay.
- Longer historical recovery → keep outside this child unless a selected dependency requires it.

## Migration Plan

Apply in phase dependency order. Keep prior source refs and known artifact manifests as rollback checkpoints; do not rewrite or delete unrelated work. Protocol v1 requires the corrected pair; incompatibility fails visibly rather than weakening authority. Backward-readable audit additions use existing persistence with additive versioning; audit history does not reconstitute execution authority. Complete the slice before its integration gate.

## Verification

Static lifecycle/state inspection during implementation; completed behavior is demonstrated at Gate A2. Tasks are implemented using static reasoning; no per-edit unit loops.
