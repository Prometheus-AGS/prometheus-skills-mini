# Task4 selected service-job mapping source handoff

Source authored only, no acceptance/gate/compile claim. The exact twelve authored files and SHA-256 hashes are in mapping-handoff-source.json. All new modules stay below500lines; oversized existing files get surgical API/module forwarding. Selection prerequisite is selection-handoff/receipt.json. Provider interface receipt manifest880a1ff8f5765375fd87b75cd09d7f82255e040af9429a06b0a7cc6f45703a1d is source evidence only; subsequent provider revisions supersede it.

## Actual authority producer

POST /api/uar/jobs/{job_id}/admission is registered through the existing UAR router. It requires AuthenticatedApiUser from middleware, Owner role, non-synthetic owner_principal, and a registered live AuthManager user with ModifyConfig permission. It loads the actual durable task via KernelApi.task_get and requires its real assigned agent through the existing can_access_agent policy. It never accepts body/header subject, tenant, replacement input, created_by or attempt counters. Owner's existing administrative task-board access is used; body provenance is not ownership evidence.

This is explicitly service-scoped execution: the authenticated local initiating owner is stored as user:<id>, while the application-published private UAR runtime credential authenticates a separate receiver service authority. These are not asserted equal. Workspace is an explicit operator selection scoped by the receiver's authenticated deployment binding; it is not inferred as a tenant or user claim. Delegated-user mode is unsupported because no actual verified remote user/tenant mapping exists. Synthetic root/master-key/no-auth/loopback callers cannot create selected jobs, since the middleware sentinel does not distinguish those authorities. Existing ordinary native/manual identities keep their behavior. No IdP, new client, transport boot or default remote receiver was added.

SelectedUarJob fields are now crate-visible rather than public external producer fields. The actual mapper uses live registered-owner authorization. The type is not an authentication proof and has no Deserialize/Debug. A2A task caller scope is stamped from that initiating owner instead of None. Later task5/7 must enforce selected owner/synthetic-root rules across all control/A2A views; current historical admin control policy is not newly certified.

## Exact body/policy mapping

The request requires authority=service and configurationPolicy/toolPolicy/resourcePolicy=bound_uar_definition. This explicitly opts into UAR's selected definition as model/tool/resource policy authority. The assigned native agent supplies local access/context only; native configuration, budgets, tool allowlists, working directory and resource policy are NOT implied equivalent or inherited. A native-policy request is a named unsupported error.

- Actual stored task title + two newlines + description -> CreateRunRequest.input.
- Explicit Owner-authorized history -> history.messages; session_id and history.session_id use the same stable job session. Accepted provider roles user/assistant/tool and matching unique tool calls/results are checked; source bounds are1000messages/4MiB counted content/call payload from provider runtime/turn/host/history.rs, not an invented size policy. Unknown history fields fail extraction. Historical tool data is context, not a replay command.
- Explicit bindingId + bindingRevision -> deployment_binding_id (existing prepare) and service_placement.bindingId/bindingRevision. Exact syntax observed in provider service_instance.rs:63–76 and receiver routes.rs:549–550. App-published UarEffectiveBinding supplies instance/profile/locality/endpoint roles/credential reference. Required capabilities include full_harness_delegation_v1 and are checked by selected admission.
- definition{id,version,digest} is retained as the operator-requested pin. It is not mislabeled receiver-verified definition-digest evidence. Receiver binding revision is checked by the provider before run admission and by the Boss wire receipt against initial prepared placement. Requested pin and receiver evidence remain distinct.
- reasoningEffort maps exactly none/low/medium/high/max.
- Bound definition owns tool/resource grants and working directory. Additional per-job grants and paired-host tool_admission return explicit unsupported errors; an ordinary service credential is not fabricated SidecarGuard proof.
- Per-job required maxTokensPerTurn,maxTokensPerSession,maxToolCallsPerTurn,maxCostPerSessionUsd,timeoutSeconds,requestsPerMinute,tokensPerMinute each returns its own named unsupported error. There is no fabricated top-level budget field and no claim that requested bounds were proved by arbitrary artifact metadata.
- Required durable restart recovery/steer refuse before admission. Unknown top-level fields/raw run/token/actor objects fail typed extraction.

Existing canonical prepare covers every emitted body field, including history and binding revision. Boss local body digest remains distinct from provider body+workspace digest; no cross-language floating-point hash equality is asserted. Credential revision is None because this service publication exposes no trustworthy revision: no revision is fabricated and an Existing attempt never reconstructs/refreshed-submits credentials.

## Real kernel path

AppState.kernel is Arc<dyn KernelApi>. Correct extension is crates/librefang-kernel/src/kernel_api.rs (NOT types/src/kernel_api.rs). Object-safe async send_job_message and send_job_message_streaming trait methods forward to the existing concrete selected seams. Alternate trait implementations default to native forwarding or explicit selected-unavailable, never silently native fallback. The endpoint's streaming flag exercises the same selected streaming entry, returning a receipt distinct from later observation. Disabled uar-driver responds explicitly unavailable. Task5 will attach observation/control; no synthetic native stream/completion/usage is produced.

## Stable identity and legacy overwrite closure

Memory substrate task_post creates UUID task IDs (substrate.rs:1163). JobAttemptRef::selected_task_id validates the stored UUID and fixed first-release attempt1, returning uar-job-v1-<uuid>-1. retry_count never becomes an attempt allocator. New terminal attempts require a separate future explicit policy. The selected dispatcher requires this exact JobAttemptRef/task-ID relationship; opaque external callers cannot populate SelectedUarJob fields. Admission/delegation/session IDs are deterministic derivatives in the mapper.

Both legacy API admission (before preflight) and driver retain_connection reject this reserved namespace, including after completion/restart/missing retained projection. Selected retained slots are additionally tagged; legacy replacement tests that tag under the same write lock. Explicit authorized refresh preserves/derives the tag. Ordinary manual IDs outside the reserved namespace do not require a broad durable-list check and preserve behavior. No source-authored earlier task3 arbitrary-ID records have been executed, so no invented historical migration is needed.

Selected API classification uses durable reservations, matching original initiating owner/job/tenant and then loading its original workspace/receipt. Missing DB/projection is unknown. Existing ignores fresh body/configuration for execution, never preflights or installs a replacement connection and only reconciles original identity/epoch. The initial descriptor preflight remains read-only; durable Created commit precedes private connection installation and execution admission.

## Remaining integration and source scenarios

Authored but NOT RUN: explicit unsupported limits/native/delegated/paired-host cases; actual stored input/history/receiver binding revision appearing in the mapped body and canonical digest; fixed attempt namespace independent of retry counters; unregistered root refusal. Existing selected restart scenario fixture now uses the enforced UUID namespace. This source work is not a test gate.

Still pending: task5 exact approval/revision cutover and selected owner-aware controls, bounded known-secret presentation mapping before persistence, task6 all scheduler/wake paths and task-board admission race handling, task7 both A2A views including synthetic-root/admin classification. The newly selected endpoint is source authored within an incomplete delivery; it is not safe-to-release evidence while those paths remain unfinished. No scheduling/native loop callers were migrated in task4. The final gate must traverse actual KernelApi/kernel -> UAR router/executor -> persistence -> safe effect through both supported entries, not these source scenarios or mocks.

No compiler, test, lint, build, service/dependency operation, commit, canonical mutation, blocked diagnostic or judge call ran.
