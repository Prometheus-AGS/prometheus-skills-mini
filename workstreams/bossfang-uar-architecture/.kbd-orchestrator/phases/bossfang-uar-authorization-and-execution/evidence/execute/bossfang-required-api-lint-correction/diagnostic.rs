//! Owner-triggered real no-effect full-harness diagnostic.
#[cfg(feature = "uar-driver")]
use crate::{middleware::AuthenticatedApiUser, routes::AppState, types::api_error};
#[cfg(feature = "uar-driver")]
use axum::{extract::State, http::StatusCode, response::Response, Extension, Json};
#[cfg(feature = "uar-driver")]
use librefang_llm_drivers::drivers::{uar, uar_run::UarRunClient};
#[cfg(feature = "uar-driver")]
use serde::Deserialize;
#[cfg(feature = "uar-driver")]
use std::sync::Arc;

#[cfg(feature = "uar-driver")]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DiagnosticRequest {
    workspace_id: String,
    provider_id: String,
    model: String,
    #[serde(default)]
    boss_task_id: Option<String>,
}

#[cfg(feature = "uar-driver")]
pub(super) async fn diagnostic(
    State(state): State<Arc<AppState>>,
    api_user: Option<Extension<AuthenticatedApiUser>>,
    Json(request): Json<DiagnosticRequest>,
) -> Response {
    if api_user.is_none() {
        return api_error(
            StatusCode::UNAUTHORIZED,
            "authenticated_owner_required",
            "Diagnostic requires an authenticated BossFang owner",
        );
    }
    let binding = match uar::admit_supervised_binding().await {
        Ok(binding) => binding,
        Err(error) => {
            return api_error(
                StatusCode::BAD_GATEWAY,
                "uar_connection_not_admitted",
                error.to_string(),
            )
        }
    };
    let admission = match UarRunClient::diagnostic_admission(
        request.workspace_id,
        &request.provider_id,
        &request.model,
        request.boss_task_id.unwrap_or_default(),
        &binding,
    ) {
        Ok(admission) => admission,
        Err(error) => return super::errors::client_error(error),
    };
    super::enabled::admit_source(state, api_user, admission, true).await
}

/// Authenticated Owner-only full-run diagnostic; no catalog installation.
#[cfg(feature = "uar-driver")]
pub(crate) async fn diagnostic_route(
    state: axum::extract::State<Arc<AppState>>,
    api_user: Option<axum::Extension<crate::middleware::AuthenticatedApiUser>>,
    axum::Json(request): axum::Json<serde_json::Value>,
) -> axum::response::Response {
    #[cfg(feature = "uar-driver")]
    {
        let request = match serde_json::from_value::<DiagnosticRequest>(request) {
            Ok(request) => request,
            Err(error) => {
                return crate::types::api_error(
                    axum::http::StatusCode::BAD_REQUEST,
                    "diagnostic_request_invalid",
                    error.to_string(),
                )
            }
        };
        diagnostic(state, api_user, axum::Json(request)).await
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        let _ = (state, api_user, request);
        crate::types::api_error(
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            "uar_driver_disabled",
            "BossFang was built without the uar-driver feature",
        )
    }
}
