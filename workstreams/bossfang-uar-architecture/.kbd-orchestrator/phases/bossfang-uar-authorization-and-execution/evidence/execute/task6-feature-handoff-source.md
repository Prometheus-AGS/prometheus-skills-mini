# Task6 feature source handoff

Source authored only; no runtime acceptance. Schema checkpoint a31f63d remains untouched. Exact 12 changed file hashes are in task6-feature-handoff-source.json. Feature source claims released; network lease remains held for Task7.

## API contract

- KernelApi / LibreFangKernel: async read_job_dispatch_intent(&self, job_id: &str) -> Result<Option<librefang_memory::task_dispatch::JobDispatchState>, String>; async reconcile_selected_jobs(&self) -> Result<(), String>. Alternate implementations return fixed unavailable errors.
- Admission first commits SelectedJobIntent against actual stored assignee. Only Created permits descriptor preflight and first A2A reservation. Existing checks the original A2A relation; absence returns unknown without fresh preflight, credentials or body. Both native and selected claims share schema payload CAS authority.
- claim_native_job_prompt(agent, exact IDs) returns only newly claimed rows serialized as ALREADY CLAIMED. Duplicate fires return None; no generic discovery substitutes for the exact row. Typed TaskPosted IDs pass alongside dispatch without changing public TriggerMatch. Pending rows are each dispatched by exact ID.
- claim_task_workflow_input(job, context) resolves actual stored registered assignee, claims that exact row, preserves workflow context and appends the actual claimed row in existing workflow input. Selected/unknown/already claimed cannot launch a workflow. Unassigned targeted workflows explicitly refuse missing claimant mapping. Untargeted workflows unchanged.
- reconcile_selected_jobs loads original private reservation/projection and invokes schema idempotent reconciliation. Unknown, lost epoch and missing private state do not advance the board. A2A transaction and task-board transaction remain separate.
- Legacy A2A message/send refuses reserved selected namespace before product insert/model effect. Root selected get/cancel require the actual registered initiating Owner and use bounded typed observation / fixed unknown safe receipts. Manual/native root behavior retained.
- Retry/PATCH/delete return explicit selected original-control requirement; substrate CAS independently closes classification races. Generic native completion refuses selected/unknown before publishing a completion event.

## Authored scenarios (not run)

Lifecycle source covers exact native row/one claim, selected intent with absent private attempt, actual assigned workflow/context preservation, and selected/unknown/unassigned workflow refusal. Admission source callers were surgically migrated to required SelectedClaim. No mocks substitute for final full-stack acceptance; independent FTEST owner holds real router/provider/effect gate source.

## Remaining boundaries

Cron AgentTurn and deferred native approval carry no stored JobAttemptRef and remain native, as explicitly accepted. No prompt parsing, invented mapping, new client or scheduler credential recovery. Native reset/retry may repeat native effects under its preexisting policy, but enduring Native classification prevents cross-harness selection. Task7 must expose original owner, revision, history, cancellation uncertainty and provider usage. Full delivery compiler/runtime/integration verification is pending.
