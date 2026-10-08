//! Original authenticated transports, separate from the selection for new runs.
use super::{
    binding::ensure_same_binding, http::endpoint, wire::WireReceipt, Transport, UarRunClient,
    UarRunClientError,
};
use librefang_types::{
    config::UarServiceInstanceConfig,
    uar_run::{UarDelegatedRunProjection, UarRunAdmission},
};
use reqwest::Method;
use zeroize::Zeroizing;

#[derive(Clone)]
pub(super) struct RetainedConnection {
    transport: Transport,
    workspace_id: String,
    verified_principal: String,
    selected_job: bool,
    secrets: Option<super::presentation::CapturedSecrets>,
}

impl UarRunClient {
    /// Install only the reservation winner's preflight connection. A retained
    /// slot is never replaced by a racing initial admission or changed input.
    pub(super) async fn retain_selected_connection(
        &self,
        projection: &UarDelegatedRunProjection,
        transport: Transport,
        secrets: super::presentation::CapturedSecrets,
    ) -> Result<(), UarRunClientError> {
        let mut connections = self.retained_connections.write().await;
        match connections.entry(projection.boss_task_id.clone()) {
            std::collections::hash_map::Entry::Vacant(entry) => {
                entry.insert(RetainedConnection {
                    transport,
                    workspace_id: projection.workspace_id.clone(),
                    verified_principal: projection.verified_principal.clone(),
                    selected_job: true,
                    secrets: Some(secrets),
                });
                Ok(())
            }
            std::collections::hash_map::Entry::Occupied(_) =>
                Err(UarRunClientError::InvalidAdmission(
                    "selected original connection is already retained".into(),
                )),
        }
    }

    pub(super) async fn retain_connection(
        &self,
        admission: &UarRunAdmission,
        principal: &str,
        transport: Transport,
        secrets: super::presentation::CapturedSecrets,
    ) -> Result<(), UarRunClientError> {
        // Namespace survives restart; the slot tag also protects an in-process
        // selected authority regardless of the legacy request's spelling.
        if admission.boss_task_id.starts_with(librefang_types::uar_run::UAR_SELECTED_JOB_PREFIX) {
            return Err(UarRunClientError::InvalidAdmission(
                "selected job identity requires selected dispatch".into(),
            ));
        }
        let mut connections = self.retained_connections.write().await;
        if connections.get(&admission.boss_task_id).is_some_and(|slot| slot.selected_job) {
            return Err(UarRunClientError::InvalidAdmission(
                "selected original connection cannot be replaced by legacy admission".into(),
            ));
        }
        connections.insert(admission.boss_task_id.clone(), RetainedConnection {
            transport,
            workspace_id: admission.workspace_id.clone(),
            verified_principal: principal.into(),
            selected_job: false,
            secrets: Some(secrets),
        });
        Ok(())
    }

    pub(super) async fn original_transport(
        &self,
        projection: &UarDelegatedRunProjection,
    ) -> Result<Transport, UarRunClientError> {
        let connection = self
            .retained_connections
            .read()
            .await
            .get(&projection.boss_task_id)
            .cloned()
            .ok_or(UarRunClientError::ConnectionReattachmentRequired)?;
        if connection.workspace_id != projection.workspace_id
            || connection.verified_principal != projection.verified_principal
        {
            return Err(UarRunClientError::Binding(
                "retained connection owner or workspace differs from original admission".into(),
            ));
        }
        ensure_same_binding(projection, &connection.transport.binding)?;
        Ok(connection.transport)
    }

    pub(super) async fn original_secrets(
        &self, projection: &UarDelegatedRunProjection,
    ) -> Result<super::presentation::CapturedSecrets, UarRunClientError> {
        self.original_transport(projection).await?;
        self.retained_connections.read().await.get(&projection.boss_task_id)
            .and_then(|slot| slot.secrets.clone())
            .ok_or(UarRunClientError::ConnectionReattachmentRequired)
    }

    /// Presence is not an expiry or health assertion. Real upstream refusal
    /// remains authoritative; no grant token is exposed in this status.
    pub async fn has_retained_connection(&self, projection: &UarDelegatedRunProjection) -> bool {
        self.original_transport(projection).await.is_ok()
    }

    /// Reattach exactly the saved endpoint with a new private scoped credential.
    /// Never publishes selection, resubmits a task, or alters the stored epoch.
    pub async fn refresh_connection(
        &self,
        projection: &UarDelegatedRunProjection,
        instance: &UarServiceInstanceConfig,
        workspace_id: &str,
        bearer: String,
    ) -> Result<UarDelegatedRunProjection, UarRunClientError> {
        let expected = &projection.effective_binding;
        if workspace_id != projection.workspace_id
            || instance.id != expected.instance_id
            || instance.profile != expected.profile
            || instance.workspace_locality != expected.workspace_locality
            || instance.workspace != expected.workspace
            || instance.credential_ref != expected.credential_ref
            || instance.endpoints != expected.endpoints
            || bearer.trim().is_empty()
        {
            return Err(UarRunClientError::InvalidAdmission("original connection identity, endpoints, profile, workspace and credential reference must match the saved admission".into()));
        }
        let base = expected.endpoints.runtime.as_deref().ok_or_else(|| {
            UarRunClientError::Binding("original runtime endpoint is absent".into())
        })?;
        super::http::validate_base(base)?;
        let transport = Transport {
            base: endpoint(base, "api/uar/full-harness/v1"),
            credential: Some(Zeroizing::new(bearer)),
            binding: expected.clone(),
        };
        self.ensure_runtime_epoch(&transport, projection).await?;
        let suffix = match projection.uar_task_id.as_deref() {
            Some(id) => format!("tasks/{id}"),
            None => format!("admissions/{}", projection.admission_key),
        };
        let receipt: WireReceipt = self
            .json(
                &transport,
                Method::GET,
                &suffix,
                None,
                "original connection reattachment",
                false,
                workspace_id,
            )
            .await?;
        let refreshed = receipt.merge_projection(projection, expected.clone())?;
        let mut connections = self.retained_connections.write().await;
        let selected_job = projection.boss_task_id.starts_with(librefang_types::uar_run::UAR_SELECTED_JOB_PREFIX)
            || connections.get(&projection.boss_task_id).is_some_and(|slot| slot.selected_job);
        // A refresh may add the new bearer, but cannot recreate the original
        // run dictionary after restart or discard the original captured values.
        let mut secrets = connections.get(&projection.boss_task_id).and_then(|slot| slot.secrets.clone());
        if let Some(captured) = &mut secrets { captured.add_transport(&transport); }
        connections.insert(projection.boss_task_id.clone(), RetainedConnection {
            transport,
            workspace_id: workspace_id.into(),
            verified_principal: projection.verified_principal.clone(),
            selected_job,
            secrets,
        });
        Ok(refreshed)
    }
}
