import { mkdir, open, rename, realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eligiblePath, regularFile, readJson, verifyRef, hashFile, digest,
  requireValue, validate, writeNew, safeError, within } from '../../acceptance/lib/records.mjs';
import { loadConfig, componentBinding, recheck } from '../../acceptance/lib/inputs.mjs';
import { readReceipt, compatibleBinding } from '../../acceptance/lib/receipts.mjs';

const phase = 'phase-bauar-release-acceptance';
const phaseRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const acceptanceRoot = join(phaseRoot, 'acceptance');
const fileSchema = { type: 'object', properties: {
  path: { type: 'string', minLength: 1 }, sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' }
}, required: ['path', 'sha256'], additionalProperties: false };
const hashes = ['configSha256', 'sourceSha256', 'packageSha256', 'profileSha256', 'runtimeSealSha256'];
const qaSchema = { type: 'object', properties: {
  schemaVersion: { const: 1 }, kind: { const: 'standalone-produced-artifact-qa' },
  phase: { const: phase }, executionKey: { type: 'string', minLength: 1 },
  status: { enum: ['PASS', 'FAIL'] }, startedAt: { type: 'string' }, endedAt: { type: 'string' },
  ...Object.fromEntries(hashes.map(key => [key, { type: 'string', pattern: '^[a-f0-9]{64}$' }])),
  inputs: { type: 'array', items: fileSchema, minItems: 1 },
  checks: { type: 'array', minItems: 1, items: { type: 'object', properties: {
    id: { type: 'string' }, status: { enum: ['PASS', 'FAIL'] }, category: { type: 'string' }
  }, required: ['id', 'status', 'category'], additionalProperties: false } },
  executedCount: { type: 'integer', minimum: 1 }, observations: { type: 'object', additionalProperties: {
    anyOf: [{ type: 'boolean' }, { type: 'integer', minimum: 0 }]
  } }, limitations: { type: 'array', items: { type: 'string' }, minItems: 1 },
  unavailableGates: { type: 'array', items: { type: 'string' }, minItems: 1 }
}, required: ['schemaVersion', 'kind', 'phase', 'executionKey', 'status', 'startedAt', 'endedAt',
  ...hashes, 'inputs', 'checks', 'executedCount', 'observations', 'limitations', 'unavailableGates'],
additionalProperties: false };

function publicPath(path) {
  eligiblePath(path);
  requireValue(!/(?:^|[/\\\\])private(?:$|[/\\\\])/.test(path), 'private_artifact_body_not_selected');
  return path;
}
function refOnly(ref) { return { path: ref.path, sha256: ref.sha256 }; }
function enumerate(value, refs = []) {
  if (!value || typeof value !== 'object') return refs;
  if (typeof value.path === 'string' && typeof value.sha256 === 'string') {
    eligiblePath(value.path); refs.push(refOnly(value));
  }
  for (const item of Object.values(value)) if (item && typeof item === 'object') enumerate(item, refs);
  return refs;
}
async function publicRecord(ref) {
  publicPath(ref.path); await verifyRef(ref);
  return readJson(ref.path);
}
async function markdown(path, text) {
  eligiblePath(path);
  const reservation = await open(path + '.reservation', 'wx', 0o600); await reservation.close();
  const pending = join(dirname(path), '.' + randomUUID() + '.pending');
  const handle = await open(pending, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
  await rename(pending, path);
  return { path, sha256: await hashFile(path) };
}
async function main() {
  const args = process.argv.slice(2);
  requireValue(args.length === 4 && args[0] === '--inputs' && args[2] === '--inputs-sha256',
    'explicit_digest_bound_request_required');
  const requestRef = { path: publicPath(args[1]), sha256: args[3] };
  const request = await publicRecord(requestRef);
  requireValue(request.schemaVersion === 1 && request.phase === phase
    && Array.isArray(request.contracts) && Array.isArray(request.artifacts) && request.artifacts.length > 0,
    'qa_request_invalid');
  const selected = [requestRef, request.config, request.runtimeSeal, request.integration, request.additions,
    ...request.contracts, ...request.artifacts.flatMap(item => [item.ref, ...(item.schema ? [item.schema] : [])])];
  for (const ref of selected) { publicPath(ref.path); validate(ref, fileSchema); }
  publicPath(request.outputDirectory);
  requireValue(within(join(phaseRoot, 'evidence', 'execute'), request.outputDirectory), 'qa_output_outside_phase');
  // Enumerate metadata references before reading/hashing their targets. Private runtime bodies stay opaque.
  const declared = await publicRecord(request.config);
  const seal = await publicRecord(request.runtimeSeal);
  enumerate(declared); enumerate(seal);
  const exactContracts = ['records.mjs', 'inputs.mjs', 'receipts.mjs', 'adapters.mjs', 'stages.mjs']
    .map(name => join(acceptanceRoot, 'lib', name));
  exactContracts.push(join(acceptanceRoot, 'config.schema.json'), join(acceptanceRoot, 'receipt.schema.json'));
  requireValue(exactContracts.every(path => request.contracts.filter(ref => ref.path === path).length === 1)
    && request.contracts.some(ref => ref.path === declared.approvedPlan.path), 'qa_contract_inventory_incomplete');
  for (const ref of selected) { await verifyRef(ref); requireValue((await regularFile(ref.path)).size > 0, 'empty_artifact'); }
  requireValue(declared.runtimeSealPath === request.runtimeSeal.path, 'qa_seal_selection_mismatch');
  const config = await loadConfig(request.config.path, { phase, stage: 'integration' });
  requireValue(config.bindings.runtimeSealSha256 === request.runtimeSeal.sha256, 'qa_runtime_seal_changed');
  const aggregate = await readReceipt(request.integration.path);
  requireValue(aggregate.kind === 'aggregate' && aggregate.stage === 'integration' && aggregate.status === 'PASS'
    && aggregate.executionKey === config.executionKey
    && hashes.every(key => aggregate[key] === config.bindings[key]), 'complete_bound_integration_required');
  // Full acceptance, not the historical startup-only retry or an out-of-scope certification.
  requireValue(config.components.length === 8 && config.scenarios.length === 14
    && aggregate.components.length === 8 && aggregate.observations.requiredComponents === 8
    && aggregate.observations.observedComponents === 8 && aggregate.observations.passedComponents === 8
    && aggregate.observations.observedScenarios === 14, 'full_acceptance_inventory_required');
  for (const ref of aggregate.components) publicPath(ref.path);
  const startedAt = new Date().toISOString();
  const checks = [];
  const check = async (id, operation) => {
    try { await operation(); checks.push({ id, status: 'PASS', category: 'observed' }); }
    catch (error) { checks.push({ id, status: 'FAIL', category: safeError(error).category }); }
  };
  const inputs = [...selected, ...aggregate.components];
  let opaqueRuntimeEvidenceReferences = 0;
  const observed = new Set();
  await check('current-input-schema-source-package-profile-provenance', () => recheck(config));
  await check('finite-review-format-inventory-provenance', async () => {
    const additions = await publicRecord(request.additions);
    requireValue(additions.schemaVersion === 1 && additions.kind === 'finite-review-format-additions'
      && additions.phase === phase && additions.candidateConfig.path === request.config.path
      && additions.candidateConfig.sha256 === request.config.sha256
      && additions.productionBarrier.path === config.production.declarationPath
      && additions.productionBarrier.sha256 === config.seal.productionSha256
      && additions.productionBarrier.sourceSha256 === config.bindings.sourceSha256, 'qa_additions_binding_mismatch');
    const refs = enumerate(additions);
    const current = new Set([...config.selected, ...config.seal.scenarioSources].map(ref => ref.path));
    for (const key of ['recordedScenarioSources', 'recordedHarnessSources', 'recordedDesktopSources']) {
      for (const ref of additions[key] ?? []) requireValue(current.has(ref.path), 'qa_additions_source_unbound');
    }
    // Historical supersedes/package records remain historical; do not treat their digests as current.
    for (const key of ['recordedScenarioSources', 'recordedHarnessSources', 'recordedDesktopSources',
      'recordedPreparationSources', 'sourceReadinessReports']) {
      for (const ref of additions[key] ?? []) {
        eligiblePath(ref.path); await verifyRef(ref); inputs.push(refOnly(ref));
      }
    }
    requireValue(refs.length > 0, 'qa_additions_empty');
  });
  for (const ref of aggregate.components) await check('execution-' + ref.sha256.slice(0, 16), async () => {
    await verifyRef(ref);
    const execution = await readReceipt(ref.path);
    const component = config.components.find(item => item.id === execution.binding?.componentId);
    requireValue(component && !observed.has(component.id), 'qa_component_identity_duplicate');
    observed.add(component.id);
    const expected = componentBinding(config, component);
    requireValue(execution.kind === 'execution' && execution.status === 'PASS'
      && compatibleBinding(execution.binding, expected) && execution.ownerTaskKey === component.ownerTaskKey,
      'qa_execution_binding_mismatch');
    requireValue(execution.process.category === 'completed' && execution.process.cleanup.groupAbsent
      && !execution.process.cleanup.unknownDescendants && execution.process.signal === null,
      'qa_execution_cleanup_incomplete');
    const command = config.seal.commands.find(item => item.componentId === component.id);
    requireValue(execution.command.programSha256 === command.programSha256
      && execution.command.argvSha256 === digest(command.args)
      && execution.command.argumentCount === command.args.length && execution.command.cwd === command.cwd
      && execution.command.environmentClass === component.environmentClass, 'qa_command_binding_mismatch');
    publicPath(execution.componentReceipt.path); await verifyRef(execution.componentReceipt);
    inputs.push(execution.componentReceipt);
    const receipt = await readReceipt(execution.componentReceipt.path);
    requireValue(receipt.kind === 'component' && receipt.status === 'PASS'
      && compatibleBinding(receipt.binding, expected) && receipt.cleanup.descendantsReconciled
      && receipt.cleanup.ownedResourcesRemaining === 0, 'qa_component_incomplete');
    const inventory = config.scenarios.filter(item => item.componentId === component.id);
    requireValue(receipt.scenarios.length === inventory.length
      && new Set(receipt.scenarios.map(item => item.id)).size === inventory.length, 'qa_scenario_inventory_mismatch');
    for (const expectedScenario of inventory) {
      const scenario = receipt.scenarios.find(item => item.id === expectedScenario.id);
      requireValue(scenario && scenario.ownerTaskKey === expectedScenario.ownerTaskKey && scenario.status === 'PASS'
        && scenario.executedCount > 0 && Object.values(scenario.observations).some(value => value === true || value > 0),
        'qa_scenario_observations_missing');
      if (expectedScenario.negativeRequired) requireValue(scenario.negativeControl.status === 'PASS'
        && scenario.negativeControl.executedCount > 0, 'qa_paired_negative_missing');
      for (const evidence of scenario.evidence) {
        eligiblePath(evidence.path);
        // This QA does not reopen runtime payloads, raw logs or canary-bearing evidence.
        opaqueRuntimeEvidenceReferences++;
      }
      if (component.adapter.kind === 'harness') {
        const o = scenario.observations;
        requireValue(o.executedCases === 18 && o.completedCases === 13 && o.kernelCases === 5
          && o.realModelCalls > 0 && o.effectCount >= 3 && o.unknownModelRequests === 0
          && o.gateAssertionsCompleted === true && o.cleanupConfirmed === true,
          'qa_harness_counter_contract_missing');
      }
      if (component.adapter.kind === 'cargo') {
        const o = scenario.observations;
        requireValue(component.adapter.targets.length === 5 && o.selectedTargetsObserved === 5
          && o.testSummaries === 5 && o.testsPassed > 0
          && o.namedNegativesPassed === component.adapter.negativeTests.length && o.cleanupConfirmed === true,
          'qa_selected_cargo_counter_contract_missing');
      }
    }
    const negativeValidator = component.adapter.kind === 'package-validator'
      && component.adapter.validatorControl.kind !== 'pristine';
    requireValue(negativeValidator ? Number.isInteger(execution.process.exitCode) && execution.process.exitCode !== 0
      : execution.process.exitCode === 0, 'qa_process_exit_contract_mismatch');
  });
  await check('eight-distinct-mandatory-components', async () => {
    requireValue(observed.size === 8, 'qa_component_inventory_incomplete');
  });
  for (const artifact of request.artifacts) await check('artifact-' + artifact.ref.sha256.slice(0, 16), async () => {
    const stat = await regularFile(publicPath(artifact.ref.path)); await verifyRef(artifact.ref);
    requireValue(stat.size > 0 && ['json', 'markdown'].includes(artifact.format), 'qa_artifact_format_invalid');
    requireValue(artifact.format === 'json' ? artifact.ref.path.endsWith('.json')
      : artifact.ref.path.endsWith('.md'), 'qa_artifact_extension_invalid');
    if (artifact.format === 'json') {
      const value = await readJson(artifact.ref.path);
      if (artifact.schema) validate(value, await publicRecord(artifact.schema));
      else requireValue(value && typeof value === 'object' && value.schemaVersion === 1,
        'qa_versioned_artifact_required');
    }
  });
  await check('unchanged-completed-boundary-inputs', () => recheck(config));
  const status = checks.every(item => item.status === 'PASS') ? 'PASS' : 'FAIL';
  const limitations = [
    'Artifact QA validates selected phase schema vocabulary and metadata; it is not an independent product review.',
    'Runtime evidence payloads remain opaque; their content checks and SHA verification are inherited from the bound integration coordinator.',
    'Harness counters come from sanitized adapter receipts; repeated per-scenario global counts are not summed.',
    'The explicit supervisor fixture does not certify direct native Bossfang-to-UAR transport.',
    'Selected target is unsigned local darwin-arm64; signing, installed operation, Windows and remote production remain unverified or excluded.',
    'Restart unsupported/unknown requires reconciliation; no automatic recovery or replay is certified.',
    'Inherited Bossfang 279-commit baseline remains uncertified; this QA does not expand cumulative review coverage.',
    'Operator remains release authority; no canonical task, review, format or release disposition is advanced.'
  ];
  const unavailableGates = [
    'PMPO artifact_manifest.json and constraints.json schemas: not applicable; no PMPO state exists in this standalone phase.',
    'PMPO completed-iteration/convergence decisions and state-schema gates: unavailable; no fabricated PMPO files or convergence claim.',
    'Mini-wide npm check/test/spec/distribution suites: not applicable to the approved standalone product acceptance scope.',
    'Independent product review, formatting and strict managed OpenSpec checks: separate required gates, not executed by this driver.'
  ];
  const receipt = validate({ schemaVersion: 1, kind: 'standalone-produced-artifact-qa', phase,
    executionKey: config.executionKey, status, ...config.bindings, startedAt, endedAt: new Date().toISOString(),
    inputs: [...new Map(inputs.map(ref => [ref.path + ':' + ref.sha256, refOnly(ref)])).values()],
    checks, executedCount: checks.length, observations: { mandatoryComponents: observed.size,
      requiredScenarioRows: 14, opaqueRuntimeEvidenceReferences, runtimeBodiesRead: false,
      productReviewExecuted: false, formatterExecuted: false, canonicalStateChanged: false },
    limitations, unavailableGates }, qaSchema);
  await mkdir(request.outputDirectory, { mode: 0o700 });
  requireValue(await realpath(request.outputDirectory) === request.outputDirectory, 'qa_output_redirected');
  const receiptRef = await writeNew(join(request.outputDirectory, 'produced-artifact-qa.json'), receipt);
  const text = '# Standalone artifact QA log\n\n' +
    'One actual validation invocation; this is not a PMPO refinement iteration or convergence decision.\n\n' +
    'Result: ' + status + '. Checks performed: ' + checks.length + '.\n\n' +
    'Receipt SHA256: ' + receiptRef.sha256 + '.\n\n' +
    'Config/source/package/profile/runtime-seal bindings are recorded in the receipt. ' +
    'No runtime, review, formatter or canonical transition was invoked.\n';
  const logRef = await markdown(join(request.outputDirectory, 'refinement_log.md'), text);
  console.log(JSON.stringify({ schemaVersion: 1, status, receipt: receiptRef, refinementLog: logRef }));
  return status === 'PASS' ? 0 : 1;
}
try { process.exitCode = await main(); }
catch (error) { const result = safeError(error); console.log(JSON.stringify(result)); process.exitCode = result.exitCode; }

