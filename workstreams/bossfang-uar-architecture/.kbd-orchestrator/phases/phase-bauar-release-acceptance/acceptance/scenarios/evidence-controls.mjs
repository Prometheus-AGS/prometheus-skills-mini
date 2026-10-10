import { appendFile, readFile, writeFile, open } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { readJson, requireValue, within, writeNew, safeError } from '../lib/records.mjs';
import { writeReceipt } from '../lib/receipts.mjs';
import { loadConfig } from '../lib/inputs.mjs';
import { argumentsMap, scenarioContext, finishScenario, fileRef } from './scenario-common.mjs';
import { fixture, invoke, effects, execution } from './evidence-fixtures.mjs';

async function fixtureChild(mode, marker) {
  const root = process.cwd();
  requireValue(within(root, marker), 'fixture_effect_not_private');
  const binding = await readJson(process.env.BAUAR_COMPONENT_BINDING_PATH);
  const receiptPath = process.env.BAUAR_COMPONENT_RECEIPT_PATH;
  if (mode !== 'zero-count') {
    const handle = await open(marker, 'a', 0o600);
    try { await handle.writeFile(`${JSON.stringify({ effect: 'scratch-file-write', mode })}\n`); await handle.sync(); }
    finally { await handle.close(); }
  }
  if (mode === 'interrupted') { while (true) await delay(1000); }
  if (mode === 'no-receipt') return;
  if (mode === 'malformed-receipt') { await writeFile(receiptPath, '{malformed', { flag: 'wx' }); return; }
  const count = mode === 'zero-count' ? 0 : (await readFile(marker, 'utf8')).split('\n').filter(Boolean).length;
  const matched = mode !== 'failure' && count === 1;
  if (mode === 'failure') {
    const mismatchPath = `${marker}.mismatch`;
    await writeFile(mismatchPath, 'actual-mismatch', { flag: 'wx' });
    requireValue(await readFile(mismatchPath, 'utf8') !== 'required-match', 'failure_control_not_applied');
  }
  // zero-count is a deliberately invalid PASS input to the actual coordinator.
  // It is never accepted or published as passing scenario evidence.
  const status = mode === 'failure' ? 'FAIL' : 'PASS';
  await writeReceipt(receiptPath, { schemaVersion: 1, kind: 'component', binding, status,
    scenarios: [{ id: 'E02.fixture', ownerTaskKey: 'bauar-acc-03-local-acceptance-evidence/2.1', status,
      observations: { actualScratchWrites: count, expectationMatched: matched }, executedCount: count,
      negativeControl: { status: 'OUT_OF_SCOPE', executedCount: 0 }, evidence: count ? [await fileRef(marker)] : [] }],
    cleanup: { descendantsReconciled: true, ownedResourcesRemaining: 0,
      ledger: [{ kind: 'directory', state: 'retained', owned: true }] } });
  if (mode === 'failure') process.exitCode = 1;
}

async function controls(configPath) {
  const context = await scenarioContext(configPath);
  await loadConfig(configPath, { phase: context.config.phase, stage: 'integration' });
  const evidence = [];
  const observations = { positiveCoordinatorRuns: 0, refusedControls: 0, cleanupConfirmed: true };
  let executed = 0;
  try {
    const positive = await fixture(context, 'positive');
    const first = await invoke(context, positive);
    evidence.push(...first.evidence);
    requireValue(first.result.exitCode === 0 && await effects(positive) === 1, 'coordinator_positive_failed', 1);
    const retained = await execution(positive);
    requireValue(retained.record.status === 'PASS', 'coordinator_positive_receipt_missing');
    evidence.push(retained.ref); observations.positiveCoordinatorRuns++; executed++;
    const resumed = await invoke(context, positive);
    evidence.push(...resumed.evidence);
    requireValue(resumed.result.exitCode === 0 && await effects(positive) === 1, 'coordinator_replayed_pass', 1);
    observations.passedScopeReusedWithoutReplay = true; executed++;
    for (const mode of ['missing-input', 'changed-input', 'malformed-receipt', 'zero-count', 'no-receipt']) {
      const control = await fixture(context, mode);
      const run = await invoke(context, control);
      evidence.push(...run.evidence);
      requireValue(run.result.exitCode === 2, 'coordinator_negative_not_blocked', 1);
      const expectedEffects = ['missing-input', 'changed-input', 'zero-count'].includes(mode) ? 0 : 1;
      requireValue(await effects(control) === expectedEffects, 'coordinator_control_effect_count_wrong', 1);
      if (mode === 'changed-input') requireValue(run.output.category === 'file_binding_changed', 'changed_input_wrong_refusal', 1);
      if (['malformed-receipt', 'zero-count', 'no-receipt'].includes(mode)) {
        const actual = await execution(control); evidence.push(actual.ref);
        const expected = { 'malformed-receipt': 'record_json_invalid', 'zero-count': 'scenario_has_no_actual_observation',
          'no-receipt': 'unavailable_or_invalid_input' }[mode];
        requireValue(actual.record.category === expected, 'receipt_control_wrong_refusal', 1);
      }
      observations[mode.replaceAll('-', '_')] = true;
      observations.refusedControls++; executed++;
    }
    const failed = await fixture(context, 'failure');
    const failure = await invoke(context, failed);
    evidence.push(...failure.evidence);
    requireValue(failure.result.exitCode === 1 && await effects(failed) === 1, 'observed_failure_not_exit_one', 1);
    observations.observedFailureReturnsOne = true; observations.refusedControls++; executed++;
    const interrupted = await fixture(context, 'interrupted');
    const stopped = await invoke(context, interrupted);
    evidence.push(...stopped.evidence);
    requireValue(stopped.result.exitCode === 2 && await effects(interrupted) === 1, 'interruption_control_missing', 1);
    const interruptedRecord = await execution(interrupted); evidence.push(interruptedRecord.ref);
    requireValue(interruptedRecord.record.process.category === 'timed_out', 'interruption_not_observed', 1);
    const retry = await invoke(context, interrupted);
    evidence.push(...retry.evidence);
    requireValue(retry.result.exitCode === 2 && retry.output.category === 'uncertain_execution_requires_reconciliation'
      && await effects(interrupted) === 1, 'interrupted_effect_was_replayed', 1);
    observations.interruptedEffectRetainedNoReplay = true; observations.refusedControls++; executed += 2;
    const finalized = await invoke(context, positive, 'finalize');
    evidence.push(...finalized.evidence);
    requireValue(finalized.result.exitCode === 2 && await effects(positive) === 1, 'finalize_launched_or_accepted_missing_review', 1);
    observations.finalizeReadOnlyMissingReviewBlocked = true; observations.refusedControls++; executed++;
    await finishScenario(context, 'PASS', observations, evidence, executed, observations.refusedControls);
  } catch (error) {
    const safe = safeError(error);
    observations.cleanupConfirmed = safe.category !== 'scenario_child_cleanup_incomplete';
    await finishScenario(context, safe.exitCode === 1 ? 'FAIL' : 'BLOCKED', observations, evidence, executed, observations.refusedControls);
    process.exitCode = safe.exitCode;
  }
}

try {
  if (process.argv[2] === '--fixture-child') {
    const args = argumentsMap(process.argv.slice(4));
    await fixtureChild(process.argv[3], args.get('--marker'));
  } else {
    const args = argumentsMap(process.argv.slice(2));
    await controls(args.get('--config'));
  }
} catch (error) {
  const safe = safeError(error);
  process.stdout.write(`${JSON.stringify({ status: safe.exitCode === 1 ? 'FAIL' : 'BLOCKED', category: safe.category })}\n`);
  process.exitCode = safe.exitCode;
}
