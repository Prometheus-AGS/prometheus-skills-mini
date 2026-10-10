# Specification handover: Bossfang–UAR authorization and execution

> Execute amendment: [operator decisions and revised selected scope](execute-scope-amendment.md) supersede unresolved recovery, remote integration and cutover statements below.

Date: 2026-10-06  
Stage: Spec complete — awaiting explicit approval for Plan; no product implementation
Authorization: user “Approved for handover” authorized Spec only. Plan requires a new approval.

## Outcome

Four coordinating OpenSpec changes define the common architecture and its acceptance. **Bossfang orchestrates jobs; UAR executes delegated attempts; receiving MCP servers enforce resource authorization.** Each has proposal, design, behavior delta and unchecked tasks. No stage, receiver scenario or existing delivery gate is silently skipped.

| Change | Capability | Primary owner | Dependency |
|---|---|---|---|
| [01 identity boundaries](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/openspec/changes/bauar-01-identity-boundaries/proposal.md) | uar-principal-authority | UAR security | accepted source/owner checkpoint |
| [02 execution authorization](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/openspec/changes/bauar-02-execution-authorization/proposal.md) | execution-bound-authorization | UAR + The Boss approval client | 01 identity; strict client cutover; F6 correction conditional |
| [03 harness delegation](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/openspec/changes/bauar-03-harness-delegation/proposal.md) | job-harness-delegation | Bossfang C05 consumer | 01/02 contracts; C05 ownership; recovery profile |
| [04 resource lifecycle](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/openspec/changes/bauar-04-resource-credential-lifecycle/proposal.md) | mcp-resource-authority | UAR, Bossfang inbound, authorized host/receiver | 01/02/03 shared contracts; named remote receiver/custody |

The numbers give required integration precedence, not an entered Plan stage or authorization to apply. These are initiative-level cross-repository contracts. This planning root has no write authority outside itself. Plan must link repository-local child changes and exact source claims, with product worktrees created before Execute. Existing product specs must receive full proper deltas in those child changes; new capabilities here do not overwrite them.

## Decisions made concrete

- Full-harness jobs bypass both streaming and non-streaming Bossfang model-loop entry paths. Completion-shaped UAR fallback is prohibited for those jobs. Native model providers stay distinct; Codex/Claude remain comparator-only.
- Remote JWT profile requires issuer/audience/algorithm/expiry/nbf and verified tenant membership. Proposed JWKS policy is refresh at 60 seconds, hard freshness 300 seconds, fetch timeout/minimum retry interval five seconds, single-flight per issuer. These are design defaults offered for approval, not protocol mandates. Existing JWT clock leeway remains 60 seconds.
- API keys retain subject/tenant, attenuate delegation, restrict revoke/list and cannot mint host provenance. Already issued JWT revocation limits are documented honestly.
- Exact root approval identity propagates through the owned clients before strict cutover. Existing host claim-before-effect is retained.
- F6 binding edits require the unchanged-baseline real-router A/B JWT reproduction. Passing closure must identify the enforcing layer and include valid protocol/positive-owner controls.
- Admission identity/epoch commits before submission. Lost acknowledgement reconciles the same attempt; changed payload conflicts; stream reconnection cannot create work. Unknown outcome is never silently retried.
- Resource credentials are acquired and stored by an authorized existing host, consumed as immutable run grants and validated by their intended receiver. HTTP and stdio remain different boundaries.
- Bossfang /mcp service/delegated/local identity classification has explicit implementation scope, attribution and negative scenarios.
- Known credential echoes are redacted before ordinary logs/persistence/model input. The policy is bounded to system-held credential values, not arbitrary sensitive-document detection.

## Traceability: all assessed scenarios

| Assessment scenario | Owning capability / observable acceptance |
|---|---|
| Wrong issuer/audience, absent claims, expired/future JWT | 01: reject before admission; exercise documented leeway |
| Removed or same-kid changed signing key | 01: atomic refresh and rejection by 300-second hard age |
| Insufficient grant or resource scope | 04: separate outgoing-grant and actual receiver denials |
| Wrong-audience/expired resource credential | 04: receiver validates independently; no effect |
| Cross-tenant and forged tenant/workspace | 01 + 04: verified mapping and receiver authority; 02/03 owner controls |
| Reserved-role self-issuance | 01: rejected with downstream prerequisites; intended host positive |
| Credential reuse/renewal | 04 + 03: owner/run/revision isolation, expiry, reconcile before new run |
| Approval mismatch/absence/replay | 02 + 03: exact pending identity/revision; no wrong effect |
| Delegated execution | 03: both dispatch paths, explicit context/history/tool-policy mapping, one UAR loop and safe effect |
| Cancellation | 02 + 03: exact identity, stale decision race, actual/unknown outcome |
| Interrupted stream/reconnect | 03: same execution/cursor, no new work |
| Lost submission/retry | 03: frozen receipt, changed payload 409/admission_digest_conflict |
| Restart recovery | 03: truthful capabilities and no silent rerun; scope decision open |
| MCP session crossover | 02: production-router two-JWT POST/GET/replay/DELETE matrix |
| Stdio environment/termination | 04: captured allowlist, process lifecycle, unavailable sandbox denied |
| Key revoke/tenant preservation | 01: direct/exchange paths, owner/admin policy |
| Credential logs/output/model context | 04: distinct synthetic canaries and explicit tool-echo projection |
| Bossfang receiving service identity | 04: authenticated mode/subject/actor/tenant distinct from agent header |

Candidate map: cand-001 → 03 adapt existing provider consumer; cand-002 → 01 adopt existing JWT; cand-003 → 02/04 adopt existing rmcp/run transport, conditional correction only; cand-004 → 04 reference/blocked adoption; cand-005 → 02/04 adopt exact admission; cand-006/007 → 03 reference only; cand-008 → 03 reject nested harness route; cand-009 → 01 adapt policy; cand-010 → 04 conditional existing storage reference. All nine build-required entries from library-candidates.json have an owner here.

## Prerequisites and unresolved product choices

These are actual input/ownership gaps, not failed product tests. Handover approval does not answer them. Questions on recovery and remote receiver/custody were presented during Spec; no answer is assumed.

| ID | Needed evidence/decision | Blocks |
|---|---|---|
| C05-OWNERSHIP | agreed immutable UAR provider checkpoint, Bossfang C05.1–3 consumer assignment, exact shared-file claims and existing parent-gate owner | product dispatch/overlapping writes |
| ROOT-APPROVAL-COMPATIBILITY | complete root-client inventory, coordinated strict cutover or explicitly approved narrow local exception | approval cutover/dispatch |
| F6-REPRODUCTION | valid two-principal production-router matrix with positive controls | session-binding code changes only |
| RECOVERY-PROFILE-DECISION | explicit unsupported/unknown first release or durable-recovery requirement | release-scope and recovery-specific implementation dispatch |
| REMOTE-RECEIVER-INVENTORY | named server/IdP/resource/scope/tenant/actor/flow and owner | receiver-specific supplement, implementation, remote certification |
| REMOTE-RESOURCE-SECRET-STORE | named authorized host/store, custody/schema/rotation/deletion/access policy | remote persistence supplement and implementation |

No unknown implementation has been asserted complete. The common invariants remain valid for either recovery selection. A durable selection requires an additional reviewed provider recovery design and tasks before implementation; none is smuggled into the current C05 adapter. Remote supplements are required after receiver/custody selection, with a new reviewed concrete scope. These blockers must appear in Plan; do not dispatch the conditional tasks as generic “implement OAuth” work.

## Verification boundary and rule reconciliation

Production integration order is 01 → 02 → 03 → 04, with shared files serialized. The final integrated gate spans completed production from all four; individual acceptance tasks reference the same scoped receipt where it already proves their scenario. Do not run the full gate four times, nor mark change 01 accepted before its dependent integration exists. A-9 implementation-first governs over generic OpenSpec task guidance about early group testing. Each group authors its needed scenarios/docs alongside its production work; execution waits for the complete boundary.

F6's pre-change run is diagnosis of an unchanged production boundary, not partial-code testing or certification. After an observed failure, the corrected production path receives its final integrated acceptance. Existing bridge fixture evidence is historical and does not certify current installed or remote behavior.

No product test/build or shared service is changed by Spec. Use isolated stores/data/build roots in future work; no new resident daemon. Evidence must name source revision, deployment profile, actual receiver and outcomes. Local desktop and remote multi-user acceptance are separate. Full phase completion remains blocked if required remote evidence is unavailable.

The mandatory Superpowers routing skill was consulted; KBD/OpenSpec remains the phase-specific procedure. Upstream shell-based review scripts are adapted to Node, as required by this repository. The known OpenSpec review-packet limitation is handled by including every proposal/design/spec/tasks file explicitly. Independent review must include all siblings and previous Analyze findings, not merely the first change.

## Existing work and baseline

Source revisions: UAR a7cb972992d4f83db6585449ea81af0fe4a1c990; Bossfang 16beef0fcf3053970a901990df4fedbdf86bd87d; The Boss e2ae2ce21245030293c0bea96ed02ae853b820a7. The 59-file original digest set matched at Spec entry. New targeted evidence includes The Boss approval controller and Bossfang kernel dispatch/task persistence; these are not claims of a complete new code audit.

UAR C05 is consumed rather than rebuilt. Bossfang's existing C05 is an initiative whose tasks require repository decomposition. D-UAR-P1 historical acceptance does not certify this new boundary. Original shipping KBD revision 999 and its active path remain outside this phase.

[Architectural review](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/docs/research/bossfang-uar-architecture-review-2026-10-06.md), [analysis](analysis.md), [candidate contract](library-candidates.json), [Analyze findings](review/analyze/findings.json).

## Spec-stage evidence

Strict OpenSpec validation passed all four changes: 32 requirements, 59 scenarios and 34 unchecked tasks. All 29 checked local links resolved. The 64 checked source/evidence files and all three product repository HEADs remained at the reviewed baseline; no tracked product/tooling changes were made. [Artifact checks](evidence/spec-artifact-checks-final.json), [source checks](evidence/spec-source-final.json).

The completed whole-set review returned **PASS: 0 critical / 1 warning / 1 suggestion**, fresh-context MiniMax-M3. Its language screen scored 0.0. Round 1 returned BLOCK (2 critical, 4 warnings, 1 suggestion); corrections and evidence-based dispositions are retained. One earlier truncated response was rejected and not counted. Exact producer canonical identity remains unavailable, so cross-model distinction is recorded as unverified-producer-unknown rather than verified. [Final review](review/spec/findings.json), [screen](review/spec/sycophancy.final.json), [round-1 dispositions](review/spec/round1-disposition.md).

**Warning carried into Plan:** UAR auth.rs must require verified UserContext in create/list/revoke, remove create/list anonymous fallback, and resolve stored owner/tenant for list/revoke with non-disclosing denial. The common spec already requires this authority; Plan must name these handler changes and their negative scenarios explicitly in the child tasks. Do not treat the current optional extractor as adequate. **Suggestion carried:** split the combined persisted-attenuation fixture into allowed user, disallowed reader, and reserved host-session/admin cases. This is fixture clarity, not permission to weaken the requirement. Reviewed proposal/design/spec/task bodies are preserved after the final review; this handover records its results and required follow-up.

No product tests/builds, deployments or service/configuration changes occurred. Current build/deployment health remains unknown. The Node hook dispatcher was invoked; no matching inherited lifecycle commands ran, so no automatic memory writeback is claimed. Existing source fixtures and historical parent acceptance retain only their original scope. No commit, push, issue, merge or publication was performed.

**Handover:** Spec is complete as a common coordinating contract with explicit blocked deployment supplements. Plan, Execute and Reflect remain unentered. Stop for the user's approval before Plan. The six prerequisite records above remain mandatory; a Plan handover is not receiver certification or resolution of unanswered product choices.
