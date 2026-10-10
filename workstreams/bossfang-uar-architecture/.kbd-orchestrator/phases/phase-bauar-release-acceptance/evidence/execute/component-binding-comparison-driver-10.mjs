import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, verifyRef, requireValue, digest, writeNew, safeError } from '../../acceptance/lib/records.mjs';
import { loadConfig, componentBinding } from '../../acceptance/lib/inputs.mjs';
import { readReceipt, compatibleBinding } from '../../acceptance/lib/receipts.mjs';

// Metadata only; no acceptance coordinator, compiler, test or process launch.
const phase = 'phase-bauar-release-acceptance';
const base = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
async function record(ref) { await verifyRef(ref); return readJson(ref.path); }
function hydrated(config, seal, configRef, sealRef) {
  const copy = structuredClone(config);
  for (const component of copy.components) {
    if (component.adapter.validatorControlId) {
      const matches = seal.validatorControls.filter(item => item.id === component.adapter.validatorControlId);
      requireValue(matches.length === 1, 'validator_control_mismatch');
      const { id, ...control } = matches[0]; component.adapter.validatorControl = control;
    }
  }
  return { ...copy, seal, selected: [...copy.sourceFiles, ...copy.gateFiles, ...copy.manifests,
    copy.profile, copy.approvedPlan, copy.commandContract],
    bindings: { configSha256: configRef.sha256, runtimeSealSha256: sealRef.sha256, profileSha256: copy.profile.sha256 } };
}
async function main() {
  const args = process.argv.slice(2);
  requireValue(args.length === 4 && args[0] === '--inputs' && args[2] === '--inputs-sha256',
    'explicit_bound_request_required');
  const requestRef = { path: args[1], sha256: args[3] };
  const request = await record(requestRef);
  requireValue(request.schemaVersion === 1 && request.phase === phase, 'comparison_request_invalid');
  const binding = await record(request.bindingReceipt);
  const oldConfig = await record(binding.snapshot);
  const oldSealRef = { path: oldConfig.runtimeSealPath, sha256: request.priorSeal.sha256 };
  requireValue(oldSealRef.path === request.priorSeal.path, 'prior_seal_selection_mismatch');
  const oldSeal = await record(oldSealRef);
  await record(binding.config);
  const current = await loadConfig(binding.config.path, { phase, stage: 'integration' });
  requireValue(current.runtimeSealPath === join(base, 'evidence/execute/attempts/runtime-seal-05.json'),
    'new_seal_selection_mismatch');
  const before = hydrated(oldConfig, oldSeal, binding.snapshot, oldSealRef);
  requireValue(oldConfig.executionKey === current.executionKey && digest(oldSeal.packageFiles) === digest(current.seal.packageFiles)
    && digest(oldSeal.hostFiles) === digest(current.seal.hostFiles) && digest(oldSeal.commands) === digest(current.seal.commands)
    && current.components.every(component => {
      const old = oldConfig.components.find(item => item.id === component.id);
      return old && digest(component.command) === digest(old.command)
        && digest(component.environment) === digest(old.environment)
        && digest(component.packagePaths) === digest(old.packagePaths);
    }), 'execution_hosts_or_package_changed');
  const pairs = [];
  requireValue(binding.passingComponentReuse.length === 6, 'six_pass_inventory_missing');
  for (const entry of binding.passingComponentReuse) {
    await verifyRef(entry.actualPass);
    const actual = await readReceipt(entry.actualPass.path);
    const priorComponent = before.components.find(item => item.id === entry.componentId);
    const component = current.components.find(item => item.id === entry.componentId);
    requireValue(component && priorComponent && !['desktop', 'harness'].includes(component.id)
      && actual.kind === 'execution' && actual.status === 'PASS' && actual.process.category === 'completed'
      && actual.process.cleanup.groupAbsent && !actual.process.cleanup.unknownDescendants,
      'actual_pass_missing_or_uncertain');
    const priorBinding = componentBinding(before, priorComponent);
    const nextBinding = componentBinding(current, component);
    const equal = compatibleBinding(priorBinding, nextBinding);
    const reusable = compatibleBinding(actual.binding, nextBinding);
    pairs.push({ componentId: component.id, before: priorBinding, after: nextBinding,
      actualPass: entry.actualPass, componentBindingEqual: equal, actualPassReusable: reusable });
    requireValue(equal && reusable, 'passing_component_reuse_changed');
  }
  requireValue(new Set(pairs.map(item => item.componentId)).size === 6, 'pass_identity_duplicate');
  const desktopBefore = componentBinding(before, before.components.find(item => item.id === 'desktop'));
  const desktopAfter = componentBinding(current, current.components.find(item => item.id === 'desktop'));
  requireValue(compatibleBinding(desktopBefore, desktopAfter), 'desktop05_binding_changed');
  const receipt = await writeNew(join(base, 'evidence/execute/component-binding-comparison-10.json'), {
    schemaVersion: 1, kind: 'actual-component-binding-comparison', phase, recordedAt: new Date().toISOString(),
    status: 'six-passes-reusable-harness-correction-requires-runtime', request: requestRef,
    config: binding.config, runtimeSeal: { path: current.runtimeSealPath, sha256: current.bindings.runtimeSealSha256 },
    pairs, desktopBindingUnchanged: true, packageFilesUnchanged: true, hostFilesUnchanged: true,
    commandsAndEnvironmentsUnchanged: true, executionKeyUnchanged: true, runtimeExecuted: false, excludedF6Accessed: false
  });
  console.log(JSON.stringify({ status: 'six-passes-reusable-harness-correction-requires-runtime', receipt,
    config: binding.config, runtimeSealSha256: current.bindings.runtimeSealSha256, compatibleActualPasses: 6 }));
}
try { await main(); } catch (error) { const safe = safeError(error); console.log(JSON.stringify(safe)); process.exitCode = safe.exitCode; }

