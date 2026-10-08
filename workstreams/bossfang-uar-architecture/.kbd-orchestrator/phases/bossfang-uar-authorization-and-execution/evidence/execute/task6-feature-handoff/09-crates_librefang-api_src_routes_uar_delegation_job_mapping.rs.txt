//! Real selected stored-job API. The authenticated local Owner initiates a
//! service-scoped run; the app's UAR credential supplies separate receiver
//! authority. No caller-provided subject/tenant or forwarded token is accepted.
use std::sync::Arc;
use axum::{Extension, Json, extract::{State, Path}, http::StatusCode, response::{IntoResponse, Response}};
use crate::{routes::AppState, middleware::{AuthenticatedApiUser, UserRole}, types::api_error};
use librefang_kernel::kernel::uar_harness::{ResolvedDispatch, JobDispatchOutcome, JobDispatchError, mapping::{self, JobSelectionRequest}};
use librefang_types::{agent::AgentId, uar_run::JobAttemptRef};

pub(super) async fn admit(
    State(state): State<Arc<AppState>>,
    api_user: Option<Extension<AuthenticatedApiUser>>,
    Path(job_id): Path<String>,
    Json(request): Json<JobSelectionRequest>,
) -> Response {
    let Some(user) = api_user.as_ref() else {
        return refusal(StatusCode::UNAUTHORIZED, "registered_service_owner_required");
    };
    // Root represents either a daemon key OR no-auth/loopback. It is not proof
    // of a registered human and cannot be promoted into selected job ownership.
    if user.0.role != UserRole::Owner || user.0.owner_principal().is_none() {
        return refusal(StatusCode::FORBIDDEN, "registered_service_owner_required");
    }
    let principal = match mapping::service_initiator(state.kernel.auth_manager(), user.0.user_id) {
        Ok(principal) => principal,
        Err(error) => return refusal(StatusCode::FORBIDDEN, error.0),
    };
    if let Err(error) = mapping::validate_requirements(&request) {
        return refusal(StatusCode::UNPROCESSABLE_ENTITY, error.0);
    }
    let task = match state.kernel.task_get(&job_id).await {
        Ok(Some(task)) => task,
        Ok(None) => return refusal(StatusCode::NOT_FOUND, "stored_job_not_found"),
        Err(_) => return refusal(StatusCode::SERVICE_UNAVAILABLE, "stored_job_unavailable"),
    };
    // Owner authority permits task-board access; the existing agent resource
    // policy additionally requires a real accessible assigned agent.
    let agent_id = match task["assigned_to"].as_str().and_then(|id| id.parse::<AgentId>().ok()) {
        Some(id) if crate::routes::can_access_agent(&state, id, api_user.as_ref()) => id,
        _ => return refusal(StatusCode::NOT_FOUND, "assigned_agent_unavailable"),
    };
    let job = JobAttemptRef { job_id: task["id"].as_str().unwrap_or("").to_string(), attempt: 1 };
    let Some(boss_task_id) = job.selected_task_id() else {
        return refusal(StatusCode::CONFLICT, "stored_job_identity_invalid");
    };
    use librefang_memory::task_dispatch::JobDispatchState;
    let intent = match state.kernel.read_job_dispatch_intent(&job.job_id).await {
        Ok(Some(JobDispatchState::Unclaimed)) => None,
        Ok(Some(JobDispatchState::Selected(intent))) if intent.initiating_owner == principal
            && intent.job == job && intent.local_task_id == boss_task_id => Some(intent),
        Ok(Some(JobDispatchState::Native(_))) => return refusal(StatusCode::CONFLICT, "job_already_native"),
        Ok(Some(JobDispatchState::Selected(_))) | Ok(None) => return refusal(StatusCode::NOT_FOUND, "selected_attempt_not_found"),
        _ => return refusal(StatusCode::SERVICE_UNAVAILABLE, "job_dispatch_storage_unknown"),
    };
    let store = state.kernel.a2a_tasks();
    // Durable classification does not consult current credentials or trust a
    // new request workspace. Missing projection/DB is unknown, never fresh.
    let reservations = match store.list_uar_job_attempts() {
        Ok(reservations) => reservations,
        Err(_) => return refusal(StatusCode::SERVICE_UNAVAILABLE, "selected_attempt_storage_unknown"),
    };
    let original = reservations.into_iter().find(|item| item.boss_task_id == boss_task_id);
    let streaming = request.streaming;
    let selected = if let Some(reservation) = original {
        if reservation.verified_subject != principal || reservation.job != job || reservation.verified_tenant.is_some() {
            return refusal(StatusCode::NOT_FOUND, "selected_attempt_not_found");
        }
        let saved = match store.get_uar_job_attempt(&principal, None, &reservation.workspace_id, &job) {
            Ok(Some(saved)) => saved,
            _ => return refusal(StatusCode::SERVICE_UNAVAILABLE, "selected_attempt_outcome_unknown"),
        };
        match mapping::existing_service_job(&principal, saved, Arc::clone(&state.uar_run_control)) {
            Ok(selected) => selected,
            Err(error) => return refusal(StatusCode::CONFLICT, error.0),
        }
    } else {
        // An interrupted first selection may have committed intent but never
        // reached A2A reservation. It must never prepare a replacement body.
        if intent.is_some() {
            return refusal(StatusCode::SERVICE_UNAVAILABLE, "selected_attempt_outcome_unknown");
        }
        // Existing connection publication/config supplies service placement.
        // It does not authenticate the local user or manufacture tenant claims.
        let binding = match librefang_llm_drivers::drivers::uar::admit_supervised_binding().await {
            Ok(binding) => binding,
            Err(_) => return refusal(StatusCode::SERVICE_UNAVAILABLE, "uar_service_binding_unavailable"),
        };
        match mapping::map_service_job(state.kernel.auth_manager(), user.0.user_id, &task,
            &binding, request, Arc::clone(&state.uar_run_control)) {
            Ok(selected) => selected,
            Err(error) => return refusal(StatusCode::UNPROCESSABLE_ENTITY, error.0),
        }
    };
    let dispatch = ResolvedDispatch::Uar(Box::new(selected));
    // Both calls cross the real KernelApi trait into the same kernel adapter.
    // A selected admission is never native completion or token-usage evidence.
    let outcome = if streaming {
        match Arc::clone(&state.kernel).send_job_message_streaming(agent_id, "", None, dispatch).await {
            Ok(JobDispatchOutcome::Delegated(receipt)) => Ok(receipt),
            Ok(JobDispatchOutcome::Native(_)) => return refusal(StatusCode::INTERNAL_SERVER_ERROR, "selected_dispatch_authority_mismatch"),
            Err(error) => Err(error),
        }
    } else {
        match state.kernel.send_job_message(agent_id, "", dispatch).await {
            Ok(JobDispatchOutcome::Delegated(receipt)) => Ok(receipt),
            Ok(JobDispatchOutcome::Native(_)) => return refusal(StatusCode::INTERNAL_SERVER_ERROR, "selected_dispatch_authority_mismatch"),
            Err(error) => Err(error),
        }
    };
    match outcome {
        Ok(receipt) => (StatusCode::ACCEPTED, Json(serde_json::json!({
            "authority": "service", "policyAuthority": "bound_uar_definition",
            "initiatingOwner": principal, "delegation": receipt,
            "observation": "separate_from_admission", "nativePolicyInherited": false
        }))).into_response(),
        Err(JobDispatchError::IdentityConflict) => refusal(StatusCode::CONFLICT, "selected_attempt_identity_conflict"),
        Err(JobDispatchError::CapabilityMissing(index)) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(serde_json::json!({"error":{"code":"required_capability_missing", "requirementIndex":index}})),
        ).into_response(),
        Err(_) => refusal(StatusCode::SERVICE_UNAVAILABLE, "selected_dispatch_unavailable_or_unknown"),
    }
}

fn refusal(status: StatusCode, code: &'static str) -> Response {
    api_error(status, code, code)
}
