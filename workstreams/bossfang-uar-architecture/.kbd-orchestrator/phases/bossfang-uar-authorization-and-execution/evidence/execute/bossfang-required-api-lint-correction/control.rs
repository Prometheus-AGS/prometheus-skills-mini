//! Observation control never acquires the selected handler's execution authority.

use crate::middleware::{AuthenticatedApiUser, TrustedNoAuthCaller, UserRole};
use crate::routes::AppState;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use serde_json::{json, Value};
use std::sync::Arc;

type ControlResponse = (StatusCode, Json<Value>);

/// Describe implemented control contracts without claiming a runtime gate passed.
pub fn control_capability() -> Value {
    json!({
        "observation_detach": {
            "supported": cfg!(all(feature = "surreal-backend", feature = "uar-driver")),
            "operation": "pause_subscription",
            "scope": "logical_subscription",
            "requires": ["authenticated_owner", "observer_storage", "bound_uar_subscription"],
            "queued_receipts_preserved": true,
            "cursor_preserved": true,
            "shared_fabric_socket_closed": false,
            "in_flight_delivery_retracted": false,
        },
        "execution_cancel": {
            "supported": false,
            "status": "execution_cancel_unsupported",
            "reason": "channel_execution_owner_not_bound",
            "owner_binding": "durable_exact_owner_receipt_required",
            "observation_detach_is_execution_cancel": false,
        },
    })
}

// These new paths are not in middleware's existing Owner-only pause/revoke list.
// Require the same role here and distinguish a credential from no-auth loopback trust.
fn require_owner(
    api_user: Option<&AuthenticatedApiUser>,
    trusted_no_auth: bool,
) -> Result<(), ControlResponse> {
    if trusted_no_auth || api_user.is_none() {
        return Err(error(
            StatusCode::UNAUTHORIZED,
            "channel_control_authentication_required",
            "An authenticated Owner credential is required for channel control",
        ));
    }
    if api_user.is_none_or(|user| user.role < UserRole::Owner) {
        return Err(error(
            StatusCode::FORBIDDEN,
            "channel_control_owner_required",
            "Owner role is required for channel control",
        ));
    }
    Ok(())
}

fn error(status: StatusCode, code: &str, message: &str) -> ControlResponse {
    (status, Json(json!({"error": message, "code": code})))
}

/// Pause future observation release while retaining the independent cursor and queue.
pub async fn detach_channel_observation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    api_user: Option<Extension<AuthenticatedApiUser>>,
    trusted_no_auth: Option<Extension<TrustedNoAuthCaller>>,
) -> ControlResponse {
    if let Err(response) = require_owner(
        api_user.as_ref().map(|user| &user.0),
        trusted_no_auth.is_some(),
    ) {
        return response;
    }
    #[cfg(all(feature = "surreal-backend", feature = "uar-driver"))]
    {
        use librefang_storage::channel_actions::{ChannelActionStore, ObserverStatus};

        let session = match librefang_storage::shared_pool()
            .open(&state.kernel.config_ref().storage)
            .await
        {
            Ok(session) => session,
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "observer_storage_unavailable",
                    "Observer storage is unavailable",
                )
            }
        };
        let store = match ChannelActionStore::open(&session).await {
            Ok(store) => store,
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "observer_store_unavailable",
                    "Observer store is unavailable",
                )
            }
        };
        let subscriber = match store.get_observer_subscription(&id).await {
            Ok(Some(subscriber)) => subscriber,
            Ok(None) => {
                return error(
                    StatusCode::NOT_FOUND,
                    "observer_subscription_not_found",
                    "Observer subscription is unavailable",
                )
            }
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "observer_subscription_unavailable",
                    "Observer subscription is unavailable",
                )
            }
        };
        if subscriber.status == ObserverStatus::Revoked {
            return error(
                StatusCode::CONFLICT,
                "observer_status_conflict",
                "A revoked observer subscription cannot be detached",
            );
        }
        let already_paused = subscriber.status == ObserverStatus::Paused;
        let saved = if already_paused {
            subscriber
        } else {
            let target = super::ObserverTarget {
                subscription_id: subscriber.subscription_id.clone(),
                uar_workspace_id: subscriber.uar_workspace_id.clone(),
                source_grant_issuer: subscriber.source_grant_issuer.clone(),
                source_grant_id: subscriber.source_grant_id.clone(),
            };
            if let Err(failure) = super::change_uar_subscription(&target, "pause").await {
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({
                        "error": failure,
                        "code": "uar_observation_pause_failed",
                        "subscription_id": id,
                        "execution_state_changed": false,
                    })),
                );
            }
            match store
                .set_observer_status(&id, ObserverStatus::Active, ObserverStatus::Paused)
                .await
            {
                Ok(saved) => saved,
                Err(_) => {
                    return (
                        StatusCode::CONFLICT,
                        Json(json!({
                            "error": "UAR paused but BossFang status did not commit; reconcile before retrying",
                            "code": "observation_detach_reconciliation_required",
                            "subscription_id": id,
                            "uar_observation_status": "paused",
                            "bossfang_observation_status": "unconfirmed",
                            "execution_state_changed": false,
                        })),
                    )
                }
            }
        };
        (
            StatusCode::OK,
            Json(json!({
                "status": "observation_detached",
                "operation": "pause_subscription",
                "scope": "logical_subscription",
                "subscription": saved,
                "already_paused": already_paused,
                "queued_receipts_preserved": true,
                "cursor_preserved": true,
                "shared_fabric_socket_closed": false,
                "in_flight_delivery_retracted": false,
                "execution_state_changed": false,
            })),
        )
    }
    #[cfg(not(all(feature = "surreal-backend", feature = "uar-driver")))]
    {
        let _ = (state, id);
        error(
            StatusCode::NOT_IMPLEMENTED,
            "observation_detach_unsupported",
            "Observer control is unsupported by this build",
        )
    }
}

/// Refuse execution cancellation until the occurrence has an exact durable runtime owner.
pub async fn cancel_channel_execution(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    api_user: Option<Extension<AuthenticatedApiUser>>,
    trusted_no_auth: Option<Extension<TrustedNoAuthCaller>>,
) -> ControlResponse {
    if let Err(response) = require_owner(
        api_user.as_ref().map(|user| &user.0),
        trusted_no_auth.is_some(),
    ) {
        return response;
    }
    #[cfg(feature = "surreal-backend")]
    {
        use librefang_storage::channel_routes::ChannelRouteStore;

        let session = match librefang_storage::shared_pool()
            .open(&state.kernel.config_ref().storage)
            .await
        {
            Ok(session) => session,
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "channel_storage_unavailable",
                    "Channel storage is unavailable",
                )
            }
        };
        let store = match ChannelRouteStore::open(&session).await {
            Ok(store) => store,
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "channel_route_store_unavailable",
                    "Channel route store is unavailable",
                )
            }
        };
        let source = match store.source_occurrence(&id).await {
            Ok(Some(source)) => source,
            Ok(None) => {
                return error(
                    StatusCode::NOT_FOUND,
                    "channel_occurrence_not_found",
                    "Channel occurrence is unavailable",
                )
            }
            Err(librefang_storage::StorageError::InvalidConfig(_)) => {
                return error(
                    StatusCode::BAD_REQUEST,
                    "invalid_channel_occurrence_id",
                    "Channel occurrence ID must be a SHA-256 hex digest",
                )
            }
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "channel_occurrence_unavailable",
                    "Channel occurrence is unavailable",
                )
            }
        };
        let dispatch = match store.dispatch_receipt(&id).await {
            Ok(dispatch) => dispatch,
            Err(_) => {
                return error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "channel_dispatch_receipt_unavailable",
                    "Channel dispatch receipt is unavailable",
                )
            }
        };
        // Handler, claimant, and observer instance IDs are not exact task/run owner bindings.
        // No transport detach, instance cancel, or agent-wide stop can substitute for one.
        (
            StatusCode::NOT_IMPLEMENTED,
            Json(json!({
                "error": "The channel occurrence has no durable exact execution owner binding",
                "code": "channel_execution_owner_not_bound",
                "status": "execution_cancel_unsupported",
                "reason": "channel_execution_owner_not_bound",
                "occurrence_id": source.occurrence_id,
                "route_revision": source.route_revision,
                "dispatch_state": dispatch.as_ref().map(|receipt| receipt.state),
                "execution_owner": null,
                "execution_state_changed": false,
                "observation_state_changed": false,
            })),
        )
    }
    #[cfg(not(feature = "surreal-backend"))]
    {
        let _ = state;
        (
            StatusCode::NOT_IMPLEMENTED,
            Json(json!({
                "error": "Channel execution owner storage is unsupported by this build",
                "code": "channel_execution_owner_not_bound",
                "status": "execution_cancel_unsupported",
                "reason": "channel_execution_owner_not_bound",
                "occurrence_id": id,
                "execution_owner": null,
                "execution_state_changed": false,
                "observation_state_changed": false,
            })),
        )
    }
}
