//! Source scenarios only: authored for the completed delivery boundary, not
//! executed or a substitute for the real kernel/UAR router/effect gate.
use super::*;
use librefang_llm_drivers::drivers::uar_run::UarRunControl;
use librefang_runtime::a2a::{A2aTask, A2aTaskStatus, A2aTaskStore};
use librefang_types::{agent::AgentId, uar_run::*};
use serde_json::json;

fn fixture() -> (UarJobAttemptReservation, A2aTask, UarDelegatedRunProjection) {
    let projection: UarDelegatedRunProjection = serde_json::from_value(json!({
        "bossTaskId": "uar-job-v1-00000000-0000-0000-0000-000000000001-1", "verifiedPrincipal": "verified-owner",
        "delegationId": "delegation-1", "admissionKey": "admission-1",
        "requestDigest": "sha256:request", "targetBindingId": "binding-1",
        "workspaceId": "workspace-1", "selectedInstanceId": "instance-1",
        "effectiveBinding": {
            "instance_id": "instance-1", "ownership": "external", "endpoints": {},
            "workspace_locality": "local", "workspace": null,
            "credential_ref": "credential-reference", "profile": "full_harness_v1",
            "capabilities": [], "placement": {"current_operation": "new_session",
                "new_session": true, "native_run_reattachment": false, "live_migration": false}
        },
        "definition": {"id": "definition-1", "version": "1", "digest": "sha256:definition"},
        "admissionState": "reserved", "executionState": "submitted",
        "cancellationState": "none", "effectState": "not_dispatched",
        "recoveryState": "available", "bossProjectionRetention": "process_ephemeral",
        "revision": 0, "cursor": 0, "runtimeEpoch": "epoch-1",
        "retention": {"mode": "process_ephemeral", "terminalTtlSeconds": 60, "terminalRecordCap": 10},
        "cancellation": {"requested": false, "acknowledged": false, "terminal": false, "cleanupUncertain": false},
        "detached": false
    })).unwrap();
    let reservation = UarJobAttemptReservation {
        job: JobAttemptRef { job_id: "00000000-0000-0000-0000-000000000001".into(), attempt: 1 },
        verified_subject: projection.verified_principal.clone(), verified_tenant: None,
        workspace_id: projection.workspace_id.clone(), boss_task_id: projection.boss_task_id.clone(),
        harness: "uar".into(), admission_id: projection.admission_key.clone(),
        runtime_epoch: "epoch-1".into(), request_digest: projection.request_digest.clone(),
        definition: projection.definition.clone(), credential_ref: Some("credential-reference".into()),
        credential_revision: Some("revision-1".into()), required_capabilities: vec![],
    };
    let task = A2aTask { id: projection.boss_task_id.clone(), session_id: None,
        status: A2aTaskStatus::Submitted.into(), messages: vec![], artifacts: vec![],
        agent_id: None, caller_a2a_agent_id: None };
    (reservation, task, projection)
}

fn selected(reservation: &UarJobAttemptReservation, receipt: &UarDelegatedRunProjection) -> SelectedUarJob {
    SelectedUarJob {
        job: reservation.job.clone(),
        verified_subject: reservation.verified_subject.clone(),
        verified_tenant: reservation.verified_tenant.clone(),
        admission: UarRunAdmission {
            boss_task_id: receipt.boss_task_id.clone(), delegation_id: receipt.delegation_id.clone(),
            admission_key: receipt.admission_key.clone(), target_binding_id: receipt.target_binding_id.clone(),
            workspace_id: receipt.workspace_id.clone(), definition: receipt.definition.clone(),
            definition_diagnostics: vec![],
            run: json!({"input": "changed input", "run_credentials": {"token": "synthetic-secret-canary"}})
                .as_object().unwrap().clone(),
        },
        credential_revision: Some("renewed-credential-revision".into()),
        required_capabilities: vec![], requires_durable_restart_recovery: false,
        requires_steer: false, control: std::sync::Arc::new(UarRunControl::default()),
    }
}

#[tokio::test]
async fn reopened_attempt_with_changed_credentials_reconciles_without_new_identity() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("attempts.db");
    let (reservation, task, projection) = fixture();
    {
        let store = A2aTaskStore::with_persistence(10, &path);
        store.reserve_uar_job_attempt(reservation.clone(), task, projection.clone()).unwrap();
    }
    let store = A2aTaskStore::with_persistence(10, &path);
    // No retained connection exists after restart. The existing branch must
    // return unknown locally without preflight, new admission or native work.
    let result = admission::dispatch_to_store(&store, AgentId::new(), selected(&reservation, &projection), librefang_memory::task_dispatch::SelectedClaim::Existing)
        .await.unwrap();
    assert_eq!(result.runtime_epoch, projection.runtime_epoch);
    assert_eq!(result.admission_key, projection.admission_key);
    assert_eq!(result.request_digest, projection.request_digest);
    assert_eq!(result.recovery_state, "outcome_unknown");
    assert_eq!(result.effect_state, "effect_unconfirmed");
    let saved = store.get_uar_job_attempt(&reservation.verified_subject, None,
        &reservation.workspace_id, &reservation.job).unwrap().unwrap();
    assert_eq!(saved.reservation, reservation);
    assert_eq!(store.list_uar_job_attempts().unwrap().len(), 1);
    assert!(!serde_json::to_string(&saved.projection).unwrap().contains("synthetic-secret-canary"));
}

#[tokio::test]
async fn missing_owner_refuses_before_storage_or_preflight() {
    let (reservation, _, projection) = fixture();
    let mut request = selected(&reservation, &projection);
    request.verified_subject.clear();
    let result = admission::dispatch_to_store(&A2aTaskStore::new(10), AgentId::new(), request, librefang_memory::task_dispatch::SelectedClaim::Created).await;
    assert!(matches!(result, Err(JobDispatchError::InvalidIdentity)));
}

#[test]
fn ephemeral_selection_is_explicitly_unsupported() {
    let (reservation, _, projection) = fixture();
    let selected = ResolvedDispatch::Uar(Box::new(selected(&reservation, &projection)));
    assert!(matches!(selected.require_native_ephemeral(), Err(JobDispatchError::EphemeralUnsupported)));
    assert!(ResolvedDispatch::Native.require_native_ephemeral().is_ok());
}
