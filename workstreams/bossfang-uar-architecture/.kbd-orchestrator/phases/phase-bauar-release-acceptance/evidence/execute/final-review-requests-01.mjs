import { mkdir, realpath, lstat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eligiblePath, regularFile, readJson, verifyRef, hashFile, digest,
  requireValue, writeNew, safeError, within } from '../../acceptance/lib/records.mjs';
import { loadConfig, componentBinding, recheck } from '../../acceptance/lib/inputs.mjs';
import { readReceipt, compatibleBinding } from '../../acceptance/lib/receipts.mjs';

// Request construction only, after the parent releases the full integration boundary.
// This driver never invokes the QA helper, packet builder, reviewer, formatter or gate.
const phase = 'phase-bauar-release-acceptance';
const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const phaseRoot = dirname(dirname(evidenceRoot));
const workstream = dirname(dirname(dirname(phaseRoot)));
const phaseRepositoryRoot = '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini';
const acceptedPlanBase = '3ac3fdd37a381d4e3eab0c334623df8244dbf031';
const acceptedPlanSha256 = 'befdc718486d5e969c48f28be88854a538b277d7151bea99172b3cd8f337168f';
const primaryMini = '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini';
const hashes = ['configSha256', 'sourceSha256', 'packageSha256', 'profileSha256', 'runtimeSealSha256'];
const changes = [
  'bauar-acc-01-private-packaged-desktop',
  'bauar-acc-02-current-harness-regression',
  'bauar-acc-03-local-acceptance-evidence',
];

function publicPath(path) {
  eligiblePath(path);
  requireValue(!/(?:^|[/\\])(?:private|node_modules|dist|target|\.git)(?:$|[/\\])/.test(path),
    'private_or_binary_artifact_not_selected');
  requireValue(!/(?:^|[/\\])(?:\.env(?:\..*)?|credentials(?:\..*)?|chat(?:\..*)?|.*\.log)$/.test(path),
    'sensitive_record_not_selected');
  return path;
}
const refOnly = value => ({ path: value.path, sha256: value.sha256 });
async function fileRef(path) {
  publicPath(path);
  await regularFile(path);
  return { path, sha256: await hashFile(path) };
}
async function publicRecord(ref) {
  publicPath(ref.path);
  await verifyRef(ref);
  return readJson(ref.path);
}
function enumerate(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.path === 'string') eligiblePath(value.path);
  for (const item of Object.values(value)) if (item && typeof item === 'object') enumerate(item);
}
async function optionalFile(path) {
  publicPath(path);
  try { await lstat(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
function argumentsForPrepare() {
  const args = process.argv.slice(2);
  requireValue(args.length === 9 && args[0] === '--prepare'
    && args[1] === '--integration' && args[3] === '--integration-sha256'
    && args[5] === '--additions' && args[7] === '--additions-sha256',
  'explicit_prepare_digest_bound_inputs_required');
  return {
    integration: { path: publicPath(args[2]), sha256: args[4] },
    additions: { path: publicPath(args[6]), sha256: args[8] },
  };
}
async function contextsFor(config) {
  const paths = [
    { path: join(phaseRoot, 'spec.md'), role: 'spec' },
    { path: config.approvedPlan.path, role: 'constraint' },
    { path: join(workstream, '.kbd-orchestrator', 'constraints.md'), role: 'constraint' },
    { path: join(phaseRoot, 'acceptance', 'harness-scenarios.md'), role: 'boundary' },
    { path: join(phaseRoot, 'evidence', 'plan', 'command-contract.json'), role: 'boundary' },
  ];
  for (const id of changes) {
    const root = join(workstream, 'openspec', 'changes', id);
    paths.push({ path: join(root, 'proposal.md'), role: 'spec' },
      { path: join(root, 'design.md'), role: 'spec' },
      { path: join(root, 'verification.md'), role: 'boundary' });
  }
  // Change02 intentionally has skip_specs:true; no missing/invented delta is inferred.
  paths.push({
    path: join(workstream, 'openspec', 'changes', changes[0], 'specs', 'packaged-profile-isolation', 'spec.md'),
    role: 'spec',
  }, {
    path: join(workstream, 'openspec', 'changes', changes[2], 'specs', 'local-acceptance-evidence', 'spec.md'),
    role: 'spec',
  });
  const optional = join(phaseRoot, 'verification.md');
  const missingOptionalContexts = [];
  if (await optionalFile(optional)) paths.push({ path: optional, role: 'boundary' });
  else missingOptionalContexts.push({ path: optional, status: 'absent-optional-context' });
  const contexts = [];
  for (const item of paths) contexts.push({ ...await fileRef(item.path), role: item.role });
  return { contexts, missingOptionalContexts };
}
async function completedPublicComponents(config, aggregate) {
  const refs = [], observed = new Set();
  for (const selected of aggregate.components) {
    const ref = refOnly(selected);
    publicPath(ref.path);
    await verifyRef(ref);
    const execution = await readReceipt(ref.path);
    const component = config.components.find(value => value.id === execution.binding?.componentId);
    requireValue(component && !observed.has(component.id), 'complete_unique_component_required');
    observed.add(component.id);
    const binding = componentBinding(config, component);
    requireValue(execution.kind === 'execution' && execution.status === 'PASS'
      && compatibleBinding(execution.binding, binding) && execution.ownerTaskKey === component.ownerTaskKey,
    'complete_bound_execution_required');
    requireValue(execution.process.category === 'completed' && execution.process.signal === null
      && execution.process.cleanup.groupAbsent && !execution.process.cleanup.unknownDescendants,
    'owned_execution_cleanup_required');
    const command = config.seal.commands.find(value => value.componentId === component.id);
    requireValue(command && execution.command.programSha256 === command.programSha256
      && execution.command.argvSha256 === digest(command.args)
      && execution.command.argumentCount === command.args.length
      && execution.command.cwd === command.cwd
      && execution.command.environmentClass === component.environmentClass, 'bound_execution_command_required');
    const componentRef = refOnly(execution.componentReceipt);
    publicPath(componentRef.path);
    await verifyRef(componentRef);
    const receipt = await readReceipt(componentRef.path);
    requireValue(receipt.kind === 'component' && receipt.status === 'PASS'
      && compatibleBinding(receipt.binding, binding) && receipt.cleanup.descendantsReconciled
      && receipt.cleanup.ownedResourcesRemaining === 0, 'complete_bound_component_required');
    const inventory = config.scenarios.filter(value => value.componentId === component.id);
    requireValue(receipt.scenarios.length === inventory.length
      && new Set(receipt.scenarios.map(value => value.id)).size === inventory.length,
    'complete_scenario_inventory_required');
    for (const expected of inventory) {
      const scenario = receipt.scenarios.find(value => value.id === expected.id);
      requireValue(scenario && scenario.status === 'PASS' && scenario.ownerTaskKey === expected.ownerTaskKey
        && scenario.executedCount > 0
        && Object.values(scenario.observations).some(value => value === true || value > 0),
      'actual_scenario_observation_required');
      if (expected.negativeRequired) requireValue(scenario.negativeControl.status === 'PASS'
        && scenario.negativeControl.executedCount > 0, 'actual_paired_negative_required');
      // Opaque metadata only: never hash/read the private scenario evidence bodies here.
      for (const evidence of scenario.evidence) eligiblePath(evidence.path);
    }
    refs.push(ref, componentRef);
  }
  requireValue(observed.size === 8, 'eight_completed_components_required');
  return refs;
}
async function main() {
  const selected = argumentsForPrepare();
  const additions = await publicRecord(selected.additions);
  requireValue(additions.schemaVersion === 1 && additions.kind === 'finite-review-format-additions'
    && additions.phase === phase, 'finite_additions_required');
  enumerate(additions);
  const configRef = refOnly(additions.candidateConfig);
  publicPath(configRef.path);
  await verifyRef(configRef);
  const config = await loadConfig(configRef.path, { phase, stage: 'integration' });
  requireValue(config.bindings.configSha256 === configRef.sha256
    && config.approvedPlan.path === join(phaseRoot, 'plan.md')
    && config.approvedPlan.sha256 === acceptedPlanSha256, 'accepted_plan_current_config_required');
  const sealRef = { path: config.runtimeSealPath, sha256: config.bindings.runtimeSealSha256 };
  publicPath(sealRef.path);
  requireValue(additions.productionBarrier.path === config.production.declarationPath
    && additions.productionBarrier.sha256 === config.seal.productionSha256
    && additions.productionBarrier.sourceSha256 === config.bindings.sourceSha256,
  'current_production_barrier_required');
  await verifyRef(selected.integration);
  const aggregate = await readReceipt(selected.integration.path);
  requireValue(aggregate.kind === 'aggregate' && aggregate.stage === 'integration'
    && aggregate.status === 'PASS' && aggregate.executionKey === config.executionKey
    && hashes.every(key => aggregate[key] === config.bindings[key]), 'current_full_integration_pass_required');
  requireValue(config.components.length === 8 && config.scenarios.length === 14
    && aggregate.components.length === 8 && aggregate.observations.requiredComponents === 8
    && aggregate.observations.observedComponents === 8 && aggregate.observations.passedComponents === 8
    && aggregate.observations.observedScenarios === 14, 'full_eight_component_fourteen_scenario_inventory_required');
  const componentRefs = await completedPublicComponents(config, aggregate);
  const reviewScope = await fileRef(join(phaseRoot, 'acceptance', 'review-paths.json'));
  const scope = await publicRecord(reviewScope);
  enumerate(scope);
  requireValue(scope.repositories.length === 3
    && scope.repositories.reduce((sum, repo) => sum + repo.paths.length, 0) === 241
    && scope.limitations.inheritedCommits === 279, 'accepted_finite_review_scope_required');
  const { contexts, missingOptionalContexts } = await contextsFor(config);
  const contracts = [];
  for (const name of ['records', 'inputs', 'receipts', 'adapters', 'stages', 'environment', 'processes']) {
    contracts.push(await fileRef(join(phaseRoot, 'acceptance', 'lib', name + '.mjs')));
  }
  for (const name of ['config.schema.json', 'receipt.schema.json', 'local-release-acceptance.mjs']) {
    contracts.push(await fileRef(join(phaseRoot, 'acceptance', name)));
  }
  contracts.push(refOnly(config.approvedPlan));
  const helperRefs = {
    qa: await fileRef(join(evidenceRoot, 'produced-artifact-qa-driver-01.mjs')),
    packets: await fileRef(join(evidenceRoot, 'cumulative-review-packet-driver-01.mjs')),
    preparation: await fileRef(fileURLToPath(import.meta.url)),
  };
  const artifacts = [
    { ref: selected.integration, format: 'json', schema: await fileRef(join(phaseRoot, 'acceptance', 'receipt.schema.json')) },
    { ref: selected.additions, format: 'json' },
    ...componentRefs.map(ref => ({
      ref, format: 'json', schema: contracts.find(value => value.path.endsWith('/receipt.schema.json')),
    })),
    ...contexts.filter(value => value.path.endsWith('.md')).map(value => ({ ref: refOnly(value), format: 'markdown' })),
  ];
  const versionedOnlyArtifacts = [selected.additions];
  const referenceOnlyArtifacts = [];
  for (const selectedReport of additions.sourceReadinessReports ?? []) {
    const ref = refOnly(selectedReport);
    publicPath(ref.path);
    requireValue(within(phaseRoot, ref.path), 'readiness_artifact_outside_phase');
    await verifyRef(ref);
    if (ref.path.endsWith('.md')) artifacts.push({ ref, format: 'markdown' });
    else {
      requireValue(ref.path.endsWith('.json'), 'readiness_artifact_format_required');
      const value = await publicRecord(ref);
      if (value && !Array.isArray(value) && value.schemaVersion === 1) {
        artifacts.push({ ref, format: 'json' });
        versionedOnlyArtifacts.push(ref);
      } else referenceOnlyArtifacts.push({ ref, status: 'unversioned-json-reference-only',
        artifactSchemaValidated: false });
    }
  }
  const responsibilities = [...scope.repositories.map(repo => ({
    id: repo.name, prefixes: [repo.root + '/'],
  })), { id: 'phase', prefixes: [phaseRepositoryRoot + '/'] }];
  const roots = [...scope.repositories.map(repo => repo.root), phaseRepositoryRoot];
  requireValue(new Set(roots).size === 4 && roots.every(root => !roots.some(other =>
    root !== other && root.startsWith(other + '/'))), 'unique_review_responsibilities_required');
  const packetBuilder = await fileRef(join(primaryMini, 'lib', 'review', 'packet-builder', 'packet.mjs'));
  const judgeClient = await fileRef(join(primaryMini, 'lib', 'review', 'judge-client.mjs'));
  const gitProgram = await fileRef('/usr/bin/git');
  await recheck(config);
  await verifyRef(selected.additions);
  await verifyRef(selected.integration);
  for (const ref of [...contexts, ...contracts, ...Object.values(helperRefs), packetBuilder, judgeClient, gitProgram]) {
    await verifyRef(ref);
  }
  const output = join(evidenceRoot, 'final-review-requests-' + randomUUID());
  await mkdir(output, { mode: 0o700 });
  requireValue(await realpath(output) === output, 'request_output_redirected');
  const common = { schemaVersion: 1, phase, config: configRef, runtimeSeal: sealRef,
    integration: selected.integration, additions: selected.additions };
  const qa = await writeNew(join(output, 'produced-artifact-qa-request.json'), {
    ...common, contracts, artifacts: [...new Map(artifacts.map(value => [value.ref.path, value])).values()],
    outputDirectory: join(output, 'produced-artifact-qa'),
  });
  const packets = await writeNew(join(output, 'cumulative-review-packet-request.json'), {
    ...common, reviewScope, packetBuilder, judgeClient, gitProgram, contexts,
    phaseRepository: { name: 'phase', root: phaseRepositoryRoot, base: acceptedPlanBase },
    responsibilities, producer: { producer: 'unknown', warning: 'Exact producer model connection identity unavailable.' },
    outputDirectory: join(output, 'cumulative-review-packets'),
  });
  const receipt = await writeNew(join(output, 'request-construction.json'), {
    schemaVersion: 1, kind: 'finite-final-review-request-construction', phase,
    recordedAt: new Date().toISOString(), status: 'PREPARED', executionKey: config.executionKey,
    ...config.bindings, selected, helperRefs, requests: { qa, packets },
    contexts, missingOptionalContexts, versionedOnlyArtifacts, referenceOnlyArtifacts,
    requestSchema: 'versioned-only; existing helper contracts inspected; no formal request JSON schema is available',
    versionedOnlyArtifactLimitation: 'These selected JSON artifacts have schemaVersion1; no invented strict schema is claimed.',
    mandatoryComponents: 8, mandatoryScenarioRows: 14, inheritedSourcePaths: 241,
    acceptedPlanBase, acceptedPlan: refOnly(config.approvedPlan),
    observations: { requestsConstructed: 2, privateBodiesRead: false, helpersInvoked: false,
      reviewDispatched: false, formattingExecuted: false, acceptanceExecuted: false,
      canonicalStateChanged: false, modelIndependenceVerified: false, excludedF6Accessed: false },
  });
  console.log(JSON.stringify({ status: 'prepared-only', qaRequest: qa, packetRequest: packets, receipt,
    helperRefs, reviewDispatched: false }));
}
await main().catch(error => {
  console.log(JSON.stringify({ status: 'request-construction-incomplete', ...safeError(error) }));
  process.exitCode = 2;
});

