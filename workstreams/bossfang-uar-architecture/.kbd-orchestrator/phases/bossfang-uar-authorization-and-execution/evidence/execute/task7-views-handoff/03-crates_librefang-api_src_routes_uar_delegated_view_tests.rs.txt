//! Source-only projection scenarios. Full identity/control/effect verification
//! belongs to the final real-kernel/provider acceptance fixture, not these tests.
use super::*;
use serde_json::json;

fn original() -> UarReservedJobAttempt {
    let job = JobAttemptRef { job_id: "00000000-0000-0000-0000-000000000001".into(), attempt: 1 };
    let projection: UarDelegatedRunProjection = serde_json::from_value(json!({
        "bossTaskId":job.selected_task_id().unwrap(),"verifiedPrincipal":"original-owner",
        "delegationId":"delegation","admissionKey":"admission","requestDigest":"sha256:request",
        "targetBindingId":"binding","workspaceId":"workspace","selectedInstanceId":"instance",
        "effectiveBinding":{"instance_id":"instance","ownership":"external","endpoints":{},
            "workspace_locality":"local","workspace":null,"credential_ref":"reference",
            "profile":"full_harness_v1","capabilities":[],"placement":{"current_operation":"new_session",
                "new_session":true,"native_run_reattachment":false,"live_migration":false}},
        "definition":{"id":"definition","version":"1","digest":"sha256:definition"},
        "admissionState":"admitted","executionState":"cancelled","cancellationState":"requested",
        "effectState":"effect_unconfirmed","recoveryState":"available","bossProjectionRetention":"durable",
        "revision":8,"cursor":3,"runtimeEpoch":"original-epoch","uarTaskId":"remote-task","uarRunId":"original-run",
        "retention":{"mode":"process_ephemeral","terminalTtlSeconds":60,"terminalRecordCap":10},
        "cancellation":{"requested":true,"acknowledged":false,"terminal":true,"cleanupUncertain":true},"detached":false
    })).unwrap();
    let reservation = UarJobAttemptReservation { job, verified_subject: projection.verified_principal.clone(),
        verified_tenant: None, workspace_id: projection.workspace_id.clone(), boss_task_id: projection.boss_task_id.clone(),
        harness:"uar".into(), admission_id: projection.admission_key.clone(), runtime_epoch:"original-epoch".into(),
        request_digest:projection.request_digest.clone(), definition:projection.definition.clone(),
        credential_ref:Some("reference".into()), credential_revision:None, required_capabilities:vec![] };
    UarReservedJobAttempt { disposition:UarReservationDisposition::Existing, reservation, projection }
}
fn event(parts: Vec<UarPresentationPart>) -> UarAttemptPresentationEvent {
    UarAttemptPresentationEvent { runtime_epoch:"original-epoch".into(), task_id:"remote-task".into(),
        run_id:"original-run".into(), event_id:3, kind:UarAttemptEventKind::State, parts }
}

#[test]
fn original_identity_and_cancellation_facts_stay_distinct() {
    let view = serde_json::to_value(project(original(), vec![])).unwrap();
    assert_eq!(view["originalOwner"], "original-owner"); assert_eq!(view["job"]["attempt"], 1);
    assert_eq!(view["runtimeEpoch"], "original-epoch"); assert_eq!(view["runId"], "original-run");
    assert_eq!(view["revision"], 8); assert_eq!(view["cancellation"]["requested"], true);
    assert_eq!(view["cancellation"]["acknowledged"], false); assert_eq!(view["cancellation"]["terminal"], true);
    assert_eq!(view["cancellation"]["cleanupUncertain"], true);
    assert_eq!(view["effectState"], "effect_unconfirmed");
    assert!(view["usage"].is_null()); assert_eq!(view["historicalTextAvailable"], false);
    assert_eq!(view["historyIsExecutable"], false);
}

#[test]
fn retained_presentation_and_usage_are_data_only_without_invented_totals() {
    let history = vec![event(vec![UarPresentationPart::Message { speaker:UarPresentationSpeaker::Assistant,
        text:UarSecretExcludedText::from_secret_excluded_text("retained [REDACTED] text".into()) },
        UarPresentationPart::Usage { input_tokens:Some(4), output_tokens:Some(2), total_tokens:None, model:None }])];
    let view = serde_json::to_value(project(original(), history)).unwrap();
    assert_eq!(view["usage"]["source"], "uar_observed"); assert_eq!(view["usage"]["inputTokens"], 4);
    assert!(view["usage"]["totalTokens"].is_null()); assert_eq!(view["historicalTextAvailable"], true);
    assert_eq!(view["history"][0]["eventId"], 3); assert_eq!(view["historyIsExecutable"], false);
    assert!(!view.to_string().contains("cost")); assert!(!view.to_string().contains("arguments"));
}

#[test]
fn cancellation_requires_exact_original_observed_revision() {
    let projection = original().projection;
    assert!(cancel_revision(&projection, None).is_err());
    assert!(cancel_revision(&projection, Some(7)).is_err());
    assert_eq!(cancel_revision(&projection, Some(8)).unwrap(), 8);
}
