import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eligiblePath, readJson, verifyRef, writeNew, requireValue, safeError, digest, within } from '../../acceptance/lib/records.mjs';
import { readReceipt } from '../../acceptance/lib/receipts.mjs';

const phase = 'phase-bauar-release-acceptance';
const phaseRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const fixtures = ['bauar-harness-gate.mjs', 'bauar-harness-runtime.mjs',
  'bauar-harness-peer.mjs', 'bauar-harness-supervisor.mjs'];
const stages = ['setup', 'provider_start', 'provider_seed', 'host_start', 'normal_selected',
  'streaming_selected', 'denial', 'cancellation', 'lost_responses', 'reconnect',
  'capture_crash', 'intent_crash', 'native_compatibility', 'runtime_epoch',
  'kernel_contract', 'final_receipt', 'incomplete_terminal_start', 'incomplete_terminal_approved',
  'incomplete_terminal_before_restart', 'incomplete_terminal_after_restart', 'incomplete_terminal_finished'];
const cases = ['registered-owner-and-explicit-unsupported', 'normal-exact-approval-and-reconciliation',
  'streaming-and-outcome-commit-crash', 'exact-denial-no-effect',
  'three-surface-cancellation-exact-caller-revision', 'lost-admission-and-decision-response-no-reenactment',
  'observation-reconnect-original-run', 'provider-admission-before-host-capture-crash',
  'durable-intent-crash-before-a2a', 'actual-pending-and-stale-sweep-preserves-selected-intent',
  'enabled-wake-native-and-selected-cas-winners', 'provider-epoch-restart-remains-unknown',
  'native-legacy-and-ephemeral-kernel-contract'];
const codes = ['ERR_ASSERTION', 'ERR_INVALID_ARG_TYPE', 'ERR_MODULE_NOT_FOUND', 'ERR_INVALID_URL',
  'ERR_HTTP_HEADERS_SENT', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ENOENT', 'EACCES', 'EADDRINUSE', 'ETIMEDOUT'];
const providerCodes = ['stored_job_unavailable', 'job_dispatch_storage_unknown', 'selected_attempt_storage_unknown',
  'selected_attempt_outcome_unknown', 'uar_service_binding_unavailable', 'selected_dispatch_unavailable_or_unknown',
  'admission_digest_conflict', 'service_binding_mismatch', 'service_instance_incompatible',
  'service_migration_unsupported', 'run_binding_conflict', 'uar_runtime_epoch_lost',
  'uar_attempt_outcome_unknown', 'uar_retention_expired'];
const operations = ['selected_admission', 'selected_events', 'selected_approval', 'selected_cancel', 'selected_lookup',
  'provider_stream', 'provider_receipt', 'a2a_rest', 'a2a_rpc', 'task_board', 'agent_creation', 'unclassified'];
const fixed = (value, allowed) => allowed.includes(value) ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const boolean = value => typeof value === 'boolean' ? value : null;
const status = value => Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
const escaped = value => value.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');

function sources(refs) {
  requireValue(Array.isArray(refs) && refs.length === 4, 'exact_four_fixture_refs_required');
  for (const ref of refs) eligiblePath(ref.path);
  requireValue(new Set(refs.map(ref => ref.path)).size === 4
    && fixtures.every(name => refs.filter(ref => basename(ref.path) === name).length === 1)
    && new Set(refs.map(ref => dirname(ref.path))).size === 1, 'fixture_source_inventory_invalid');
  return refs;
}
function processCheckpoint(value) {
  if (!value || typeof value !== 'object') return null;
  return { exitCode: Number.isInteger(value.exitCode) ? value.exitCode : null,
    signal: fixed(value.signal, ['SIGABRT', 'SIGSEGV', 'SIGILL', 'SIGBUS', 'SIGKILL', 'SIGTERM']),
    ...Object.fromEntries(['running', 'spawnError', 'stdinError', 'readyObserved', 'stderrClassified',
      'stackOverflow', 'rustPanic', 'allocationFailure'].map(key => [key, boolean(value[key])])) };
}
function checkpoint(value) {
  return { stage: fixed(value?.stage, stages), cancellationSurface: fixed(value?.cancellationSurface, ['direct', 'rest', 'rpc']),
    cancellationStep: fixed(value?.cancellationStep, ['admission', 'approval_observation', 'revision_lookup',
      'missing_revision', 'stale_revision', 'exact_revision', 'terminal_observation']),
    lastCompletedCase: fixed(value?.lastCompletedCase, cases), completedCaseCount: count(value?.completedCaseCount),
    host: processCheckpoint(value?.host), provider: processCheckpoint(value?.provider), kernel: processCheckpoint(value?.kernel) };
}

/** Pure in-memory observer. Unknown lines/fields are discarded, never persisted. */
export function createHarnessDiagnosticObserver(sourceRefs) {
  const refs = sources(sourceRefs);
  const errorCodes = new Set(), errorKinds = new Set(), httpStatuses = new Set(), refusalCodes = new Set();
  const locations = new Map(), completed = new Set(), stagesObserved = new Set(), timeouts = new Map();
  let classifiedLines = 0, fixedCheckpoint = null, finalRecords = 0, finalExecutedCases = null;
  let admissionCheckpointSeen = false, bindingCheckpointSeen = false;
  return {
    observeLine(stream, line) {
      let classified = false;
      for (const code of codes) if (new RegExp('(?:^|[^A-Z_])' + code + '(?:$|[^A-Z_])').test(line)) {
        errorCodes.add(code); classified = true;
      }
      for (const kind of ['AssertionError', 'TypeError', 'SyntaxError', 'RangeError', 'TimeoutError', 'AbortError']) {
        if (new RegExp('(?:^|\\W)' + kind + '(?:$|\\W)').test(line)) { errorKinds.add(kind); classified = true; }
      }
      for (const match of line.matchAll(/\bHTTP ([1-5]\d{2})\b/g)) {
        httpStatuses.add(Number(match[1])); classified = true;
      }
      for (const code of providerCodes) if (line.includes('"' + code + '"')) { refusalCodes.add(code); classified = true; }
      for (const ref of refs) {
        const match = new RegExp(escaped(ref.path) + ':(\\d+):(\\d+)').exec(line);
        if (match && count(Number(match[1])) !== null && count(Number(match[2])) !== null) {
          const location = { path: ref.path, sourceSha256: ref.sha256, line: Number(match[1]), column: Number(match[2]) };
          locations.set(ref.path + ':' + match[1] + ':' + match[2], location); classified = true;
        }
      }
      if (line.trim().startsWith('{')) {
        let value;
        try { value = JSON.parse(line); } catch { value = null; }
        if (value?.harnessFailureCheckpoint) {
          fixedCheckpoint = checkpoint(value.harnessFailureCheckpoint);
          if (fixedCheckpoint.stage) stagesObserved.add(fixedCheckpoint.stage);
          classified = true;
        }
        const currentStage = fixed(value?.harnessStage, stages);
        if (currentStage) { stagesObserved.add(currentStage); classified = true; }
        const completedCase = fixed(value?.harnessCompletedCase, cases);
        if (completedCase) { completed.add(completedCase); classified = true; }
        const timeout = value?.harnessRequestTimeout;
        if (timeout && fixed(timeout.operation, operations)) {
          const selected = { operation: timeout.operation, method: fixed(timeout.method, ['GET', 'POST', 'DELETE', 'PUT']),
            rpcMethod: fixed(timeout.rpcMethod, ['tasks/get', 'tasks/cancel']) };
          timeouts.set(digest(selected), selected); classified = true;
        }
        if (value?.admissionCheckpoint) {
          admissionCheckpointSeen = true;
          const statuses = value.admissionCheckpoint.providerAdmissionStatuses;
          const refusals = value.admissionCheckpoint.providerAdmissionRefusalCodes;
          for (const item of Array.isArray(statuses) ? statuses : []) if (status(item) !== null) httpStatuses.add(item);
          for (const item of Array.isArray(refusals) ? refusals : []) if (providerCodes.includes(item)) refusalCodes.add(item);
          classified = true;
        }
        if (value?.bindingCheckpoint) { bindingCheckpointSeen = true; classified = true; }
        if (stream === 'stdout' && value?.passed === true && count(value.executedCases) !== null) {
          finalRecords++; finalExecutedCases = value.executedCases; classified = true;
          // No receipt path or raw final payload is retained by the observer.
        }
      }
      if (classified) classifiedLines++;
    },
    result() { return { diagnosticClassifiedLines: classifiedLines, diagnosticErrorCodes: errorCodes.size,
      diagnosticSourceLocations: locations.size, diagnosticFixedCheckpointSeen: fixedCheckpoint !== null,
      diagnosticFinalRecords: finalRecords }; },
    snapshot() { return { schemaVersion: 1, kind: 'fixed-harness-diagnostic-observation',
      stagesObserved: [...stagesObserved], completedCases: [...completed], checkpoint: fixedCheckpoint,
      errorCodes: [...errorCodes], errorKinds: [...errorKinds], httpStatuses: [...httpStatuses],
      providerRefusalCodes: [...refusalCodes], sourceLocations: [...locations.values()], requestTimeouts: [...timeouts.values()],
      admissionCheckpointSeen, bindingCheckpointSeen, finalRecords, finalExecutedCases,
      rawOutputRetained: false, credentialsRetained: false, actualRequestBodiesRetained: false,
      runtimeAssertionsSynthesized: false, acceptanceVerdict: 'not-adjudicated' }; }
  };
}

async function main() {
  const args = process.argv.slice(2);
  requireValue(args.length === 4 && args[0] === '--inputs' && args[2] === '--inputs-sha256',
    'explicit_digest_bound_request_required');
  const requestRef = { path: eligiblePath(args[1]), sha256: args[3] };
  await verifyRef(requestRef);
  const request = await readJson(requestRef.path);
  requireValue(request.schemaVersion === 1 && request.phase === phase && request.mode === 'extract-fixed-checkpoint',
    'checkpoint_request_invalid');
  const refs = sources(request.fixtureSources);
  for (const ref of [request.execution, request.completedIntegration, request.checkpoint, ...refs]) eligiblePath(ref.path);
  eligiblePath(request.outputPath);
  requireValue(within(join(phaseRoot, 'evidence', 'execute'), request.outputPath)
    && !/(?:^|\/)private(?:$|\/)/.test(request.outputPath), 'public_phase_output_required');
  await verifyRef(request.execution); await verifyRef(request.completedIntegration);
  const execution = await readReceipt(request.execution.path);
  const aggregate = await readReceipt(request.completedIntegration.path);
  requireValue(execution.kind === 'execution' && execution.binding.componentId === 'harness'
    && ['FAIL', 'BLOCKED'].includes(execution.status) && execution.process.category === 'completed'
    && execution.process.cleanup.groupAbsent && !execution.process.cleanup.unknownDescendants,
    'actual_failed_clean_harness_required');
  requireValue(aggregate.kind === 'aggregate' && aggregate.stage === 'integration'
    && aggregate.executionKey === execution.binding.executionKey
    && aggregate.observations.requiredComponents === 8 && aggregate.observations.observedComponents === 8
    && aggregate.components.some(ref => ref.path === request.execution.path && ref.sha256 === request.execution.sha256),
    'completed_batch_with_selected_failure_required');
  requireValue(within(execution.attemptRoot, request.checkpoint.path)
    && basename(request.checkpoint.path) === 'failure-checkpoint.json', 'owned_fixed_checkpoint_required');
  for (const ref of [...refs, request.checkpoint]) await verifyRef(ref);
  const value = await readJson(request.checkpoint.path);
  requireValue(value?.harnessFailureCheckpoint && typeof value.harnessFailureCheckpoint === 'object',
    'fixed_checkpoint_missing');
  const captured = checkpoint(value.harnessFailureCheckpoint);
  requireValue(captured.stage !== null && captured.completedCaseCount !== null, 'checkpoint_unclassified');
  const receipt = await writeNew(request.outputPath, { schemaVersion: 1, kind: 'harness-diagnostic-checkpoint',
    phase, status: 'classified-not-adjudicated', execution: request.execution, completedIntegration: request.completedIntegration,
    inputCheckpoint: request.checkpoint, fixtureSources: refs, captured, createdAt: new Date().toISOString(),
    evidenceBoundary: { runtimeInvoked: false, retryPerformed: false, rawErrorCopied: false, requestBodyCopied: false,
      credentialsCopied: false, modelCallsSynthesized: false, toolEffectsSynthesized: false, canonicalMutated: false },
    limitations: ['Fixed checkpoint extraction identifies stage/process facts only; discarded original error output cannot be recovered.',
      'Supervisor fixture transport and real receiver enforcement remain distinct from native direct transport certification.'] });
  console.log(JSON.stringify({ schemaVersion: 1, status: 'classified-not-adjudicated', receipt }));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { await main(); } catch (error) { const result = safeError(error); console.log(JSON.stringify(result)); process.exitCode = result.exitCode; }
}

