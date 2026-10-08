# Task6 schema source handoff

Role: surrealdb-schema-engineer, serial ownership. Root: /Users/gqadonis/.claude/worktrees/bauar-bossfang. Parent6 begun151, child6 begun44. Source checkpoint consumed: control-handoff/receipt.json coordinator56c681d. Exact four source hashes/line counts are in task6-schema-handoff-source.json. New task_dispatch.rs is 295 lines; scenarios 168. Existing substrate.rs received only task-dispatch extraction/wiring and required task mutation predicates; lib.rs only reexports the new typed API. No caller, Surreal, migration, dependency or service changes.

## Public API

Types are named through librefang_memory::task_dispatch. Methods remain inherent MemorySubstrate methods:

- task_claim_selected_intent(&self, intent: SelectedJobIntent) -> LibreFangResult<SelectedClaim>
- task_claim_native_wake(&self, jobs: &[String], agent: &str, agent_name: Option<&str>) -> LibreFangResult<Vec<ClaimedNativeJob>>
- task_read_dispatch_intent(&self, job: &str) -> LibreFangResult<Option<JobDispatchState>>
- task_reconcile_selected_outcome(&self, intent: SelectedJobIntent, reservation: UarJobAttemptReservation, projection: UarDelegatedRunProjection) -> LibreFangResult<SelectedReconcile>

SelectedJobIntent contains exact JobAttemptRef, deterministic local_task_id, initiating_owner, workspace_id, expected_assignee. The verified producer must derive these from the authenticated initiating Owner, actual stored job and application binding; this public struct is not authentication proof. Validity requires first-release selected_task_id identity and nonempty owner/workspace/assignee. No run body, credentials, human input/history or raw diagnostics exist in the intent.

SelectedClaim = Created | Existing | Conflict | Unknown | NotFound. Created follows a committed IMMEDIATE transaction that reads the actual job, checks pending + exact expected_assignee + empty payload, and writes the selected intent/status=in_progress/claimed_at together. Existing requires byte-decoded original metadata equality, including after failure/restart/terminal outcome. Different original intent or a Native tag is Conflict regardless of reset status. Unknown/version-unsupported nonempty payload is preserved. Missing job is NotFound, never a newly created job.

IMPORTANT caller ordering: Created permits the first descriptor/preflight/reservation path, not replay. Existing must load/reconcile the original private A2A reservation. Existing selected intent with no A2A row (crash or failure before reservation) is reconciliation-required unknown; never perform a new preflight/admission or native fallthrough. Scope includes caller cancellation after intent commit: no automatic intent release was added.

JobDispatchState = Unclaimed | Native(NativeJobIntent) | Selected(SelectedJobIntent) | Unknown; outer None is missing row. Empty legacy pending rows are Unclaimed; empty non-pending legacy rows are reported Native from actual status/assignee. Supported tagged payloads retain their classification regardless of status. This API exposes metadata, not executable authority.

## Native authority and original policy

Native claim is an IMMEDIATE transaction with the original pending -> in_progress CAS, actual UUID/name/unassigned matching, assigned_to and claimed_at. It stamps a stable Native tag containing actual job ID/original assignee. Exact-list wake returns ONLY newly claimed eligible rows with id/title/description/assigned_to/created_by/created_at/claimed_at/status. Existing in_progress or selected/unknown rows return no grant; duplicate IDs in one batch cannot claim twice. Callers must construct a prompt solely from returned rows and describe them as ALREADY CLAIMED, not issue an unrestricted discovery prompt. No token or native recovery lease was invented.

The original task_claim signature and JSON fields remain. It delegates to the same native transaction, picks the highest-priority/oldest eligible row, skips selected/unknown rows, and writes Native classification before returning work. The old optimistic select/retry loop is replaced by serialized IMMEDIATE selection/CAS so classification and claim are atomic. UUID/name/pool matching and native completion/retry/TTL policy remain.

Legacy empty-payload in_progress/terminal native rows acquire their enduring Native tag when reset/retry/failed->pending PATCH makes them runnable again. Native tags survive native retry; a later UAR selection always conflicts. This does not certify native retries as effect-free: the prior native retry policy still owns that uncertainty. Old status/assignee values are represented exactly, including empty legacy assignee; no new principal is invented.

Generic task_claim, task_complete, task_delete, task_retry, task_update_status (pending/cancelled), task_reset_stuck, task_expire_stale and task_prune_finished now classify payloads in Rust and guard each actual write with byte-exact payload equality, plus the existing status/TTL predicate. No unsafe JSON SQL predicate or process-only exclusion is used. A selected claim committed between read and UPDATE invalidates the stale native predicate. Stale sweep additionally rechecks its cutoff at the write and reports only changed rows. Selected and unknown records are not reset, completed, cancelled, deleted or pruned through generic native methods. Operator-facing list/get still expose records; the feature caller must not feed their unfiltered contents into native model prompts.

## Selected outcome reconciliation

SelectedReconcile = Applied | Unchanged | Conflict | Unknown | NotFound. The caller MUST load the original reservation and projection from the durable private A2A store; caller-constructed public structs do not establish authority. The API compares job/attempt, local task ID, local owner/workspace, UAR harness/no invented tenant, admission identity, request digest, definition, credential reference and runtime epoch. Missing original runtime/task/run identity or unavailable recovery posture returns Unknown.

The first applied checkpoint retains only the complete typed original reservation plus runtime/task/run/revision/outcome metadata inside the same payload. Later changes to that binding/epoch/run conflict; older revisions do not regress; terminal outcomes cannot be changed to another outcome. Matching repeats return Unchanged. The one SQLite taskboard transaction writes checkpoint, task status, fixed local result code and terminal timestamps. It does not store remote text, receipt diagnostics, input or credentials. effect_unconfirmed remains in the original private projection: taskboard execution completion is not proof of effect settlement.

A2A outcome and taskboard are separate stores: the feature owner must call reconciliation after private outcome commits and on restart/wake. A crash between them leaves a selected intent; repeat the idempotent projection, never re-execute. No distributed transaction is claimed. Selected intent/row retention is protected until a later explicit lifecycle policy, so old terminal selection cannot silently become fresh work.

## Authored source scenarios / pending integration

Seven scenario functions cover: selected preflight pause + restart with no A2A row; reverse native winner + one newly claimed grant + retry/stale classification; concurrent first claims; unknown version payload protection across generic mutation/retention; legacy native reset tagging; interrupted taskboard outcome write then idempotent reconciliation and wrong-run/epoch refusal; byte-exact CAS invalidation after selection. These source scenarios use real SQLite APIs but have NOT run.

No tests, compiler, build, formatter, lint, service, dependency, canonical or commit commands ran. Source reads/diffs/hashes are authoring evidence only, not an independent review or release gate. Full kernel/provider/effect tests remain deferred until completed production. SurrealTaskBackend remains unwired here and unchanged; no parity certification or numbered migration was added.

## Serial transfer

All four schema paths are released to root for immutable snapshot. Feature caller ownership has NOT started in this agent. Root must transfer and bind exact admission/mapping/wake/trait paths before wiring: selected intent before preflight; exact native claim before any job-targeted model prompt; Existing+absent A2A unknown; original outcome reconciliation; selected approval/cron/event/retry/PATCH routing. Existing native reservation is never permission for a second simultaneous targeted loop. Tasks with generic triggers that cannot provide exact job IDs need an explicit unsupported/selection-safe routing decision rather than a prompt-only workaround.
