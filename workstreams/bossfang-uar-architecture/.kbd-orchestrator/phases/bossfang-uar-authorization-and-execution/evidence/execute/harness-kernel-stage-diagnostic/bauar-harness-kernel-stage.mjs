// Emit only the fixed private kernel fixture checkpoint, never captured process output.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const stages = new Set([
  "configuration_read",
  "configuration_scope_assert",
  "configuration_setup",
  "provider_instance_resolve",
  "provider_credential_read",
  "registry_seed",
  "kernel_boot",
  "kernel_handle",
  "supervised_configuration",
  "connection_setup",
  "provider_connect",
  "provider_admission",
  "native_spawn",
  "native_normal_call",
  "native_normal_response_assert",
  "case_1_complete",
  "native_stream_call",
  "native_stream_variant",
  "native_stream_drain",
  "native_stream_events_assert",
  "native_stream_result_assert",
  "case_2_complete",
  "native_ephemeral_call_assert",
  "native_spawn_ephemeral_call_assert",
  "case_3_complete",
  "legacy_spawn",
  "legacy_call",
  "legacy_response_assert",
  "case_4_complete",
  "selected_task_post",
  "selected_task_read",
  "selected_config_read",
  "selected_control",
  "selected_attempt_baseline",
  "selected_ephemeral_refusal_assert",
  "selected_spawn_refusal_assert",
  "selected_attempt_count_assert",
  "selected_intent_assert",
  "case_5_complete",
  "selected_attempt_absence_assert",
  "receipt_write",
  "shutdown"
]);
const source = 'crates/librefang-kernel/tests/bauar_harness_delegation.rs';
export async function emitKernelStage(root) {
  try {
    const value = JSON.parse(await readFile(join(root, 'kernel', 'kernel-stage.json'), 'utf8'));
    const keys = ['schemaVersion', 'stage', 'completedCaseCount', 'source', 'line'];
    const valid = value && typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
      && value.schemaVersion === 1 && stages.has(value.stage) && value.source === source
      && Number.isInteger(value.completedCaseCount) && value.completedCaseCount >= 0 && value.completedCaseCount <= 5
      && Number.isInteger(value.line) && value.line >= 1 && value.line <= 500;
    if (!valid) { console.error(JSON.stringify({ kernelStageDiagnosticValid: false })); return; }
    console.error(JSON.stringify({ kernelStageCheckpoint: {
      schemaVersion: 1, stage: value.stage, completedCaseCount: value.completedCaseCount, source, line: value.line } }));
  } catch { console.error(JSON.stringify({ kernelStageDiagnosticAvailable: false })); }
}
