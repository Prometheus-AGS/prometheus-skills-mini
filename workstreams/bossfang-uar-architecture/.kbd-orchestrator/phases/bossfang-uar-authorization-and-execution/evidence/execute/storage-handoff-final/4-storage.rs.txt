use std::sync::Arc;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use librefang_kernel::a2a::A2aTask;
use librefang_types::uar_run::UarDelegatedRunProjection;

use crate::{routes::AppState, types::api_error};

/// Legacy/manual delegation persistence. Selected product jobs must first use
/// A2aTaskStore::reserve_uar_job_attempt and reconcile Existing/unknown results;
/// this helper does not grant selected-job network admission authority.
pub(super) fn persist_initial(
    state: &Arc<AppState>,
    task: A2aTask,
    projection: UarDelegatedRunProjection,
) -> Result<UarDelegatedRunProjection, Response> {
    let task_id = projection.boss_task_id.clone();
    let retention = state
        .kernel
        .a2a_tasks()
        .put_uar_delegated_task(task, projection)
        .map_err(|error| persistence_error(&task_id, &error))?;
    let store = state.kernel.a2a_tasks();
    if store.get(&task_id).is_none() {
        return Err(persistence_error(
            &task_id,
            "the committed BossFang task could not be read back",
        ));
    }
    let projection = store.get_uar_delegation(&task_id).ok_or_else(|| {
        persistence_error(
            &task_id,
            "the committed UAR delegation projection could not be read back",
        )
    })?;
    if projection.boss_projection_retention != retention {
        return Err(persistence_error(
            &task_id,
            "the UAR delegation retention did not match the committed store",
        ));
    }
    Ok(projection)
}

pub(super) fn persist_projection(
    state: &Arc<AppState>,
    projection: UarDelegatedRunProjection,
) -> Result<UarDelegatedRunProjection, Response> {
    let task_id = projection.boss_task_id.clone();
    let retention = state
        .kernel
        .a2a_tasks()
        .put_uar_delegation(projection)
        .map_err(|error| persistence_error(&task_id, &error))?;
    let projection = state
        .kernel
        .a2a_tasks()
        .get_uar_delegation(&task_id)
        .ok_or_else(|| {
            persistence_error(
                &task_id,
                "the committed UAR delegation projection could not be read back",
            )
        })?;
    if projection.boss_projection_retention != retention {
        return Err(persistence_error(
            &task_id,
            "the UAR delegation retention did not match the committed store",
        ));
    }
    Ok(projection)
}

pub(super) fn persist_and_sync(
    state: &Arc<AppState>,
    projection: UarDelegatedRunProjection,
) -> Result<UarDelegatedRunProjection, Response> {
    let projection = persist_projection(state, projection)?;
    Ok(projection)
}

pub(super) fn saved_view(
    state: &Arc<AppState>,
    projection: UarDelegatedRunProjection,
    status: StatusCode,
) -> Response {
    match persist_and_sync(state, projection) {
        Ok(projection) => (status, Json(projection)).into_response(),
        Err(response) => response,
    }
}

fn persistence_error(task_id: &str, _error: &str) -> Response {
    // Storage errors can include trigger diagnostics; keep credential material
    // out of the HTTP/log projection even on interrupted writes.
    tracing::error!(task_id, "failed to persist UAR delegation");
    api_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "delegation_persistence_failed",
        "The UAR delegation projection could not be committed",
    )
}
