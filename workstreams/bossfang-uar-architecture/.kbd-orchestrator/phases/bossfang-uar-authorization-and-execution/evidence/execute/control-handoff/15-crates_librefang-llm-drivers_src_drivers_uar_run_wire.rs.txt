use librefang_types::{
    config::UarEffectiveBinding,
    uar_run::{
        UarDefinitionMode, UarDelegatedRunProjection, UarProjectionRetention, UarRunAdmission,
        UarRunCancellation, UarRunRetention,
    },
};
use serde::Deserialize;
use serde_json::{Map, Value};

use super::{PreparedAdmission, UarRunClientError};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(super) struct WireReceipt {
    #[serde(default)]
    admission_id: Option<String>,
    #[serde(default)]
    task_id: Option<String>,
    #[serde(default)]
    native_task_id: Option<String>,
    #[serde(default)]
    run_id: Option<String>,
    #[serde(default)]
    runtime_epoch: Option<String>,
    #[serde(default)]
    workspace_id: Option<String>,
    #[serde(default)]
    state: Option<String>,
    #[serde(default)]
    revision: u64,
    #[serde(default)]
    cursor: u64,
    retention: WireRetention,
    #[serde(default)]
    effective_service_binding: Value,
    #[serde(default)]
    diagnostics: Vec<Value>,
    #[serde(default)]
    cancellation: WireCancellation,
    #[serde(default)]
    detached: bool,
    #[serde(default)]
    unsupported_semantics: Vec<String>,
    #[serde(default)]
    expires_at: Option<String>,
    #[serde(default)]
    created_at: Option<String>,
    #[serde(default)]
    terminal_at: Option<String>,
    #[serde(default)]
    links: Map<String, Value>,
}

#[derive(Debug, Deserialize)]
pub(super) struct WireRuntimeDescriptor {
    #[serde(default)]
    pub event_cursor_profile: Option<String>,
    pub(super) profile: String,
    pub(super) runtime_epoch: String,
    pub(super) recovery: String,
    pub(super) retention: WireRetention,
    pub(super) steer_supported: bool,
}

impl WireRuntimeDescriptor {
    pub(super) fn validate(&self) -> Result<(), UarRunClientError> {
        if self.profile != "full_harness_v1" || self.recovery != "unsupported_after_restart" {
            return Err(UarRunClientError::InvalidResponse {
                operation: "runtime capabilities",
                message: "UAR full-harness profile or recovery contract is incompatible"
                    .to_string(),
            });
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub(super) struct WireRetention {
    mode: String,
    terminal_ttl_seconds: u64,
    terminal_record_cap: u64,
}

impl From<WireRetention> for UarRunRetention {
    fn from(value: WireRetention) -> Self {
        Self {
            mode: value.mode,
            terminal_ttl_seconds: value.terminal_ttl_seconds,
            terminal_record_cap: value.terminal_record_cap,
        }
    }
}

#[derive(Debug, Default, Deserialize)]
struct WireCancellation {
    requested: bool,
    acknowledged: bool,
    terminal: bool,
    cleanup_uncertain: bool,
}

impl From<WireCancellation> for UarRunCancellation {
    fn from(value: WireCancellation) -> Self {
        Self {
            requested: value.requested,
            acknowledged: value.acknowledged,
            terminal: value.terminal,
            cleanup_uncertain: value.cleanup_uncertain,
        }
    }
}

impl WireReceipt {
    pub(super) fn into_projection(
        self,
        admission: &UarRunAdmission,
        prepared: &PreparedAdmission,
        binding: UarEffectiveBinding,
        verified_principal: &str,
    ) -> Result<UarDelegatedRunProjection, UarRunClientError> {
        let admission_id = self
            .admission_id
            .as_deref()
            .unwrap_or(&admission.admission_key);
        if admission_id != admission.admission_key {
            return Err(UarRunClientError::InvalidResponse {
                operation: "admission",
                message: "receipt admission identity does not match the requested key".to_string(),
            });
        }
        if self.workspace_id.as_deref() != Some(&admission.workspace_id) {
            return Err(UarRunClientError::InvalidResponse {
                operation: "admission",
                message: "receipt workspace identity does not match the request".to_string(),
            });
        }
        let state = self.state.clone().unwrap_or_else(|| "submitted".into());
        if self
            .native_task_id
            .as_deref()
            .is_some_and(|native_id| native_id != admission.boss_task_id)
        {
            return Err(UarRunClientError::InvalidResponse {
                operation: "admission",
                message: "receipt native task identity does not match the BossFang task"
                    .to_string(),
            });
        }
        if !self.effective_service_binding.is_null() {
            validate_effective_binding(
                &self.effective_service_binding,
                &binding,
                &admission.target_binding_id,
                prepared.definition_mode,
            )?;
        } else if state != "rejected" {
            return Err(UarRunClientError::InvalidResponse {
                operation: "admission",
                message: "receipt omitted its effective service binding".to_string(),
            });
        }
        // Selected service mapping pins the receiver's deployment revision in
        // the real service_placement field. Keep that pin separate from the
        // requested definition digest; this verifies only receiver evidence.
        if let Some(expected) = prepared.body.pointer("/service_placement/bindingRevision").and_then(Value::as_u64) {
            if state != "rejected" && self.effective_service_binding.get("bindingRevision").and_then(Value::as_u64) != Some(expected) {
                return binding_mismatch("bindingRevision");
            }
        }
        let cancellation: UarRunCancellation = self.cancellation.into();
        Ok(UarDelegatedRunProjection {
            boss_task_id: admission.boss_task_id.clone(),
            verified_principal: verified_principal.to_string(),
            delegation_id: admission.delegation_id.clone(),
            admission_key: admission.admission_key.clone(),
            request_digest: prepared.request_digest.clone(),
            target_binding_id: admission.target_binding_id.clone(),
            definition_mode: prepared.definition_mode,
            workspace_id: admission.workspace_id.clone(),
            selected_instance_id: binding.instance_id.clone(),
            effective_binding: binding,
            definition: admission.definition.clone(),
            definition_diagnostics: admission.definition_diagnostics.clone(),
            remote_diagnostics: self.diagnostics,
            uar_task_id: self.task_id,
            uar_thread_id: None,
            uar_root_run_id: None,
            uar_run_id: self.run_id,
            admission_state: if state == "rejected" {
                "refused".into()
            } else {
                "admitted".into()
            },
            execution_state: state,
            cancellation_state: cancellation_state(&cancellation),
            effect_state: "not_dispatched".into(),
            recovery_state: "available".into(),
            boss_projection_retention: UarProjectionRetention::ProcessEphemeral,
            revision: self.revision,
            cursor: self.cursor,
            runtime_epoch: self.runtime_epoch,
            retention: self.retention.into(),
            cancellation,
            detached: self.detached,
            unsupported_semantics: self.unsupported_semantics,
            expires_at: self.expires_at,
            created_at: self.created_at,
            terminal_at: self.terminal_at,
            links: self.links,
        })
    }

    pub(super) fn merge_projection(
        self,
        projection: &UarDelegatedRunProjection,
        binding: UarEffectiveBinding,
    ) -> Result<UarDelegatedRunProjection, UarRunClientError> {
        let prepared = PreparedAdmission {
            request_digest: projection.request_digest.clone(),
            definition_mode: projection.definition_mode,
            body: Value::Null,
        };
        let admission = UarRunAdmission {
            boss_task_id: projection.boss_task_id.clone(),
            delegation_id: projection.delegation_id.clone(),
            admission_key: projection.admission_key.clone(),
            target_binding_id: projection.target_binding_id.clone(),
            workspace_id: projection.workspace_id.clone(),
            definition: projection.definition.clone(),
            definition_diagnostics: projection.definition_diagnostics.clone(),
            run: Map::new(),
        };
        let mut merged = self.into_projection(
            &admission,
            &prepared,
            binding,
            &projection.verified_principal,
        )?;
        merged.boss_projection_retention = projection.boss_projection_retention;
        // UAR's execution receipt has no evidence that a previously uncertain
        // external effect or BossFang recovery outcome has been settled.
        merged.effect_state.clone_from(&projection.effect_state);
        merged.recovery_state.clone_from(&projection.recovery_state);
        for diagnostic in &projection.remote_diagnostics {
            if !merged.remote_diagnostics.contains(diagnostic) {
                merged.remote_diagnostics.push(diagnostic.clone());
            }
        }
        merged.uar_thread_id.clone_from(&projection.uar_thread_id);
        merged
            .uar_root_run_id
            .clone_from(&projection.uar_root_run_id);
        Ok(merged)
    }
}

fn validate_effective_binding(
    observed: &Value,
    expected: &UarEffectiveBinding,
    target_binding_id: &str,
    definition_mode: UarDefinitionMode,
) -> Result<(), UarRunClientError> {
    let Some(observed) = observed.as_object() else {
        return Err(UarRunClientError::InvalidResponse {
            operation: "admission",
            message: "receipt omitted its effective service binding".to_string(),
        });
    };
    require_equal(observed, "instanceId", &expected.instance_id)?;
    require_equal(observed, "profile", &expected.profile)?;
    require_equal(observed, "intent", "new")?;
    match definition_mode {
        UarDefinitionMode::Bound => require_equal(observed, "bindingId", target_binding_id)?,
        UarDefinitionMode::InlineDiagnostic
            if observed.get("bindingId").is_some_and(|id| !id.is_null()) =>
        {
            return binding_mismatch("bindingId");
        }
        UarDefinitionMode::InlineDiagnostic => {}
    }
    require_equal(
        observed,
        "workspaceLocation",
        match expected.workspace_locality {
            librefang_types::config::UarWorkspaceLocality::Local => "local",
            librefang_types::config::UarWorkspaceLocality::Remote => "remote",
        },
    )?;
    if let Some(endpoints) = observed.get("endpoints").and_then(Value::as_object) {
        for (role, expected_endpoint) in [
            ("runtime", expected.endpoints.runtime.as_deref()),
            (
                "administration",
                expected.endpoints.administration.as_deref(),
            ),
            ("models", expected.endpoints.models.as_deref()),
            ("console", expected.endpoints.console.as_deref()),
        ] {
            let actual = endpoints.get(role).and_then(Value::as_str);
            if expected_endpoint.map(trim_endpoint) != actual.map(trim_endpoint) {
                return binding_mismatch(role);
            }
        }
    } else {
        return binding_mismatch("endpoints");
    }
    let observed_capabilities = observed
        .get("capabilities")
        .and_then(Value::as_array)
        .map(|values| values.iter().filter_map(Value::as_str).collect::<Vec<_>>())
        .unwrap_or_default();
    if expected
        .capabilities
        .iter()
        .any(|capability| !observed_capabilities.contains(&capability.as_str()))
    {
        return binding_mismatch("capabilities");
    }
    let credential_ref = observed.get("credentialRef").and_then(Value::as_str);
    if expected.credential_ref.as_deref() != credential_ref {
        return binding_mismatch("credentialRef");
    }
    Ok(())
}

fn require_equal(
    observed: &Map<String, Value>,
    field: &'static str,
    expected: &str,
) -> Result<(), UarRunClientError> {
    if observed.get(field).and_then(Value::as_str) == Some(expected) {
        Ok(())
    } else {
        binding_mismatch(field)
    }
}

fn trim_endpoint(value: &str) -> &str {
    value.trim_end_matches('/')
}

fn binding_mismatch<T>(field: &'static str) -> Result<T, UarRunClientError> {
    Err(UarRunClientError::InvalidResponse {
        operation: "admission",
        message: format!("receipt effective service binding mismatched '{field}'"),
    })
}

fn cancellation_state(cancellation: &UarRunCancellation) -> String {
    if cancellation.terminal {
        "terminal"
    } else if cancellation.cleanup_uncertain {
        "cleanup_unconfirmed"
    } else if cancellation.acknowledged {
        "acknowledged"
    } else if cancellation.requested {
        "requested"
    } else {
        "none"
    }
    .to_string()
}
