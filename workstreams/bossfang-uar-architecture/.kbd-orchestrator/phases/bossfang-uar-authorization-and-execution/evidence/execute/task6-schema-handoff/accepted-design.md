# Design

## Context

See proposal.md. This is a residual C05 consumer child, not a fresh adapter. Parent numeric tasks 03/1–9 map to the ordered child tasks. Source inspection and full entrypoint inventory: [prerequisites](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/bossfang-prerequisites.md).

Driver accepted bac04cb6b2c144520e28234ad77f00d4cf0f5b23 as the isolated source baseline, not a newly certified release. Original 16beef0 is its ancestor by 279 commits / 1,239 changed files including C08/C14/dependencies. BAUAR diffs compare only to bac04cb6. Original main and owner checkouts remain unchanged. Historical C05 consumer bd4510505b448e97af2f540e349f020b92ef41df/provider fcfce6d226b50eee502c5f272e9215112d933e29 receipt retains its original macOS scope. Provider candidate a7cb972992d4f83db6585449ea81af0fe4a1c990 requires final UAR01/02 handover before strict consumer changes.

## Goals / Non-Goals

Goals: explicitly selected jobs use existing UAR control, one durable attempt relation, strict caller decision identity, and conservative retry/cancel/recovery.
Non-goals: new HTTP client/RunManager, converting every model-provider call, durable provider recovery, receiver/IdP/custody integration, rewriting historical gates, pins, CLI, UI or services.

## Decisions

### Existing authority

Source anchors at bac04cb6: UarRunClient is defined in crates/librefang-llm-drivers/src/drivers/uar_run/mod.rs:102; UarRunControl is its public type alias at :111. The separate model-only UarDriver exists in crates/librefang-llm-drivers/src/drivers/uar.rs:430 (LlmDriver implementation :994) and stays read-only. Provider RunManager exists at a7cb972 in src/uar/runtime/manager.rs:384; src/uar/api/full_harness.rs:30 holds Arc<RunManager> and handlers.rs:91 delegates admission to the existing admit_run path. Neither authority is being invented.

Reuse UarRunControl/UarRunClient, UarDelegatedRunProjection, A2aTaskStore, routes/uar_delegation and routes/uar/delegated_tasks.rs. Retained original connections and selected configuration remain application-owned. Kernel modules orchestrate the existing contract, never duplicate its HTTP or task authority.

### Proposed storage choice for acceptance

Keep existing private SQLite A2A store as delegated-attempt authority. Extend its versioned projection with product job/attempt, mandatory verified owner subject and its authenticated tenant (nullable only for the selected single-tenant authority), workspace, harness, original admission/epoch, required capabilities and credential reference/revision. Unique owner/workspace/job/attempt identity reserves before submission. Store no credential values. A missing/anonymous owner refuses selected admission before any network effect. Tenant absence never permits a delegated tenant requirement to be weakened; that profile is unsupported until an actual verified mapping is accepted. The existing provider ActorOwner (src/uar/runtime/actor/messages.rs:10–36 at a7cb972) requires nonempty, non-anonymous subject equal to its verified context and permits an absent tenant. Persist exactly that accepted namespace, not a fabricated root/display name.

Initial task/projection/relation use the existing transaction. Later applied event identity/cursor, durable presentation event and local task outcome commit in one transaction in that database. Extract focused storage into crates/librefang-runtime/src/a2a/uar_delegation_store.rs with surgical a2a.rs wiring. Current later projection/task upserts are separate and do not satisfy this requirement.

Memory task board remains scheduling data. Its retry/wake paths consult the authoritative relation before requeue/dispatch. Interruption between attempt commit and task-board presentation reconciles the existing attempt; never creates new admission. There is no cross-database atomicity claim. Both inspected backend feature profiles use SQLite A2A persistence at boot; SurrealTaskBackend only supplies task reset and is not an attempt store. No Surreal attempt support is claimed.

This is a material refinement of the parent's tentative substrate module and requires driver/schema-owner acceptance before 03/2 production. No numbered memory/Surreal migration is proposed for this private A2A schema extension. Their selected maxima are 61/48; never allocate from main 60/42. Applied migrations stay unchanged. Private A2A schema extension follows its existing additive boot schema lifecycle with interrupted-open and old-data compatibility scenarios.

#### Crash and atomicity protocol

The durable attempt reservation is the network-admission prerequisite. A task-board claim alone grants no submission authority. The original product job/attempt identity is stable across wakes; uniqueness in A2A storage makes racing wakes find the same reservation rather than generate competing admissions. A missing/unavailable authoritative store denies new selected dispatch instead of treating uncertainty as a fresh job.

| Interruption | Reconciliation rule |
|---|---|
| Task board claimed; no attempt reservation committed | No network submission is permitted yet. Reclaim may repeat reservation under the same stable job/attempt identity. |
| Attempt reservation committed; board projection absent or still pending | Look up the committed relation and restore scheduling presentation. Only the original reservation can submit; no new identity. |
| Submission may have reached UAR; receipt missing | Reconcile original admission under owner/workspace/epoch; never replace it. Changed credential material is not an exact retry. |
| Receipt/event observed; transaction not committed | Re-observe the original execution from last committed cursor. No product event is considered applied before its transaction. |
| Event/cursor/outcome transaction committed; task board still stale | The A2A record is authoritative. Present its outcome and idempotently update scheduling status; stale board state cannot authorize another run. |
| Provider epoch changed or original private connection unavailable | Record unsupported/unknown and await reconciliation or an explicit later operator action. Do not auto-create another attempt. |

Atomic presentation means the durable event row, cursor and A2A task/outcome projection live in one private A2A transaction. Session history and task-board rows are downstream views; they consume the recorded execution event identity idempotently and cannot advance the authoritative cursor themselves. This does not promise an atomic session/memory/a2a multi-database write.

#### Selected Surreal task-board disposition

At bac04cb6 the observed production sweep calls the concrete memory.substrate.task_reset_stuck from kernel/accessors.rs; kernel task-queue methods similarly use the concrete substrate. A source call-site search found no production dispatch through SurrealTaskBackend's task_reset_stuck trait implementation. Surreal-backed memory/config elsewhere does not change the selected delegated attempt store. Keep that alternate backend read-only and make no parity claim for an unwired alternate task queue.

Kernel owns attempt eligibility; memory must not depend on kernel or runtime A2A types. For bulk reset, pass an explicit set of ineligible selected job IDs to a focused concrete-substrate reset operation; retain the existing ordinary reset API for native callers. Explicit retry/PATCH and dispatch recheck the same durable authority. A snapshot exclusion alone is not sufficient network authorization: the unique reservation/reconciliation step always remains the final guard before submission, including concurrent sweeps. No duplicate execution authority is introduced in memory.

### Explicit dispatch eligibility

Selected jobs carry typed harness/attempt context resolved from durable product identity before normal non-streaming and streaming loop entry. Both call the same adapter; provider name and prompt text never select execution mode. Context travels through explicit parameters/job references, not ambient globals. Map input, authorized history, definition/config revision, tool policy, grants and required limits; reject unsupported required semantics before admission.

First-release selection covers normal task-board/scheduled jobs. Independent send_message_ephemeral and spawn_ephemeral_worker remain native-only and reject an explicitly requested harness selection before their direct loop. Ordinary native ephemeral behavior remains unchanged. This explicit eligibility is a proposed acceptance decision, not an assumption that every direct loop is covered by send_message_full.

#### Proposed explicit dispatch interface and supported profile

The following names are proposed interfaces, not claims about existing symbols. New uar_harness/admission.rs defines JobAttemptRef (stable product job ID plus attempt ordinal) and ResolvedDispatch (Native or Uar with a persisted attempt reference and accepted harness binding). A single resolve_dispatch(job_ref: &JobAttemptRef) -> Result<ResolvedDispatch, UnsupportedReason> resolves durable scheduling selection and owner context. Native is returned only for an explicitly unselected job. Missing context on a selected job is an error. Dispatch hooks receive ResolvedDispatch explicitly; they do not read task-local/global mutable selection, prompt strings or provider names. Existing public native entry signatures can remain wrappers; internal job dispatch passes the explicit job reference through both normal entries. Repeated wakes resolve the original persisted relation.

| Profile path at bac04cb6 | Disposition |
|---|---|
| Normal non-streaming execution before agent_execution.rs:1603 run_agent_loop | Selected task-board/scheduled attempt routes to UAR; explicit native stays native. |
| Normal streaming execution before messaging.rs:3107 run_agent_loop_streaming | Same typed selection and authority, with observation streamed back. |
| Explicit retry/PATCH, accessors stale/pending sweep, cron AgentTurn, triggers/workflow resume, approval wake at kernel/mod.rs:1849 | Scheduling entry points resolve the same JobAttemptRef and cannot reset an unresolved admission. |
| Workflow/operator-timeout, idle/completion wakes flowing to the two normal entries | Covered only when carrying a durable selected job/attempt; ordinary native calls remain native. No implicit conversion of arbitrary conversation turns. |
| messaging.rs:718 direct ephemeral loop and ephemeral_spawn.rs:469 ephemeral worker loop | Required UAR selection rejected before effect; native-only profile published. |
| Required durable provider restart recovery or steer | Unsupported by full_harness_v1 / unsupported_after_restart (wire.rs:73–80); reject required semantics. |

Register mod uar_harness in kernel/mod.rs in child 1.3. uar_harness/mod.rs passes serially from selection to control to retry for observation/lifecycle module declarations and exports. Do not create unwired modules. Product job selection persistence is part of the versioned A2A relation, not a hidden ambient flag.

#### Request mapping and exact digest

The bound first-release mapping uses the existing flattened UarRunAdmission.run map. Current provider CreateRunRequest fields at a7cb972 src/uar/api/routes.rs:71–98 are artifact, agent_id, deployment_binding_id, service_placement, input, session_id, run_credentials, mcp_servers, tool_admission, working_directory, reasoning_effort, history, skill_attachments and flattened presentation_negotiation fields. Map job input to input, authorized history to history, pinned selected definition to deployment_binding_id with its accepted service_placement, tool policy to tool_admission, approved resources to the existing run_credentials/mcp_servers representation and working directory to working_directory. Do not submit inline artifact/agent_id as a silent substitute for a bound definition. Requirements without a supported representation (including any required budget/limit not represented by the final provider contract) refuse before admission. Child 2.1 records a field-by-field effective-policy receipt from the final provider handover; it cannot invent a wire limit or drop one.

Bossfang prepare at uar_run/mod.rs:136–181 clones every run-map field, adds admission_id and native_task_id and supplies/validates deployment_binding_id. canonical.rs:7–51 hashes the complete body using recursively lexicographically sorted object keys, preserved array order and JSON scalar encoding, SHA-256 with sha256: prefix. The provider's handlers.rs:65,417–445 hashes the complete original body before removing admission/native IDs, wrapped as request plus workspace_id, recursively sorted, SHA-256 lower-case hex. These are distinct local-body and provider-body/workspace digests; do not compare their encoded strings as if identical. Provider key is (verified ActorOwner, workspace_id, admission_id), held within the runtime epoch (full_harness.rs:97).

Every present body field and nested value participates, including credentials if the actual wire contract carries them, nulls, timestamps, expiry/revision markers and extension fields. There is no non-secret-only or timestamp-exclusion rule. Workspace comes from x-uar-workspace-id and participates in the provider digest; authentication and epoch headers are namespace/control inputs, not invented body fields. Credential references/revisions and digest may be retained; credential values and serialized secret-bearing bodies must not be persisted or logged. If exact original material cannot be reconstructed in memory under the original authorized connection, reconcile the admission instead of submitting refreshed material. Frozen same-key replay and changed-body conflict are enforced by the provider, never by a second Bossfang executor.

### Strict cutover

Carry caller-observed exact approval identity/revision through API and existing client after UAR02 final schema handover. Existing approve currently refreshes lookup revision; remove that substitution so stale decisions fail. Migrate all owned callers in one delivery and refuse old shapes without effects. Do not invent final UAR02 fields.

Preserve unified root JSON-RPC/network A2A views and original retained connection. Add only missing owner/attempt/revision mapping. Cancellation requested, acknowledgement, terminal result and cleanup uncertainty remain distinct. Historical tool events cannot execute; usage comes only from provider evidence.

### Scheduling and observation

Cover explicit retry, task_update_status/PATCH, stale reset, pending-task/event wake, cron AgentTurn, approval wake, workflow/operator-timeout resume and completion wakes. Prefer central dispatch/task-queue policy so upstream callers stay unchanged. Existing unresolved attempt reconciles; epoch loss stays unsupported/unknown. No fresh admission.

Deduplicate by epoch/task/run/numeric event ID, atomically persist event/cursor/outcome, skip applied IDs and reconcile forward gaps/malformed IDs. Reconnect is observation only.

### Exact file ownership

Paths below are relative to isolated product root. Proposals only; driver records claims before writes. F-STORAGE finishes and hands over before F-HARNESS touches shared types/storage. Default team ownership must explicitly extend to listed kernel/runtime/API paths.

F-STORAGE, schema-engineer then serial feature-steward, child 1.2 / parent 03/2:
- crates/librefang-types/src/uar_run.rs
- crates/librefang-runtime/src/a2a.rs
- crates/librefang-runtime/src/a2a/uar_delegation_store.rs (new)
- crates/librefang-api/src/routes/uar_delegation/storage.rs

F-HARNESS selection/mapping, child 1.3–2.1 / parent 03/3–4:
- crates/librefang-kernel/src/kernel/mod.rs
- crates/librefang-kernel/src/kernel/agent_execution.rs
- crates/librefang-kernel/src/kernel/messaging.rs
- crates/librefang-kernel/src/kernel/ephemeral_spawn.rs (explicit unsupported selection only)
- crates/librefang-kernel/src/kernel/uar_harness/mod.rs (new)
- crates/librefang-kernel/src/kernel/uar_harness/admission.rs (new)
- crates/librefang-types/src/uar_run.rs (serial transfer)
- crates/librefang-llm-drivers/src/drivers/uar_run/canonical.rs
- crates/librefang-llm-drivers/src/drivers/uar_run/wire.rs
- crates/librefang-api/src/routes/uar_delegation.rs

F-HARNESS observation/control, child 2.2 / parent 03/5:
- crates/librefang-kernel/src/kernel/uar_harness/mod.rs (serial module/export wiring from selection)
- crates/librefang-llm-drivers/src/drivers/uar_run/mod.rs
- crates/librefang-llm-drivers/src/drivers/uar_run/approval.rs (new; mod.rs already 479 lines)
- crates/librefang-llm-drivers/src/drivers/uar_run/observation.rs
- crates/librefang-api/src/routes/uar_delegation.rs (serial)
- crates/librefang-api/src/routes/uar_delegation/observation.rs
- crates/librefang-kernel/src/kernel/uar_harness/observation.rs (new)
- crates/librefang-types/src/uar_run.rs (serial)

F-SCHEMA-SCHEDULING, surrealdb-schema-engineer, first part of child 2.3 / parent 03/6:
- crates/librefang-memory/src/substrate.rs (focused concrete reset API accepting excluded job IDs; no new attempt DB, schema or migration)

The schema engineer records the accepted exclusion input/result contract, native-call compatibility and immutable source checkpoint before releasing substrate.rs. F-RETRY consumes that API; it does not edit substrate.rs. Any required substrate follow-up returns ownership to the schema engineer before retry resumes. This is the explicit schema-owner handover, separate from F-STORAGE.

F-RETRY/projections, remaining child 2.3–2.4 / parent 03/6–7:
- crates/librefang-kernel/src/kernel/mod.rs (serial from selection; wake_agent_after_approval policy transfer only)
- crates/librefang-kernel/src/kernel/uar_harness/mod.rs (serial from control; lifecycle module/export wiring only)
- crates/librefang-kernel/src/kernel/handles/task_queue.rs
- crates/librefang-kernel/src/kernel/accessors.rs
- crates/librefang-kernel/src/kernel/cron_tick.rs
- crates/librefang-kernel/src/kernel/triggers_and_workflow.rs
- crates/librefang-kernel/src/kernel/uar_harness/lifecycle.rs (new)
- crates/librefang-api/src/routes/task_queue.rs
- crates/librefang-api/src/routes/uar/delegated_tasks.rs
- crates/librefang-api/src/routes/uar.rs
- crates/librefang-api/src/routes/network.rs

F-TEST, child 3.1–3.2 / parent 03/8–9:
- crates/librefang-kernel/tests/bauar_harness_delegation.rs (new)
- crates/librefang-kernel/tests/kernel_handle_contract_task.rs
- crates/librefang-api/tests/task_board_assignee_wake_test.rs
- scripts/integration/bauar-harness-gate.mjs (new)

F-RETRY releases network.rs to F-MCP only after child 2.4 / parent 03/7 completes at a recorded immutable A2A checkpoint. Other discovered callbacks and original C05 gate script remain read-only. New modules <=500 lines; existing large modules get necessary wiring only.

## Risks / Trade-offs

Broad existing source history requires explicit baseline record and diff isolation. Separate scheduling and attempt DBs require durable intent plus reconciliation, not invented atomicity. UAR02 schema is a hard dependency for strict caller migration. Nested OpenSpec actionContext currently allows only workstreams/bauar; driver must establish an explicit product-root execution binding and exact claims before apply.

## Migration Plan

Amend parent/child mapping, accept storage and dispatch eligibility, freeze provider contract. Implement F-STORAGE, record handover, then F-HARNESS. Retain old projection reads; never reinterpret in-flight completion-driver jobs as full-harness attempts. Rollback disables new selected admissions while preserving receipt/observation/unknown data; no deletion or replay.

## Verification

After all selected production is complete, trace real kernel->UAR router/executor->safe effect through both supported entry paths. Cover context, unsupported requirements, lost response/exact retry/conflict/credential revision, replay/gaps, cancellation/restart, retry/PATCH/stale/pending/event/cron wakes, both A2A views, interrupted persistence and native compatibility. Include unsupported ephemeral-selection negatives. Record task/run/decision/cursor/effect identities and secrets canaries. Run the smallest completed production integration gate then required serialized checks with isolated CARGO_TARGET_DIR. No product gate has run. BAUAR delta bounds the newly selected scenarios and feature diff, not the number of real layers traversed: the gate must traverse the actual Bossfang kernel, UAR router/executor, persistence and safe effect. A mock UAR or local contract-only test cannot replace it. Parent04/10 is the independent final review task, receiving child3.2 and MCP child2.2 evidence after the complete delivery; no duplicate final-review task is needed.

## Observed cursor/fragment correction

Provider source emits contiguous internal events then filters RuntimeStep from public AGUI; selected preflight now requires provider event_cursor_profile=contiguous_cursor_frames_v1, which adds nonexecutable uar.cursor for suppressed full-harness events. Consumer preserves strict real gap/retention handling. Bounded private content carry commits safe projected event groups/cursor/outcome atomically through additive existing store apply_uar_attempt_events (single-event wrapper retained), <=4MiB group, <=1MiB event. Incomplete groups do not advance. Exact store/control/caller source extensions are in parent bindings. Three isolated legacy afc-c05 approval bodies migrate to caller-observed expectedRevision; historical receipts and actual C05/shipping acceptance are untouched.

## Accepted Task6 durable dispatch refinement (source handoff)

The original reset-exclusion-only proposal above is superseded by the accepted task6-dispatch-intent-contract.md and immutable task6-schema-handoff/receipt.json in parent evidence. Use concrete SQLite task_queue.payload version-one tagged intent and enduring Native classification, not a process-only list. Claim selected intent before descriptor preflight. Created permits the first preflight/reservation; Existing loads only the original A2A row and absent row means reconciliation-required unknown, superseding the earlier table suggestion to repeat reservation. Exact-list native wake returns newly claimed rows only; prompts identify these rows as already claimed. Selected outcomes reconcile idempotently from original durable A2A metadata; no cross-store atomicity or effect-settlement claim. Surreal alternate route remains unchanged and uncertified. Root allocated exact Task6 feature paths in execution-bindings.json, including admission.rs and job_mapping.rs. No runtime gate has run.
