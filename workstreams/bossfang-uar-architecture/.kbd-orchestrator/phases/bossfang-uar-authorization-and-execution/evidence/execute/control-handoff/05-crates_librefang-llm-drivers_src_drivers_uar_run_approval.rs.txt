//! Strict decisions carry the original caller-observed pair unchanged.
use super::{binding::require_task_id, UarRunClient, UarRunClientError};
use librefang_types::uar_run::UarDelegatedRunProjection;
use reqwest::Method;

impl UarRunClient {
    /// No lookup here: replacing the caller's revision would authorize a
    /// different observed state. The receiver validates this exact decision.
    pub async fn approve(
        &self,
        projection: &UarDelegatedRunProjection,
        approval_id: &str,
        expected_revision: u64,
        approved: bool,
    ) -> Result<UarDelegatedRunProjection, UarRunClientError> {
        if approval_id.trim().is_empty() {
            return Err(UarRunClientError::InvalidAdmission("original approval ID is required".into()));
        }
        let task_id = require_task_id(projection)?;
        let body = serde_json::json!({
            "expected_revision": expected_revision,
            "approval_id": approval_id,
            "approved": approved
        });
        self.receipt_request(projection, Method::POST,
            &format!("tasks/{task_id}/tool-approval"), Some(&body), "tool approval", true).await
    }
}
