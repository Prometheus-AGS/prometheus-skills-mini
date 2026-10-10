import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, verifyRef, hashFile, writeNew, requireValue, safeError, digest, within, validate }
  from '../../acceptance/lib/records.mjs';
import { loadConfig, recheck } from '../../acceptance/lib/inputs.mjs';
import { readReceipt, reviewStatus } from '../../acceptance/lib/receipts.mjs';
import { osVerify, osArchive } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/spec-backend.mjs';
import { hooksFire } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hooks.mjs';
import { runHookCommand } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hook-command.mjs';
import { stageHandoffWrite } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/stage-gate.mjs';
import { readReconcileState } from '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/lib/kbd/reconcile-state.mjs';

// Prepared orchestration only. Invocation is a real filesystem/canonical mutation.
const phase = 'phase-bauar-release-acceptance';
const base = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const project = '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture';
const node = '/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node';
const prom = '/Users/gqadonis/.local/bin/prometheus';
const orchestratorRoot = '/Users/gqadonis/.codex/skills/kbd-process-orchestrator';
const runner = join(orchestratorRoot, 'shared/openspec/cli.mjs');
const apply = '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/scripts/kbd-apply.mjs';
const handoffPath = join(base, 'handoffs/execute.handoff.json');
const taskPath = join(base, 'dispatch/tasks.json');
const changes = ['bauar-acc-01-private-packaged-desktop', 'bauar-acc-02-current-harness-regression',
  'bauar-acc-03-local-acceptance-evidence'];
const bindingKeys = ['configSha256', 'sourceSha256', 'packageSha256', 'profileSha256', 'runtimeSealSha256'];
const contracts = [fileURLToPath(import.meta.url), taskPath, node, prom, runner,
  join(orchestratorRoot, 'shared/openspec/lifecycle.mjs'), join(orchestratorRoot, 'shared/openspec/state.mjs'),
  join(orchestratorRoot, 'references/schemas/handoff.schema.json'), join(orchestratorRoot, 'hooks/hooks.json'),
  apply, '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/lib/kbd/reconcile-state.mjs',
  '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/lib/kbd/reconcile.mjs',
  ...['spec-backend.mjs', 'hooks.mjs', 'hook-command.mjs', 'stage-gate.mjs'].map(name => '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/' + name),
  ...['records.mjs', 'inputs.mjs', 'receipts.mjs'].map(name => join(base, 'acceptance/lib', name)),
  join(base, 'acceptance/receipt.schema.json'), join(base, 'acceptance/config.schema.json')];
let outputDirectory;
let config;
let requestRef;
let step = 0;
const outcomes = [];

function publicPath(path) {
  requireValue(typeof path === 'string' && !/(?:^|[/\\])private(?:$|[/\\])/.test(path),
    'private_body_not_selected');
  return path;
}
async function record(ref) {
  publicPath(ref.path); await verifyRef(ref); return readJson(ref.path);
}
async function save(name, value) {
  const ref = await writeNew(join(outputDirectory, name), value);
  outcomes.push(ref); return ref;
}
function execute(program, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(program, args, { cwd: project, encoding: 'utf8', shell: false,
    maxBuffer: 2 * 1024 * 1024, env: { ...process.env, KBD_ORCHESTRATOR_ROOT: orchestratorRoot } });
  return { result, observation: { program, args, startedAt, endedAt: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, errorPresent: Boolean(result.error),
    stdoutBytes: Buffer.byteLength(result.stdout ?? ''), stderrBytes: Buffer.byteLength(result.stderr ?? '') } };
}
function snapshot() {
  const view = readReconcileState(project, { program: prom });
  requireValue(view.authoritative && view.waypoint.activePhaseId === phase
    && view.waypoint.sourceRevision === view.state.revision, 'canonical_phase_or_projection_mismatch');
  const current = view.state.phases[phase];
  requireValue(current?.id === phase && current.status === 'in_progress', 'phase_not_in_execute_scope');
  return { revision: view.state.revision, current };
}
function completeTasks(current, assigned) {
  requireValue(digest(Object.keys(current.changes).sort()) === digest([...changes].sort()),
    'canonical_change_inventory_mismatch');
  for (const change of changes) {
    const row = current.changes[change];
    const ids = assigned[change].map(task => task.id).sort();
    requireValue(row.status === 'complete' && row.implementationStatus === 'complete'
      && digest(Object.keys(row.tasks).sort()) === digest(ids)
      && Object.values(row.tasks).every(task => task.status === 'complete'), 'canonical_tasks_incomplete');
  }
}
async function aggregate(ref, stage) {
  await record(ref);
  const value = await readReceipt(ref.path);
  requireValue(value.kind === 'aggregate' && value.stage === stage && value.status === 'PASS'
    && value.executionKey === config.executionKey && bindingKeys.every(key => value[key] === config.bindings[key])
    && value.components.length === 8 && value.observations.requiredComponents === 8
    && value.observations.observedComponents === 8 && value.observations.passedComponents === 8
    && value.observations.observedScenarios === 14, 'complete_bound_gate_required');
  return value;
}
async function main() {
  const args = process.argv.slice(2);
  requireValue(args.length === 5 && args[0] === '--run' && args[1] === '--inputs'
    && args[3] === '--inputs-sha256', 'explicit_root_invocation_required');
  requestRef = { path: args[2], sha256: args[4] };
  const request = await record(requestRef);
  requireValue(request.schemaVersion === 1 && request.phase === phase && Array.isArray(request.contracts)
    && typeof request.commandId === 'string' && /^[A-Za-z0-9._:/-]{1,159}$/.test(request.commandId)
    && Array.isArray(request.outputs) && request.outputs.length > 0
    && request.skipSpecsChange === changes[1] && request.skipSpecsReason === 'root-explicit-change02-exception',
    'closure_request_invalid');
  outputDirectory = publicPath(request.outputDirectory);
  requireValue(within(join(base, 'evidence/execute'), outputDirectory)
    && !existsSync(outputDirectory) && !existsSync(handoffPath), 'closure_output_or_handoff_exists');
  requireValue(contracts.every(path => request.contracts.filter(ref => ref.path === path).length === 1),
    'closure_contract_inventory_incomplete');
  for (const ref of request.contracts) { publicPath(ref.path); await verifyRef(ref); }
  const freshness = await record(request.managedFreshness);
  requireValue(freshness.operation === 'refresh' && freshness.project === project
    && freshness.status === 'refreshed' && freshness.latestVerified === true
    && Array.isArray(freshness.authoredPathsChanged) && freshness.authoredPathsChanged.length === 0
    && typeof freshness.version === 'string', 'managed_freshness_unavailable');
  await record(request.config);
  config = await loadConfig(request.config.path, { phase, stage: 'finalize' });
  requireValue(config.components.length === 8 && config.scenarios.length === 14, 'acceptance_scope_changed');
  const integration = await aggregate(request.integration, 'integration');
  const finalization = await aggregate(request.finalization, 'finalize');
  const componentSet = refs => refs.map(ref => ref.path + ':' + ref.sha256).sort();
  requireValue(digest(componentSet(integration.components)) === digest(componentSet(finalization.components))
    && finalization.observations.finalizationReadOnly === true
    && finalization.observations.runtimeInvoked === false, 'finalization_not_same_completed_runtime');
  const qa = await record(request.artifactQa);
  requireValue(qa.kind === 'standalone-produced-artifact-qa' && qa.phase === phase && qa.status === 'PASS'
    && qa.executionKey === config.executionKey && bindingKeys.every(key => qa[key] === config.bindings[key])
    && qa.executedCount > 0 && qa.checks.length === qa.executedCount
    && qa.checks.every(check => check.status === 'PASS') && qa.observations.mandatoryComponents === 8
    && qa.observations.requiredScenarioRows === 14
    && qa.inputs.some(ref => ref.path === request.integration.path && ref.sha256 === request.integration.sha256),
    'artifact_qa_incomplete_or_unbound');
  const format = await reviewStatus(config, config.finalization.formatReceiptPath, 'format');
  const review = await reviewStatus(config, config.finalization.reviewReceiptPath, 'review');
  requireValue(format.status === 'PASS' && review.status === 'PASS'
    && finalization.dispositions.formatting === format.disposition
    && finalization.dispositions.review === review.disposition, 'review_or_format_incomplete');
  for (const ref of request.outputs) { publicPath(ref.path); await verifyRef(ref); }
  const assigned = await readJson(taskPath);
  const before = snapshot();
  completeTasks(before.current, assigned);
  requireValue(before.current.stages.execute?.status === 'in_progress'
    && (!before.current.stages.reflect || before.current.stages.reflect.status === 'pending'), 'execute_boundary_already_advanced');
  const optionalConfigs = [join(orchestratorRoot, 'hooks/user.json'),
    join(project, '.kbd-orchestrator/hooks-config.json')];
  requireValue(optionalConfigs.every(path => !existsSync(path)), 'hook_policy_changed_since_preparation');
  // Current installed policy is two optional legacy shell hooks. Refuse policy drift before any write.
  const hookPolicy = await readJson(join(orchestratorRoot, 'hooks/hooks.json'));
  const selectedHooks = hookPolicy.hooks.filter(entry => entry.enabled !== false
    && ['execute:after', 'execute:*', '*:after', '*:*'].includes(entry.event));
  requireValue(selectedHooks.length === 2 && selectedHooks.every(entry =>
    ['report-progress', 'kbd-memory-log'].includes(entry.id) && entry.action.on_failure === 'ignore'),
    'execute_after_policy_changed');
  await recheck(config);
  await save('started.json', { schemaVersion: 1, kind: 'execute-closure-started', phase,
    startedAt: new Date().toISOString(), request: requestRef, commandId: request.commandId,
    canonicalRevision: before.revision, scope: 'execute-only-no-reflect',
    limitations: ['Local unsigned darwin-arm64 only; remote/platform/signing/publication remain unclaimed.',
      'Fixture supervisor coverage does not certify native direct Bossfang-to-UAR transport.',
      'Restart unsupported/unknown requires reconciliation; no recovery or replay certification.'] });
  for (const change of changes) {
    const active = join(project, 'openspec/changes', change);
    requireValue(existsSync(active), 'active_change_missing_no_automatic_archive_replay');
  }
  const managed = (_name, inputArgs) => {
    const exact = [...inputArgs];
    if (exact[0] === 'validate') exact.push('--strict');
    if (exact[0] === 'archive' && exact[1] === changes[1]) exact.push('--skip-specs');
    const ran = execute(node, [runner, 'run', '--project', project, '--', ...exact]);
    let observed;
    for (const line of String(ran.result.stderr ?? '').split(/\r?\n/).reverse()) {
      try { const candidate = JSON.parse(line); if (candidate.operation === 'run') { observed = candidate; break; } }
      catch { /* Raw diagnostics are deliberately not persisted. */ }
    }
    ran.observation.managed = observed ? { operation: observed.operation, status: observed.status,
      code: observed.code, cliExitCode: observed.cliExitCode, version: observed.version,
      latestVerified: observed.latestVerified, policy: observed.policy, receipt: observed.receipt } : null;
    managed.last = ran;
    // The backend adapter cannot await a callback; the caller commits each actual result immediately.
    return ran.result;
  };
  for (const change of changes) {
    const ok = osVerify(project, change, { spawn: managed });
    await save('operation-' + (++step) + '.json', { schemaVersion: 1, kind: 'backend-verify', phase,
      change, ...managed.last.observation });
    requireValue(ok && managed.last.observation.managed?.version === freshness.version
      && managed.last.observation.managed?.status === 'completed'
      && managed.last.result.signal === null && !managed.last.result.error, 'backend_verify_failed', 1);
  }
  for (const change of changes) {
    let ok = true;
    try { osArchive(project, change, { spawn: managed }); } catch { ok = false; }
    const archiveRoot = join(project, 'openspec/changes/archive');
    const matches = existsSync(archiveRoot) ? readdirSync(archiveRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.endsWith('-' + change))
      .map(entry => join(archiveRoot, entry.name)) : [];
    await save('operation-' + (++step) + '.json', { schemaVersion: 1, kind: 'backend-archive', phase,
      change, ...managed.last.observation, archiveMatches: matches,
      skipSpecs: change === changes[1], skipSpecsReason: change === changes[1] ? request.skipSpecsReason : null });
    requireValue(ok && managed.last.observation.managed?.status === 'completed'
      && managed.last.observation.managed?.version === freshness.version && matches.length === 1
      && !existsSync(join(project, 'openspec/changes', change))
      && managed.last.result.signal === null && !managed.last.result.error, 'backend_archive_failed_or_ambiguous', 1);
  }
  const scan = execute(node, [apply, 'reconcile', phase, '--json']);
  let report;
  try { report = JSON.parse(scan.result.stdout); } catch { /* Incomplete scan is not clean. */ }
  await save('reconcile.json', { schemaVersion: 1, kind: 'read-only-reconcile', phase, ...scan.observation,
    report: report ? { phase: report.phase, clean: report.clean, drifted: report.drifted,
      drift: (report.drift ?? []).map(row => ({ change: row.change, task: row.task, kind: row.kind })),
      errors: (report.errors ?? []).map(row => ({ kind: row.kind, change: row.change })) } : null });
  requireValue(scan.result.status === 0 && !scan.result.error && scan.result.signal === null
    && report?.phase === phase && report.clean === true && report.drifted === 0
    && Array.isArray(report.drift) && report.drift.length === 0
    && Array.isArray(report.errors) && report.errors.length === 0, 'archived_reconciliation_incomplete', 1);
  completeTasks(snapshot().current, assigned);
  const transition = execute(prom, ['kbd', '--path', project, 'stage', 'transition',
    '--command-id', request.commandId, '--phase', phase, '--id', 'execute', '--status', 'complete']);
  await save('stage-transition.json', { schemaVersion: 1, kind: 'typed-execute-transition',
    phase, ...transition.observation });
  requireValue(transition.result.status === 0 && !transition.result.error
    && transition.result.signal === null, 'execute_transition_failed', 1);
  const after = snapshot();
  completeTasks(after.current, assigned);
  requireValue(after.current.stages.execute?.status === 'complete'
    && (!after.current.stages.reflect || after.current.stages.reflect.status === 'pending'), 'execute_completion_not_observed');
  await save('canonical-after.json', { schemaVersion: 1, kind: 'canonical-execute-complete',
    phase, revision: after.revision, stage: after.current.stages.execute,
    changes: Object.values(after.current.changes).map(change => ({ id: change.id, status: change.status,
      implementationStatus: change.implementationStatus, tasks: Object.values(change.tasks).map(task =>
        ({ id: task.id, status: task.status })) })), reflectEntered: false });
  const hooks = [];
  let hookFailed = false;
  try {
    await hooksFire('execute', 'after', phase, 1, 1, { orchestratorRoot, cwd: project,
      phasePath: phase, sourceTool: 'kbd-execute', runCommand: async (command, env, context) => {
        const actual = await runHookCommand(command, env, context);
        const unsupported = String(actual.stderr ?? '').startsWith('hook command requires shell semantics and was not run:');
        hooks.push({ exitCode: actual.status, executed: !unsupported,
          category: unsupported ? 'unsupported-shell-not-executed' : actual.status === 0 ? 'completed' : 'hook-failed' });
        return { status: actual.status, stdout: '', stderr: actual.status ? 'hook_failed' : '' };
      } });
  } catch { hookFailed = true; }
  await save('execute-after.json', { schemaVersion: 1, kind: 'actual-execute-after-dispatch',
    phase, hooks, requiredHookFailure: hookFailed, optionalUnsupportedEffectsNotClaimed: true });
  requireValue(!hookFailed && hooks.length === 2, 'required_hook_failed_or_dispatch_incomplete', 1);
  const progress = await readJson(join(base, 'progress.json'));
  requireValue(progress.sourceRevision === after.revision && progress.derivedRevision === after.revision
    && progress.completion.implementation.completed === 3 && progress.completion.implementation.total === 3,
    'phase_projection_completion_incomplete');
  const boundary = await save('completed-boundary.json', { schemaVersion: 1, kind: 'execute-completed-boundary', phase,
    status: 'PASS', endedAt: new Date().toISOString(), request: requestRef, ...config.bindings,
    canonicalRevision: after.revision, implementationCompleted: 3, implementationTotal: 3,
    reviewDisposition: review.disposition, artifacts: [...outcomes], reflectEntered: false });
  requireValue(!existsSync(handoffPath), 'existing_handoff_preserved');
  const outputs = [join(base, 'execution.md'), join(base, 'progress.json'), ...request.outputs.map(ref => ref.path),
    request.integration.path, request.finalization.path, request.artifactQa.path, boundary.path, ...outcomes.map(ref => ref.path)]
    .map(path => relative(base, path));
  stageHandoffWrite('execute', 'Execute complete: all eleven canonical tasks and three changes complete; selected local integration, artifact QA, formatting and review disposition recorded. Managed verification/archive and read-only reconciliation completed; optional legacy shell hook effects were not executed. Stop before Reflect; local unsigned, fixture transport and unsupported restart limitations remain.', outputs,
    { cwd: project, phaseDir: base });
  validate(await readJson(handoffPath), await readJson(join(orchestratorRoot, 'references/schemas/handoff.schema.json')));
  const handoff = { path: handoffPath, sha256: await hashFile(handoffPath) };
  const closure = await save('closure.json', { schemaVersion: 1, kind: 'execute-closure', phase,
    status: 'PASS', endedAt: new Date().toISOString(), request: requestRef, ...config.bindings,
    boundary, handoff, canonicalRevision: after.revision, reflectEntered: false });
  console.log(JSON.stringify({ status: 'PASS', phase, receipt: closure,
    handoff,
    signal: 'Completed kbd-execute — ' + phase + ' (step 3 of 3)', reflectEntered: false }));
  return 0;
}
try { process.exitCode = await main(); }
catch (error) {
  const safe = safeError(error);
  if (outputDirectory && existsSync(join(outputDirectory, 'started.json'))) {
    try { await save('failure.json', { schemaVersion: 1, kind: 'execute-closure-failure', phase,
      category: safe.category, exitCode: safe.exitCode, artifacts: [...outcomes],
      request: requestRef, automaticRetryPermitted: false, completedHandoffClaimed: false }); } catch { /* Preserve first receipt. */ }
  }
  console.log(JSON.stringify(safe)); process.exitCode = safe.exitCode;
}

