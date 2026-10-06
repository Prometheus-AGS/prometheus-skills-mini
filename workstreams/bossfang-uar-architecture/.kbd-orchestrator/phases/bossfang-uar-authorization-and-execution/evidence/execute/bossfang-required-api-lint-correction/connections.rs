//! Protected original-run connection recovery; never changes new-run selection.
#[cfg(feature = "uar-driver")]
use crate::{
    middleware::{AuthenticatedApiUser, UserRole},
    routes::AppState,
    types::api_error,
};
#[cfg(feature = "uar-driver")]
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Extension, Json,
};
#[cfg(feature = "uar-driver")]
use librefang_types::config::UarServiceInstanceConfig;
#[cfg(feature = "uar-driver")]
use serde::Deserialize;
#[cfg(feature = "uar-driver")]
use std::sync::Arc;

#[cfg(feature = "uar-driver")]
pub(crate) async fn connections(
    State(state): State<Arc<AppState>>,
    api_user: Option<Extension<AuthenticatedApiUser>>,
) -> Response {
    #[cfg(feature = "uar-driver")]
    {
        if api_user
            .as_ref()
            .is_none_or(|user| user.0.role != UserRole::Owner)
        {
            return api_error(
                StatusCode::FORBIDDEN,
                "authenticated_owner_required",
                "Connection recovery requires authenticated Owner authority",
            );
        }
        let mut projections = state.kernel.a2a_tasks().list_uar_delegations();
        projections.sort_by(|a, b| a.boss_task_id.cmp(&b.boss_task_id));
        let mut connections = Vec::new();
        for projection in projections {
            if matches!(
                projection.execution_state.as_str(),
                "completed" | "failed" | "cancelled"
            ) || projection.admission_state == "refused"
            {
                continue;
            }
            if super::enabled::stored_delegation(
                &state,
                &projection.boss_task_id,
                api_user.as_ref(),
            )
            .is_err()
            {
                continue;
            }
            let credential_state = if state
                .uar_run_control
                .has_retained_connection(&projection)
                .await
            {
                "retained"
            } else {
                "reattachment_required"
            };
            connections.push(serde_json::json!({"bossTaskId":projection.boss_task_id,"workspaceId":projection.workspace_id,"selectedInstanceId":projection.selected_instance_id,"effectiveBinding":projection.effective_binding,"runtimeEpoch":projection.runtime_epoch,"executionState":projection.execution_state,"admissionState":projection.admission_state,"cancellation":projection.cancellation,"credentialState":credential_state}));
        }
        Json(serde_json::json!({"connections":connections})).into_response()
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        let _ = (state, api_user);
        api_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "uar_driver_disabled",
            "BossFang was built without uar-driver",
        )
    }
}

#[cfg(feature = "uar-driver")]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RefreshRequest {
    boss_task_id: String,
    workspace_id: String,
    instance: UarServiceInstanceConfig,
    bearer: String,
}

#[cfg(feature = "uar-driver")]
pub(crate) async fn refresh(
    State(state): State<Arc<AppState>>,
    api_user: Option<Extension<AuthenticatedApiUser>>,
    Json(request): Json<RefreshRequest>,
) -> Response {
    #[cfg(feature = "uar-driver")]
    {
        if api_user
            .as_ref()
            .is_none_or(|user| user.0.role != UserRole::Owner)
        {
            return api_error(
                StatusCode::FORBIDDEN,
                "authenticated_owner_required",
                "Connection recovery requires authenticated Owner authority",
            );
        }
        let (_, projection) = match super::enabled::stored_delegation(
            &state,
            &request.boss_task_id,
            api_user.as_ref(),
        ) {
            Ok(value) => value,
            Err(response) => return response,
        };
        let instance = match (librefang_types::config::UarConfig {
            instances: vec![request.instance],
            ..Default::default()
        })
        .selected_instance()
        {
            Ok(instance) => instance,
            Err(error) => {
                return api_error(
                    StatusCode::BAD_REQUEST,
                    "uar_connection_refresh_invalid",
                    error,
                )
            }
        };
        let result = state
            .uar_run_control
            .refresh_connection(
                &projection,
                &instance,
                &request.workspace_id,
                request.bearer,
            )
            .await;
        if super::observation::is_selected(&projection) {
            return super::observation::control_result(&state, projection, result, "refresh");
        }
        match result {
            Ok(projection) => super::storage::saved_view(&state, projection, StatusCode::OK),
            Err(error) => {
                if let Some(recovered) =
                    librefang_llm_drivers::drivers::uar_run::UarRunClient::recovery_projection(
                        &projection,
                        &error,
                    )
                {
                    return super::storage::saved_view(&state, recovered, StatusCode::GONE);
                }
                super::errors::client_error(error)
            }
        }
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        let _ = (state, api_user, request);
        api_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "uar_driver_disabled",
            "BossFang was built without uar-driver",
        )
    }
}
