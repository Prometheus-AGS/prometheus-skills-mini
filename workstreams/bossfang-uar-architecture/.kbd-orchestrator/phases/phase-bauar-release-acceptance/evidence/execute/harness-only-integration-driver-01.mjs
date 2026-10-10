import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, recheck } from '../../acceptance/lib/inputs.mjs';
import { runIntegration } from '../../acceptance/lib/stages.mjs';
import { readJson, verifyRef, requireValue, safeError } from '../../acceptance/lib/records.mjs';

// Failed/unexecuted harness only: preserve sealed commands and all historical evidence.
const evidence = dirname(fileURLToPath(import.meta.url));
const phaseRoot = dirname(dirname(evidence));
const phase = 'phase-bauar-release-acceptance';
const configRef = { path: phaseRoot + '/acceptance/candidate-inputs.json',
  sha256: 'e9dbb06425ad4bfdb8d4378c3c2f286c59256e179cd33835348dcfb434005770' };
const sealRef = { path: evidence + '/attempts/runtime-seal-04.json',
  sha256: '861d2f292ff8bfe2a49d1b27e228315f8aa25d43e0a957f152779677c39fb568' };
const cleanupRef = { path: evidence + '/owned-desktop-cleanup-reconciliation-01.json',
  sha256: '1dcc6f24703adc2021053212dc88ca728447f610cc883a6b2ceb8bef9d32c4a4' };

function absent(pid, group) {
  try { process.kill(group ? -pid : pid, 0); return false; }
  catch (error) { return error.code === 'ESRCH'; }
}

try {
  for (const ref of [configRef, sealRef, cleanupRef]) await verifyRef(ref);
  const proof = await readJson(cleanupRef.path);
  requireValue(proof.kind === 'owned-desktop-cleanup-reconciliation' && proof.phase === phase
    && proof.status === 'OWNED_PROCESS_CLEANUP_OBSERVED'
    && proof.actions.runRemainingUnexecutedHarnessOnly === true
    && proof.actions.retryDesktop === false, 'cleanup_authorization_invalid');
  requireValue(proof.coordinator.sha256 === '3a405046263643343a2b95d8edb61e8ace02373729d60e8543057ea5ee7d53fb'
    && proof.integration.sha256 === 'e8101761af8ef49790307b70effd8fda7cad81281813d8e733413e797030e8a8',
  'cleanup_execution_binding_invalid');
  for (const ref of [proof.coordinator, proof.integration, proof.harnessUnrun]) await verifyRef(ref);
  requireValue(proof.observations.pids.length === 8 && proof.observations.groups.length === 3
    && proof.observations.pids.every(item => Number.isSafeInteger(item.pid) && item.absent === true && absent(item.pid, false))
    && proof.observations.groups.every(item => Number.isSafeInteger(item.processGroupId)
      && item.absent === true && absent(item.processGroupId, true)), 'owned_cleanup_not_observed');
  const prior = await readJson(proof.integration.path);
  const unrun = await readJson(proof.harnessUnrun.path);
  requireValue(prior.kind === 'aggregate' && prior.stage === 'integration' && prior.status === 'FAIL'
    && prior.observations.requiredComponents === 8 && prior.observations.passedComponents === 6
    && unrun.binding.componentId === 'harness' && unrun.status === 'BLOCKED', 'prior_subset_context_invalid');
  const config = await loadConfig(configRef.path, { phase, stage: 'integration' });
  requireValue(config.runtimeSealPath === sealRef.path, 'selected_seal_changed');
  const selected = { ...config, components: config.components.filter(item => item.id === 'harness'),
    scenarios: config.scenarios.filter(item => item.componentId === 'harness') };
  requireValue(selected.components.length === 1 && selected.scenarios.length === 2, 'harness_subset_invalid');
  await recheck(config);
  const result = await runIntegration(selected);
  console.log(JSON.stringify({ schemaVersion: 1, ...result, subsetOnly: true,
    requiredComponents: 1, requiredScenarios: 2, fullPhasePassClaimed: false }));
  process.exitCode = result.exitCode;
} catch (error) {
  const safe = safeError(error);
  console.log(JSON.stringify({ schemaVersion: 1, exitCode: safe.exitCode, status: 'BLOCKED',
    category: safe.category, subsetOnly: true, fullPhasePassClaimed: false }));
  process.exitCode = safe.exitCode;
}
