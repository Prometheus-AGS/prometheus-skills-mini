import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, lstat, realpath, mkdir, open } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase metadata preparation only: never imports or launches the acceptance coordinator.
const evidence = dirname(fileURLToPath(import.meta.url));
const phaseRoot = dirname(dirname(evidence));
const configPath = join(phaseRoot, 'acceptance/candidate-inputs.json');
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const repeated = name => process.argv.flatMap((value, index) => value === name ? [process.argv[index + 1]] : []);
const desktopReport = argument('--desktop-report');
const desktopSources = argument('--desktop-sources');
const harnessReport = argument('--harness-report');
const packageReceiptPath = argument('--package-receipt');
const explicitPreparation = repeated('--preparation-source');
const explicitDiagnostic = repeated('--diagnostic-record');
const diagnosticDrivers = [1, 2, 3, 4, 5, 6].map(index => join(evidence, `uar-compiler-diagnostic-driver-0${index}.mjs`));
const diagnosticRecords = ['compiler-diagnostic-amendment-01.json', 'compiler-environment-correction-01.json',
  'compiler-environment-correction-02.json', 'compiler-diagnostic-amendment-02.json',
  'compiler-environment-correction-03.json', 'uar-compiler-diagnostic-05.json', 'uar-compiler-diagnostic-06.json']
  .map(name => join(evidence, name)).concat([join(evidence, 'failed-component-retry-amendment-01.json'),
    join(evidence, 'startup-retry-integration-01.json'), join(evidence, 'startup-retry-integration-01-started.json')],
    explicitDiagnostic);
const cursorReport = join(phaseRoot, 'dispatch/h02-readiness-report.md');
const hostReceipts = ['api', 'kernel'].map(host => join(evidence, `host-${host}-compile.receipt-03.json`));
const descriptorPath = join(evidence, 'private/package-controls-01/controls.json');
const additionsPath = join(evidence, 'review-format-additions-09.json');
const readinessPath = join(evidence, 'attempts/scenario-readiness-05.json');
const oldAdditionsPath = join(evidence, 'review-format-additions-08.json');
const configHashIndex = process.argv.indexOf('--config-sha256');
const expectedConfigSha256 = configHashIndex < 0 ? '' : process.argv[configHashIndex + 1];
const waitIndex = process.argv.indexOf('--wait-ms');
const waitMs = waitIndex < 0 ? 0 : Number(process.argv[waitIndex + 1]);
const check = (value, category) => { if (!value) throw new Error(category); };

function eligible(path) {
  check(typeof path === 'string' && isAbsolute(path) && normalize(path) === path, 'invalid_finite_path');
  check(!/(?:^|[/\\])(?:bauar_session_owner\.rs|mcp_server\.rs)(?:$|[/\\])/.test(path), 'excluded_path');
  return path;
}
function digest(value) {
  const ordered = item => Array.isArray(item) ? item.map(ordered) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, ordered(item[key])])) : item;
  return createHash('sha256').update(JSON.stringify(ordered(value))).digest('hex');
}
async function ref(path, resolveExecutable = false) {
  eligible(path);
  const selected = resolveExecutable ? await realpath(path) : path;
  eligible(selected);
  const stat = await lstat(selected);
  check(stat.isFile() && !stat.isSymbolicLink() && await realpath(selected) === selected, 'regular_input_required');
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(selected)) hash.update(bytes);
  return { path: selected, sha256: hash.digest('hex') };
}
const json = async path => JSON.parse(await readFile(eligible(path), 'utf8'));
async function verify(value) {
  check(value.sha256 === (await ref(value.path)).sha256, 'input_hash_changed');
}
async function immutable(path, value) {
  eligible(path);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  check(await realpath(dirname(path)) === dirname(path), 'output_parent_redirected');
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`); await handle.sync(); }
  finally { await handle.close(); }
  return ref(path);
}
async function prerequisites() {
  const missing = [];
  for (const path of [desktopReport, desktopSources, harnessReport, cursorReport, ...hostReceipts, descriptorPath,
    packageReceiptPath, ...diagnosticDrivers, ...diagnosticRecords, ...explicitPreparation]) {
    try { check((await lstat(eligible(path))).isFile(), 'prerequisite_not_file'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; missing.push(path); }
  }
  return missing;
}
async function main() {
  check(/^[a-f0-9]{64}$/.test(expectedConfigSha256), 'frozen_config_digest_required');
  check(Number.isSafeInteger(waitMs) && waitMs >= 0 && waitMs <= 3600000, 'invalid_wait_budget');
  const deadline = Date.now() + waitMs;
  let missing = await prerequisites();
  while (missing.length && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, Math.min(5000, deadline - Date.now())));
    missing = await prerequisites();
  }
  if (missing.length) {
    console.log(JSON.stringify({ status: 'readiness-pending', missing, acceptanceExecuted: false }));
    process.exitCode = 2;
    return;
  }
  const configRef = await ref(configPath);
  check(configRef.sha256 === expectedConfigSha256, 'frozen_config_changed');
  const config = await json(configPath);
  const desktopReady = await json(desktopSources);
  // The explicit report supplies delivery assurance; source refs remain finite and measured.
  const desktopSuffixes = ['/tests/e2e/gates/bauarPackagedAcceptance.test.ts',
    '/tests/e2e/gates/support/bauarPackagedLaunch.ts', '/tests/e2e/gates/playwright.config.ts',
    '/scripts/gates/bauar-native-admission-controls.ts', '/scripts/gates/bauar-native-desktop-cases.ts',
    '/scripts/gates/bauar-secret-projection-lifecycle.ts', '/scripts/gates/bauar-post-ack-cases.ts',
    '/scripts/gates/bauar-secret-projection-mcp.ts'];
  check(Array.isArray(desktopReady) && desktopReady.length === 8 && desktopSuffixes.every(suffix =>
    desktopReady.filter(value => value.path.endsWith(suffix)).length === 1), 'desktop_readiness_incomplete');
  for (const value of desktopReady) eligible(value.path);
  check(desktopReady.every(value => config.components.find(component => component.id === 'desktop')
    .sourcePaths.includes(value.path)), 'desktop_scope_changed');
  for (const value of desktopReady) await verify(value);
  const harnessReady = await json(harnessReport);
  check(harnessReady.status === 'source-ready-not-runtime-verified' && Array.isArray(harnessReady.changes) && harnessReady.changes.length > 0,
    'harness_readiness_incomplete');
  for (const value of harnessReady.changes) eligible(value.path);
  for (const value of harnessReady.changes) await verify(value);
  const selected = [...config.sourceFiles, ...config.gateFiles, ...config.manifests,
    config.profile, config.approvedPlan, config.commandContract];
  for (const value of selected) eligible(value.path);
  const barrier = await json(config.production.declarationPath);
  const sourceSha256 = digest(selected);
  check(barrier.sourceSha256 === sourceSha256, 'production_declaration_changed');
  check(config.production.requiredTasks.every(key => barrier.tasks.filter(task =>
    task.key === key && task.status === 'complete').length === 1), 'production_not_complete');
  for (const value of selected) await verify(value);
  const packageReceipt = await json(packageReceiptPath);
  check(packageReceipt.sourceUnchanged && packageReceipt.uarMatches && packageReceipt.asarChanged,
    'package_completion_missing');
  for (const value of Object.values(packageReceipt.packageFiles)) await verify(value);
  const previousPackagePath = join(evidence, 'boss-package-01.json');
  const previousPackage = await json(previousPackagePath);
  check(packageReceipt.packageFiles.uar.sha256 === previousPackage.packageFiles.uar.sha256,
    'unchanged_sidecar_contract_changed');
  const hosts = [];
  for (let index = 0; index < hostReceipts.length; index += 1) {
    const receipt = await json(hostReceipts[index]);
    const result = receipt.result;
    check(result.exitCode === 0 && result.category === 'completed' && result.cleanup.groupAbsent === true
      && result.cleanup.unknownDescendants === false && receipt.sourceUnchanged === true,
    'host_build_incomplete');
    check(result.observations.buildFinished === true && result.observations.buildSucceeded === true
      && result.observations.compilerArtifacts === 1, 'host_compiler_artifact_incomplete');
    check(receipt.resolution?.status === 'compiled-not-runtime-tested' && receipt.resolution.exists === true,
      'host_resolution_missing');
    await verify(receipt.resolution);
    for (const value of receipt.sourceInputs) await verify(value);
    hosts.push({ path: receipt.resolution.path, sha256: receipt.resolution.sha256 });
  }
  const descriptor = await json(descriptorPath);
  check(descriptor.acceptanceExecuted === false && descriptor.validatorControls.length === 3,
    'prepared_control_contract_changed');
  for (const value of [...descriptor.originals, descriptor.archive, descriptor.archiveRecord]) await verify(value);
  const selectedPaths = new Set(selected.map(value => value.path));
  const scenarioPaths = [...new Set(config.components.flatMap(component => component.sourcePaths)
    .filter(path => !selectedPaths.has(path)))];
  // Enumerate and exclude before any reads; no directory or Git source traversal.
  for (const path of scenarioPaths) eligible(path);
  const scenarioSources = [];
  for (const path of scenarioPaths) scenarioSources.push(await ref(path));
  const packagePaths = [...new Set(config.components.flatMap(component => component.packagePaths))];
  for (const path of packagePaths) eligible(path);
  const packageFiles = [];
  for (const path of packagePaths) packageFiles.push(await ref(path));
  const substitutions = {
    'harness:resolved-api-host-executable': hosts[0].path,
    'harness:resolved-kernel-test-executable': hosts[1].path
  };
  for (const control of descriptor.validatorControls) {
    substitutions[`${control.id}:controlled-copy-Resources`] = control.argumentPath;
    substitutions[`${control.id}:local-or-public`] = control.kind === 'public-mode' ? 'public' : 'local';
    await verify(control.original);
    await verify(control.controlled);
    if (control.failurePredicate) await verify(control.failurePredicate.source);
  }
  const commands = [];
  for (const component of config.components) {
    const args = component.command.args.map(arg => substitutions[`${component.id}:${arg}`] ?? arg);
    check(!args.some(arg => ['resolved-api-host-executable', 'resolved-kernel-test-executable',
      'controlled-copy-Resources', 'local-or-public'].includes(arg)), 'command_resolution_incomplete');
    commands.push({ componentId: component.id, ...component.command, args,
      programSha256: (await ref(component.command.program, true)).sha256 });
  }
  for (const runtime of Object.values(config.runtimes)) {
    check(await realpath(runtime.path) === runtime.realPath, 'runtime_resolution_changed');
    await verify({ path: runtime.realPath, sha256: runtime.sha256 });
  }
  const declaredAt = new Date().toISOString();
  check(Date.parse(declaredAt) >= Date.parse(barrier.completedAt), 'readiness_precedes_production');
  // Complete all reads/hashes first; no product effects occur in this driver.
  const productionBuildReceipts = [];
  for (const path of [packageReceiptPath, ...hostReceipts]) productionBuildReceipts.push(await ref(path));
  const prior = await json(oldAdditionsPath);
  const reportRefs = await Promise.all([desktopReport, desktopSources, harnessReport, cursorReport].map(path => ref(path)));
  const preparationPaths = [fileURLToPath(import.meta.url), join(evidence, 'host-build-driver-03.mjs'),
    join(evidence, 'integration-driver-01.mjs'), join(evidence, 'correction-binding-driver-07.mjs'),
    join(evidence, 'failed-startup-components-driver-01.mjs'), join(evidence, 'startup-retry-supervisor-01.mjs'),
    ...diagnosticDrivers, ...explicitPreparation];
  const cumulativePreparationPaths = [...new Set([...prior.recordedPreparationSources.map(value => value.path),
    ...preparationPaths])];
  const preparationRefs = [];
  for (const path of cumulativePreparationPaths) preparationRefs.push(await ref(path));
  const cumulativeDiagnosticPaths = [...new Set([...(prior.recordedDiagnosticInputs ?? []).map(value => value.path),
    ...diagnosticRecords])];
  const diagnosticRefs = [];
  for (const path of cumulativeDiagnosticPaths) diagnosticRefs.push(await ref(path));
  const harnessRefs = harnessReady.changes.map(value => ({ path: value.path, sha256: value.sha256 }));
  const currentSources = [];
  for (const value of scenarioSources) currentSources.push({ ...value, bytes: (await lstat(value.path)).size,
    lines: (await readFile(value.path, 'utf8')).split('\n').length - 1, status: 'source-ready-not-runtime-tested' });
  await verify(configRef);
  const additions = { ...prior, recordedAt: declaredAt, status: 'source-ready-runtime-not-executed',
    supersedes: await ref(oldAdditionsPath), candidateConfig: configRef,
    productionBarrier: { ...await ref(config.production.declarationPath), sourceSha256 },
    recordedScenarioSources: currentSources, pendingScenarioSources: [], artifactInputsPending: [],
    sourceReadinessReports: reportRefs,
    recordedPreparationSources: preparationRefs,
    recordedDiagnosticInputs: diagnosticRefs, recordedHarnessSources: harnessRefs,
    recordedDesktopSources: desktopReady.map(({ path, sha256 }) => ({ path, sha256 })),
    retainedPackageReceipts: [await ref(previousPackagePath), await ref(packageReceiptPath)],
    formatScope: { ...prior.formatScope,
      desktopPaths: desktopReady.map(value => value.path),
      phasePreparationPaths: cumulativePreparationPaths,
      phaseDiagnosticRecordPaths: [...cumulativeDiagnosticPaths, harnessReport],
      harnessPaths: harnessRefs.map(value => value.path) },
    evidenceBoundary: { ...prior.evidenceBoundary,
      preparationExecuted: true, gateExecuted: false, sourceCheckExecuted: false },
    sealReadiness: { ...prior.sealReadiness, status: 'ready-for-integration-admission',
      runtimeSealPath: config.runtimeSealPath } };
  const readiness = { schemaVersion: 1, ready: true, sourceSha256: digest(scenarioSources), declaredAt };
  const scenarioReadiness = await immutable(readinessPath, readiness);
  const seal = { schemaVersion: 1, phase: config.phase, executionKey: config.executionKey,
    configSha256: configRef.sha256, productionSha256: (await ref(config.production.declarationPath)).sha256,
    sourceSha256, profileSha256: config.profile.sha256, createdAt: declaredAt,
    packageFiles, hostFiles: hosts, scenarioSources, scenarioReadiness, commands,
    nodeVersions: { coordinator: config.runtimes.coordinator.version, child: config.runtimes.child.version },
    productionBuildReceipts, substitutions, validatorControls: descriptor.validatorControls };
  const additionsRef = await immutable(additionsPath, additions);
  const sealRef = await immutable(config.runtimeSealPath, seal);
  console.log(JSON.stringify({ status: 'sealed-not-runtime-tested', seal: sealRef, scenarioReadiness,
    reviewFormatAdditions: additionsRef, packageFiles: packageFiles.length, scenarioSources: scenarioSources.length,
    hosts: hosts.length, acceptanceExecuted: false }));
}
await main().catch(error => { console.log(JSON.stringify({ status: 'sealing-incomplete',
  category: error.code === 'EEXIST' ? 'immutable_output_exists' : /^[a-z_]+$/.test(error.message)
    ? error.message : 'unavailable_input', acceptanceExecuted: false })); process.exitCode = 2; });
