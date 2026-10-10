# Decision log — Bossfang–UAR authorization and execution

## 2026-10-06 — Analyze entry
User approved the Assess handover with “yes, go to analyze”. Provenance: user. This authorizes Analyze only; stop before Spec. Canonical workstream UUID remains 7041aa63-d951-4b19-a59c-b963d65b3b83.

## 2026-10-06 — D-A1: Full-harness execution (recommendation)
Options: explicit UAR C05 delegation; Bossfang loop plus true inference; current nested completion path.
Recommendation: cand-001 for UAR-executed jobs. Provenance: source research and original user intent; pending stage approval.
Reason: existing provider has one run authority and explicit admission/control identity; current driver is completion-shaped but starts execution.
Disconfirming evidence: normal EndTurn argues against unconditional duplicate writes. A genuine model-only product requirement would select cand-006 separately.
Do not implement or rename unrelated Codex/Claude adapters from this recommendation.

## 2026-10-06 — D-A2: Retain cryptography and MCP dependencies (recommendation)
Keep jsonwebtoken 11.0.0, rmcp 3.1.2 and reqwest_mcp 0.13.4. Provenance: local pins plus current upstream/registry checks.
Build application attenuation, provenance, tenant/revoke and JWKS freshness policy. New versions do not prove application boundary fixes.
No dependency change authorized; no new stack discovery needed.

## 2026-10-06 — D-A3: Host resource credential lifecycle (recommendation)
Use an authorized existing host/backend resolver, finite UAR grants, and independent receiver enforcement.
oauth2-rs 5.0.0 is a conditional reference until a named resource/IdP flow is supplied. Token exchange is optional and provider-specific.
No original-JWT forwarding assumption, new broker daemon or custom signature implementation.
Provenance: inspected boundaries, MCP 2025-11-25 and published OAuth standards.

## 2026-10-06 — D-A4: Recovery scope (operator input pending)
Options: truthful unsupported restart recovery/unknown outcome first, or a separately specified durable recovery capability.
Recommendation: first option; keep uncertain attempts reconcilable and never silently retry their effects.
Operator asked asynchronously; absence of reply is not approval. Current provider explicitly lacks restart recovery.

## 2026-10-06 — D-A5: Remote receiver inventory (input pending)
No production receiver/IdP inventory was supplied. Local bridge, Bossfang receiving /mcp and UAR /mcp/uar are source-known surfaces.
Common security contracts may be specified; remote production certification remains blocked until actual resources and issuer/tenant/actor rules are named.
Provenance: assessment evidence limit; asynchronous operator clarification pending.

## 2026-10-06 — D-A6: Existing C05 ownership (recommendation)
Link existing Bossfang C05.1–3 and UAR provider checkpoint; do not rebuild the provider or close its parent gate.
Convergence ownership is a documented planning reservation, not a transfer. Resolve file claims before Plan assignments/Execute.
No messages to other tasks, publication or product writes were authorized.


## 2026-10-06 — D-A7: Independent-review corrections
F6 remediation now has an explicit F6-REPRODUCTION prerequisite; cand-003 retains the SDK unchanged. Added cand-009 common identity policy and cand-010 concrete storage references, with remote storage selection blocked explicitly. Conditional oauth2-rs targets existing application reqwest 0.12, never reqwest_mcp 0.13.4. Reviewer claim that pinned JWT leeway defaults to zero was rejected against validation.rs:126 (60 seconds); citation added. Harness comparison is limited to execution ID, approval ID and interrupt classification. These are analysis corrections, not product implementation.

## 2026-10-06 — D-A8: Bounded review handover
Two completed review rounds reached the skill cap. Latest verdict remains BLOCK (1 critical/3 warnings/1 suggestion) in the unchanged receipt. Final author corrections add Bossfang receiving identity ownership, explicit storage categories, F6 closure observables and changed-admission conflict acceptance. They are not independently re-reviewed. Human Spec approval must consider this limitation; no product certification or source execution is authorized.

### 2026-10-06 — D-S1: explicit execution-envelope contract

Spec inspection confirmed C05 deserializes the native CreateRunRequest, which already has history, agent/artifact, host resources and execution options. The coordinating harness spec now requires explicit mapping and rejection of unsupported required semantics. This preserves F1 context/tool/budget coverage without inventing provider fields or starting another loop. Evidence: UAR src/uar/api/full_harness/handlers.rs:65–95 and src/uar/api/routes.rs:71–98. No code changed.

### 2026-10-06 — D-S2: concrete policy and evidence contracts

Spec review round 1 required explicit role delegation and receiver-principal meaning. Proposed defaults: api_key_delegable_roles=[user], host-session/admin excluded, management admin identities explicitly configured by verified issuer/subject/tenant; monotonic JWKS age; resource identity from validated JWT/introspection and no cross-tenant delegation in the initial common profile. Defined SSE deduplication and F6 denial receipts. The reviewer suggestion that every admission namespace change produces 409 was rejected against reserve() semantics; only a changed digest within the same namespace conflicts. These decisions are proposals for Spec approval, not product changes or deployment selection.

### 2026-10-06 — D-S3: Spec handover and review carry-forward

All four coordinating OpenSpec changes validate strictly. Independent whole-set round 2 PASS: 0 critical, 1 warning, 1 suggestion; language screen 0.0. Plan must explicitly name auth.rs required UserContext/no-anonymous/owner-tenant checks and split role fixture cases. Reviewed spec bodies unchanged after review. Cross-model distinction remains unverified because producer identity is unknown. Six input/ownership prerequisites remain open. Stop before Plan; no product implementation, publication or gate closure.

## D-P1 — Conditional implementation plan and exact task identity

2026-10-06. Preserve four coordinating changes and all 34 numeric backend task IDs. Bind reviewed requirements to isolated product child worktrees before dispatch. Source ownership, client compatibility and unanswered recovery/remote custody choices remain explicit blockers. Implement 01→02→03→04 production before shared V1/V2 acceptance, avoiding evidence-dependency deadlock. Existing C05 and original shipping gates remain independently owned.

The first whole-plan review passed; targeted call inventory refinement exposed an unassigned A2A cancellation obligation. It is now explicit in 03/7 and LIFECYCLE acceptance, with pending-wake guard in 03/6 and exact serial network.rs function ownership. Independent correction confirmation passed. No product behavior was changed.

## Execute product decisions 2026-10-06
See [scope amendment](execute-scope-amendment.md) for direct restart, strict-cutover and empty-remote/default-removal decisions. These supersede the earlier open prerequisites.

## 2026-10-08T23:24:26.255Z — Identity task7 acceptance boundary approved

Direct operator reply: “Approved”. Accept the existing eight AUTH/KEY cases and scoped formatting/compiler evidence for01/7; retain global formatting FAILED and broad T2 NOT RUN at parent phase/release level. No D0/F6, package/platform, independent review or original shipping gate is waived. [Approval and source binding](evidence/execute/parent-resume-2026-10-08/identity-task7-acceptance.json).

## Operator scope correction — 2026-10-08T23:39:17.118Z

The operator instructed: “Forget about this and move forward. There is no vulnerability.” F6/D0 session-owner investigation and conditional remediation are removed from this release phase’s acceptance scope. Tasks02/5 and02/6 are withdrawn/cancelled, not passed or evidence-backed disproved. Task02/7 now covers exact approval/claim/cancellation only. Do not inspect, execute or retry the excluded diagnostic. No assertion of a demonstrated vulnerability or a verified absence of one follows. Application/service credentials on the selected Bossfang→UAR path and configured resource credentials on outbound MCP connections remain the accepted architecture. Other identity, exact-decision/effect, formatting, package/platform and independent-review requirements remain in force. This supersedes earlier F6 dependency and blocker statements in historical plans/reports.
