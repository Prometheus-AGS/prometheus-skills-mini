# F-HARNESS-SELECTION source handoff

Status: source authored; not compiled, tested, accepted as integrated, or committed. Parent03/3 / child3 only. Baseline bac04cb6; immutable storage receipt accepted at coordinator64409f0. Exact absolute paths, hashes and line counts are in selection-handoff-source.json. Storage source is consumed without changes. Existing oversized kernel files receive only dispatch wrappers/module wiring; new modules are responsibility-based and below500lines.

## API and authority

- kernel::uar_harness exports SelectedUarJob, ResolvedDispatch::{Native,Uar}, JobDispatchOutcome<T>::{Native,Delegated}, JobDispatchError. SelectedUarJob deliberately has no Deserialize or Debug. Its verified subject/tenant fields are a producer obligation, not authentication proof. It carries stable JobAttemptRef, bound UarRunAdmission, credential revision, required capabilities/recovery/steer and the existing AppState Arc<UarRunControl>. No second client or boot path exists.
- send_job_message and send_job_message_streaming branch before their original native wrappers. Selected success returns a delegated receipt, never AgentLoopResult/usage or a fabricated native stream. Native wrappers/results remain unchanged. Task4 must encode message/history/policy into selected admission; the separate message argument belongs to Native only. The streaming observer is still task5.
- send_job_message_ephemeral and spawn_job_ephemeral_worker reject selected dispatch before native registry/workspace/tool/loop setup. Native forwards unchanged. No feature flag converts selected into native: without uar-driver it returns FeatureUnavailable.
- admission::dispatch_to_store validates non-anonymous owner/stable IDs, reads durable authority before new preflight, and uses original reserved admission on Existing. It does not prepare or POST changed body/credentials under an existing attempt. Stable identity mismatch errors. Missing retained rows/storage errors never mean absence or fresh execution.
- Fresh path: exact existing client prepare digest -> read-only descriptor/binding preflight -> required capability/recovery refusal -> reserve identity/task/projection transaction -> only Created installs the exact pending private connection and invokes existing client admission. Racing Existing does only reconciliation. Durable restart recovery is explicitly unsupported. Missing capability error carries its host requirement index.
- Existing path: original lookup/resolve only. Unavailable original connection, changed epoch, retention expiry or uncertain receipt becomes fixed unknown/unsupported metadata; no replacement identity, new admission, native fallback or executable recovery. An admission receipt never proves no external effect occurred. Receipt persistence reads back the store-clamped applied cursor.

## Connection-order refinement accepted during source authoring

Driver selection.rs introduces opaque PendingUarAdmission with private Transport, no Debug/serialization. prepare_selected_projection performs no retain/POST. admit_selected compares committed identity/digest/epoch and binding, installs only into a vacant retained slot, then delegates to existing admit. Occupied/error after Created becomes unknown. Legacy prepare_projection is a thin wrapper retaining its prior behavior; refresh_connection is unchanged. Existing mod.rs shrinks, avoiding a new oversized source module.

The rejected alternative was unconditional or_insert before reservation: preflight winner and durable-reservation winner could differ. It was not implemented. Exact added claims were accepted by coordinator: driver mod.rs, retained.rs, new selection.rs, and new kernel admission_tests.rs.

## Mandatory remaining task4/manual boundary

Source inventory finds one production prepare_projection caller: crates/librefang-api/src/routes/uar_delegation.rs:168. It accepts caller-supplied boss_task_id or UUID when empty (:119-120), then uses shared get_uar_delegation namespace (:123). It is not a separate selected job namespace. Driver retained.rs retains by boss_task_id; its legacy retain_connection remains replace-capable. Connection refresh is separately called by routes/uar_delegation/connections.rs:130.

Before integrated delivery, task4 must protect selected transport against reachable legacy admission overwrite, including concurrent preflight, completion and restart. Classify using owner/workspace/job/attempt authority. A simple preflight existence check is not race-complete. If caller routing cannot close the race, smallest follow-up is an explicit selected ownership tag on the retained slot that rejects legacy replacement, while preserving ordinary manual behavior. Durable selected ownership must also survive restart classification. Task3 does NOT claim authoritative credential immutability across these still-unmigrated legacy callers. Do not start task4 or broaden API writes without its scheduled boundary.

## Secret/presentation contract

Selected storage omits arbitrary definition_diagnostics, remote_diagnostics and links, plus raw admission input/history/credentials. Fixed local recovery codes may be persisted. No sanitizer/provenance claim is made. These untyped diagnostics/history are unavailable pending approved typed mapping; absence is not fabricated empty history. The storage handoff's UarPresentationPart/UarSecretExcludedText remain unchanged and task5 must supply the accepted finite run-secret policy and a real decoded-message size bound. This task does not narrow approved durable presentation to metadata permanently.

## Source scenarios and remaining gate

admission_tests.rs authors (not runs) SQLite close/reopen reconciliation with changed in-memory credential/input canary retaining original identity/digest/epoch/revision, missing-owner refusal before storage/preflight, and explicit ephemeral unsupported/native disposition. These are source scenarios, not completion evidence and not replacements for the real kernel -> UAR router/executor -> persistence -> safe-effect gate. Complete mapping/control/wakes first; provider/strict-approval checkpoint03/1 remains open. Full selected integration and final review acceptance are deferred.

No tests, compiler, build, lint, dependency/service operation, gate, commit, canonical mutation or blocked diagnostic was run.
