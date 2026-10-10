import { mkdir, readdir, realpath, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { componentBinding, executableHash, recheck } from './inputs.mjs';
import { privateEnvironment } from './environment.mjs';
import { runOwned } from './processes.mjs';
import { outputAdapter, prepareAdapter, adaptedComponent } from './adapters.mjs';
import { readReceipt, readComponent, writeReceipt, receiptRef, compatibleBinding,
  aggregateStatus, statusExit, reviewStatus } from './receipts.mjs';
import { readJson, writeNew, digest, requireValue, safeError, verifyRef } from './records.mjs';

function executionRoot(config) { return join(config.outputRoot, `execution-${digest(config.executionKey).slice(0, 24)}`); }
function componentRoot(config, component) { return join(executionRoot(config), `component-${digest(component.id).slice(0, 24)}`); }
async function directory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  requireValue(await realpath(path) === path, 'output_directory_redirected');
}
async function entries(path) {
  try { return await readdir(path, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function existing(config, component, binding) {
  const inventory = config.scenarios.filter(item => item.componentId === component.id);
  let passed;
  let latestFailure;
  for (const entry of await entries(componentRoot(config, component))) {
    requireValue(entry.isDirectory() && /^[a-f0-9-]{36}$/.test(entry.name), 'journal_entry_invalid');
    const root = join(componentRoot(config, component), entry.name);
    requireValue(await realpath(root) === root, 'journal_redirected');
    const files = await entries(root);
    const has = name => files.some(file => file.name === name && file.isFile());
    // An attempt with no committed execution result is never automatically replayed.
    requireValue(has('execution.json'), 'interrupted_execution_requires_reconciliation');
    const execution = await readReceipt(join(root, 'execution.json'));
    requireValue(execution.kind === 'execution', 'journal_receipt_invalid');
    requireValue(execution.process.category === 'completed' && execution.process.cleanup.groupAbsent
      && !execution.process.cleanup.unknownDescendants, 'uncertain_execution_requires_reconciliation');
    if (!compatibleBinding(execution.binding, binding)) continue;
    await verifyRef(execution.componentReceipt);
    const receipt = await readComponent(execution.componentReceipt.path, binding, inventory);
    if (execution.status === 'PASS' && receipt.status === 'PASS') passed = { receipt, ref: await receiptRef(join(root, 'execution.json')) };
    else if (!latestFailure || execution.endedAt > latestFailure.endedAt) latestFailure = {
      receipt, ref: await receiptRef(join(root, 'execution.json')), endedAt: execution.endedAt };
  }
  return { passed, failure: latestFailure };
}

async function versionProbe(config, root) {
  const probeId = randomUUID();
  const attemptRoot = join(config.privateRoot, probeId);
  const component = { environmentClass: 'runtime-private', fixtureEnvKeys: [],
    environment: { PATH: config.components[0].environment.PATH } };
  const { env } = await privateEnvironment(config, component, attemptRoot,
    join(attemptRoot, 'unused-binding.json'), join(attemptRoot, 'unused-receipt.json'));
  let lines = 0;
  let matches = 0;
  const result = await runOwned({ program: config.runtimes.child.path, args: ['--version'],
    cwd: root, env, budgetMs: 10000, outputPolicy: {
      observeLine(stream, line) { if (stream === 'stdout' && line.trim()) { lines++; if (line.trim() === config.runtimes.child.version) matches++; } },
      result() { return { versionMatched: lines === 1 && matches === 1 }; }
    } });
  const ref = await writeNew(join(root, `runtime-version-${probeId}.json`), {
    schemaVersion: 1, kind: 'runtime-version', executionKey: config.executionKey,
    runtime: { path: config.runtimes.child.realPath, sha256: config.runtimes.child.sha256, version: config.runtimes.child.version }, result });
  requireValue(result.category === 'completed' && result.exitCode === 0 && result.cleanup.groupAbsent
    && !result.cleanup.unknownDescendants && result.observations.versionMatched === true, 'child_runtime_not_observed');
  return ref;
}

async function execute(config, component, binding) {
  const id = randomUUID();
  const journalRoot = join(componentRoot(config, component), id);
  const attemptRoot = join(config.privateRoot, id);
  const bindingPath = join(attemptRoot, 'binding.json');
  const childReceiptPath = join(attemptRoot, 'component.json');
  const inventory = config.scenarios.filter(item => item.componentId === component.id);
  const command = config.seal.commands.find(item => item.componentId === component.id);
  let positiveReceipt;
  if (component.adapter.validatorControl?.positiveComponentId) {
    const positiveComponent = config.components.find(item => item.id === component.adapter.validatorControl.positiveComponentId);
    requireValue(positiveComponent?.adapter.validatorControl?.kind === 'pristine', 'positive_component_missing');
    const previous = await existing(config, positiveComponent, componentBinding(config, positiveComponent));
    requireValue(previous.passed, 'positive_component_not_passed');
    const positiveExecution = await readReceipt(previous.passed.ref.path);
    positiveReceipt = positiveExecution.componentReceipt;
  }
  await recheck(config);
  requireValue(await executableHash(command.program) === command.programSha256, 'component_program_changed');
  await prepareAdapter(config, component);
  const { env } = await privateEnvironment(config, component, attemptRoot, bindingPath, childReceiptPath);
  await writeNew(bindingPath, binding);
  await directory(journalRoot);
  const startedAt = new Date().toISOString();
  await writeNew(join(journalRoot, 'started.json'), { schemaVersion: 1, kind: 'started', binding, attemptRoot, startedAt });
  const adapter = outputAdapter(component, attemptRoot, positiveReceipt, binding);
  adapter.policy.onStarted = async ({ pid, startedAt: processStartedAt }) => writeNew(join(journalRoot, 'owned-process.json'),
    { schemaVersion: 1, kind: 'owned-process', pid, processGroupId: pid, startedAt: processStartedAt, attemptRoot });
  const result = await runOwned({ program: command.program, args: command.args, cwd: command.cwd,
    env, budgetMs: component.budgetMs, outputPolicy: adapter.policy });
  let receipt;
  let category = 'observed';
  try {
    requireValue(result.category === 'completed' && result.cleanup.groupAbsent && !result.cleanup.unknownDescendants,
      'component_process_incomplete');
    if (component.adapter.kind === 'component') {
      receipt = await readComponent(childReceiptPath, binding, inventory);
      requireValue(result.exitCode === 0 || receipt.status !== 'PASS', 'exit_receipt_disagreement', 1);
      if (result.exitCode !== 0 && receipt.status === 'PASS') requireValue(false, 'component_failed', 1);
    } else {
      const collected = await adapter.collect(result);
      receipt = adaptedComponent(binding, inventory, component.adapter, collected, result.cleanup);
    }
    await recheck(config);
  } catch (error) {
    const safe = safeError(error); category = safe.category;
    receipt = adaptedComponent(binding, inventory, component.adapter, { status: safe.exitCode === 1 ? 'FAIL' : 'BLOCKED',
      observations: { evidenceIncomplete: true, childExited: result.exitCode !== null }, cases: [], negatives: [], evidence: [] }, result.cleanup);
  }
  const componentRef = await writeReceipt(join(journalRoot, 'component.json'), receipt);
  const execution = { schemaVersion: 1, kind: 'execution', binding, status: receipt.status,
    ownerTaskKey: component.ownerTaskKey, command: { programSha256: command.programSha256,
      argvSha256: digest(command.args), argumentCount: command.args.length, cwd: command.cwd,
      environmentClass: component.environmentClass }, process: result, componentReceipt: componentRef,
    attemptRoot, startedAt, endedAt: new Date().toISOString(), category };
  const ref = await writeReceipt(join(journalRoot, 'execution.json'), execution);
  return { receipt, ref };
}

async function aggregate(config, stage, startedAt, results, additional = {}) {
  const records = results.map(item => item.receipt);
  const status = aggregateStatus([...records, ...(additional.reviewResults ?? [])]);
  const scopes = Object.fromEntries([...config.scopes.deferred, ...config.scopes.excluded, ...config.scopes.unauthorized]
    .map(scope => [scope, 'OUT_OF_SCOPE']));
  const receipt = { schemaVersion: 1, kind: 'aggregate', stage, executionKey: config.executionKey,
    ownerTaskKey: config.ownerTaskKey, status, ...config.bindings,
    components: results.map(item => item.ref), runtimeEvidence: additional.runtimeEvidence ?? [],
    observations: { requiredComponents: config.components.length, observedComponents: records.length,
      passedComponents: records.filter(item => item.status === 'PASS').length,
      observedScenarios: records.reduce((n, item) => n + item.scenarios.filter(scenario => scenario.status === 'PASS').length, 0),
      reusedComponents: additional.reused ?? 0, runtimeInvoked: stage === 'integration', finalizationReadOnly: stage === 'finalize' },
    startedAt, endedAt: new Date().toISOString(), dispositions: { ...scopes, ...(additional.dispositions ?? {}) },
    category: status === 'PASS' ? stage === 'integration' ? 'runtime_components_passed' : 'selected_local_readiness'
      : 'mandatory_evidence_incomplete_or_failed' };
  const ref = await writeReceipt(join(executionRoot(config), `${stage}-${randomUUID()}.json`), receipt);
  return { exitCode: statusExit(status), receipt: { ...ref, status, stage } };
}

export async function runIntegration(config) {
  const startedAt = new Date().toISOString();
  await directory(config.outputRoot); await directory(config.privateRoot); await directory(executionRoot(config));
  const lockPath = join(executionRoot(config), 'integration.lock');
  const lock = await open(lockPath, 'wx', 0o600);
  await lock.close();
  try {
    const results = [];
    const pending = [];
    for (const component of config.components) {
      const binding = componentBinding(config, component);
      const previous = await existing(config, component, binding);
      if (previous.passed) results.push(previous.passed);
      else pending.push({ component, binding });
    }
    const reused = results.length;
    const runtimeEvidence = pending.length ? [await versionProbe(config, executionRoot(config))] : [];
    // Serial launch preserves one Cargo writer and keeps failure attribution exact.
    for (const { component, binding } of pending) {
      const result = await execute(config, component, binding);
      results.push(result);
      // Unknown lifecycle/effects cannot be repaired by launching subsequent jobs.
      if (!result.receipt.cleanup.descendantsReconciled) break;
    }
    await recheck(config);
    if (results.length !== config.components.length) {
      for (const { component, binding } of pending.filter(item => !results.some(result => result.receipt.binding.componentId === item.component.id))) {
        const receipt = adaptedComponent(binding, config.scenarios.filter(item => item.componentId === component.id), component.adapter,
          { status: 'BLOCKED', observations: { notLaunched: true }, cases: [], negatives: [], evidence: [] },
          { groupAbsent: true, unknownDescendants: false });
        results.push({ receipt, ref: await writeReceipt(join(executionRoot(config), `unrun-${randomUUID()}.json`), receipt) });
      }
    }
    return await aggregate(config, 'integration', startedAt, results, { reused, runtimeEvidence });
  } finally { await unlink(lockPath); }
}

export async function finalize(config) {
  const startedAt = new Date().toISOString();
  // No runOwned path is reachable from finalization. Evidence is rehashed in place.
  const results = [];
  for (const component of config.components) {
    const previous = await existing(config, component, componentBinding(config, component));
    requireValue(previous.passed || previous.failure, 'mandatory_component_missing');
    results.push(previous.passed ?? previous.failure);
  }
  const format = await reviewStatus(config, config.finalization.formatReceiptPath, 'format');
  const review = await reviewStatus(config, config.finalization.reviewReceiptPath, 'review');
  await recheck(config);
  return aggregate(config, 'finalize', startedAt, results, { reused: results.length, reviewResults: [format, review],
    dispositions: { formatting: format.disposition, review: review.disposition },
    runtimeEvidence: [await receiptRef(config.finalization.formatReceiptPath), await receiptRef(config.finalization.reviewReceiptPath)] });
}
