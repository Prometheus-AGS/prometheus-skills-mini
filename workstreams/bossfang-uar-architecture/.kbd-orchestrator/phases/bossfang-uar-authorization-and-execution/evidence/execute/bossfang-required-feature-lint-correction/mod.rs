//! Explicit selected-job dispatch; no provider-name or prompt-based selection.
//! Task mapping supplies verified identity and an already mapped admission.
//! The AppState-owned control is passed through; this module never boots one.

#[cfg(feature = "uar-driver")]
pub mod observation;

pub mod lifecycle;
#[cfg(test)]
mod lifecycle_tests;

use librefang_types::uar_run::UarDelegatedRunProjection;
#[cfg(feature = "uar-driver")]
use librefang_types::uar_run::{JobAttemptRef, UarRunAdmission};

#[cfg(feature = "uar-driver")]
mod admission;
#[cfg(feature = "uar-driver")]
pub mod mapping;
#[cfg(all(test, feature = "uar-driver"))]
mod mapping_tests;
#[cfg(all(test, feature = "uar-driver"))]
mod admission_tests;

/// In-memory, host-resolved selection. This is not a deserializable API request
/// or proof of authentication. The mapping owner must verify owner/tenant,
/// authorize the job, preserve its stable attempt and reject unmapped policy.
/// No Debug implementation: the admission can contain in-memory credentials.
pub struct SelectedUarJob {
    #[cfg(feature = "uar-driver")]
    pub(crate) job: JobAttemptRef,
    #[cfg(feature = "uar-driver")]
    pub(crate) verified_subject: String,
    #[cfg(feature = "uar-driver")]
    pub(crate) verified_tenant: Option<String>,
    #[cfg(feature = "uar-driver")]
    pub(crate) admission: UarRunAdmission,
    #[cfg(feature = "uar-driver")]
    pub(crate) credential_revision: Option<String>,
    #[cfg(feature = "uar-driver")]
    pub(crate) required_capabilities: Vec<String>,
    #[cfg(feature = "uar-driver")]
    pub(crate) requires_durable_restart_recovery: bool,
    #[cfg(feature = "uar-driver")]
    pub(crate) requires_steer: bool,
    /// The existing application authority, never a per-attempt client.
    #[cfg(feature = "uar-driver")]
    pub(crate) control: std::sync::Arc<librefang_llm_drivers::drivers::uar_run::UarRunControl>,
}

/// Callers must resolve selected jobs explicitly. Missing selected context is
/// an error at mapping, never permission to construct Native.
pub enum ResolvedDispatch {
    Native,
    Uar(Box<SelectedUarJob>),
}

/// A delegated receipt is not native completion, usage or a native event stream.
/// Observation is attached by the later control/observation owner.
pub enum JobDispatchOutcome<T> {
    Native(T),
    Delegated(Box<UarDelegatedRunProjection>),
}

/// Fixed local errors never interpolate provider bodies or credential material.
#[derive(Debug, thiserror::Error)]
pub enum JobDispatchError {
    #[error(transparent)]
    Native(#[from] crate::error::KernelError),
    #[error("uar_selected_ephemeral_unsupported")]
    EphemeralUnsupported,
    #[error("uar_harness_feature_unavailable")]
    FeatureUnavailable,
    #[error("uar_selected_identity_invalid")]
    InvalidIdentity,
    #[error("uar_attempt_identity_conflict")]
    IdentityConflict,
    #[error("uar_attempt_storage_unavailable_or_outcome_unknown")]
    StorageUnknown,
    #[error("uar_required_restart_recovery_unsupported")]
    RestartRecoveryUnsupported,
    #[error("uar_required_steer_unsupported")]
    SteerUnsupported,
    /// Index into the host-owned required_capabilities list; avoid exposing an
    /// arbitrary configuration string through an error or log.
    #[error("uar_required_capability_missing_at_index_{0}")]
    CapabilityMissing(usize),
    #[error("uar_admission_preparation_failed")]
    PreparationFailed,
}

impl ResolvedDispatch {
    /// Both ephemeral entry wrappers call this before registry/workspace/loop
    /// setup. The first release deliberately has no ephemeral UAR profile.
    pub fn require_native_ephemeral(&self) -> Result<(), JobDispatchError> {
        match self {
            Self::Native => Ok(()),
            Self::Uar(_) => Err(JobDispatchError::EphemeralUnsupported),
        }
    }
}

pub(super) async fn dispatch_selected(
    kernel: &super::LibreFangKernel,
    agent_id: librefang_types::agent::AgentId,
    selected: SelectedUarJob,
) -> Result<UarDelegatedRunProjection, JobDispatchError> {
    #[cfg(feature = "uar-driver")]
    {
        admission::dispatch(kernel, agent_id, selected).await
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        let _ = (kernel, agent_id, selected);
        Err(JobDispatchError::FeatureUnavailable)
    }
}

/// Existing native stream shape, kept distinct from delegated admission.
pub type NativeJobStream = (
    tokio::sync::mpsc::Receiver<librefang_runtime::llm_driver::StreamEvent>,
    tokio::task::JoinHandle<crate::error::KernelResult<librefang_runtime::agent_loop::AgentLoopResult>>,
);
