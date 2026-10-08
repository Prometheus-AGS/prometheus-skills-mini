//! Authored source scenarios, not executed acceptance. These use the real
//! kernel/substrate claim seam; full router/provider/effect verification is
//! owned by the final harness gate, not replaced by these local assertions.
use crate::kernel::LibreFangKernel;
use librefang_memory::{TaskQueueCaps, task_dispatch::{SelectedJobIntent, SelectedClaim, JobDispatchState}};
use librefang_types::{agent::{AgentId, AgentManifest}, config::KernelConfig, uar_run::JobAttemptRef};

fn kernel() -> (LibreFangKernel, tempfile::TempDir, AgentId) {
    let tmp = tempfile::tempdir().unwrap();
    let config = KernelConfig { home_dir: tmp.path().to_owned(),
        data_dir: tmp.path().join("data"), network_enabled: false, ..Default::default() };
    let kernel = LibreFangKernel::boot_with_config(config).unwrap();
    let agent = kernel.spawn_agent_inner(AgentManifest { name: "lifecycle-worker".into(),
        module: "builtin:chat".into(), ..Default::default() }, None, None, None).unwrap();
    (kernel, tmp, agent)
}
async fn post(kernel: &LibreFangKernel, agent: Option<AgentId>, title: &str) -> String {
    let agent = agent.map(|id| id.to_string());
    kernel.memory.substrate.task_post(title, "actual stored body", agent.as_deref(), Some("owner"),
        TaskQueueCaps::UNLIMITED).await.unwrap()
}
fn intent(job: String, agent: AgentId) -> SelectedJobIntent {
    let job = JobAttemptRef { job_id: job, attempt: 1 };
    SelectedJobIntent { local_task_id: job.selected_task_id().unwrap(), job,
        initiating_owner: "verified-owner".into(), workspace_id: "workspace".into(), expected_assignee: agent.to_string() }
}

#[tokio::test(flavor = "multi_thread")]
async fn native_exact_rows_are_claimed_once_before_prompt() {
    let (kernel, _tmp, agent) = kernel();
    let first = post(&kernel, Some(agent), "requested job").await;
    let unrelated = post(&kernel, Some(agent), "unrelated job").await;
    let prompt = kernel.claim_native_job_prompt(agent, &[first.clone()]).await.unwrap().unwrap();
    assert!(prompt.contains("ALREADY CLAIMED"));
    assert!(prompt.contains(&first));
    assert!(!prompt.contains(&unrelated));
    assert!(!prompt.contains("unrelated job"));
    assert_eq!(kernel.memory.substrate.task_get(&first).await.unwrap().unwrap()["status"], "in_progress");
    assert!(kernel.claim_native_job_prompt(agent, &[first.clone()]).await.unwrap().is_none());
    assert_eq!(kernel.memory.substrate.task_claim_selected_intent(intent(first, agent)).await.unwrap(), SelectedClaim::Conflict);
}

#[tokio::test(flavor = "multi_thread")]
async fn committed_selection_without_private_attempt_never_becomes_native() {
    let (kernel, _tmp, agent) = kernel();
    let job = post(&kernel, Some(agent), "selected").await;
    let original = intent(job.clone(), agent);
    assert_eq!(kernel.memory.substrate.task_claim_selected_intent(original.clone()).await.unwrap(), SelectedClaim::Created);
    kernel.reconcile_selected_jobs().await.unwrap();
    assert!(kernel.claim_native_job_prompt(agent, &[job.clone()]).await.unwrap().is_none());
    assert_eq!(kernel.read_job_dispatch_intent(&job).await.unwrap(), Some(JobDispatchState::Selected(original)));
    assert_eq!(kernel.memory.substrate.task_get(&job).await.unwrap().unwrap()["status"], "in_progress");
}

#[tokio::test(flavor = "multi_thread")]
async fn workflow_keeps_context_and_claims_actual_assignee_without_trigger_owner() {
    let (kernel, _tmp, agent) = kernel();
    let job = post(&kernel, Some(agent), "workflow assigned job").await;
    let input = kernel.claim_task_workflow_input(&job, "operator workflow context").await.unwrap().unwrap();
    assert!(input.starts_with("operator workflow context\n\n"));
    assert!(input.contains("ALREADY CLAIMED"));
    assert!(input.contains("actual stored body"));
    assert!(input.contains(&agent.to_string()));
    assert!(kernel.claim_task_workflow_input(&job, "second fire").await.unwrap().is_none());
    let unassigned = post(&kernel, None, "pool job").await;
    assert_eq!(kernel.claim_task_workflow_input(&unassigned, "context").await.unwrap_err(), "task_workflow_assignee_mapping_unsupported");
    assert_eq!(kernel.memory.substrate.task_get(&unassigned).await.unwrap().unwrap()["status"], "pending");
}

#[tokio::test(flavor = "multi_thread")]
async fn workflow_selected_and_unknown_payload_never_authorize_input() {
    let (kernel, _tmp, agent) = kernel();
    let selected = post(&kernel, Some(agent), "selected workflow").await;
    kernel.memory.substrate.task_claim_selected_intent(intent(selected.clone(), agent)).await.unwrap();
    assert!(kernel.claim_task_workflow_input(&selected, "context").await.unwrap().is_none());
    let unknown = post(&kernel, Some(agent), "unknown workflow").await;
    {
        let db = kernel.memory.substrate.pool().get().unwrap();
        db.execute("UPDATE task_queue SET payload = ?2 WHERE id = ?1", rusqlite::params![unknown, b"future-version".as_slice()]).unwrap();
    }
    assert!(kernel.claim_task_workflow_input(&unknown, "context").await.unwrap().is_none());
    assert_eq!(kernel.read_job_dispatch_intent(&unknown).await.unwrap(), Some(JobDispatchState::Unknown));
}
