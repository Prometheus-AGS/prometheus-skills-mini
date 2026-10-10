// Selected H01–H04 evidence-only adjudication. Overall desktop batch remains FAIL.
import { join, dirname } from 'node:path';
import { readJson, verifyRef, hashFile, digest, writeNew, requireValue, eligiblePath, safeError } from '../../acceptance/lib/records.mjs';
import { readReceipt, readComponent, compatibleBinding } from '../../acceptance/lib/receipts.mjs';
import { componentBinding, loadConfig, recheck } from '../../acceptance/lib/inputs.mjs';

const phaseRoot = "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance";
const harnessCases = [
  "registered-owner-and-explicit-unsupported",
  "normal-exact-approval-and-reconciliation",
  "streaming-and-outcome-commit-crash",
  "exact-denial-no-effect",
  "three-surface-cancellation-exact-caller-revision",
  "lost-admission-and-decision-response-no-reenactment",
  "observation-reconnect-original-run",
  "provider-admission-before-host-capture-crash",
  "durable-intent-crash-before-a2a",
  "actual-pending-and-stale-sweep-preserves-selected-intent",
  "enabled-wake-native-and-selected-cas-winners",
  "provider-epoch-restart-remains-unknown",
  "native-legacy-and-ephemeral-kernel-contract"
];
const kernelCases = [
  "native-normal",
  "native-stream",
  "native-ephemeral-entrypoints",
  "legacy-uar-model-provider",
  "selected-ephemeral-refuses-before-reservation"
];
const targets = [
  "bauar_identity_boundary",
  "bauar_resource_grants",
  "bauar_stdio_boundary",
  "bauar_secret_projection",
  "bauar_full_harness_cursor"
];
const negatives = [
  "key_authority::http_key_issue_direct_exchange_revoke_preserve_identity_roles_and_bounded_ttl",
  "key_authority::key_metadata_and_mutation_require_owner_tenant_and_exact_issuer_admin_kind",
  "key_authority::standalone_host_grant_requires_mapped_issuer_credential_and_retains_scope_attenuation",
  "local_admission::explicit_local_startup_validates_signed_registered_claims_before_run_admission",
  "local_admission::incomplete_remote_policy_is_rejected_at_actual_startup",
  "remote_jwks::remote_jwks_router_requires_tenant_and_mapping_for_bearer_and_direct_key",
  "remote_jwks::real_jwks_rotation_cooldown_failed_refresh_hard_age_and_recovery",
  "remote_jwks::remote_jwks_header_and_body_delay_share_the_total_verifier_budget",
  "grants_pin_owner_run_destination_revision_lease_and_action",
  "stdio_boundary_captures_environment_owns_children_and_discards_raw_stderr",
  "actual_provider_and_mcp_copies_hide_variants_without_changing_execution",
  "projected_receipt_metadata_is_explicit_and_hashes_retained_bytes",
  "filtered_runtime_steps_keep_original_cursors_and_reconnect_without_gaps",
  "lost_retained_history_remains_an_explicit_stream_gap",
  "exact_admission_retry_preserves_original_run_and_rejects_changed_input"
];
const expectedEffects = ['BAUAR_NORMAL', 'BAUAR_STREAM', 'BAUAR_PARTIAL_TERMINAL',
  'BAUAR_LOST', 'BAUAR_RECONNECT', 'BAUAR_SELECTED_RACE'];
const selectedIds = ['H01', 'H02.harness', 'H02.exact-retry', 'H03', 'H04'];
const assertionSources = [
  '/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-gate.mjs',
  '/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-runtime.mjs',
  '/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-peer.mjs',
  '/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-supervisor.mjs',
  '/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/scripts/integration/bauar-harness-native.mjs',
  '/Users/gqadonis/.claude/worktrees/bauar-release-bossfang/crates/librefang-kernel/tests/bauar_harness_delegation.rs',
  '/Users/gqadonis/.claude/worktrees/bauar-release-uar/tests/bauar_full_harness_cursor.rs',
  join(phaseRoot, 'acceptance/lib/adapters.mjs')
];
function exact(actual, expected, category) {
  requireValue(Array.isArray(actual) && actual.length === expected.length
    && new Set(actual).size === expected.length && expected.every(item => actual.includes(item)), category);
}
function argumentsFor(argv) {
  requireValue(argv.includes('--run'), 'adjudication_not_released');
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index];
    if (name === '--run') continue;
    requireValue(['--config', '--config-sha256', '--integration', '--integration-sha256', '--harness-integration', '--harness-integration-sha256', '--seal-sha256', '--output'].includes(name)
      && !Object.hasOwn(options, name) && typeof argv[index + 1] === 'string', 'adjudication_argument_invalid');
    options[name] = argv[++index];
  }
  for (const name of ['--config', '--config-sha256', '--integration', '--integration-sha256', '--harness-integration', '--harness-integration-sha256', '--seal-sha256'])
    requireValue(typeof options[name] === 'string', 'adjudication_argument_missing');
  return options;
}
function evidencePath(path) {
  eligiblePath(path);
  requireValue(path.startsWith(phaseRoot + '/evidence/execute/'), 'adjudication_evidence_scope_invalid');
  return path;
}
async function receipt(ref) {
  evidencePath(ref.path);
  await verifyRef(ref);
  return readReceipt(ref.path);
}
async function contextFor(configRef, expectedSealSha256) {
  eligiblePath(configRef.path); await verifyRef(configRef);
  const config = await loadConfig(configRef.path, { phase: 'phase-bauar-release-acceptance', stage: 'integration' });
  requireValue(config.scopes.selected === 'unsigned local darwin-arm64', 'adjudication_scope_invalid');
  const sealRef = { path: config.runtimeSealPath, sha256: config.bindings.runtimeSealSha256 };
  requireValue(sealRef.sha256 === expectedSealSha256,
    'adjudication_frozen_seal_changed');
  const refs = [...config.selected, ...config.seal.scenarioSources];
  const sourceRefs = assertionSources.map(path => {
    eligiblePath(path);
    const found = refs.filter(ref => ref.path === path);
    requireValue(found.length > 0 && new Set(found.map(ref => ref.sha256)).size === 1,
      'adjudication_assertion_source_unbound');
    return { path, sha256: found[0].sha256 };
  });
  for (const ref of sourceRefs) await verifyRef(ref);
  return { ...config, configRef, sealRef, sourceRefs };
}
async function integrationChain(context, integrationRef, harnessIntegrationRef) {
  const aggregate = await receipt(integrationRef);
  const supplement = await receipt(harnessIntegrationRef);
  for (const value of [aggregate, supplement]) {
    requireValue(value.kind === 'aggregate' && value.stage === 'integration'
      && value.executionKey === context.executionKey && value.observations.runtimeInvoked === true,
      'adjudication_integration_invalid');
    requireValue(value.profileSha256 === context.bindings.profileSha256, 'adjudication_profile_changed');
    if (value === supplement) for (const [key, expected] of Object.entries(context.bindings))
      requireValue(value[key] === expected, 'adjudication_integration_binding_changed');
  }
  // The actual desktop interruption is retained. Selected backend02 scope is independent of desktop/E.
  requireValue(aggregate.status === 'FAIL' && aggregate.observations.requiredComponents === 8
    && aggregate.observations.observedComponents === 8 && aggregate.observations.passedComponents === 6
    && aggregate.components.length === 8, 'adjudication_overall_context_changed');
  requireValue(supplement.status === 'PASS' && supplement.observations.requiredComponents === 1
    && supplement.observations.observedComponents === 1 && supplement.observations.passedComponents === 1
    && supplement.observations.observedScenarios === 2 && supplement.components.length === 1,
    'adjudication_harness_subset_incomplete');
  const selected = new Map();
  for (const [batch, requiredId] of [[aggregate, 'uar-regression'], [supplement, 'harness']]) {
    const matches = [];
    for (const ref of batch.components) {
      const metadata = await receipt(ref);
      requireValue(!(['harness', 'uar-regression'].includes(metadata.binding.componentId)
        && metadata.status === 'PASS' && metadata.binding.componentId !== requiredId),
        'adjudication_selected_duplicate_conflict');
      if (metadata.binding.componentId === requiredId) matches.push({ ref, execution: metadata });
    }
    requireValue(matches.length === 1, 'adjudication_selected_execution_ambiguous');
    const { ref, execution } = matches[0];
    const component = context.components.find(item => item.id === requiredId);
    requireValue(component && execution.kind === 'execution'
      && compatibleBinding(execution.binding, componentBinding(context, component)),
      'adjudication_component_binding_changed');
    requireValue(!selected.has(requiredId), 'adjudication_selected_duplicate_conflict');
    requireValue(execution.status === 'PASS' && execution.process.exitCode === 0
      && execution.process.category === 'completed' && execution.process.cleanup.groupAbsent
      && !execution.process.cleanup.unknownDescendants, 'adjudication_execution_not_clean');
    const command = context.seal.commands.find(item => item.componentId === requiredId);
    requireValue(execution.command.programSha256 === command.programSha256
      && execution.command.argvSha256 === digest(command.args)
      && execution.command.argumentCount === command.args.length && execution.command.cwd === command.cwd
      && execution.command.environmentClass === component.environmentClass, 'adjudication_command_chain_changed');
    const inventory = context.scenarios.filter(item => item.componentId === component.id);
    await verifyRef(execution.componentReceipt);
    const child = await readComponent(execution.componentReceipt.path, componentBinding(context, component), inventory);
    requireValue(child.status === 'PASS' && compatibleBinding(child.binding, execution.binding)
      && child.cleanup.descendantsReconciled && child.cleanup.ownedResourcesRemaining === 0,
      'adjudication_component_incomplete');
    exact(child.scenarios.map(item => item.id), inventory.map(item => item.id), 'adjudication_component_inventory_changed');
    requireValue(child.scenarios.every(item => item.status === 'PASS' && item.executedCount > 0
      && (!inventory.find(expected => expected.id === item.id).negativeRequired
        || item.negativeControl.status === 'PASS' && item.negativeControl.executedCount > 0)),
      'adjudication_scenario_incomplete');
    selected.set(component.id, { component, receipt: child, execution, executionRef: ref });
  }
  exact([...selected.keys()], ['harness', 'uar-regression'], 'adjudication_selected_component_set_missing');
  return { aggregate, supplement, selected };
}
async function harnessEvidence(context, selected) {
  const record = selected.get('harness');
  requireValue(record && record.component.adapter.kind === 'harness', 'adjudication_harness_missing');
  const rawRefs = [...new Map(record.receipt.scenarios.flatMap(item => item.evidence).map(ref => [ref.path, ref])).values()];
  const mainRef = rawRefs.find(ref => ref.path.endsWith('/receipt.json') && !ref.path.endsWith('/kernel/receipt.json'));
  const kernelRef = rawRefs.find(ref => ref.path.endsWith('/kernel/receipt.json'));
  requireValue(mainRef && kernelRef && rawRefs.length === 2
    && mainRef.path.startsWith(record.execution.attemptRoot + '/')
    && kernelRef.path === join(dirname(mainRef.path), 'kernel/receipt.json'), 'adjudication_harness_raw_evidence_missing');
  await verifyRef(mainRef); await verifyRef(kernelRef);
  const main = await readJson(mainRef.path), kernel = await readJson(kernelRef.path);
  requireValue(main.schemaVersion === 1 && main.executedCases === 18 && kernel.executedCases === 5,
    'adjudication_harness_count_incomplete');
  exact(main.completed, harnessCases, 'adjudication_harness_cases_incomplete');
  exact(kernel.cases, kernelCases, 'adjudication_kernel_cases_incomplete');
  requireValue(Number.isSafeInteger(main.realModelCalls) && main.realModelCalls > 0
    && main.modelRequestClasses.unknown === 0
    && ['task', 'auxiliary', 'continuation', 'unknown'].every(key => Number.isSafeInteger(main.modelRequestClasses[key])
      && main.modelRequestClasses[key] >= 0)
    && Object.values(main.modelRequestClasses).reduce((sum, count) => sum + count, 0) === main.realModelCalls,
    'adjudication_model_observations_incomplete');
  requireValue(Array.isArray(main.effects), 'adjudication_effect_observations_missing');
  const effectCounts = Object.fromEntries(expectedEffects.map(label => [label, main.effects.filter(item => item === label).length]));
  requireValue(main.effects.length === expectedEffects.length && Object.values(effectCounts).every(count => count === 1),
    'adjudication_effect_count_mismatch', 1);
  requireValue(main.primaryAssigneeWake === false && main.primaryBackgroundSweep === false
    && main.raceAssigneeWake === true && main.raceTaskBoardSweep === true, 'adjudication_wake_observations_incomplete');
  requireValue(main.providerCoverage?.path === 'Bossfang -> private fixture supervisor -> packaged uar-sidecar'
    && main.providerCoverage.resourceGrant?.trustedHost === 'sidecar-launch-host'
    && main.providerCoverage.resourceGrant?.scopes?.includes('fixture:invoke'), 'adjudication_supervisor_coverage_missing');
  for (const scenario of record.receipt.scenarios) {
    const o = scenario.observations;
    requireValue(o.executedCases === 18 && o.completedCases === 13 && o.kernelCases === 5
      && o.realModelCalls === main.realModelCalls && o.effectCount === main.effects.length
      && o.gateAssertionsCompleted === true && o.cleanupConfirmed === true, 'adjudication_harness_receipt_disagreement');
  }
  return { mainRef, kernelRef, completed: main.completed, kernelCases: kernel.cases,
    effectCounts, effectTotal: main.effects.length, realModelCalls: main.realModelCalls,
    modelRequestClasses: main.modelRequestClasses, providerCoverage: main.providerCoverage,
    kernelIdentityDigests: Object.fromEntries(['nativeAgent', 'legacyAgent', 'providerInstance']
      .map(key => [key, typeof kernel[key] === 'string' ? digest(kernel[key]) : null])) };
}
function regressionEvidence(selected) {
  const record = selected.get('uar-regression');
  requireValue(record && record.component.adapter.kind === 'cargo', 'adjudication_regression_missing');
  exact(record.component.adapter.targets, targets, 'adjudication_target_inventory_changed');
  exact(record.component.adapter.negativeTests, negatives, 'adjudication_negative_inventory_changed');
  const args = record.component.command.args;
  for (const arg of args) requireValue(!/(?:bauar_session_owner|mcp_server)\.rs/.test(arg), 'adjudication_excluded_argument');
  const actualTargets = args.flatMap((arg, index) => arg === '--test' ? [args[index + 1]] : []);
  exact(actualTargets, targets, 'adjudication_target_command_changed');
  requireValue(args.includes('--locked') && args[args.indexOf('--features') + 1] === 'server-full,test-probes'
    && args.includes('--test-threads=1'), 'adjudication_regression_profile_changed');
  const rows = record.receipt.scenarios;
  for (const row of rows) {
    const o = row.observations;
    requireValue(o.selectedTargetsObserved === 5 && o.testSummaries === 5 && o.testsPassed >= 15
      && o.namedNegativesPassed === 15 && o.cleanupConfirmed === true,
      'adjudication_regression_observations_incomplete');
    const cases = record.component.adapter.scenarioCases[row.id], negativeCases = record.component.adapter.negativeCases[row.id];
    requireValue(row.executedCount === cases.length && o.matchedCases === cases.length
      && row.negativeControl.executedCount === negativeCases.length
      && o.matchedNegativeCases === negativeCases.length, 'adjudication_regression_case_count_changed');
  }
  return { observedCounts: { selectedTargets: rows[0].observations.selectedTargetsObserved,
    summaries: rows[0].observations.testSummaries, testsPassed: rows[0].observations.testsPassed,
    namedNegativesPassed: rows[0].observations.namedNegativesPassed },
    expectedTargetNames: targets, expectedNegativeNames: negatives,
    proof: 'Successful actual source-bound Cargo adapter observed all five Running targets, five nonzero clean summaries, and each named negative. Receipt retains counts, not per-target summary rows or test-name transcripts.' };
}
async function execute(options) {
  const configRef = { path: options['--config'], sha256: options['--config-sha256'] };
  const integrationRef = { path: options['--integration'], sha256: options['--integration-sha256'] };
  const harnessIntegrationRef = { path: options['--harness-integration'], sha256: options['--harness-integration-sha256'] };
  const context = await contextFor(configRef, options['--seal-sha256']);
  const chain = await integrationChain(context, integrationRef, harnessIntegrationRef);
  const harness = await harnessEvidence(context, chain.selected), regression = regressionEvidence(chain.selected);
  const scenarios = [...chain.selected.values()].flatMap(item => item.receipt.scenarios);
  exact(scenarios.map(item => item.id), selectedIds, 'adjudication_selected_scenarios_missing');
  const output = options['--output'] ?? join(phaseRoot, 'evidence/execute/harness-adjudication-02.json');
  evidencePath(output);
  for (const ref of [configRef, integrationRef, harnessIntegrationRef, context.sealRef, ...context.sourceRefs, harness.mainRef, harness.kernelRef]) await verifyRef(ref);
  await recheck(context);
  const result = { schemaVersion: 1, kind: 'harness-adjudication', phase: context.phase,
    ownerTask: { changeId: 'bauar-acc-02-current-harness-regression', backendId: '3', specLabel: '2.1' },
    status: 'PASS', selectedScopeStatus: 'PASS', overallIntegrationStatus: chain.aggregate.status,
    fullPhasePassClaimed: false, selectedComponents: ['harness', 'uar-regression'], adjudicatedAt: new Date().toISOString(), executionKey: context.executionKey,
    bindings: context.bindings, inputs: { configRef, integrationRef, harnessIntegrationRef, sealRef: context.sealRef },
    priorOverallBindingDisposition: 'Historical overall FAIL remains unchanged; UAR PASS is reused only when current source/package/profile/scenario/command component binding is identical.',
    components: [...chain.selected.values()].map(item => ({ componentId: item.component.id,
      executionRef: item.executionRef, componentReceipt: item.execution.componentReceipt,
      command: item.execution.command, process: item.execution.process, cleanup: item.receipt.cleanup })),
    scenarios: scenarios.map(item => ({ id: item.id, status: item.status, executedCount: item.executedCount,
      negativeControl: item.negativeControl, observations: item.observations })),
    persistedObservations: { harness, regression },
    sourceScopes: { finiteAssertionSources: context.sourceRefs,
      componentSourceBindings: [...chain.selected.values()].map(item => ({ componentId: item.component.id,
        sourceSha256: item.receipt.binding.sourceSha256, sourcePaths: item.component.sourcePaths })) },
    assertionBacked: { gateCompleted: true, case: 'provider-epoch-restart-remains-unknown',
      originalAdmissionRunCursorIdentity: 'Asserted inside the successful real gate; actual IDs and local before/after counters are not final emitted fields.',
      restart: 'Gate asserts unsupported/unknown/reconciliation-required, retained original task, unchanged admission count and zero epoch effect. Actual state string is not a persisted final field.',
      cleanup: 'Coordinator actual exit0 and observed owned process-group absence/unknownDescendants=false are persisted; gate finally closes owned children/peers before exit.' },
    limitations: ['Overall integration remains FAIL; desktop D01–D04 and unrelated E components are not certified by this selected H01–H04 adjudication.',
      'Unsigned local darwin-arm64 only; no release, signing, installation, Windows or production remote certification.',
      'Harness runs through private application-equivalent supervisor; native direct Bossfang principal transport and standalone JWT/tenant authentication are not covered there.',
      'Supporting server-full,test-probes five-target batch is distinct from the packaged server-full sidecar.',
      'Restart remains unsupported/unknown and requires reconciliation; no durable recovery, automatic replay or external exactly-once claim.',
      'Correlation/cursor and per-target clean-summary detail are assertion-backed, not invented persisted snapshots.',
      'Known-secret fixtures do not establish universal secret classification or external credential custody.'],
    verificationBoundary: 'Read-only actual evidence adjudication; no runtime gate, build, formatter, review, canonical change or product write.' };
  const ref = await writeNew(output, result);
  console.log(JSON.stringify({ status: result.status, selectedScopeStatus: result.selectedScopeStatus,
    overallIntegrationStatus: result.overallIntegrationStatus, fullPhasePassClaimed: false, receipt: ref, harnessCases: harness.completed.length + harness.kernelCases.length,
    regressionTargets: regression.observedCounts.selectedTargets, namedNegatives: regression.observedCounts.namedNegativesPassed }));
}
try { await execute(argumentsFor(process.argv.slice(2))); }
catch (error) { const safe = safeError(error); console.log(JSON.stringify({ status: safe.exitCode === 1 ? 'FAIL' : 'BLOCKED',
  category: safe.category })); process.exitCode = safe.exitCode; }
