# Task 6 prerequisite — persistent selection/native race authority

This is a source-grounded API proposal, not an implementation or migration allocation. No Task6 source is written.

## Observed execution paths

- kernel/uar_harness/admission.rs40–46 does selected read-only descriptor preflight before the durable A2A reservation78. During that window there is no selected relation for another wake to consult.
- memory/substrate.rs1222 task_claim SELECTs pending jobs then CASes status to in_progress1283. All public kernel TaskQueue operations in kernel/handles/task_queue.rs call this concrete SQLite substrate, including task_get/list/retry/PATCH, even when other memory backends are configured.
- triggers_and_workflow.rs29–43 and349 explicitly start a model turn that subsequently invokes task_claim. A task_claim-only exclusion therefore cannot prevent a native model turn targeting a job during selected preflight.
- kernel/accessors.rs831 reconciles pending wakes, then843 invokes concrete substrate.task_reset_stuck. substrate.rs1531 selects expired in_progress rows;1560/1569 retry them or mark failed. TaskBackend only exposes task_reset_stuck (backend.rs230). SurrealTaskBackend implements that operation for its separate running task_queue rows, but it is not the live TaskQueue route above. No numbered Surreal migration is justified by this inventory.

## Smallest candidate contract for schema-owner acceptance

Use the existing durable SQLite task_queue authority to establish an explicit versioned execution-intent claim BEFORE either selected preflight/admission or a job-targeted native model wake. Do not put this business decision solely in a process lock or derive it from retry_count. A typed intent contains only job/attempt, harness, initiating owner/workspace and immutable local correlation; no run input/history/credential values.

The inspected collaboration task_post writes an empty payload BLOB (substrate.rs1204–1206); task claim/get APIs do not expose or mutate that field. A narrow candidate is a tagged version-one intent inside this existing payload, leaving empty legacy payload native-eligible and refusing to overwrite nonempty unknown payload. This avoids a new migration but is a PROPOSAL requiring schema-owner acceptance of payload semantics. If that column is reserved for another contract, use a small versioned task-intent relation in the SAME task database under the schema owner's migration allocation, not the A2A connection and not a guessed main-branch migration number.

Proposed methods in a new cohesive memory/substrate/task_dispatch.rs (<500 lines), wired surgically from substrate.rs:

1. claim_selected_job_intent(job_id, expected_assignee, typed_intent): SQLite IMMEDIATE transaction compares the actual stored job/assignee/status and existing intent, establishes selected authority once, returns Created/Existing/NativeClaimed/Unknown. In_progress or an already advertised native intent must reject a new selection. Created precedes descriptor preflight; failure after this claim stays selected-unknown, never becomes fresh native work.
2. claim_native_job_wake(job_ids, agent): atomically classify/claim the exact stored jobs before their titles/input reach a native model wake. Existing selected intents are excluded/reconciled; native wins make later selection conflict. Existing wake prompts drain generic queues, so Task6 must either thread exact eligible job IDs into those wake seams or deliberately constrain which pending jobs are offered. A filter followed by unguarded dispatch is not enough. A native wake that began before the new marker must settle before a competing selection can succeed; existing per-agent/session locks serialize execution but cannot substitute for persistent intent or close cross-process races.
3. read_job_dispatch_intent and reconcile_selected_job_outcome: original metadata survives restart; bridge private A2A outcome into taskboard status idempotently. This is explicit crash reconciliation between task DB and A2A DB, not a distributed transaction. An intent with missing A2A reservation means unknown; do not fabricate a new attempt or fall back.
4. task_claim, retry, failed->pending PATCH, stale reset, expiry and retention must all respect selected intent. Selected retry never becomes a fresh executable queue row. Preserve native signatures/behavior through thin wrappers; exclusion must occur in authoritative UPDATE predicates/transaction, not only an earlier list read.

## Exact requested ownership extensions (not yet granted)

Schema owner: crates/librefang-memory/src/substrate.rs (surgical wiring and exact task operation predicates); NEW crates/librefang-memory/src/substrate/task_dispatch.rs; NEW crates/librefang-memory/src/substrate/task_dispatch_tests.rs (<500, source authoring only). If TaskBackend/Surreal support is required for reset exclusions, exact crates/librefang-memory/src/backend.rs and crates/librefang-memory/src/backends/surreal_task.rs; no migration number proposed. The live concrete substrate must be handled regardless of that optional interface.

Feature steward after immutable schema handoff: previously planned task6 accessors.rs, triggers_and_workflow.rs, handles/task_queue.rs, kernel/mod.rs approval wake, and serialized routes/network.rs F-RETRY claim. Additional exact admission.rs and API job_mapping.rs slices may be needed to acquire the intent before preflight and return Existing/NativeClaimed truthfully; KernelApi/TaskQueue trait slices only if an actual API caller cannot use the kernel's inherent dispatch. Root must bind exact task6 paths and wake-ID contract before dispatch. No broad directory claim is requested.

## Required source scenarios for the completed integration gate

Pause selected descriptor preflight while a native assignee/pending/cron/event wake races the same stored job; exactly one persistent intent wins before either model or remote admission effect. Reverse the winner. Crash after intent before A2A reservation, after reservation before POST, and after private outcome before taskboard update; all resume as original/unknown reconciliation, never new native/remote execution. Race stale/reset/PATCH/retry/retention against the intent. Include legacy native rows and configured backend disposition. No scenario or gate has run.
