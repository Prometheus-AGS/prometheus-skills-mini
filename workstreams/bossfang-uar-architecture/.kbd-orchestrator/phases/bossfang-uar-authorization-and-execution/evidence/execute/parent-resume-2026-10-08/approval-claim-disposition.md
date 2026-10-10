# Parent 02 approval and claim reconciliation — 2026-10-08

Read-only reconciliation of `bauar-02-execution-authorization` tasks 3 and 4. This is an evidence disposition, not a canonical completion, new runtime result, or independent final review. Root owns execution and task transitions. No excluded UAR source or D0 route was inspected or run.

## Closure recommendation

**Task 4 is independently supported for closure at the recorded local host-claim boundary.** Child G1-02 directly exercises concurrent duplicate claims and a lost effect response through the real production bridge/MCP effect boundary. Its finite receipt explicitly records one effect, duplicate rejection, and unknown outcome without replay. It does not depend on the excluded session-ownership reproduction. Retain the child-approved v2 native-consumption extension rather than claiming cand-005 remained entirely unchanged.

**Task 3 is supported for closure as the owned caller implementation task, with the administrative no-change disposition below recorded explicitly.** The required callers retain exact identity, unsupported legacy input is rejected, the named positive helpers consume originating event IDs, and compatibility/reconnect/edited-input scenarios exist. The earlier approval runtime receipt must keep its old source boundary. No D0 result or new runtime replay is required to establish this implementation disposition. Closing it must not close task7's current integration matrix or task8's repository/build boundary. The child compiler receipt alone is not evidence that the named remote-MCP helper integration was executed.

## Task 3 criteria

Task title: update owned Boss controller/lifecycle/response types and administrative forwarding; migrate remote_mcp_run_grants and principal_host/sidecar_process positive helpers to originating IDs; preserve negative intent; include reconnect/edited-input scenarios and compatibility docs; no optional-ID fallback on migrated calls.

| Criterion | Observed evidence | Disposition |
|---|---|---|
| Controller requires exact originating identity | Boss `UarToolApprovalController.ts:58` rejects absent/blank IDs; raw ID retained at70; registry key includes run and raw ID at86; POST unconditionally sends approval_id at151 | Implemented. The optional unknown input type describes untrusted input; it is not an executable fallback |
| Edited inputs cannot reuse approval | Controller129 rejects approved decisions containing updatedInput; recordHumanDecision must succeed before exact raw ID resolution at137–151 | Implemented; actual edited scenario exists in older parent acceptance |
| Lifecycle/response identity | `uarApprovalLifecycle.ts:16` requires pending approvalId and projects it at87; registry registration/dispatch is keyed by approvalId. Controller registerOrReattach preserves same identity on reconnect | Implemented. Optional approvalId in the broader inspection type also covers historical/host evidence and does not demonstrate run-only response fallback |
| UAR positive helpers | `remote_mcp_run_grants.rs:347–354`, `principal_host.rs:269–293`, `sidecar_process.rs:755–759` read actual parsed event IDs and send them; shared `approval_events.rs` filters complete matching-run frames and deduplicates IDs | Implemented static evidence. These six named caller/controller/lifecycle files were hashed and match child source17 |
| Negative scenario intent | Parent `exact-approval-authoring.md` records valid captured IDs in foreign-owner negatives and explicit unavailable IDs in retention-only probes | Authoring evidence, not newly rerun negative controls in this reconciliation |
| Reconnect/edited-input runtime | Parent `boss-approval-runtime-15-acceptance.json`: approve/deny/reconnect/edited/cancel/unavailable pass; malformed-ID cases retained from runtime11 before its later failure | Actual historical boundary, not current whole-source proof. Current controller, lifecycle, AGUI adapter, gate and fixture hashes equal source18; UarRuntimeConnection differs from source18 |
| Compatibility documentation | UAR `docs/operations/execution-authorization.md` declares strict owned-caller cutover, exact event IDs, no external legacy compatibility; parent inventory supplies original callers | Present. Preserve breaking-change declaration |
| Administrative forwarding | `UarAdministrationAdapter.ts:163,168,170` lists approval capabilities, but `readUarAdministrationSnapshot` (333–346) projects capability metadata. Observed IPC route142 exposes this snapshot; no generic administrative approval-send route was identified in the inspected IPC/adapter and bounded Boss source search. Only controller contains an approval_id POST | Original inventory treated advertised methods as an executable forwarding client. Record this narrower no-change finding explicitly; do not invent an unused forwarding API or claim a migrated generic client ran |

The last row is the explicit no-change disposition for the original administrative-forwarding assumption: the inspected owned adapter advertises capabilities; it does not author a generic approval request. Adding such an API would be new product scope. The actual approval response ingress is `src/shared/ipc/schemas/ai.ts:304–315`: strict input requires approvalId with minimum length1 and approved boolean; `src/main/ipc/handlers/ai.ts:184–185` forwards the typed payload to AiService. The controller then sends the exact originating ID. Thus the task's authority-preservation objective is met on the observed owned caller path. This is a bounded implementation conclusion, not proof about all installed/external consumers. Any separately identified real forwarding caller would require its own exact-path inspection.

## Task 4 criteria

Task title: adopt cand-005 unchanged where conformant, fix observed claim deltas, include concurrent duplicate claim and lost-effect-response scenarios, verify one claim and explicit unknown outcome.

| Criterion | Child evidence | Disposition |
|---|---|---|
| Concurrent duplicate MCP claims | `host-admission-v2-acceptance-02.json`: concurrentDuplicate.exactlyOneEffect=true, oneRejected=true | Reproduced at production bridge/MCP effect boundary |
| Lost effect response | Same receipt: lostResponse.effectObserved=true, replayRejected=true, teardownState=outcome-unknown | Direct required proof; no inferred success or automatic replay |
| Binding/revalidation | Same receipt: nonConsuming/exactBinding/pendingCancelledConsumedRejected/currentPolicy/expiredLeaseRejected/metadataRevisionRejected all true; nine approval-policy combinations | Conformant existing behavior retained |
| Observed native claim delta | Thirty-one native host cases include concurrent_and_repeated_native_claim with nativeConsumes1, host claim persistence failure with0, terminal persistence failure with1; missing/kind/version/owner/argument/revision/lease/budget substitutions rejected | Approved child v2 extension. Synthetic host producers establish contract, not native body execution |
| Genuine native execution/uncertainty | G2-12 ordinary cases and focused postack02 use actual UAR; calibrated body1 and cancellation body0, unknown lifecycle on dropped acknowledgment/cancellation | Additional local evidence. Search_tools body only; no all-native-body claim |

`G1-02-bound-receipt.json` binds actual exit0, real production bridge, 31 native contract cases and nine approval matrix cases to source15. `source17-focused-postack-rebinding.json` preserves that applicability because only two postack gate files changed. Root's current source/applicability check is required before treating the old evidence as current; this reconciliation did not hash every product input.

## Compiler, provenance and limits

- Child `C-main-17.json`: TypeScript main compiler exit0, not runtime acceptance.
- Child `C-rust-callers-02.json`: cargo test --no-run exit0 for tool_admission_integration, bauar_inline_revision and bauar_native_admission_storage_fixture. It neither names remote_mcp_run_grants nor proves every shared helper consumer executed.
- Child `boss-task4-callers.md`: strict v2 manual producer/observer migration inventory. It addresses protocol executionKind callers, a related but distinct inventory from parent02 root approval callers.
- Normal binaries emitted at child source12, instrumented binary at13; later source17 applicability is explicitly scoped rebinding, not freshly built whole-source17 binaries.
- Parent runtime15 approval acceptance is source18/build08 with retained runtime11 malformed-ID prefixes. UarRuntimeConnection now differs from that source18, so no unconditional current-runtime re-certification follows. Current parent aggregate G2 work does not itself replay the dedicated approval reconnect/edited matrix.
- Chosen model/role route is not proof of served identity; no cross-model independence assertion is made.
- No D0/F6, remote receiver, Windows, installed/package, parent phase or release certification follows from closing task3 or4. Task5/6 session ownership and task7 combined final matrix stay independent.

## Evidence locations

Within parent `evidence/execute/`: `exact-approval-authoring.md`, `boss-approval-runtime-15-acceptance.json`, `source-inventory-name-and-stream-delivery-18.json`.

Within child `children/desktop-mcp-projection-acceptance/evidence/execute/`: `boss-task4-callers.md`, `C-main-17.json`, `C-rust-callers-02.json`, `G1-02-bound-receipt.json`, `host-admission-v2-acceptance-02.json`, `G2-12-finite-failure.json`, `G2-postack-02-finite-evidence.json`, `G2-postack-02-bound-receipt.json`, `source17-focused-postack-rebinding.json`, `final-source-manifest-17.json`, `acceptance-disposition.json`.

Planning authority: parent `tasks.md`; workstream `openspec/changes/bauar-02-execution-authorization/{design.md,tasks.md,specs/execution-bound-authorization/spec.md}`; parent `approval-client-inventory.md`. Original inventory described intent/observed capability names; implementation evidence above controls the narrower current conclusion.

## Follow-up disposition after parent fullG2-14

Parent `parent-resume-2026-10-08/G2-14-acceptance.json` records actual aggregate exit0 with six profiles, each one target effect and one eager/two deferred exact decisions, nine event scenarios, nine native cases, five negative cases, and final actual sink assertions. Its pre/post binding covers239 sources and28 artifacts with no drift. This removes the old aggregate G2 completion gap; historical G2-12 remains failed at its own boundary.

This actual integrated result strengthens the current exact-decision/cancellation path. It does not masquerade as a dedicated repeat of the older reconnect/edited approval-client matrix. That distinction does not block task3: its title requires migration, authored scenarios/docs and absence of optional-ID fallback; task7 separately requires the complete current approval/claim/cancellation and F6 matrices.

No new replay request is prepared for task3. A changed UarRuntimeConnection hash alone is not a reproduced behavior defect or proof the prior approval result is invalid; conversely, it cannot make the earlier source18 runtime receipt a whole-current-source receipt. Keep that applicability limitation in task7's reconciliation. If task7 later establishes a specific current approval coverage gap, use the existing authored approval-client gate and accepted staged provider with explicit current source/artifact binding, selecting only the genuinely uncovered authored scenarios. Do not create a new API or expand the matrix to close this implementation task.

The resulting root actions are evidence reconciliation of02/3 and02/4 independently, while retaining02/5–8's own statuses and requirements. This note does not perform those transitions. Served-model identity and ordinary source12/instrumented source13 versus source17 applicability limitations remain unchanged.

Only this assigned note was written. No gate, build, test, dependency change, source edit or canonical transition was performed. A read attempt using a login shell encountered an unrelated shell-initialization parse error; the read was repeated successfully with login disabled and explicit Node22 LTS. No product command was run by that attempt.
