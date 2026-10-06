use librefang_types::uar_run::UarDelegatedRunProjection;
use reqwest::Method;
use serde::Deserialize;
use serde_json::Value;

use super::wire::{WireReceipt, WireRuntimeDescriptor};
use super::{Transport, UarRunClient, UarRunClientError};

impl UarRunClient {
    pub(super) async fn transport(
        &self,
        _verified_principal: &str,
    ) -> Result<Transport, UarRunClientError> {
        let (base, credential, binding) = super::super::uar::full_run_transport()
            .await
            .map_err(|error| UarRunClientError::Binding(error.to_string()))?;
        validate_base(&base)?;
        if credential.is_none() {
            return Err(UarRunClientError::Binding(
                "selected full-run endpoint has no authenticated runtime credential".to_string(),
            ));
        }
        Ok(Transport {
            base: endpoint(&base, "api/uar/full-harness/v1"),
            credential,
            binding,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub(super) async fn receipt(
        &self,
        transport: &Transport,
        method: Method,
        suffix: &str,
        body: Option<&Value>,
        operation: &'static str,
        uncertain_on_transport: bool,
        workspace_id: &str,
        accept_receipt_on_error_status: bool,
    ) -> Result<WireReceipt, UarRunClientError> {
        let mut request = self
            .client
            .request(method, endpoint(&transport.base, suffix))
            .header("x-uar-workspace-id", workspace_id);
        if let Some(credential) = &transport.credential {
            request = request.bearer_auth(credential.as_str());
        }
        if let Some(body) = body {
            request = request.json(body);
        }
        let response = tokio::time::timeout(self.request_timeout, request.send())
            .await
            .map_err(|_| UarRunClientError::Transport {
                operation,
                message: format!("timed out after {} seconds", self.request_timeout.as_secs()),
                outcome_uncertain: uncertain_on_transport,
            })?
            .map_err(|error| UarRunClientError::Transport {
                operation,
                message: error.to_string(),
                outcome_uncertain: uncertain_on_transport,
            })?;
        let status = response.status();
        let payload =
            response
                .text()
                .await
                .map_err(|error| UarRunClientError::InvalidResponse {
                    operation,
                    message: error.to_string(),
                })?;
        if status.is_success() || accept_receipt_on_error_status {
            if let Ok(receipt) = serde_json::from_str::<WireReceipt>(&payload) {
                return Ok(receipt);
            }
        }
        let refusal = serde_json::from_str::<WireErrorEnvelope>(&payload)
            .ok()
            .map(|item| item.error.into());
        let message = refusal.as_ref().map_or_else(
            || payload.clone(),
            |item: &librefang_types::uar_run::UarRunRefusal| item.message.clone(),
        );
        Err(UarRunClientError::Remote {
            operation,
            status,
            message,
            refusal: refusal.map(Box::new),
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub(super) async fn json<T: for<'de> Deserialize<'de>>(
        &self,
        transport: &Transport,
        method: Method,
        suffix: &str,
        body: Option<&Value>,
        operation: &'static str,
        uncertain_on_transport: bool,
        workspace_id: &str,
    ) -> Result<T, UarRunClientError> {
        let mut request = self
            .client
            .request(method, endpoint(&transport.base, suffix))
            .header("x-uar-workspace-id", workspace_id);
        if let Some(credential) = &transport.credential {
            request = request.bearer_auth(credential.as_str());
        }
        if let Some(body) = body {
            request = request.json(body);
        }
        let response = self
            .send(
                transport,
                request,
                operation,
                uncertain_on_transport,
                workspace_id,
            )
            .await?;
        response
            .json::<T>()
            .await
            .map_err(|error| UarRunClientError::InvalidResponse {
                operation,
                message: error.to_string(),
            })
    }

    pub(super) async fn send(
        &self,
        _transport: &Transport,
        request: reqwest::RequestBuilder,
        operation: &'static str,
        uncertain_on_transport: bool,
        _workspace_id: &str,
    ) -> Result<reqwest::Response, UarRunClientError> {
        let response = tokio::time::timeout(self.request_timeout, request.send())
            .await
            .map_err(|_| UarRunClientError::Transport {
                operation,
                message: format!("timed out after {} seconds", self.request_timeout.as_secs()),
                outcome_uncertain: uncertain_on_transport,
            })?
            .map_err(|error| UarRunClientError::Transport {
                operation,
                message: error.to_string(),
                outcome_uncertain: uncertain_on_transport,
            })?;
        if response.status().is_success() {
            return Ok(response);
        }
        let status = response.status();
        let payload = response.text().await.unwrap_or_default();
        let refusal: Option<librefang_types::uar_run::UarRunRefusal> =
            serde_json::from_str::<WireErrorEnvelope>(&payload)
                .ok()
                .map(|item| item.error.into());
        let message = refusal
            .as_ref()
            .map_or_else(|| payload.clone(), |item| item.message.clone());
        Err(UarRunClientError::Remote {
            operation,
            status,
            message,
            refusal: refusal.map(Box::new),
        })
    }

    pub(super) async fn runtime_descriptor(
        &self,
        transport: &Transport,
        workspace_id: &str,
    ) -> Result<WireRuntimeDescriptor, UarRunClientError> {
        self.json(
            transport,
            Method::GET,
            "capabilities",
            None,
            "runtime capabilities",
            false,
            workspace_id,
        )
        .await
    }

    pub(super) async fn ensure_runtime_epoch(
        &self,
        transport: &Transport,
        projection: &UarDelegatedRunProjection,
    ) -> Result<(), UarRunClientError> {
        let descriptor = self
            .runtime_descriptor(transport, &projection.workspace_id)
            .await?;
        descriptor.validate()?;
        if let Some(previous_epoch) = projection.runtime_epoch.as_ref() {
            if previous_epoch != &descriptor.runtime_epoch {
                return Err(UarRunClientError::RecoveryUnsupported {
                    previous_epoch: previous_epoch.clone(),
                    current_epoch: descriptor.runtime_epoch,
                });
            }
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
struct WireErrorEnvelope {
    error: WireError,
}

#[derive(Debug, Deserialize)]
struct WireError {
    code: String,
    message: String,
    #[serde(default)]
    task_id: Option<String>,
    #[serde(default)]
    admission_id: Option<String>,
}

impl From<WireError> for librefang_types::uar_run::UarRunRefusal {
    fn from(value: WireError) -> Self {
        Self {
            code: value.code,
            message: value.message,
            task_id: value.task_id,
            admission_id: value.admission_id,
        }
    }
}

pub(super) fn endpoint(base: &str, suffix: &str) -> String {
    format!(
        "{}/{}",
        base.trim_end_matches('/'),
        suffix.trim_start_matches('/')
    )
}

pub(super) fn validate_base(base: &str) -> Result<(), UarRunClientError> {
    let url = reqwest::Url::parse(base)
        .map_err(|error| UarRunClientError::Binding(error.to_string()))?;
    let loopback = url.host_str().is_some_and(|host| {
        host == "localhost"
            || host
                .trim_matches(['[', ']'])
                .parse::<std::net::IpAddr>()
                .is_ok_and(|ip| ip.is_loopback())
    });
    if !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !(url.scheme() == "https" || (url.scheme() == "http" && loopback))
    {
        return Err(UarRunClientError::Binding(
            "full-run endpoint requires loopback HTTP or HTTPS without URL credentials".to_string(),
        ));
    }
    Ok(())
}
