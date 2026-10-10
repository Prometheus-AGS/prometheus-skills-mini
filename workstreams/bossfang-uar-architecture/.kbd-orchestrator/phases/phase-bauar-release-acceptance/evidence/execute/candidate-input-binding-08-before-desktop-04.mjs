import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, lstat, realpath, open, writeFile } from 'node:fs/promises';
import { dirname, join, isAbsolute, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dormant preparation: only the parent may invoke this after coherent delivery.
// No product edits, directory traversal, compiler, formatter, gate or coordinator import.
const evidence = dirname(fileURLToPath(import.meta.url));
const phaseRoot = dirname(dirname(evidence));
const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
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
async function ref(path) {
  eligible(path);
  const stat = await lstat(path);
  check(stat.isFile() && !stat.isSymbolicLink() && await realpath(path) === path, 'regular_input_required');
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return { path, sha256: hash.digest('hex') };
}
async function verify(value) {
  check(value && /^[a-f0-9]{64}$/.test(value.sha256), 'explicit_digest_required');
  check((await ref(value.path)).sha256 === value.sha256, 'input_hash_changed');
}
const json = async path => JSON.parse(await readFile(eligible(path), 'utf8'));
async function immutable(path, value, raw = false) {
  eligible(path);
  check(await realpath(dirname(path)) === dirname(path), 'output_parent_redirected');
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(raw ? value : `${JSON.stringify(value, null, 2)}\n`); await handle.sync(); }
  finally { await handle.close(); }
  return ref(path);
}
async function main() {
  const requestRef = { path: arg('--inputs'), sha256: arg('--inputs-sha256') };
  await verify(requestRef);
  const request = await json(requestRef.path);
  check(request.schemaVersion === 1 && request.phase === 'phase-bauar-release-acceptance', 'request_invalid');
  check(request.config.path === join(phaseRoot, 'acceptance/candidate-inputs.json'), 'config_scope_changed');
  const deliveries = [request.config, request.packageReceipt, request.desktop.report, request.desktop.sources,
    request.harness.readiness, ...request.productionSources, ...request.preparationSources, ...request.diagnosticRecords];
  for (const value of deliveries) eligible(value.path);
  for (const value of deliveries) await verify(value);
  const configRaw = await readFile(request.config.path);
  const config = JSON.parse(configRaw);
  const priorConfig = structuredClone(config);
  const selected = [...config.sourceFiles, ...config.gateFiles, ...config.manifests,
    config.profile, config.approvedPlan, config.commandContract];
  for (const value of selected) eligible(value.path);
  const priorBarrierRef = await ref(config.production.declarationPath);
  const priorBarrier = await json(config.production.declarationPath);
  check(priorBarrier.sourceSha256 === digest(selected), 'prior_production_binding_changed');
  const desktop = config.components.find(value => value.id === 'desktop');
  const harness = config.components.find(value => value.id === 'harness');
  const regression = config.components.find(value => value.id === 'uar-regression');
  check(desktop && harness && regression, 'component_contract_missing');
  const expectedProduction = desktop.sourcePaths.filter(path =>
    path.endsWith('/src/main/core/paths/constants.ts') || path.endsWith('/src/main/core/preboot/README.md'));
  check(expectedProduction.length === 2 && request.productionSources.length === 2
    && request.productionSources.every(value => expectedProduction.includes(value.path)), 'production_scope_changed');
  const desktopRefs = await json(request.desktop.sources.path);
  check(Array.isArray(desktopRefs) && desktopRefs.length === 7, 'desktop_readiness_incomplete');
  for (const value of desktopRefs) eligible(value.path);
  check(desktopRefs.every(value => desktop.sourcePaths.includes(value.path)), 'desktop_scope_changed');
  for (const value of desktopRefs) await verify(value);
  const harnessReady = await json(request.harness.readiness.path);
  check(harnessReady.status === 'source-ready-not-runtime-verified'
    && Array.isArray(harnessReady.changes) && harnessReady.changes.length > 0, 'harness_readiness_incomplete');
  const harnessDirectory = dirname(harness.sourcePaths.find(path => path.endsWith('/bauar-harness-gate.mjs')));
  for (const value of harnessReady.changes) eligible(value.path);
  check(harnessReady.changes.every(value => dirname(value.path) === harnessDirectory), 'harness_scope_changed');
  for (const value of harnessReady.changes) await verify(value);
  const allowed = new Map([...request.productionSources, ...desktopRefs, ...harnessReady.changes]
    .map(value => [value.path, value.sha256]));
  const changes = [];
  for (const value of selected) {
    const actual = await ref(value.path);
    if (actual.sha256 !== value.sha256) {
      check(allowed.get(value.path) === actual.sha256, 'unexpected_selected_drift');
      changes.push({ path: value.path, beforeSha256: value.sha256, sha256: actual.sha256 });
      value.sha256 = actual.sha256;
    }
  }
  for (const value of harnessReady.changes) {
    if (!config.sourceFiles.some(item => item.path === value.path))
      config.sourceFiles.push({ path: value.path, sha256: value.sha256 });
    if (!harness.sourcePaths.includes(value.path)) harness.sourcePaths.push(value.path);
  }
  const packageReceipt = await json(request.packageReceipt.path);
  check(packageReceipt.status === 'PASS' && packageReceipt.sourceUnchanged === true
    && packageReceipt.uarMatches === true && packageReceipt.asarChanged === true, 'package_not_complete');
  for (const value of Object.values(packageReceipt.packageFiles)) eligible(value.path);
  for (const value of Object.values(packageReceipt.packageFiles)) await verify(value);
  check(request.productionSources.every(value => packageReceipt.currentSource.some(item =>
    item.path === value.path && item.sha256 === value.sha256)), 'package_production_sources_not_bound');
  const previousPackage = await json(join(evidence, 'boss-package-01.json'));
  check(packageReceipt.packageFiles.uar.sha256 === previousPackage.packageFiles.uar.sha256, 'sidecar_changed');
  const additions = {
    desktop: [request.desktop.report, request.desktop.sources, request.packageReceipt],
    harness: [request.harness.readiness],
    'uar-regression': request.diagnosticRecords
  };
  for (const [id, values] of Object.entries(additions)) {
    const component = config.components.find(item => item.id === id);
    for (const value of values) {
      check(value.path.startsWith(`${phaseRoot}/`), 'phase_record_scope_changed');
      if (!component.sourcePaths.includes(value.path)) component.sourcePaths.push(value.path);
      if (!config.manifests.some(item => item.path === value.path)) config.manifests.push(value);
    }
  }
  const priorSeal = await json(priorConfig.runtimeSealPath);
  const priorRefs = new Map([...selected.map(value => ({ ...value })), ...priorSeal.scenarioSources,
    ...priorSeal.packageFiles].map(value => [value.path, value.sha256]));
  // Passing component reuse is measured against the existing seal, never presumed.
  const priorSelected = [...priorConfig.sourceFiles, ...priorConfig.gateFiles, ...priorConfig.manifests,
    priorConfig.profile, priorConfig.approvedPlan, priorConfig.commandContract];
  for (const value of priorSelected) priorRefs.set(value.path, value.sha256);
  const reuse = [];
  for (const component of config.components.filter(value => !['desktop', 'harness', 'uar-regression'].includes(value.id))) {
    let unchanged = true;
    const paths = [...new Set([...component.sourcePaths, ...component.packagePaths])];
    for (const path of paths) eligible(path);
    for (const path of paths) if ((await ref(path)).sha256 !== priorRefs.get(path)) unchanged = false;
    reuse.push({ componentId: component.id, unchangedInputs: unchanged });
  }
  config.production.declarationPath = join(evidence, 'production-barrier-08.json');
  config.runtimeSealPath = join(evidence, 'attempts/runtime-seal-03.json');
  const sourceSha256 = digest([...config.sourceFiles, ...config.gateFiles, ...config.manifests,
    config.profile, config.approvedPlan, config.commandContract]);
  const barrier = { ...priorBarrier, sourceSha256, completedAt: new Date().toISOString(),
    supersedes: priorBarrierRef.sha256, reason: 'Actual startup corrections and genuine rebuilt Boss package; exact sidecar and hosts retained.' };
  delete barrier.amendment;
  check(config.executionKey === priorConfig.executionKey && config.components.every(component => {
    const prior = priorConfig.components.find(value => value.id === component.id);
    return digest(component.command) === digest(prior.command)
      && digest(component.environment) === digest(prior.environment)
      && digest(component.packagePaths) === digest(prior.packagePaths);
  }), 'execution_contract_changed');
  for (const value of deliveries) await verify(value);
  const snapshot = await immutable(join(evidence, 'candidate-inputs-before-correction-08.json'), configRaw, true);
  const barrierRef = await immutable(config.production.declarationPath, barrier);
  await writeFile(request.config.path, `${JSON.stringify(config, null, 2)}\n`);
  const receipt = { schemaVersion: 1, recordedAt: new Date().toISOString(), request: requestRef,
    snapshot, config: await ref(request.config.path), barrier: barrierRef, sourceSha256, changes,
    packageReceipt: request.packageReceipt, sourceReadiness: additions,
    preparationSources: request.preparationSources, passingComponentReuse: reuse,
    executionKeyUnchanged: true, runtimeExecuted: false, excludedF6Accessed: false };
  const receiptRef = await immutable(join(evidence, 'correction-input-binding-08.json'), receipt);
  console.log(JSON.stringify({ status: 'bound-not-runtime-tested', ...receipt, receipt: receiptRef }));
}
await main().catch(error => { console.log(JSON.stringify({ status: 'binding-incomplete',
  category: error.code === 'EEXIST' ? 'immutable_output_exists' : /^[a-z_]+$/.test(error.message)
    ? error.message : 'unavailable_input', runtimeExecuted: false })); process.exitCode = 2; });
