//! Real kernel entry contracts paired with the Node HARNESS gate's current UAR
//! process and controlled HTTP model. No mock LlmDriver or execution receipt.
// The real async fixture exceeded the compiler's default query depth (130 > 128).
#![recursion_limit = "256"]

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn bauar_kernel_entry_contract() {
    assert!(cfg!(feature = "uar-driver"), "real provider driver required");
    #[cfg(feature = "uar-driver")]
    enabled::run().await;
}

#[cfg(feature = "uar-driver")]
mod enabled {
use librefang_kernel::{KernelApi, LibreFangKernel};
use librefang_kernel::kernel::uar_harness::{mapping, JobDispatchError, JobDispatchOutcome, ResolvedDispatch};
use librefang_kernel_handle::KernelHandle;
use librefang_llm_drivers::drivers::{uar, uar_run::UarRunControl};
use librefang_types::{agent::{AgentManifest, UserId}, config::KernelConfig,
    ephemeral::EphemeralSpawnRequest};
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Arc};

fn manifest(name: &str, provider: &str, model: &str, base: Option<&str>) -> AgentManifest {
    let mut value = json!({"name":name,"version":"1.0.0","description":"private HARNESS fixture",
        "module":"builtin:chat", "model":{"provider":provider,"model":model,
        "system_prompt":"Return the requested fixture marker."}});
    if provider != "uar" { value["model"]["api_key_env"] = json!("BAUAR_MODEL_KEY"); }
    if let Some(base) = base { value["model"]["base_url"] = json!(base); }
    serde_json::from_value(value).expect("actual AgentManifest")
}

fn checkpoint(root: &std::path::Path, stage: &str, completed: usize, line: u32) {
    let value = json!({"schemaVersion":1,"stage":stage,"completedCaseCount":completed,
        "source":"crates/librefang-kernel/tests/bauar_harness_delegation.rs","line":line});
    std::fs::write(root.join("kernel-stage.json"), serde_json::to_vec(&value).unwrap()).unwrap();
}

pub async fn run() {
    assert!(cfg!(feature = "surreal-backend"), "default operational persistence required");
    let root = PathBuf::from(std::env::var_os("BAUAR_KERNEL_ROOT").expect("private gate root required"));
    let mut cases = Vec::new();
    macro_rules! stage {
        ($name:literal) => { checkpoint(&root, $name, cases.len(), line!()); };
    }
    stage!("configuration_read");
    let mut config: KernelConfig = serde_json::from_slice(&std::fs::read(root.join("config.json")).unwrap()).unwrap();
    stage!("configuration_scope_assert");
    assert!(config.home_dir.starts_with(&root) && config.data_dir.starts_with(&root));
    stage!("configuration_setup");
    config.storage = librefang_storage::config::StorageConfig::embedded_default(root.join("operational"));
    config.memory.sqlite_path = Some(root.join("memory.db"));
    config.task_board.assignee_wake = false;
    let model = config.default_model.clone();
    stage!("provider_instance_resolve");
    let instance = config.uar.as_ref().unwrap().selected_instance().unwrap();
    stage!("provider_credential_read");
    let token = std::env::var("BAUAR_UAR_BEARER").expect("private provider bearer");
    stage!("registry_seed");
    librefang_kernel::registry_sync::seed_registry_fixture_for_tests(&config.home_dir);
    stage!("kernel_boot");
    let kernel = Arc::new(LibreFangKernel::boot_with_config(config).expect("actual kernel boot"));
    stage!("kernel_handle");
    Arc::clone(&kernel).set_self_handle();
    stage!("supervised_configuration");
    uar::configure_supervised_instance(Ok(instance.clone()));
    uar::configure_supervised_credentials(Ok(uar::UarResolvedCredentials {
        runtime: Some(token.clone().into()), administration: Some(token.clone().into()),
        models: Some(token.clone().into()), console: Some(token.clone().into()),
    }));
    stage!("connection_setup");
    let connection = librefang_channels::uar_sidecar::UarConnectionManager::new(
        instance.effective_sidecar(), root.clone())
        .with_instance_config(Some(&instance)).with_probe_bearer(Some(token))
        .with_endpoint_callback(uar::set_supervised_endpoint_with_bearer);
    stage!("provider_connect");
    connection.connect().await.expect("current provider connection must authenticate");
    stage!("provider_admission");
    let binding = uar::admit_supervised_binding().await.expect("actual compatibility admission");
    stage!("native_spawn");
    let native = kernel.spawn_agent(manifest("bauar-native", "openai", &model.model,
        model.base_url.as_deref())).unwrap();
    stage!("native_normal_call");
    match kernel.send_job_message(native, "BAUAR_NATIVE_NORMAL", ResolvedDispatch::Native).await.unwrap() {
        JobDispatchOutcome::Native(result) => { stage!("native_normal_response_assert"); assert!(result.response.contains("BAUAR_NATIVE_NORMAL done")); },
        JobDispatchOutcome::Delegated(_) => panic!("native entry must remain native"),
    }
    cases.push("native-normal");
    stage!("case_1_complete");
    stage!("native_stream_call");
    let outcome = Arc::clone(&kernel).send_job_message_streaming(native, "BAUAR_NATIVE_STREAM", None,
        ResolvedDispatch::Native).await.unwrap();
    stage!("native_stream_variant");
    let JobDispatchOutcome::Native((mut events, task)) = outcome else { panic!("native stream required") };
    let mut event_count = 0;
    stage!("native_stream_drain");
    while events.recv().await.is_some() { event_count += 1; }
    stage!("native_stream_events_assert");
    assert!(event_count > 0, "actual native stream must emit events");
    stage!("native_stream_result_assert");
    assert!(task.await.unwrap().unwrap().response.contains("BAUAR_NATIVE_STREAM done"));
    cases.push("native-stream");
    stage!("case_2_complete");
    stage!("native_ephemeral_call_assert");
    assert!(kernel.send_job_message_ephemeral(native, "BAUAR_NATIVE_EPHEMERAL", None, None,
        ResolvedDispatch::Native).await.unwrap().response.contains("BAUAR_NATIVE_EPHEMERAL done"));
    stage!("native_spawn_ephemeral_call_assert");
    assert!(kernel.spawn_job_ephemeral_worker(EphemeralSpawnRequest::new(native, "fixture",
        "BAUAR_NATIVE_SPAWN").with_tools(vec![]), ResolvedDispatch::Native).await.unwrap()
        .response.contains("BAUAR_NATIVE_SPAWN done"));
    cases.push("native-ephemeral-entrypoints");
    stage!("case_3_complete");

    // A legacy UAR model provider alone must never select full HARNESS delegation.
    stage!("legacy_spawn");
    let legacy = kernel.spawn_agent(manifest("bauar-legacy", "uar", &model.model, None)).unwrap();
    stage!("legacy_call");
    match kernel.send_job_message(legacy, "BAUAR_LEGACY_MODEL", ResolvedDispatch::Native).await.unwrap() {
        JobDispatchOutcome::Native(result) => { stage!("legacy_response_assert"); assert!(result.response.contains("BAUAR_LEGACY_MODEL done")); },
        JobDispatchOutcome::Delegated(_) => panic!("provider name must not select the harness"),
    }
    cases.push("legacy-uar-model-provider");
    stage!("case_4_complete");

    let handle: &dyn KernelHandle = kernel.as_ref();
    stage!("selected_task_post");
    let task_id = handle.task_post("BAUAR_EPHEMERAL_REFUSED",
        "No selected ephemeral profile exists.", Some(&native.to_string()), None).await.unwrap();
    stage!("selected_task_read");
    let stored = handle.task_get(&task_id).await.unwrap().unwrap();
    stage!("selected_config_read");
    let selection: Value = serde_json::from_slice(&std::fs::read(root.join("selection.json")).unwrap()).unwrap();
    stage!("selected_control");
    let control = Arc::new(UarRunControl::default());
    let selected = || ResolvedDispatch::Uar(Box::new(mapping::map_service_job(kernel.auth_manager(),
        UserId::from_name("bauar-owner"), &stored, &binding,
        serde_json::from_value(selection.clone()).unwrap(), control.clone()).unwrap()));
    stage!("selected_attempt_baseline");
    let count_before = kernel.a2a_tasks().list_uar_job_attempts().unwrap().len();
    stage!("selected_ephemeral_refusal_assert");
    assert!(matches!(kernel.send_job_message_ephemeral(native, "ignored", None, None,
        selected()).await, Err(JobDispatchError::EphemeralUnsupported)));
    stage!("selected_spawn_refusal_assert");
    assert!(matches!(kernel.spawn_job_ephemeral_worker(EphemeralSpawnRequest::new(
        native, "refused", "ignored"), selected()).await, Err(JobDispatchError::EphemeralUnsupported)));
    stage!("selected_attempt_count_assert");
    assert_eq!(kernel.a2a_tasks().list_uar_job_attempts().unwrap().len(), count_before);
    stage!("selected_intent_assert");
    assert!(matches!(kernel.read_job_dispatch_intent(&task_id).await.unwrap(),
        Some(librefang_memory::task_dispatch::JobDispatchState::Unclaimed)));
    cases.push("selected-ephemeral-refuses-before-reservation");
    stage!("case_5_complete");
    stage!("selected_attempt_absence_assert");
    assert!(!kernel.a2a_tasks().list_uar_job_attempts().unwrap().iter()
        .any(|row| row.job.job_id == task_id));
    stage!("receipt_write");
    std::fs::write(root.join("receipt.json"), serde_json::to_vec(&json!({
        "schemaVersion":1,"executedCases":cases.len(),"cases":cases,
        "nativeAgent":native.to_string(),
        "legacyAgent":legacy.to_string(),"providerInstance":binding.instance_id
    })).unwrap()).unwrap();
    stage!("shutdown");
    kernel.shutdown();
}
}
