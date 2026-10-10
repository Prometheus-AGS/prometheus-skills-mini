import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eligiblePath, hashFile, readJson, requireValue, validate, verifyRef, digest, within } from './records.mjs';

const schemaPath = fileURLToPath(new URL('../config.schema.json', import.meta.url));
const tasks = ['bauar-acc-01-private-packaged-desktop/1.1', 'bauar-acc-02-current-harness-regression/1.1',
  'bauar-acc-02-current-harness-regression/1.2', 'bauar-acc-03-local-acceptance-evidence/1.1',
  'bauar-acc-03-local-acceptance-evidence/1.2'];
const placeholders = new Set(['resolved-api-host-executable', 'resolved-kernel-test-executable',
  'controlled-copy-Resources', 'local-or-public']);

export async function executableHash(path) { eligiblePath(path); return hashFile(await realpath(path)); }
export async function loadConfig(path, { phase, stage }) {
  requireValue(['integration', 'finalize'].includes(stage), 'stage_invalid');
  requireValue(process.platform === 'darwin' && process.arch === 'arm64', 'selected_platform_unavailable');
  const schema = await readJson(schemaPath);
  const config = validate(await readJson(path), schema);
  requireValue(config.phase === phase, 'phase_mismatch');
  requireValue(digest([...config.production.requiredTasks].sort()) === digest([...tasks].sort()), 'production_barrier_incomplete');
  for (const selected of [path, config.production.declarationPath, config.runtimeSealPath, config.outputRoot,
    config.privateRoot, config.finalization.formatReceiptPath, config.finalization.reviewReceiptPath]) eligiblePath(selected);
  const phaseRoot = dirname(dirname(path));
  requireValue(within(phaseRoot, config.outputRoot) && within(phaseRoot, config.privateRoot)
    && config.outputRoot !== config.privateRoot, 'private_roots_outside_phase');
  requireValue(within(config.outputRoot, config.runtimeSealPath), 'seal_outside_evidence');
  const selected = [...config.sourceFiles, ...config.gateFiles, ...config.manifests, config.profile,
    config.approvedPlan, config.commandContract];
  requireValue(new Set(selected.map(ref => ref.path)).size === selected.length, 'duplicate_input_path');
  requireValue(!selected.some(ref => [path, config.production.declarationPath, config.runtimeSealPath].includes(ref.path)), 'binding_dependency_cycle');
  for (const ref of selected) await verifyRef(ref);
  for (const runtime of Object.values(config.runtimes)) {
    requireValue(await realpath(eligiblePath(runtime.path)) === runtime.realPath, 'runtime_resolution_changed');
    await verifyRef({ path: runtime.realPath, sha256: runtime.sha256 });
  }
  requireValue(config.runtimes.coordinator.version === 'v22.20.0' && process.version === config.runtimes.coordinator.version,
    'coordinator_version_mismatch');
  requireValue(await realpath(process.execPath) === config.runtimes.coordinator.realPath, 'coordinator_path_mismatch');
  requireValue(config.runtimes.child.version === 'v24.11.1', 'child_version_mismatch');
  const sourceSha256 = digest(selected);
  const declaration = await readJson(config.production.declarationPath);
  requireValue(declaration.schemaVersion === 1 && declaration.phase === phase && declaration.sourceSha256 === sourceSha256
    && typeof declaration.completedAt === 'string' && Array.isArray(declaration.tasks), 'production_declaration_invalid');
  requireValue(tasks.every(key => declaration.tasks.filter(item => item.key === key && item.status === 'complete').length === 1),
    'production_not_complete');
  const seal = validate(await readJson(config.runtimeSealPath), schema.$defs.seal, schema);
  for (const component of config.components) {
    const controlId = component.adapter.validatorControlId;
    if (controlId) {
      requireValue(!component.adapter.validatorControl, 'validator_control_ambiguous');
      const matches = (seal.validatorControls ?? []).filter(item => item.id === controlId);
      requireValue(matches.length === 1, 'sealed_validator_control_missing');
      const { id, ...control } = matches[0];
      component.adapter.validatorControl = control;
    }
  }
  const configSha256 = await hashFile(path);
  requireValue(seal.phase === phase && seal.executionKey === config.executionKey && seal.configSha256 === configSha256
    && seal.sourceSha256 === sourceSha256 && seal.profileSha256 === config.profile.sha256
    && seal.productionSha256 === await hashFile(config.production.declarationPath), 'runtime_seal_mismatch');
  requireValue(Date.parse(seal.createdAt) >= Date.parse(declaration.completedAt), 'seal_precedes_production');
  for (const ref of [...seal.packageFiles, ...seal.hostFiles, ...seal.scenarioSources, ...seal.productionBuildReceipts, seal.scenarioReadiness]) await verifyRef(ref);
  const readiness = await readJson(seal.scenarioReadiness.path);
  requireValue(readiness.schemaVersion === 1 && readiness.ready === true && readiness.sourceSha256 === digest(seal.scenarioSources)
    && Date.parse(readiness.declaredAt) >= Date.parse(declaration.completedAt), 'scenario_source_not_ready');
  const ids = config.scenarios.map(item => item.id);
  requireValue(new Set(ids).size === ids.length && new Set(config.components.map(item => item.id)).size === config.components.length,
    'scenario_inventory_duplicate');
  requireValue(new Set(config.components.flatMap(item => item.scenarioIds)).size === ids.length
    && config.components.reduce((count, item) => count + item.scenarioIds.length, 0) === ids.length, 'scenario_inventory_incomplete');
  for (const component of config.components) {
    requireValue(component.adapter.kind !== 'cargo' || component.environmentClass === 'supporting-build-private'
      && component.environment.CARGO_HOME && component.environment.RUSTUP_HOME && component.environment.CARGO_TARGET_DIR,
      'compiler_tool_roots_missing');
    requireValue(component.scenarioIds.every(id => config.scenarios.some(item => item.id === id && item.componentId === component.id)),
      'scenario_component_mismatch');
    requireValue(component.sourcePaths.every(path => selected.some(ref => ref.path === path)
      || seal.scenarioSources.some(ref => ref.path === path)), 'component_source_unbound');
    requireValue(component.packagePaths.every(path => seal.packageFiles.some(ref => ref.path === path)), 'component_package_unbound');
    const commands = seal.commands.filter(item => item.componentId === component.id);
    requireValue(commands.length === 1, 'component_command_missing');
    const command = commands[0];
    requireValue(command.program === component.command.program && command.cwd === component.command.cwd
      && command.args.length === component.command.args.length && component.command.args.every((arg, index) =>
        arg === command.args[index] || placeholders.has(arg) && seal.substitutions?.[`${component.id}:${arg}`] === command.args[index]),
      'sealed_command_changed');
    eligiblePath(command.cwd);
    requireValue(await executableHash(command.program) === command.programSha256, 'component_program_changed');
    for (const arg of command.args) requireValue(!/(?:bauar_session_owner\.rs|mcp_server\.rs)/.test(arg), 'excluded_argument');
  }
  const bindings = { configSha256, sourceSha256, packageSha256: digest(seal.packageFiles), profileSha256: config.profile.sha256,
    runtimeSealSha256: await hashFile(config.runtimeSealPath) };
  return { ...config, configPath: path, seal, bindings, selected };
}

export function componentBinding(config, component) {
  const sources = [...config.selected, ...config.seal.scenarioSources].filter(ref => component.sourcePaths.includes(ref.path));
  const scenarioSha256 = digest(config.scenarios.filter(item => component.scenarioIds.includes(item.id)));
  const command = config.seal.commands.find(item => item.componentId === component.id);
  const packageFiles = config.seal.packageFiles.filter(ref => component.packagePaths.includes(ref.path));
  const hostFiles = config.seal.hostFiles.filter(ref => command.args.includes(ref.path));
  const bindingSha256 = digest({ component, command, sources, scenarioSha256,
    packageFiles, hostFiles, profile: config.profile });
  return { executionKey: config.executionKey, componentId: component.id, bindingSha256,
    configSha256: config.bindings.configSha256, sourceSha256: digest(sources), packageSha256: digest(packageFiles),
    profileSha256: config.bindings.profileSha256, scenarioSha256, runtimeSealSha256: config.bindings.runtimeSealSha256 };
}

export async function recheck(config) {
  for (const ref of [...config.selected, ...config.seal.packageFiles, ...config.seal.hostFiles, ...config.seal.scenarioSources,
    ...config.seal.productionBuildReceipts, config.seal.scenarioReadiness]) await verifyRef(ref);
  requireValue(await hashFile(config.configPath) === config.bindings.configSha256
    && await hashFile(config.runtimeSealPath) === config.bindings.runtimeSealSha256, 'inputs_changed_during_execution');
}
