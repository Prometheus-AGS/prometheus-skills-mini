# Design: Bossfang harness delegation

## Context

See proposal.md and the [analysis](/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/analysis.md). Reuse cand-001 UAR C05 API and the existing Bossfang C05 initiative. Native Bossfang dispatch calls its agent loop in [agent_execution.rs](/Users/gqadonis/Projects/references/librefang/crates/librefang-kernel/src/kernel/agent_execution.rs:1575); streaming dispatch also reaches the loop in [messaging.rs](/Users/gqadonis/Projects/references/librefang/crates/librefang-kernel/src/kernel/messaging.rs:3163). Product task operations are backed by [task_queue.rs](/Users/gqadonis/Projects/references/librefang/crates/librefang-kernel/src/kernel/handles/task_queue.rs:1) and the memory substrate. This is targeted dispatch evidence, not a full audit of these large modules.

## Goals / Non-Goals

A UAR attempt uses one executor and durable product attempt metadata. Preserve existing job scheduling, native provider behavior and product history. No new UAR loop/task authority, no librefang-cli expansion, no unrelated Codex/Claude rewrite. cand-006 is a separate true inference mode only; the current execution-shaped driver cannot be called inference-only.

## Decisions

1. Add a feature-scoped harness adapter selected before entering either streaming or non-streaming Bossfang model loop. Both entry paths route a UAR-harness attempt into the same adapter contract. Native model providers continue existing dispatch. Preserve normal stop→EndTurn as counterevidence against unconditional duplicate effects; failure cases require observation.
2. Persist an additive versioned attempt record in Bossfang's existing durable product storage: job/attempt, owner/workspace, harness, admission ID, expected UAR epoch, requested capabilities, credential reference/revision, optional returned task/run receipt, cursor and explicit outcome. Commit admission identity before network submission and receipt before dependent product transitions. Product history is not a runtime checkpoint. New persistence module/record names are implementation choices; do not overwrite existing task JSON with an unversioned opaque blob.
3. Use capabilities → admission → reconciliation → status/events → exact approval/cancel/detach from the existing UAR full-harness routes. Do not duplicate RunManager. Exact request digest includes credential material: reconciliation by admission is preferred after a lost response. Never persist plaintext to reconstruct a retry; changed credential material conflicts. If the exact request is unavailable and reconciliation cannot establish an outcome, retain unknown instead of creating another admission.
4. Persist and compare runtime epoch and retention limits. Stream retries are observation retries only. Deduplicate presentation by event identity/cursor; never translate internal executed tool events into Bossfang tool proposals. Cancellation is a requested transition, not a guaranteed rollback.
5. Recovery is capability-gated regardless of the final product profile. The current provider supports process-ephemeral execution only. RECOVERY-PROFILE-DECISION blocks release-scope and implementation dispatch for recovery-specific tasks: the operator must select explicit unsupported/unknown behavior or request a separately specified durable extension. The generic handover approval is not that selection. No guessed durable design is hidden in these specs.
6. Admission/enforcement originates in 01/02. Reuse original C05.1–3 ownership; require immutable accepted provider checkpoint, consumer assignment and integration receipts. The Boss native adapter remains a comparator and existing run client; this change does not mandate converting all The Boss runs to C05. Any future additional consumer conversion needs an explicit scoped delta.

### Identity and cursor keys

Provider admission namespace is (verified ActorOwner, workspace, admission_id); runtime epoch is a client guard against reuse across provider restarts. The exact body/workspace digest is compared within that namespace. Changed body under the same namespace yields admission_digest_conflict; changing owner/workspace selects another namespace and is NOT promised to yield that error. Such a change is forbidden for retry/reconciliation by the adapter and separately constrained by authorization. A changed epoch produces unsupported/unknown reconciliation, not a fabricated digest conflict.

The provider full_harness/handlers.rs:181–245 accepts numeric last_event_id or Last-Event-ID and uses event.id for replay/order. Deduplication key is (runtime_epoch, task_id, run_id, event.id); store last applied numeric cursor with the versioned product attempt and atomically apply its associated product event/outcome update. Drop replay IDs at or below the cursor, reconcile forward gaps, reject malformed IDs as observation errors, and never fabricate an execution event ID. An auxiliary non-executable diagnostic without an ID cannot advance the execution cursor. Product storage must provide this transaction; if its accepted backend cannot, stop for an explicit storage delta rather than claim crash-safe presentation.

### Admission envelope mapping

The inspected UAR CreateRunRequest at src/uar/api/routes.rs:71–98 supports input; agent_id or artifact; deployment_binding_id/service_placement; session_id; run_credentials; mcp_servers; tool_admission; working_directory; reasoning_effort; history; skill_attachments; and presentation negotiation. Full-harness adds admission_id/native_task_id and uses the same admission authority. The adapter must explicitly map selected job requirements into these supported inputs and the selected agent artifact's policy. Treat optional fields as optional only when the job does not require their semantics. Provider capability profile and agreed configuration/inspection contract determine supported budgets/tool policy; do not invent a numeric budget field or infer capability from arbitrary JSON acceptance. Record the non-secret mapping/effective-policy receipt in product attempt diagnostics. Unsupported required semantics reject before submitting a run. Author a context/history/tool-policy acceptance case in addition to the one-loop case.

## Scope and sequencing

After 01/02 contracts: Bossfang kernel agent_execution.rs and messaging.rs dispatch hooks, feature-scoped new kernel/runtime harness adapter, task_queue.rs and memory substrate persistence integration with new feature-scoped records, selected librefang-types contracts, and librefang-llm-drivers/src/drivers/uar.rs compatibility/selection boundary. New modules must avoid enlarging already oversized files; no unrelated refactor. Kernel retry/task_retry and scheduled-job resumption call sites that can dispatch this selected harness are included in the one-attempt policy. Plan must enumerate these call sites and concrete additive persistence schema at the accepted C05 checkpoint before assigning writes.

UAR full_harness.rs/handlers.rs are read/consume surfaces unless the integrated adapter exposes a specific provider gap; such a delta must be reconciled with the existing owner. 04 follows for resource lifecycle. No simultaneous writers to shared kernel/host modules.

## Risks / Trade-offs

- Existing generic task retry can create a fresh execution → carry explicit attempt/outcome semantics through every reachable UAR dispatch and forbid uncertainty-driven resubmit.
- Process restart loses provider admission memory → epoch check; no unsupported recovery promise.
- Multi-repository rollout is not atomic → provider capability first, consumer requirement second; unsupported endpoint blocks selected job.
- Unknown outcome requires operator reconciliation → retain evidence and avoid falsely reporting failure with no effects.

## Migration Plan

Resolve C05 ownership and recovery scope before Plan dispatchability. Add provider-compatible consumer selection, record schema and reconciliation; migrate new UAR-harness jobs explicitly. Existing in-flight completion-driver jobs finish under their original identity; do not reinterpret them as admitted full-harness runs. Disable new UAR-harness admission for rollback while retaining attempt/receipt records and observation; do not delete uncertain attempts or resubmit them using another provider.

## Verification

After complete selected production delivery, trace job submission to one UAR model/tool loop and one safe effect, including both dispatch entry paths. Lose admission response, repeat exact payload, change payload (409 admission_digest_conflict), interrupt/replay stream, cancel during effects and restart UAR. Check exact task/run IDs, effect counter and classified outcome rather than merely checking HTTP success. Unsupported steer/recovery must remain visibly unsupported. Codex thread/turn and Claude task/run are comparison vocabulary, not acceptance of their adapters.
