import { dirname, join } from 'node:path';
import { readJson, requireValue, verifyRef, within } from './records.mjs';
import { readReceipt, receiptRef } from './receipts.mjs';

const harnessCases = [
  'registered-owner-and-explicit-unsupported', 'normal-exact-approval-and-reconciliation',
  'streaming-and-outcome-commit-crash', 'exact-denial-no-effect',
  'three-surface-cancellation-exact-caller-revision', 'lost-admission-and-decision-response-no-reenactment',
  'observation-reconnect-original-run', 'provider-admission-before-host-capture-crash',
  'durable-intent-crash-before-a2a', 'actual-pending-and-stale-sweep-preserves-selected-intent',
  'enabled-wake-native-and-selected-cas-winners', 'provider-epoch-restart-remains-unknown',
  'native-legacy-and-ephemeral-kernel-contract'
];
const kernelCases = ['native-normal', 'native-stream', 'native-ephemeral-entrypoints',
  'legacy-uar-model-provider', 'selected-ephemeral-refuses-before-reservation'];

// Raw child text and receipt locations stay in this invocation-local closure.
// Only selected counts and booleans cross the process receipt boundary.
export function outputAdapter(component, attemptRoot, positiveReceipt, binding) {
  const config = component.adapter;
  let harnessFinal;
  const passedTests = new Set();
  const seenTargets = new Set();
  const summaries = [];
  const observations = { finalRecords: 0, refusalMatched: false };
  return {
    policy: {
      observeLine(stream, line) {
        if (config.kind === 'harness' && stream === 'stdout' && line.trim().startsWith('{')) {
          let value; try { value = JSON.parse(line); } catch { return; }
          if (value?.passed === true && Number.isSafeInteger(value.executedCases) && typeof value.receipt === 'string') {
            requireValue(within(attemptRoot, value.receipt), 'harness_receipt_not_private');
            harnessFinal = value; observations.finalRecords++;
          }
        }
        if (config.kind === 'cargo') {
          for (const target of config.targets ?? []) {
            if (stream === 'stderr' && line.includes(`Running tests/${target}.rs (`)) seenTargets.add(target);
          }
          const test = /^test ([A-Za-z0-9_:]+) \.\.\. ok\s*$/.exec(line);
          if (test && (config.negativeTests ?? []).includes(test[1])) passedTests.add(test[1]);
          const summary = /^test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out;/.exec(line);
          if (summary) summaries.push(summary.slice(1).map(Number));
        }
        const predicate = config.validatorControl?.failurePredicate;
        if (predicate && stream === predicate.stream && line.includes(predicate.literal)) observations.refusalMatched = true;
      },
      result() {
        return { ...observations, selectedTargetsObserved: seenTargets.size, testSummaries: summaries.length,
          testsPassed: summaries.reduce((n, row) => n + row[0], 0), namedNegativesPassed: passedTests.size };
      }
    },
    async collect(result) {
      const clean = result.category === 'completed' && result.cleanup.groupAbsent && !result.cleanup.unknownDescendants;
      if (!clean) return { status: 'BLOCKED', observations: { cleanupConfirmed: false }, cases: [], negatives: [], evidence: [] };
      if (config.kind === 'harness') {
        requireValue(result.exitCode === 0, 'harness_failed', 1);
        requireValue(observations.finalRecords === 1 && harnessFinal?.executedCases === 18, 'harness_observations_missing');
        const receipt = await readJson(harnessFinal.receipt);
        const kernelPath = join(dirname(harnessFinal.receipt), 'kernel', 'receipt.json');
        const kernel = await readJson(kernelPath);
        requireValue(receipt.schemaVersion === 1 && receipt.executedCases === 18 && Array.isArray(receipt.completed)
          && receipt.completed.length === 13 && new Set(receipt.completed).size === 13
          && harnessCases.every(name => receipt.completed.includes(name)), 'harness_case_inventory_missing');
        requireValue(kernel.executedCases === 5 && Array.isArray(kernel.cases) && kernel.cases.length === 5
          && new Set(kernel.cases).size === 5 && kernelCases.every(name => kernel.cases.includes(name)),
          'kernel_case_inventory_missing');
        requireValue(Number.isSafeInteger(receipt.realModelCalls) && receipt.realModelCalls > 0
          && Array.isArray(receipt.effects) && receipt.effects.length >= 3 && receipt.modelRequestClasses?.unknown === 0
          && ['task', 'auxiliary', 'continuation', 'unknown'].every(key => Number.isSafeInteger(receipt.modelRequestClasses[key])
            && receipt.modelRequestClasses[key] >= 0)
          && ['task', 'auxiliary', 'continuation', 'unknown'].reduce((n, key) => n + receipt.modelRequestClasses[key], 0) === receipt.realModelCalls,
          'harness_runtime_observations_missing');
        // The gate's admission/peer assertions precede its final record. Their
        // completion is assertion-backed runtime evidence, not persisted fields.
        const finite = { executedCases: 18, completedCases: 13, kernelCases: 5, realModelCalls: receipt.realModelCalls,
          effectCount: receipt.effects.length, unknownModelRequests: 0, gateAssertionsCompleted: true,
          cleanupConfirmed: true, primaryAssigneeWakeDisabled: receipt.primaryAssigneeWake === false,
          primaryBackgroundSweepDisabled: receipt.primaryBackgroundSweep === false,
          raceAssigneeWakeEnabled: receipt.raceAssigneeWake === true, raceTaskBoardSweepEnabled: receipt.raceTaskBoardSweep === true };
        return { status: 'PASS', observations: finite, cases: [...receipt.completed, ...kernel.cases],
          negatives: [...receipt.completed, ...kernel.cases], evidence: [await receiptRef(harnessFinal.receipt), await receiptRef(kernelPath)] };
      }
      if (config.kind === 'cargo') {
        requireValue(result.exitCode === 0, 'cargo_failed', 1);
        requireValue(config.targets?.length > 0 && config.negativeTests?.length > 0
          && seenTargets.size === config.targets.length && summaries.length === config.targets.length
          && summaries.every(([passed, failed, ignored, measured, filtered]) => passed > 0 && failed === 0
            && ignored === 0 && measured === 0 && filtered === 0)
          && passedTests.size === config.negativeTests.length, 'cargo_selected_observations_missing');
        return { status: 'PASS', observations: { ...this.policy.result(), cleanupConfirmed: true },
          cases: [...seenTargets], negatives: [...passedTests], evidence: [] };
      }
      if (config.kind === 'package-validator') {
        const control = config.validatorControl;
        requireValue(control, 'validator_control_missing');
        await verifyRef(control.original); await verifyRef(control.controlled);
        requireValue(within(attemptRoot, control.controlled.path) || within(dirname(attemptRoot), control.controlled.path),
          'validator_copy_not_private');
        const pristine = control.kind === 'pristine';
        if (pristine) requireValue(control.original.sha256 === control.controlled.sha256 && result.exitCode === 0,
          'pristine_validator_failed', 1);
        else {
          const positiveRef = positiveReceipt ?? control.positiveReceipt;
          requireValue(positiveRef && control.failurePredicate, 'validator_positive_control_missing');
          await verifyRef(positiveRef);
          const positive = await readReceipt(positiveRef.path);
          requireValue(positive.kind === 'component' && positive.status === 'PASS'
            && ['executionKey', 'sourceSha256', 'packageSha256', 'profileSha256'].every(key => positive.binding[key] === binding[key])
            && positive.scenarios.some(scenario => scenario.observations.pristine === true
              && scenario.evidence.some(ref => ref.path === control.original.path && ref.sha256 === control.original.sha256)),
            'validator_positive_control_unmatched');
          requireValue(control.kind === 'public-mode' || control.original.sha256 !== control.controlled.sha256,
            'validator_mutation_not_observed');
          requireValue(result.exitCode !== null && result.exitCode !== 0 && observations.refusalMatched,
            'validator_refusal_not_observed', 1);
        }
        return { status: 'PASS', observations: { pristine, originalRehashed: true, controlledInputRehashed: true,
          refusalMatched: !pristine && observations.refusalMatched, validatorInvocations: 1, cleanupConfirmed: true },
          cases: [control.kind], negatives: pristine ? [] : [control.kind],
          evidence: [control.original, control.controlled, ...((positiveReceipt ?? control.positiveReceipt) ? [positiveReceipt ?? control.positiveReceipt] : [])] };
      }
      requireValue(false, 'adapter_kind_invalid');
    }
  };
}

export async function prepareAdapter(config, component) {
  if (component.adapter.kind !== 'package-validator') return;
  const control = component.adapter.validatorControl;
  requireValue(control, 'validator_control_missing');
  await verifyRef(control.original); await verifyRef(control.controlled);
  requireValue(control.original.path !== control.controlled.path, 'validator_original_would_be_mutated');
  const command = config.seal.commands.find(item => item.componentId === component.id);
  requireValue(command.args.includes(control.argumentPath)
    && (control.argumentPath === control.controlled.path || within(control.argumentPath, control.controlled.path)),
    'validator_control_not_invoked');
  requireValue(within(config.privateRoot, control.controlled.path), 'validator_copy_not_private');
  requireValue(control.expectedExit === (control.kind === 'pristine' ? 'zero' : 'nonzero'), 'validator_exit_contract_invalid');
  if (control.failurePredicate) {
    const predicate = control.failurePredicate;
    requireValue(component.sourcePaths.includes(predicate.source.path), 'validator_predicate_source_unbound');
    await verifyRef(predicate.source);
    const { readFile } = await import('node:fs/promises');
    requireValue((await readFile(predicate.source.path, 'utf8')).includes(predicate.literal), 'validator_predicate_not_in_source');
  }
  if (control.positiveReceipt) await verifyRef(control.positiveReceipt);
}

export function adaptedComponent(binding, inventory, adapterConfig, collected, cleanup) {
  const scenarios = inventory.map(expected => {
    const cases = adapterConfig.scenarioCases?.[expected.id] ?? [];
    const negatives = adapterConfig.negativeCases?.[expected.id] ?? [];
    const observed = cases.filter(name => collected.cases.includes(name));
    const negativeObserved = negatives.filter(name => collected.negatives.includes(name));
    const required = adapterConfig.requiredObservations ?? [];
    const complete = cases.length > 0 && observed.length === cases.length
      && required.every(key => collected.observations[key] === true || collected.observations[key] > 0)
      && (!expected.negativeRequired || negatives.length > 0 && negativeObserved.length === negatives.length);
    return { id: expected.id, ownerTaskKey: expected.ownerTaskKey,
      status: collected.status === 'PASS' && complete ? 'PASS' : collected.status === 'FAIL' ? 'FAIL' : 'BLOCKED',
      observations: { ...collected.observations, matchedCases: observed.length, matchedNegativeCases: negativeObserved.length },
      executedCount: observed.length,
      negativeControl: { status: expected.negativeRequired ? complete ? 'PASS' : 'BLOCKED' : 'OUT_OF_SCOPE',
        executedCount: negativeObserved.length }, evidence: collected.evidence };
  });
  return { schemaVersion: 1, kind: 'component', binding,
    status: scenarios.every(item => item.status === 'PASS') ? 'PASS' : collected.status === 'FAIL' ? 'FAIL' : 'BLOCKED',
    scenarios, cleanup: { descendantsReconciled: cleanup.groupAbsent && !cleanup.unknownDescendants,
      ownedResourcesRemaining: cleanup.groupAbsent ? 0 : 1,
      ledger: [{ kind: 'process', state: cleanup.groupAbsent ? 'closed' : 'retained', owned: true },
        { kind: 'directory', state: 'retained', owned: true }] } };
}
