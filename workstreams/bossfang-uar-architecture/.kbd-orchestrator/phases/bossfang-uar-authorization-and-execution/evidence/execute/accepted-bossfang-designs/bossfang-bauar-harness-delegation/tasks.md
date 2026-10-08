# Tasks

All tasks remain pending. Parent backend IDs are numeric03/1–9; child displayed ordinals below map one-to-one in this order. Driver must obtain actual child backend IDs during registration, not assume them from markdown.

## 1. Accepted checkpoint and durable attempt

- [ ] 1.1 Record baseline bac04cb6, historical C05 receipt, final provider/strict-approval checkpoint, exact file claims, product-root execution binding and accepted A2A-storage/dispatch-eligibility refinement; verify immutable source/ownership/task mapping artifacts exist before production dispatch. Parent03/1, C05.1–3.
- [ ] 1.2 Extract crates/librefang-runtime/src/a2a/uar_delegation_store.rs with focused module wiring in a2a.rs, and extend existing A2A projection/store with versioned product attempt relation and atomic event/cursor/task outcome transaction; include interrupted-write, old-record, retention and secret-exclusion scenarios/docs, then record schema-engineer handover to feature-steward. Verify initial identity precedes network admission and later projection updates use one transaction at the completed gate. Parent03/2, C05.2.
- [ ] 1.3 Add explicit selected job dispatch before both supported kernel loop entries, reuse existing UarRunControl, register uar_harness in kernel/mod.rs and its admission module/exports, pass typed JobAttemptRef/ResolvedDispatch explicitly to both hooks, and refuse unsupported ephemeral selection; include native-compatibility and unsupported-capability scenarios/docs. Verify selected paths bypass native model loops and native paths remain unchanged at completed gate. Parent03/3, C05.1.

## 2. Residual lifecycle refinement

- [ ] 2.1 Implement explicit job input/history/definition/tool-policy/resource/required-limit mapping through existing client; include lost response, same-key replay, changed payload, credential revision and unsupported-field scenarios/docs. Verify exact original owner/workspace/admission/epoch and effective context without new execution on uncertainty. Parent03/4, C05.1–2.
- [ ] 2.2 Register observation in the serially transferred uar_harness/mod.rs; implement atomic observed event application and strict caller-observed approval identity/revision across owned API/client callers after UAR02 handover; include interrupted replay/gap, stale decision and legacy-shape refusal scenarios/docs. Verify observed tools never enter native dispatch. Parent03/5, C05.2.
- [ ] 2.3 First obtain F-SCHEMA-SCHEDULING schema-engineer implementation and recorded handover of the substrate excluded-job reset API (exact file, interface/native behavior and immutable checkpoint). Then consume that API in F-RETRY, register lifecycle in uar_harness/mod.rs and take the wake_agent_after_approval slice of kernel/mod.rs after selection release. Carry original attempt identity through cancellation, retry/PATCH/stale sweep/pending-event-cron wake and resume paths; include explicit unsupported/unknown restart/retention/cancel-race scenarios/docs. Verify no automatic replacement admission or uncertain-effect replay. Parent03/6, C05.2–3.
- [ ] 2.4 Refine existing unified A2A lookup/cancel with the same owner/attempt/revision and preserve non-executable history plus provider-attributed usage; include both A2A views and restored-history scenarios/docs. Verify no invented usage and release F-RETRY network.rs to F-MCP at the immutable child2.4 / parent03/7 A2A checkpoint. Parent03/7, C05.3.

## 3. Completed delivery boundary

- [ ] 3.1 After selected 01–04 production is complete, run real Bossfang kernel->UAR router/executor->safe effect gate through both supported entries and actual attempt persistence, covering scenarios authored above, native mode and unsupported ephemeral selection; record exact identities/effect counts/decision revisions/cursors/source hashes and failure outcomes. Parent03/8, combined C05 residual acceptance.
- [ ] 3.2 Run required serialized scoped build/integration checks once with an isolated target directory, contribute the BAUAR diff against bac04cb6 to the independent final review tracked at parent04/10, and record platform limits without closing original C05 or shipping gates. Parent03/9.

Production is not authorized by artifact presence. F-STORAGE must hand over before F-HARNESS shared-file writes; final reviewer remains dormant until full selected delivery. The A2A SQLite refinement and native-only ephemeral eligibility are explicit proposed decisions awaiting driver design acceptance.

