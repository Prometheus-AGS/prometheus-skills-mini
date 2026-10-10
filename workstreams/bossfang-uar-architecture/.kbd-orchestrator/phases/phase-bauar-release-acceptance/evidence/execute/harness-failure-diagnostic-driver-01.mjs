import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loadConfig, componentBinding, recheck } from '../../acceptance/lib/inputs.mjs';
import { privateEnvironment } from '../../acceptance/lib/environment.mjs';
import { runOwned } from '../../acceptance/lib/processes.mjs';
import { readReceipt, compatibleBinding } from '../../acceptance/lib/receipts.mjs';
import { hashFile, digest, requireValue, writeNew, safeError } from '../../acceptance/lib/records.mjs';
import { createHarnessDiagnosticObserver } from './harness-failure-diagnostic-observer-01.mjs';

const phase = 'phase-bauar-release-acceptance';
const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const configPath = join(root, 'acceptance', 'candidate-inputs.json');
const expectedConfig = "43d5a37b59743f7afc9b39ddbe8ced25b9553e77ad1c6efe479cd02fb5338e33";
const priorPath = "/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/evidence/execute/attempts/execution-0a50eef88a9cb91020cb5361/component-77e2d3fdeec023785671be93/76fc37e7-71e1-4cdd-a309-89d7eaf0c49f/execution.json";
const outputRoot = join(root, 'evidence', 'execute', 'harness-failure-diagnostic-01');
let output;
async function main() {
  requireValue(process.argv.length === 2, 'literal_no_argument_driver_required');
  requireValue(await hashFile(configPath) === expectedConfig, 'diagnostic_config_changed');
  const config = await loadConfig(configPath, { phase, stage: 'integration' });
  const component = config.components.find(item => item.id === 'harness');
  const binding = componentBinding(config, component);
  const prior = await readReceipt(priorPath);
  requireValue(prior.kind === 'execution' && ['FAIL', 'BLOCKED'].includes(prior.status)
    && compatibleBinding(prior.binding, binding) && prior.process.category === 'completed'
    && prior.process.cleanup.groupAbsent && !prior.process.cleanup.unknownDescendants,
    'exact_failed_component_not_reconciled');
  const priorRef = { path: priorPath, sha256: await hashFile(priorPath) };
  const command = config.seal.commands.find(item => item.componentId === 'harness');
  requireValue(prior.command.programSha256 === command.programSha256
    && prior.command.argvSha256 === digest(command.args), 'prior_literal_command_changed');
  const fixtureSources = [...config.selected, ...config.seal.scenarioSources]
    .filter(ref => /\/bauar-harness-(gate|runtime|peer|supervisor)\.mjs$/.test(ref.path));
  const observer = createHarnessDiagnosticObserver(fixtureSources);
  const attemptRoot = join(config.privateRoot, 'harness-diagnostic-' + randomUUID());
  const { env } = await privateEnvironment(config, component, attemptRoot,
    join(attemptRoot, 'binding.json'), join(attemptRoot, 'unused-component.json'));
  await writeNew(join(attemptRoot, 'binding.json'), binding);
  output = join(outputRoot, 'result.json');
  const started = await writeNew(join(outputRoot, 'started.json'), {
    schemaVersion: 1, kind: 'failed-harness-diagnostic-started', phase, binding,
    priorExecution: priorRef, attemptRoot, startedAt: new Date().toISOString(),
    command: { programSha256: command.programSha256, argvSha256: digest(command.args),
      argumentCount: command.args.length, cwd: command.cwd },
    diagnosticObserver: { path: join(dirname(fileURLToPath(import.meta.url)), 'harness-failure-diagnostic-observer-01.mjs'),
      sha256: await hashFile(join(dirname(fileURLToPath(import.meta.url)), 'harness-failure-diagnostic-observer-01.mjs')) },
    boundary: 'One authorized failed-component reproducer; no certification or automatic replay.'
  });
  const result = await runOwned({ program: command.program, args: command.args, cwd: command.cwd,
    env, budgetMs: component.budgetMs, outputPolicy: {
      observeLine: (stream, line) => observer.observeLine(stream, line),
      result: () => observer.result(),
      onStarted: async ({ pid, startedAt }) => writeNew(join(outputRoot, 'owned-process.json'),
        { schemaVersion: 1, pid, processGroupId: pid, startedAt, owned: true })
    } });
  let unchanged = true;
  try { await recheck(config); } catch { unchanged = false; }
  const clean = result.category === 'completed' && result.cleanup.groupAbsent && !result.cleanup.unknownDescendants;
  const status = !clean || !unchanged ? 'incomplete'
    : result.exitCode === 0 ? 'completed-not-adjudicated' : 'reproduced-failure';
  const ref = await writeNew(output, { schemaVersion: 1, kind: 'failed-harness-diagnostic', phase,
    status, binding, priorExecution: priorRef, started, attemptRoot, result, diagnostics: observer.snapshot(),
    fixtureSources, inputConfig: { path: configPath, sha256: expectedConfig }, inputsUnchanged: unchanged,
    evidenceBoundary: { failedComponentOnly: true, automaticRetry: false, certificationBatch: false,
      productSourceChanged: false, configChanged: false, sealChanged: false, canonicalMutated: false,
      rawOutputRetained: false, actualRuntimeInvoked: true, sideEffectsPossibleInOwnedFixture: true },
    coverage: { transport: 'Bossfang -> explicit private fixture supervisor -> packaged UAR',
      actualReceiverEnforcementRequired: true, directNativeTransportCertified: false,
      runtimeResponsesSynthesized: false, approvalOrEffectResultsSynthesized: false },
    endedAt: new Date().toISOString() });
  console.log(JSON.stringify({ status, receipt: ref }));
  return status === 'incomplete' ? 2 : result.exitCode === 0 ? 0 : 1;
}
try { process.exitCode = await main(); }
catch (error) {
  const safe = safeError(error);
  if (output) {
    try { await writeNew(output, { schemaVersion: 1, kind: 'failed-harness-diagnostic-unavailable',
      phase, status: 'incomplete', category: safe.category, exitCode: safe.exitCode }); } catch { /* Preserve existing immutable result. */ }
  }
  console.log(JSON.stringify(safe)); process.exitCode = safe.exitCode;
}

