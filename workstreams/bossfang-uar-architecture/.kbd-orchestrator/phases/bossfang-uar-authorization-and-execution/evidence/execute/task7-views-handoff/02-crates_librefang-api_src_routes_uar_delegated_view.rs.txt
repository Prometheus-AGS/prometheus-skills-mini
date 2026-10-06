//! One non-executable selected product view shared by root JSON-RPC and REST A2A.
//! Only original durable relation + registered initiating owner grants access.
use crate::{routes::AppState, middleware::{AuthenticatedApiUser, UserRole}};
use librefang_memory::task_dispatch::JobDispatchState;
use librefang_types::uar_run::*;
use librefang_kernel::kernel::uar_harness::{mapping, observation};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct SelectedTaskView {
    id: String,
    status: String,
    harness: &'static str,
    job: JobAttemptRef,
    original_owner: String,
    workspace_id: String,
    admission_id: String,
    runtime_epoch: String,
    uar_task_id: Option<String>,
    run_id: Option<String>,
    definition: UarDefinitionIdentity,
    revision: u64,
    cursor: u64,
    execution_state: String,
    effect_state: String,
    recovery_state: String,
    cancellation_state: String,
    cancellation: UarRunCancellation,
    history: Vec<UarAttemptPresentationEvent>,
    historical_text_available: bool,
    history_is_executable: bool,
    usage: Option<ObservedUsage>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ObservedUsage {
    source: &'static str,
    event_id: u64,
    run_id: String,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
    model: Option<UarSecretExcludedText>,
}

pub(super) async fn original(
    state: &AppState, task_id: &str, user: Option<&AuthenticatedApiUser>,
) -> Result<Option<UarReservedJobAttempt>, String> {
    let Some(user) = user else { return Ok(None); };
    if user.role != UserRole::Owner || user.owner_principal().is_none() { return Ok(None); }
    let Ok(owner) = mapping::service_initiator(state.kernel.auth_manager(), user.user_id) else { return Ok(None); };
    let store = state.kernel.a2a_tasks();
    let reservation = store.list_uar_job_attempts().map_err(|_| "selected_attempt_storage_unknown")?
        .into_iter().find(|item| item.boss_task_id == task_id && item.verified_subject == owner);
    let Some(reservation) = reservation else { return Ok(None); };
    if reservation.job.selected_task_id().as_deref() != Some(task_id) || reservation.verified_tenant.is_some() {
        return Err("selected_attempt_identity_conflict".into());
    }
    let intent = state.kernel.read_job_dispatch_intent(&reservation.job.job_id).await?;
    if !matches!(intent, Some(JobDispatchState::Selected(ref intent))
        if intent.job == reservation.job && intent.local_task_id == task_id
            && intent.initiating_owner == owner && intent.workspace_id == reservation.workspace_id) {
        return Err("selected_attempt_intent_unknown".into());
    }
    let original = store.get_uar_job_attempt(&owner, None, &reservation.workspace_id, &reservation.job)
        .map_err(|_| "selected_attempt_storage_unknown")?.ok_or("selected_attempt_outcome_unknown")?;
    let task = store.get(task_id).ok_or("selected_attempt_outcome_unknown")?;
    if task.caller_a2a_agent_id.as_deref() != Some(owner.as_str())
        || original.projection.verified_principal != owner {
        return Err("selected_attempt_identity_conflict".into());
    }
    Ok(Some(original))
}

pub(super) fn cancel_revision(projection: &UarDelegatedRunProjection, expected: Option<u64>) -> Result<u64, String> {
    let expected = expected.ok_or("selected_expected_revision_required")?;
    if expected != projection.revision { return Err("selected_revision_conflict".into()); }
    Ok(expected)
}

pub(super) fn view(state: &AppState, original: UarReservedJobAttempt) -> Result<serde_json::Value, String> {
    let events = state.kernel.a2a_tasks().uar_attempt_events_after(&original.reservation, 0)
        .map_err(|_| "selected_history_unavailable")?;
    serde_json::to_value(project(original, events)).map_err(|_| "selected_view_unavailable".into())
}

fn project(original: UarReservedJobAttempt, history: Vec<UarAttemptPresentationEvent>) -> SelectedTaskView {
    let reservation = original.reservation;
    let projection = observation::receipt(original.projection);
    // This is a retained provider observation, never an estimate or a sum of
    // potentially cumulative reports. Missing historical usage remains null.
    let usage = history.iter().rev().find_map(|event| event.parts.iter().rev().find_map(|part| match part {
        UarPresentationPart::Usage { input_tokens, output_tokens, total_tokens, model } => Some(ObservedUsage {
            source: "uar_observed", event_id: event.event_id, run_id: event.run_id.clone(),
            input_tokens: *input_tokens, output_tokens: *output_tokens, total_tokens: *total_tokens, model: model.clone(),
        }),
        _ => None,
    }));
    let historical_text_available = history.iter().any(|event| event.parts.iter().any(|part|
        matches!(part, UarPresentationPart::Message { .. } | UarPresentationPart::ToolResult { .. })));
    SelectedTaskView {
        id: reservation.boss_task_id, status: projection.execution_state.clone(), harness: "uar",
        job: reservation.job, original_owner: reservation.verified_subject,
        workspace_id: reservation.workspace_id, admission_id: reservation.admission_id,
        runtime_epoch: reservation.runtime_epoch, uar_task_id: projection.uar_task_id,
        run_id: projection.uar_run_id, definition: reservation.definition,
        revision: projection.revision, cursor: projection.cursor,
        execution_state: projection.execution_state, effect_state: projection.effect_state,
        recovery_state: projection.recovery_state, cancellation_state: projection.cancellation_state,
        cancellation: projection.cancellation, history, historical_text_available,
        history_is_executable: false, usage,
    }
}

#[cfg(test)]
#[path = "delegated_view_tests.rs"]
mod tests;
