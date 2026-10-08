//! Durable job lifecycle routing. The task-board intent is authoritative before
//! descriptor/network/model work; private A2A outcomes reconcile separately.
use crate::kernel::{LibreFangKernel, subsystems::mesh::MeshSubsystemApi};
use librefang_memory::task_dispatch::{JobDispatchState, SelectedJobIntent, SelectedReconcile};
use librefang_types::agent::AgentId;

impl LibreFangKernel {
    pub async fn read_job_dispatch_intent(&self, job: &str) -> Result<Option<JobDispatchState>, String> {
        self.memory.substrate.task_read_dispatch_intent(job).await
            .map_err(|_| "job_dispatch_storage_unknown".into())
    }

    /// Reconcile only committed original private outcomes. A scheduler does not
    /// possess the API's retained transport and never reconstructs credentials.
    /// Missing A2A state after intent commit remains unknown, never executable.
    pub async fn reconcile_selected_jobs(&self) -> Result<(), String> {
        let jobs = self.memory.substrate.task_list(None).await
            .map_err(|_| "job_dispatch_storage_unknown".to_string())?;
        for job in jobs {
            let Some(id) = job["id"].as_str() else { continue; };
            if let Some(JobDispatchState::Selected(intent)) = self.read_job_dispatch_intent(id).await? {
                self.reconcile_selected_job(intent).await?;
            }
        }
        Ok(())
    }

    pub(crate) async fn reconcile_selected_job(&self, intent: SelectedJobIntent) -> Result<SelectedReconcile, String> {
        let original = self.a2a_tasks().get_uar_job_attempt(&intent.initiating_owner, None,
            &intent.workspace_id, &intent.job).map_err(|_| "selected_attempt_storage_unknown".to_string())?;
        let Some(original) = original else { return Ok(SelectedReconcile::Unknown); };
        if matches!(original.projection.recovery_state.as_str(),
            "outcome_unknown" | "reconciliation_required" | "recovery_unsupported" | "expired") {
            return Ok(SelectedReconcile::Unknown);
        }
        self.memory.substrate.task_reconcile_selected_outcome(intent,
            original.reservation, original.projection).await
            .map_err(|_| "selected_outcome_reconciliation_unknown".into())
    }

    /// Existing workflow input preserves operator context, with actual claimed
    /// rows appended. The trigger owner never becomes an invented assignee.
    pub(crate) async fn claim_task_workflow_input(&self, job: &str, context: &str) -> Result<Option<String>, String> {
        let row = self.memory.substrate.task_get(job).await
            .map_err(|_| "job_dispatch_storage_unknown".to_string())?;
        let assignee = row.as_ref().and_then(|row| row["assigned_to"].as_str()).unwrap_or("");
        let entry = match assignee.parse::<AgentId>() {
            Ok(id) => self.agents.registry.get(id),
            Err(_) => self.agents.registry.find_by_name(assignee),
        };
        let Some(entry) = entry else { return Err("task_workflow_assignee_mapping_unsupported".into()); };
        Ok(self.claim_native_job_prompt(entry.id, &[job.to_owned()]).await?
            .map(|claimed| format!("{context}\n\n{claimed}")))
    }

    /// Exact IDs come from the typed event/pending rows, never prompt parsing.
    /// None means no new claim, so the caller must not start a targeted loop.
    pub(crate) async fn claim_native_job_prompt(&self, agent: AgentId, jobs: &[String]) -> Result<Option<String>, String> {
        for job in jobs {
            if let Some(JobDispatchState::Selected(intent)) = self.read_job_dispatch_intent(job).await? {
                self.reconcile_selected_job(intent).await?;
            }
        }
        let name = self.agents.registry.get(agent).map(|entry| entry.name.clone());
        let rows = self.memory.substrate.task_claim_native_wake(jobs, &agent.to_string(), name.as_deref()).await
            .map_err(|_| "native_job_claim_unknown".to_string())?;
        if rows.is_empty() { return Ok(None); }
        let data = serde_json::to_string(&rows).map_err(|_| "native_job_claim_encoding_failed".to_string())?;
        Ok(Some(format!("[System] These exact task-board jobs are ALREADY CLAIMED by this agent and in_progress. Execute only these rows, then use task_complete with each exact id. Do not call task_claim or discover other work for this wake.\n{data}")))
    }
}
