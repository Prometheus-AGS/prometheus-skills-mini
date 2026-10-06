//! Authored schema scenarios. Not run; real kernel/provider/effect acceptance
//! remains at the complete delivery boundary. No in-memory execution fallback.
use super::*;
use crate::TaskQueueCaps;
use serde_json::json;

async fn post(store: &MemorySubstrate, agent: &str) -> String {
    store.task_post("safe title", "safe body", Some(agent), Some("owner"), TaskQueueCaps::UNLIMITED).await.unwrap()
}
fn intent(job: &str) -> SelectedJobIntent {
    let job = JobAttemptRef { job_id: job.into(), attempt: 1 };
    SelectedJobIntent { local_task_id: job.selected_task_id().unwrap(), job,
        initiating_owner: "user:owner".into(), workspace_id: "workspace".into(), expected_assignee: "worker".into() }
}
fn payload(store: &MemorySubstrate, job: &str) -> Vec<u8> {
    store.pool.get().unwrap().query_row("SELECT payload FROM task_queue WHERE id = ?1", [job], |row| row.get(0)).unwrap()
}
fn age(store: &MemorySubstrate, job: &str) {
    store.pool.get().unwrap().execute("UPDATE task_queue SET claimed_at = '2000-01-01T00:00:00+00:00',
        created_at = '2000-01-01T00:00:00+00:00', finished_at = 1 WHERE id = ?1", [job]).unwrap();
}
fn receipt(intent: &SelectedJobIntent) -> (UarJobAttemptReservation, UarDelegatedRunProjection) {
    let projection: UarDelegatedRunProjection = serde_json::from_value(json!({
        "bossTaskId": intent.local_task_id, "verifiedPrincipal": intent.initiating_owner,
        "delegationId":"delegation", "admissionKey":"admission", "requestDigest":"sha256:request",
        "targetBindingId":"binding", "workspaceId":intent.workspace_id, "selectedInstanceId":"instance",
        "effectiveBinding":{"instance_id":"instance","ownership":"external","endpoints":{},
            "workspace_locality":"local","workspace":null,"credential_ref":"reference",
            "profile":"full_harness_v1","capabilities":[],"placement":{"current_operation":"new_session",
                "new_session":true,"native_run_reattachment":false,"live_migration":false}},
        "definition":{"id":"definition","version":"1","digest":"sha256:definition"},
        "admissionState":"accepted","executionState":"completed","cancellationState":"none",
        "effectState":"effect_unconfirmed","recoveryState":"available","bossProjectionRetention":"durable",
        "revision":2,"cursor":2,"runtimeEpoch":"epoch", "uarTaskId":"remote-task", "uarRunId":"run",
        "retention":{"mode":"process_ephemeral","terminalTtlSeconds":60,"terminalRecordCap":10},
        "cancellation":{"requested":false,"acknowledged":false,"terminal":false,"cleanupUncertain":false},"detached":false
    })).unwrap();
    let reservation = UarJobAttemptReservation {
        job:intent.job.clone(), verified_subject:intent.initiating_owner.clone(), verified_tenant:None,
        workspace_id:intent.workspace_id.clone(), boss_task_id:intent.local_task_id.clone(), harness:"uar".into(),
        admission_id:projection.admission_key.clone(), runtime_epoch:"epoch".into(),
        request_digest:projection.request_digest.clone(), definition:projection.definition.clone(),
        credential_ref:Some("reference".into()), credential_revision:None, required_capabilities:vec![],
    };
    (reservation, projection)
}

#[tokio::test]
async fn selected_preflight_pause_and_restart_never_release_to_native() {
    let dir = tempfile::tempdir().unwrap(); let path = dir.path().join("tasks.db");
    let store = MemorySubstrate::open(&path, 0.1).unwrap();
    let job = post(&store,"worker").await; let selected = intent(&job);
    assert_eq!(store.task_claim_selected_intent(selected.clone()).await.unwrap(), SelectedClaim::Created);
    // No A2A reservation/network submission exists yet: preflight is paused.
    assert!(store.task_claim_native_wake(&[job.clone()], "worker", None).await.unwrap().is_empty());
    assert!(store.task_claim("worker", None).await.unwrap().is_none());
    age(&store,&job);
    assert!(store.task_reset_stuck(1,0).await.unwrap().is_empty());
    assert!(!store.task_update_status(&job,"pending").await.unwrap());
    assert!(!store.task_update_status(&job,"cancelled").await.unwrap());
    assert!(!store.task_delete(&job).await.unwrap());
    assert!(store.task_complete(&job,"wrong native result").await.is_err());
    drop(store);
    let reopened = MemorySubstrate::open(&path, 0.1).unwrap();
    assert_eq!(reopened.task_claim_selected_intent(selected.clone()).await.unwrap(), SelectedClaim::Existing);
    assert_eq!(reopened.task_read_dispatch_intent(&job).await.unwrap(), Some(JobDispatchState::Selected(selected)));
    assert!(reopened.task_claim_native_wake(&[job],"worker",None).await.unwrap().is_empty());
}

#[tokio::test]
async fn native_exact_winner_survives_retry_and_is_not_a_second_loop_grant() {
    let store = MemorySubstrate::open_in_memory(0.1).unwrap();
    let job = post(&store,"worker").await; let other = post(&store,"other").await;
    let rows = store.task_claim_native_wake(&[job.clone(),other.clone()],"worker",None).await.unwrap();
    assert_eq!(rows.len(),1); assert_eq!(rows[0].id,job); assert_eq!(rows[0].status,"in_progress");
    assert!(store.task_claim_native_wake(&[job.clone()],"worker",None).await.unwrap().is_empty());
    assert_eq!(store.task_claim_selected_intent(intent(&job)).await.unwrap(),SelectedClaim::Conflict);
    store.task_complete(&job,"native result").await.unwrap();
    assert!(store.task_retry(&job).await.unwrap());
    assert_eq!(store.task_claim_selected_intent(intent(&job)).await.unwrap(),SelectedClaim::Conflict);
    assert_eq!(store.task_claim_native_wake(&[job.clone()],"worker",None).await.unwrap().len(),1);
    age(&store,&job);
    assert_eq!(store.task_reset_stuck(1,0).await.unwrap(),vec![job.clone()]);
    assert_eq!(store.task_claim_selected_intent(intent(&job)).await.unwrap(),SelectedClaim::Conflict);
    assert_eq!(store.task_get(&other).await.unwrap().unwrap()["status"],"pending");
}

#[tokio::test]
async fn concurrent_first_claim_has_one_harness_winner() {
    let store = MemorySubstrate::open_in_memory(0.1).unwrap();
    let job = post(&store,"worker").await; let ids = [job.clone()];
    let (selected,native) = tokio::join!(store.task_claim_selected_intent(intent(&job)),
        store.task_claim_native_wake(&ids,"worker",None));
    let selected = selected.unwrap(); let native = native.unwrap();
    assert!((selected == SelectedClaim::Created && native.is_empty())
        || (selected == SelectedClaim::Conflict && native.len() == 1));
}

#[tokio::test]
async fn unsupported_payload_is_neither_overwritten_nor_executed_or_pruned() {
    let store = MemorySubstrate::open_in_memory(0.1).unwrap();
    let job = post(&store,"worker").await;
    let original = br#"{"tag":"bossfang_job_dispatch","version":999,"intent":{}}"#.to_vec();
    store.pool.get().unwrap().execute("UPDATE task_queue SET payload = ?2 WHERE id = ?1",params![job,original]).unwrap();
    age(&store,&job);
    assert_eq!(store.task_read_dispatch_intent(&job).await.unwrap(),Some(JobDispatchState::Unknown));
    assert_eq!(store.task_claim_selected_intent(intent(&job)).await.unwrap(),SelectedClaim::Unknown);
    assert!(store.task_claim("worker",None).await.unwrap().is_none());
    assert_eq!(store.task_expire_stale(1).await.unwrap(),0);
    assert!(!store.task_update_status(&job,"cancelled").await.unwrap());
    assert!(!store.task_delete(&job).await.unwrap());
    store.pool.get().unwrap().execute("UPDATE task_queue SET status = 'failed' WHERE id = ?1",[&job]).unwrap();
    assert!(!store.task_retry(&job).await.unwrap());
    assert!(!store.task_update_status(&job,"pending").await.unwrap());
    assert_eq!(store.task_prune_finished(1).await.unwrap(),0);
    assert_eq!(payload(&store,&job),original);
}

#[tokio::test]
async fn legacy_native_reset_gets_enduring_native_tag_before_pending() {
    let store = MemorySubstrate::open_in_memory(0.1).unwrap();
    let job = post(&store,"worker").await;
    store.pool.get().unwrap().execute("UPDATE task_queue SET status='in_progress' WHERE id=?1",[&job]).unwrap();
    age(&store,&job);
    assert!(payload(&store,&job).is_empty());
    assert_eq!(store.task_reset_stuck(1,0).await.unwrap(),vec![job.clone()]);
    assert!(matches!(store.task_read_dispatch_intent(&job).await.unwrap(),Some(JobDispatchState::Native(_))));
    assert_eq!(store.task_claim_selected_intent(intent(&job)).await.unwrap(),SelectedClaim::Conflict);
    assert!(store.task_claim("worker",None).await.unwrap().is_some());
}

#[tokio::test]
async fn outcome_reconciliation_rolls_back_then_repeats_without_reexecution() {
    let store = MemorySubstrate::open_in_memory(0.1).unwrap();
    let job = post(&store,"worker").await; let selected = intent(&job);
    store.task_claim_selected_intent(selected.clone()).await.unwrap();
    let original = payload(&store,&job); let (reservation,projection) = receipt(&selected);
    // Private A2A outcome already committed; simulated taskboard interruption.
    store.pool.get().unwrap().execute_batch("CREATE TRIGGER interrupt_outcome BEFORE UPDATE ON task_queue
        BEGIN SELECT RAISE(ABORT,'interrupted outcome'); END;").unwrap();
    assert!(store.task_reconcile_selected_outcome(selected.clone(),reservation.clone(),projection.clone()).await.is_err());
    assert_eq!(payload(&store,&job),original);
    assert_eq!(store.task_get(&job).await.unwrap().unwrap()["status"],"in_progress");
    store.pool.get().unwrap().execute_batch("DROP TRIGGER interrupt_outcome;").unwrap();
    assert_eq!(store.task_reconcile_selected_outcome(selected.clone(),reservation.clone(),projection.clone()).await.unwrap(),SelectedReconcile::Applied);
    assert_eq!(store.task_reconcile_selected_outcome(selected.clone(),reservation.clone(),projection.clone()).await.unwrap(),SelectedReconcile::Unchanged);
    assert!(!store.task_retry(&job).await.unwrap());
    age(&store,&job);
    assert_eq!(store.task_prune_finished(1).await.unwrap(),0);
    let mut wrong = projection.clone(); wrong.uar_run_id = Some("different-run".into()); wrong.revision += 1;
    assert_eq!(store.task_reconcile_selected_outcome(selected.clone(),reservation.clone(),wrong).await.unwrap(),SelectedReconcile::Conflict);
    let mut missing = projection; missing.runtime_epoch = None;
    assert_eq!(store.task_reconcile_selected_outcome(selected,reservation,missing).await.unwrap(),SelectedReconcile::Unknown);
}

#[tokio::test]
async fn selection_commit_invalidates_a_stale_generic_native_update() {
    let store = MemorySubstrate::open_in_memory(0.1).unwrap();
    let job = post(&store,"worker").await;
    let stale = native_payload(&store.pool.get().unwrap(),&job).unwrap().unwrap();
    store.task_claim_selected_intent(intent(&job)).await.unwrap();
    // Same exact payload predicate used by generic task mutations after reads.
    let changed = store.pool.get().unwrap().execute(
        "UPDATE task_queue SET status='pending' WHERE id=?1 AND payload=?2",params![job,stale]).unwrap();
    assert_eq!(changed,0);
    assert_eq!(store.task_get(&job).await.unwrap().unwrap()["status"],"in_progress");
}
