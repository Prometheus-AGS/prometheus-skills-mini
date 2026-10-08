# Task7 delegated product views — source handoff

Exact 10 source paths and hashes: task7-views-handoff-source.json. Source authored only. No compiler, test, build, formatter, lint, service or gate executed. Source claims released; network may transfer to MCP slices after coordinator snapshot acceptance.

## Shared product projection

Root JSON-RPC tasks/get and REST GET /a2a/tasks/{id} share delegated_tasks::refresh_task -> Result<Option<serde_json::Value>, String>. Ordinary native/manual results retain A2aTask serialization. Selected results are SelectedTaskView: id, status, harness, job/attempt, originalOwner, workspaceId, admissionId, runtimeEpoch, uarTaskId/runId, definition, revision/cursor, executionState, effectState, recoveryState, cancellationState, cancellation, typed history, historicalTextAvailable, historyIsExecutable=false, and optional observed usage. historicalTextAvailable means some retained human/model/tool text exists, not a claim of complete remote history. Empty historical parts remain unavailable. No raw envelope/tool arguments or runtime diagnostic strings enter this view.

The selected producer requires a registered non-synthetic initiating Owner, the matching actual task-board Selected intent, original private reservation, task owner and projection owner. This closes the actual selected root cancel native/admin fallback. Wrong owners receive not-found before any control request. Neither caller headers nor request-owned workspace/owner fields establish authority.

## Exact cancellation

All three selected surfaces require expectedRevision: root tasks/cancel params {id,expectedRevision}, REST /a2a/tasks/{id}/cancel JSON body, and /api/uar/delegations/{id}/cancel JSON body. Missing or locally stale values refuse before remote mutation. UarRunClient::cancel_selected(&originalProjection, callerExpectedRevision) uses original retained transport/task/epoch and direct receipt_request; it never looks up a replacement revision. Receiver conflicts remain refusal/unknown, never automatic retry. The shared REST/root handler reports fixed selected_revision_conflict; direct selected control retains its fixed safe control error mapping. Native/manual cancel behavior is unchanged.

Cancellation requested, acknowledged, terminal and cleanupUncertain are separately presented, alongside execution/effect/recovery state. An unsuccessful/uncertain selected request cannot manufacture acknowledgment or effect settlement. Admission acknowledgment, terminal cancellation and retained history do not authorize replay.

## Usage persistence

Actual provider source src/uar/api/sse.rs RunDoneWithUsage produces agui.done.data.usage. Driver mapping persists additive typed UarPresentationPart::Usage through the existing atomic event/cursor/outcome transaction. Exact optional u64 input/output/total counts are copied; missing/invalid values remain absent. Total is never computed. Optional model goes through the original finite secret projection before typed construction. cost_usd_estimate is omitted. The view selects the latest retained usage part with its original run/event identity, never sums potentially cumulative reports. Old metadata-only events remain usage:null. No schema migration or new persistence authority.

## Authored scenarios and final acceptance

New delegated_view_tests source covers original identity, separate cancellation facts, data-only history, absent usage, exact counts without invented total, and exact/missing/stale cancellation revisions. Driver source scenarios cover observed zero versus absent counts, invalid values, omitted estimates and projected model copies. These have NOT run and are not a substitute for the full real-path fixture. Independent FTEST owner received all three request shapes and will author missing/stale controls with unchanged provider effect counts, actual 10/5/15 provider usage and retained views after restart.

## Supported profile and scheduling limits

This release supports explicit manual selection of an actual stored job. POST /api/tasks can publish a native wake before a later selection request; the authoritative Native claim then rejects late UAR selection. Selected-intent-first blocks the exact targeted native loop. The intentional manual-selection fixture disables assignee wakes and sweep at setup, while a separate real race fixture exercises enabled native wakes. Production defaults are unchanged. No automatic UAR selection at post, background UAR scheduling readiness, executable historical recovery or cross-database atomicity is claimed.
