//! Storage scenarios for the completed BAUAR delivery gate.
//! These exercise private SQLite storage, not the kernel/UAR effect path.

use super::*;
use librefang_types::uar_run::*;
use serde_json::json;

fn fixture() -> (UarJobAttemptReservation, A2aTask, UarDelegatedRunProjection) {
    let projection: UarDelegatedRunProjection = serde_json::from_value(json!({
        "bossTaskId": "product-task", "verifiedPrincipal": "verified-owner",
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
        job: JobAttemptRef { job_id: "job-1".into(), attempt: 1 },
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

fn sql(store: &A2aTaskStore, statement: &str) {
    lock_a2a_recover(store.db.as_ref().unwrap(), "scenario database")
        .execute_batch(statement).unwrap();
}

#[test]
fn reservation_interruption_rolls_back_and_missing_receipt_never_recreates() {
    let dir = tempfile::tempdir().unwrap();
    let store = A2aTaskStore::with_persistence(10, &dir.path().join("a2a.db"));
    let (reservation, task, projection) = fixture();
    sql(&store, "CREATE TRIGGER interrupt_reservation BEFORE INSERT ON uar_delegations_v1
        BEGIN SELECT RAISE(ABORT, 'reservation interrupted'); END;");
    assert!(store.reserve_uar_job_attempt(reservation.clone(), task.clone(), projection.clone()).is_err());
    assert!(store.list_uar_job_attempts().unwrap().is_empty());
    assert!(store.get(&task.id).is_none());
    sql(&store, "DROP TRIGGER interrupt_reservation;");
    assert_eq!(store.reserve_uar_job_attempt(reservation.clone(), task.clone(), projection.clone()).unwrap().disposition, UarReservationDisposition::Created);
    assert_eq!(store.reserve_uar_job_attempt(reservation.clone(), task.clone(), projection.clone()).unwrap().disposition, UarReservationDisposition::Existing);
    let mut changed = reservation.clone();
    changed.runtime_epoch = "replacement-epoch".into();
    let mut changed_projection = projection.clone();
    changed_projection.runtime_epoch = Some(changed.runtime_epoch.clone());
    assert_eq!(store.reserve_uar_job_attempt(changed, task.clone(), changed_projection).unwrap_err(), "uar_attempt_identity_conflict");
    sql(&store, "DELETE FROM uar_delegations_v1 WHERE boss_task_id = 'product-task';");
    assert_eq!(store.reserve_uar_job_attempt(reservation, task, projection).unwrap_err(), "uar_attempt_outcome_unknown");
    assert_eq!(store.list_uar_job_attempts().unwrap().len(), 1);
}

#[test]
fn event_cursor_and_outcome_rollback_together_and_replay_after_restart() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("a2a.db");
    let store = A2aTaskStore::with_persistence(10, &path);
    let (reservation, task, mut projection) = fixture();
    store.reserve_uar_job_attempt(reservation.clone(), task, projection.clone()).unwrap();
    projection.uar_task_id = Some("remote-task".into());
    projection.uar_run_id = Some("remote-run".into());
    projection.revision = 2;
    projection.cursor = 20; // Receipt availability cannot skip unapplied events.
    store.put_uar_delegation(projection.clone()).unwrap();
    assert_eq!(store.get_uar_delegation(&projection.boss_task_id).unwrap().cursor, 0);
    let event = UarAttemptPresentationEvent { runtime_epoch: "epoch-1".into(),
        task_id: "remote-task".into(), run_id: "remote-run".into(), event_id: 1,
        kind: UarAttemptEventKind::State, parts: vec![
            UarPresentationPart::Message { speaker: UarPresentationSpeaker::Human,
                text: UarSecretExcludedText::from_secret_excluded_text("safe input display".into()) },
            UarPresentationPart::Message { speaker: UarPresentationSpeaker::Assistant,
                text: UarSecretExcludedText::from_secret_excluded_text("safe answer".into()) },
            UarPresentationPart::ToolResult {
                tool_name: UarSecretExcludedText::from_secret_excluded_text("safe_tool".into()),
                outcome: UarPresentedToolOutcome::Succeeded,
                text: UarSecretExcludedText::from_secret_excluded_text("safe observation".into()) },
        ] };
    projection.execution_state = "completed".into();
    projection.revision = 3;
    sql(&store, "CREATE TRIGGER interrupt_outcome BEFORE UPDATE ON a2a_tasks_v2
        BEGIN SELECT RAISE(ABORT, 'synthetic-credential-canary'); END;");
    let failure = store.apply_uar_attempt_event(&reservation, event.clone(), projection.clone()).unwrap_err();
    assert!(!failure.contains("synthetic-credential-canary"));
    assert_eq!(store.get_uar_delegation(&projection.boss_task_id).unwrap().cursor, 0);
    assert!(store.uar_attempt_events_after(&reservation, 0).unwrap().is_empty());
    assert_eq!(store.get(&projection.boss_task_id).unwrap().status, A2aTaskStatus::Submitted);
    sql(&store, "DROP TRIGGER interrupt_outcome;");
    drop(store);
    let store = A2aTaskStore::with_persistence(10, &path);
    assert_eq!(store.apply_uar_attempt_event(&reservation, event.clone(), projection.clone()).unwrap(), UarEventApplyOutcome::Applied);
    assert_eq!(store.apply_uar_attempt_event(&reservation, event.clone(), projection.clone()).unwrap(), UarEventApplyOutcome::AlreadyApplied);
    let mut gap = event.clone();
    gap.event_id = 3;
    assert_eq!(store.apply_uar_attempt_event(&reservation, gap, projection.clone()).unwrap_err(), "uar_attempt_event_gap");
    let mut wrong_owner = reservation.clone();
    wrong_owner.verified_subject = "other-owner".into();
    assert_eq!(store.apply_uar_attempt_event(&wrong_owner, event.clone(), projection.clone()).unwrap_err(), "uar_attempt_identity_conflict");
    let expected_parts = event.parts.clone();
    let mut wrong_epoch = event;
    wrong_epoch.runtime_epoch = "other-epoch".into();
    assert_eq!(store.apply_uar_attempt_event(&reservation, wrong_epoch, projection.clone()).unwrap_err(), "uar_attempt_event_identity_conflict");
    drop(store);
    let reopened = A2aTaskStore::with_persistence(10, &path);
    assert_eq!(reopened.get_uar_delegation(&projection.boss_task_id).unwrap().cursor, 1);
    assert_eq!(reopened.get(&projection.boss_task_id).unwrap().status, A2aTaskStatus::Completed);
    let committed = reopened.uar_attempt_events_after(&reservation, 0).unwrap();
    assert_eq!(committed.len(), 1);
    assert_eq!(committed[0].retained_parts(), Some(expected_parts.as_slice()));
}

#[test]
fn selected_retention_preserves_identity_without_changing_old_native_records() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("a2a.db");
    let store = A2aTaskStore::with_persistence(10, &path);
    let (reservation, task, projection) = fixture();
    // Old projections have no reservation fields and still deserialize.
    let old_json = serde_json::to_string(&projection).unwrap();
    let old_projection: UarDelegatedRunProjection = serde_json::from_str(&old_json).unwrap();
    assert_eq!(old_projection.boss_task_id, projection.boss_task_id);
    let mut native = task.clone();
    native.id = "native-task".into();
    store.insert(native);
    store.reserve_uar_job_attempt(reservation.clone(), task.clone(), projection.clone()).unwrap();
    sql(&store, "UPDATE a2a_tasks_v2 SET created_at = 0;");
    drop(store);
    let reopened = A2aTaskStore::with_persistence(1, &path);
    assert!(reopened.get("native-task").is_none());
    assert!(reopened.get(&task.id).is_some());
    assert_eq!(reopened.reserve_uar_job_attempt(reservation, task, projection).unwrap().disposition, UarReservationDisposition::Existing);
}

#[test]
fn reservation_shape_excludes_plaintext_and_ephemeral_store_refuses_selected_jobs() {
    let (reservation, task, projection) = fixture();
    let mut raw = serde_json::to_value(&reservation).unwrap();
    raw["runCredentials"] = json!({"token": "synthetic-credential-canary"});
    assert!(serde_json::from_value::<UarJobAttemptReservation>(raw).is_err());
    assert!(!serde_json::to_string(&reservation).unwrap().contains("synthetic-credential-canary"));
    let old_event: UarAttemptPresentationEvent = serde_json::from_value(json!({
        "runtimeEpoch": "epoch-1", "taskId": "remote-task", "runId": "remote-run",
        "eventId": 1, "kind": "state"
    })).unwrap();
    assert!(old_event.retained_parts().is_none());
    let mut raw_event = serde_json::to_value(old_event).unwrap();
    raw_event["authorization"] = json!("synthetic-credential-canary");
    assert!(serde_json::from_value::<UarAttemptPresentationEvent>(raw_event).is_err());
    assert_eq!(A2aTaskStore::new(10).reserve_uar_job_attempt(reservation, task, projection).unwrap_err(), "uar_attempt_durable_storage_required");
}

#[test]
fn competing_store_handles_reserve_one_original_attempt() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("a2a.db");
    let first = A2aTaskStore::with_persistence(10, &path);
    let second = A2aTaskStore::with_persistence(10, &path);
    let barrier = std::sync::Barrier::new(2);
    let dispositions = std::thread::scope(|scope| {
        let handles = [first, second].into_iter().map(|store| {
            let barrier = &barrier;
            scope.spawn(move || {
                let (reservation, task, projection) = fixture();
                barrier.wait();
                store.reserve_uar_job_attempt(reservation, task, projection)
                    .unwrap().disposition
            })
        }).collect::<Vec<_>>();
        handles.into_iter().map(|handle| handle.join().unwrap()).collect::<Vec<_>>()
    });
    assert_eq!(dispositions.iter().filter(|d| **d == UarReservationDisposition::Created).count(), 1);
    assert_eq!(dispositions.iter().filter(|d| **d == UarReservationDisposition::Existing).count(), 1);
}

