// Complete HARNESS acceptance orchestration. Requires already built binaries;
// never builds, installs, starts a daemon, uses D0, or treats a skip as success.
// Usage: node bauar-harness-gate.mjs <api-host-test-bin> <kernel-test-bin> <uar-bin> <uar-source>
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { isDeepStrictEqual } from 'node:util';
import { startPeer, startFaultProxy } from './bauar-harness-peer.mjs';
import { nativeCompatibilityGate } from './bauar-harness-native.mjs';
import { providerFixture, secret, until, expected, request, launch, alive, stop, childStatus, instanceId } from './bauar-harness-runtime.mjs';

const [hostBinary, kernelBinary, uarBinary, uarSource] = process.argv.slice(2).map(value => resolve(value));
assert.ok(hostBinary && kernelBinary && uarBinary && uarSource, 'Four explicit binary/source paths required');
for (const binary of [hostBinary, kernelBinary, uarBinary]) await access(binary);
assert.equal(process.versions.node.split('.')[0], '24', 'Use the accepted Node 24 runtime');
const root = await mkdtemp(join(tmpdir(), 'bauar-harness-'));
const owner = secret(), other = secret(), master = secret(), modelCredential = secret();
const mcpCredential = `Bearer ${secret()}`;
const completed = [];
let peer, proxy, provider, host, kernelChild, base, selection;
let stage = 'setup', cancellationSurface = null, cancellationStep = null;
const hostRoot = join(root, 'boss');
const configPath = join(hostRoot, 'config.json');
const hash = value => `$sha256$${createHash('sha256').update(value).digest('hex')}`;
const auth = { token: owner };
const view = body => body.delegation ?? body;
const endpoint = task => `/api/uar/delegations/${task}`;
const admissions = () => proxy.observations.filter(item => item.method === 'POST' && item.path.endsWith('/full-harness/v1/tasks')).length;
const effects = label => peer.effects.filter(item => item === label).length;
function passed(name) {
  assert.ok(!completed.includes(name)); completed.push(name);
  // Names are the fixed scenario literals below, never request/provider data.
  console.error(JSON.stringify({ harnessCompletedCase: name, completedCaseCount: completed.length }));
}

async function hostStart() {
  await rm(join(hostRoot, 'ready.json'), { force: true });
  await rm(join(hostRoot, 'stop'), { force: true });
  host = launch(hostBinary, ['--exact', 'bauar_private_host', '--nocapture'], hostRoot, {
    // Direct libtest launch must retain .cargo/config.toml's debug agent-loop
    // stack floor; privateEnv intentionally drops the parent environment.
    RUST_MIN_STACK: '16777216',
    BAUAR_HOST_ROOT: hostRoot, BAUAR_HOST_CONFIG: configPath,
    BAUAR_UAR_BEARER: provider.token, BAUAR_MODEL_KEY: modelCredential,
  }, { classifyStderr: true });
  const ready = await until('real private BossFang router', async () => {
    alive(host);
    try { return JSON.parse(await readFile(join(hostRoot, 'ready.json'), 'utf8')); }
    catch { return false; }
  });
  assert.equal(ready.router, 'production');
  assert.equal(ready.backgroundSweep, false);
  base = ready.base;
}
async function hostCommand(operation) {
  const id = randomUUID(), commands = join(hostRoot, 'commands');
  const temporary = join(commands, `${id}.tmp`);
  await writeFile(temporary, JSON.stringify(operation), { mode: 0o600 });
  await rename(temporary, join(commands, `${id}.request`));
  return until('real private storage checkpoint', async () => {
    alive(host);
    try { return JSON.parse(await readFile(join(commands, `${id}.response`), 'utf8')); }
    catch { return false; }
  });
}
async function job(label, agent) {
  const row = await expected(base, '/api/tasks', { ...auth, method: 'POST',
    body: { title: label, description: 'Perform the bound safe fixture effect once.', assigned_to: agent } }, [201]);
  assert.ok(row.id);
  return row.id;
}
async function admit(jobId, streaming = false, override = {}) {
  try {
    return view(await expected(base, `/api/uar/jobs/${jobId}/admission`, {
      ...auth, method: 'POST', body: { ...selection, streaming, ...override } }, [202]));
  } catch (error) {
    // Preserve the first refusal; reading the private snapshot does not retry it.
    if (error instanceof assert.AssertionError) {
      const binding = await hostCommand({ operation: 'read_binding_status' });
      console.error(JSON.stringify({ bindingCheckpoint: binding }));
    }
    throw error;
  }
}
async function current(task) { return view(await expected(base, endpoint(task), auth, [200, 202])); }
async function approval(task) {
  let after = 0;
  return until('actual provider exact approval event', async () => {
    const observed = await expected(base, `${endpoint(task)}/events?after=${after}`, auth);
    const event = observed.events.find(item => item.parts?.some(part => part.type === 'approval_required'));
    for (const item of observed.events) after = Math.max(after, item.eventId);
    if (event) {
      const part = event.parts.find(part => part.type === 'approval_required');
      assert.ok(part.approval_id);
      return { id: part.approval_id, cursor: event.eventId, projection: observed.delegation };
    }
    assert.ok(!observed.delegation.terminalAt, 'Provider ended before required approval');
    return false;
  });
}
async function decide(task, id, approved, statuses = [200], revision) {
  const snapshot = await current(task);
  return view(await expected(base, `${endpoint(task)}/approve`, { ...auth, method: 'POST',
    body: { approvalId: id, expectedRevision: revision ?? snapshot.revision, approved } }, statuses));
}
async function terminal(task, expectedState) {
  return until('actual terminal provider outcome', async () => {
    const observed = await expected(base, `${endpoint(task)}/events?after=0`, auth);
    const projection = observed.delegation;
    if (!projection.terminalAt) return false;
    assert.equal(projection.executionState, expectedState);
    const receipt = await expected(provider.base,
      `/api/uar/full-harness/v1/tasks/${projection.uarTaskId}`, provider.auth);
    assert.ok(receipt.task_id === projection.uarTaskId && receipt.run_id === projection.uarRunId
      && receipt.runtime_epoch === projection.runtimeEpoch, 'Terminal receipt must retain original correlation');
    assert.ok(receipt.terminal_at && Number.isSafeInteger(receipt.cursor), 'Actual terminal provider cursor required');
    if (projection.cursor < receipt.cursor) return false;
    assert.equal(projection.cursor, receipt.cursor, 'All original terminal events must be applied');
    return projection;
  });
}
async function board(jobId) { return expected(base, `/api/tasks/${jobId}`, auth); }
async function privateA2a(task) {
  const result = await expected(base, '/a2a', { ...auth, method: 'POST',
    body: { jsonrpc: '2.0', id: 'bauar-get', method: 'tasks/get', params: { id: task } } });
  assert.ok(result.result && !result.error, 'Actual private A2A task must be available to its owner');
  return result.result;
}

try {
  peer = await startPeer({ effectFile: join(root, 'effects.jsonl'), mcpCredential, modelCredential });
  proxy = await startFaultProxy();
  provider = await providerFixture({ root, binary: uarBinary, source: uarSource, peer, proxy, mcpCredential, modelCredential });
  await provider.start();
  selection = await provider.seed();
  await mkdir(hostRoot, { recursive: true });
  const config = { home_dir: join(hostRoot, 'home'), data_dir: join(hostRoot, 'data'), api_key: hash(master),
    task_board: { assignee_wake: false },
    users: [{ name: 'bauar-owner', role: 'owner', api_key_hash: hash(owner) },
      { name: 'bauar-other', role: 'owner', api_key_hash: hash(other) }],
    default_model: { provider: 'openai', model: 'gpt-5.4-mini', api_key_env: 'BAUAR_MODEL_KEY', base_url: `${peer.base}/v1` },
    uar: { enabled: true, selected_instance_id: instanceId, instances: [{ id: instanceId, ownership: 'external',
      endpoints: provider.endpoints, workspace_locality: 'local', profile: 'uar.service-instance/1',
      credential_ref: 'env://BAUAR_UAR_BEARER', required_capabilities: ['full_harness_delegation_v1'] }] } };
  await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
  await hostStart();
  const manifest = `name = "bauar-assignee"\nmodule = "builtin:chat"\n[model]\nprovider = "openai"\nmodel = "gpt-5.4-mini"\napi_key_env = "BAUAR_MODEL_KEY"\nbase_url = ${JSON.stringify(`${peer.base}/v1`)}\nsystem_prompt = "Execute the fixture request."\n`;
  const agent = (await expected(base, '/api/agents', { ...auth, method: 'POST', body: { manifest_toml: manifest } }, [201])).agent_id;
  assert.ok(agent, 'Actual stored assigned agent required');
  const unauthJob = await job('BAUAR_AUTH', agent);
  for (const token of [undefined, master]) {
    await expected(base, `/api/uar/jobs/${unauthJob}/admission`, { token, method: 'POST', body: selection }, [401, 403]);
  }
  for (const requirement of [{ requiresSteer: true }, { requiresDurableRestartRecovery: true },
    { authority: 'delegated_user' }, { configurationPolicy: 'native_agent' }]) {
    await expected(base, `/api/uar/jobs/${unauthJob}/admission`, { ...auth, method: 'POST', body: { ...selection, ...requirement } }, [422]);
  }
  assert.equal(admissions(), 0);
  await expected(base, `/api/tasks/${unauthJob}`, { ...auth, method: 'DELETE' }, [204]);
  passed('registered-owner-and-explicit-unsupported');

  for (const streaming of [false, true]) {
    stage = streaming ? 'streaming_selected' : 'normal_selected';
    const label = streaming ? 'BAUAR_STREAM' : 'BAUAR_NORMAL';
    const id = await job(label, agent), before = admissions();
    const run = await admit(id, streaming), task = run.bossTaskId;
    if (!(task && run.uarTaskId && run.uarRunId)) {
      const known = (value, allowed) => allowed.includes(value) ? value : null;
      const present = value => typeof value === 'string' && value.length > 0;
      console.error(JSON.stringify({ admissionCheckpoint: {
        bossTaskIdPresent: present(task), uarTaskIdPresent: present(run.uarTaskId),
        uarRunIdPresent: present(run.uarRunId), runtimeEpochPresent: present(run.runtimeEpoch),
        admissionState: known(run.admissionState, ['pending', 'admitted', 'refused', 'unresolved']),
        executionState: known(run.executionState, ['pending', 'submitted', 'reserved', 'running', 'completed', 'failed', 'cancelled', 'rejected']),
        recoveryState: known(run.recoveryState, ['available', 'outcome_unknown', 'recovery_unsupported', 'expired']),
        diagnostics: (run.remoteDiagnostics ?? []).map(item => known(item.code,
          ['uar_runtime_epoch_lost', 'uar_attempt_outcome_unknown', 'uar_retention_expired'])),
        providerAdmissionStatuses: proxy.observations.filter(item => item.method === 'POST'
          && item.path.endsWith('/full-harness/v1/tasks')).map(item => item.status ?? null),
        providerAdmissionRefusalCodes: proxy.observations.filter(item => item.method === 'POST'
          && item.path.endsWith('/full-harness/v1/tasks')).map(item => item.refusalCode ?? null),
      } }));
    }
    assert.ok(task && run.uarTaskId && run.uarRunId);
    const pending = await approval(task);
    assert.equal(effects(label), 0, 'No effect before exact approval');
    const beforeRefusal = await current(task), revision = beforeRefusal.revision;
    await decide(task, 'wrong-exact-id', true, [409], revision);
    assert.ok(isDeepStrictEqual(await current(task), beforeRefusal), 'Wrong approval ID must leave the original projection unchanged');
    await decide(task, pending.id, true, [409], Math.max(0, revision - 1));
    assert.ok(isDeepStrictEqual(await current(task), beforeRefusal), 'Stale approval revision must leave the original projection unchanged');
    await expected(base, `${endpoint(task)}/approve`, { ...auth, method: 'POST', body: { approved: true } }, [422]);
    assert.ok(isDeepStrictEqual(await current(task), beforeRefusal), 'Missing approval ID must leave the original projection unchanged');
    await expected(base, endpoint(task), { token: other }, [404]);
    const replay = await admit(id, !streaming);
    assert.equal(replay.uarTaskId, run.uarTaskId);
    assert.equal(admissions(), before + 1, 'Replay cannot create another provider attempt');
    await decide(task, pending.id, true);
    const done = await terminal(task, 'completed');
    assert.equal(done.uarRunId, run.uarRunId);
    assert.equal(effects(label), 1);
    const beforeDuplicate = await current(task);
    await decide(task, pending.id, true, [409]);
    assert.equal(effects(label), 1, 'Duplicate exact approval cannot execute again');
    assert.ok(isDeepStrictEqual(await current(task), beforeDuplicate), 'Duplicate approval must leave the original terminal projection unchanged');
    const snapshot = await expected(base, `${endpoint(task)}/events?after=0`, auth);
    assert.equal(snapshot.delegation.cursor, done.cursor);
    // A2A lookup explicitly reconciles the board. Expose the crash window first.
    assert.notEqual((await board(id)).status, 'completed');
    if (streaming) {
      await stop(host, 'SIGKILL'); await hostStart();
      assert.notEqual((await board(id)).status, 'completed');
    }
    const originalObservations = () => proxy.observations.filter(item => item.path.startsWith(`/api/uar/full-harness/v1/tasks/${run.uarTaskId}`)).length;
    const beforeRetainedRead = originalObservations();
    const retained = await privateA2a(task);
    assert.equal(retained.recoveryState, snapshot.delegation.recoveryState, 'Fully committed terminal history must retain recovery state');
    assert.ok(isDeepStrictEqual(retained.history, snapshot.events), 'Committed history must survive original-run lookup and restart');
    const rest = await expected(base, `/a2a/tasks/${task}`, auth);
    const viewFields = ['id', 'status', 'harness', 'job', 'originalOwner', 'workspaceId',
      'admissionId', 'runtimeEpoch', 'uarTaskId', 'runId', 'definition', 'revision', 'cursor',
      'executionState', 'effectState', 'recoveryState', 'cancellationState', 'cancellation',
      'history', 'historicalTextAvailable', 'historyIsExecutable', 'usage'];
    const differingFields = viewFields.filter(field => !isDeepStrictEqual(rest[field], retained[field]));
    assert.ok(isDeepStrictEqual(rest, retained), `REST/RPC parity mismatch fields: ${differingFields.join(',')}`);
    assert.equal(retained.job.jobId, id);
    assert.equal(retained.job.attempt, 1);
    assert.ok(retained.originalOwner.startsWith('user:'));
    assert.equal(retained.runtimeEpoch, run.runtimeEpoch);
    assert.equal(retained.historyIsExecutable, false);
    assert.equal(retained.runId, run.uarRunId);
    assert.equal(retained.usage.source, 'uar_observed');
    const usageEvent = retained.history.find(event => event.eventId === retained.usage.eventId);
    const usagePart = usageEvent.parts.find(part => part.type === 'usage');
    assert.ok(usagePart, 'Usage must reference an actual retained provider event');
    for (const [key, wire] of [['inputTokens', 'input_tokens'], ['outputTokens', 'output_tokens'], ['totalTokens', 'total_tokens']]) {
      assert.equal(retained.usage[key], usagePart[wire]);
      assert.ok(retained.usage[key] > 0, 'Controlled model emits actual nonzero token counts');
    }
    assert.equal(JSON.stringify(retained.usage).includes('cost'), false);
    assert.ok(isDeepStrictEqual((await privateA2a(task)).usage, retained.usage), 'Retained provider usage must remain stable');
    const latestRetained = await privateA2a(task);
    assert.ok(isDeepStrictEqual(latestRetained.history, retained.history), 'Retained provider history must remain stable');
    const reconciliation = await hostCommand({ operation: 'reconcile' });
    const committed = await board(id);
    const fixed = (value, allowed) => allowed.includes(value) ? value : null;
    const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
    console.error(JSON.stringify({ boardReconciliationCheckpoint: {
      streaming, completedCaseCount: completed.length,
      retainedAfterA2a: {
        executionState: fixed(latestRetained.executionState, ['submitted', 'working', 'running', 'approval_required', 'approval-required', 'input_required', 'completed', 'failed', 'rejected', 'cancelled']),
        effectState: fixed(latestRetained.effectState, ['not_dispatched', 'effect_unconfirmed']),
        recoveryState: fixed(latestRetained.recoveryState, ['available', 'outcome_unknown', 'reconciliation_required', 'recovery_unsupported', 'expired']),
        appliedCursor: count(latestRetained.cursor), attemptRevision: count(latestRetained.revision),
        attempt: count(latestRetained.job?.attempt),
      },
      observedAtDrain: {
        admissionState: fixed(snapshot.delegation.admissionState, ['admitted', 'unresolved', 'refused']),
        terminalPresent: Boolean(snapshot.delegation.terminalAt),
        appliedCursor: count(snapshot.delegation.cursor), attemptRevision: count(snapshot.delegation.revision),
      },
      reconciliationCommandSucceeded: reconciliation.reconciled === true,
      boardCompleted: committed.status === 'completed',
    } }));
    assert.equal(committed.status, 'completed');
    await hostCommand({ operation: 'reconcile' });
    assert.ok(isDeepStrictEqual(await board(id), committed), 'Outcome reconciliation must be idempotent');
    assert.equal(admissions(), before + 1);
    assert.equal(originalObservations(), beforeRetainedRead, 'Sealed terminal presentation must not reopen the provider');
    if (streaming) {
      console.error(JSON.stringify({ harnessStage: 'incomplete_terminal_start' }));
      const partialId = await job('BAUAR_PARTIAL_TERMINAL', agent), beforePartial = admissions();
      const partialRun = await admit(partialId, true), partialTask = partialRun.bossTaskId;
      await decide(partialTask, (await approval(partialTask)).id, true);
      console.error(JSON.stringify({ harnessStage: 'incomplete_terminal_approved' }));
      const providerTerminal = await until('actual terminal receipt before unread event application', async () => {
        const receipt = await expected(provider.base, `/api/uar/full-harness/v1/tasks/${partialRun.uarTaskId}`, provider.auth);
        return receipt.terminal_at ? receipt : false;
      });
      const partialReceipt = await current(partialTask);
      assert.ok(partialReceipt.terminalAt && partialReceipt.cursor < providerTerminal.cursor, 'Terminal receipt alone must not prove fully applied history');
      console.error(JSON.stringify({ harnessStage: 'incomplete_terminal_before_restart' }));
      await stop(host, 'SIGKILL'); await hostStart();
      console.error(JSON.stringify({ harnessStage: 'incomplete_terminal_after_restart' }));
      const incomplete = await privateA2a(partialTask);
      assert.equal(incomplete.recoveryState, 'reconciliation_required', 'Unread terminal history cannot recover its lost private dictionary');
      await hostCommand({ operation: 'reconcile' });
      assert.equal((await board(partialId)).status, 'in_progress');
      assert.equal(effects('BAUAR_PARTIAL_TERMINAL'), 1);
      assert.equal(admissions(), beforePartial + 1, 'Incomplete retained history cannot readmit execution');
      console.error(JSON.stringify({ harnessStage: 'incomplete_terminal_finished' }));
    }
    passed(streaming ? 'streaming-and-outcome-commit-crash' : 'normal-exact-approval-and-reconciliation');
  }

  stage = 'denial';
  const deniedId = await job('BAUAR_DENIED', agent), denied = await admit(deniedId);
  await decide(denied.bossTaskId, (await approval(denied.bossTaskId)).id, false);
  // Denial may produce a final explanatory model response; it never authorizes the tool.
  await until('denied run settles', async () => {
    const observed = await expected(base, `${endpoint(denied.bossTaskId)}/events?after=0`, auth);
    return Boolean(observed.delegation.terminalAt);
  });
  assert.equal(effects('BAUAR_DENIED'), 0);
  passed('exact-denial-no-effect');

  for (const surface of ['direct', 'rest', 'rpc']) {
    stage = 'cancellation'; cancellationSurface = surface; cancellationStep = 'admission';
    const label = `BAUAR_CANCEL_${surface.toUpperCase()}`;
    const cancelId = await job(label, agent), cancelled = await admit(cancelId, true);
    cancellationStep = 'approval_observation';
    await approval(cancelled.bossTaskId);
    cancellationStep = 'revision_lookup';
    const revision = (await current(cancelled.bossTaskId)).revision;
    const path = surface === 'direct' ? `${endpoint(cancelled.bossTaskId)}/cancel`
      : surface === 'rest' ? `/a2a/tasks/${cancelled.bossTaskId}/cancel` : '/a2a';
    for (const supplied of [undefined, revision - 1, revision]) {
      cancellationStep = supplied === undefined ? 'missing_revision' : supplied === revision ? 'exact_revision' : 'stale_revision';
      const fields = supplied === undefined ? {} : { expectedRevision: supplied };
      const body = surface === 'rpc' ? { jsonrpc: '2.0', id: 'cancel', method: 'tasks/cancel',
        params: { id: cancelled.bossTaskId, ...fields } } : fields;
      const result = await request(base, path, { ...auth, method: 'POST', body });
      if (supplied !== revision) {
        if (surface === 'rpc') assert.ok(result.body.error);
        else assert.ok([400, 409].includes(result.status));
        assert.equal(effects(label), 0);
      } else {
        assert.ok([200, 202].includes(result.status));
        if (surface === 'rpc') assert.ok(result.body.result && !result.body.error);
      }
    }
    cancellationStep = 'terminal_observation';
    const cancellation = await terminal(cancelled.bossTaskId, 'cancelled');
    assert.equal(cancellation.cancellation.requested, true);
    assert.equal(cancellation.cancellation.terminal, true);
    assert.equal(effects(label), 0);
  }
  passed('three-surface-cancellation-exact-caller-revision');
  stage = 'lost_responses'; cancellationSurface = null; cancellationStep = null;

  const lostId = await job('BAUAR_LOST', agent), beforeLost = admissions();
  const lostFault = proxy.loseNext('POST', /\/full-harness\/v1\/tasks$/);
  const lost = await admit(lostId);
  assert.equal(lostFault.observed, true);
  assert.equal(lost.effectState, 'effect_unconfirmed');
  const resolved = await admit(lostId);
  assert.ok(resolved.uarTaskId);
  const pendingLost = await approval(resolved.bossTaskId);
  const approvalFault = proxy.loseNext('POST', /\/tasks\/[^/]+\/tool-approval$/);
  const uncertain = await decide(resolved.bossTaskId, pendingLost.id, true, [202]);
  assert.equal(approvalFault.observed, true);
  assert.equal(uncertain.effectState, 'effect_unconfirmed');
  await terminal(resolved.bossTaskId, 'completed');
  assert.equal(effects('BAUAR_LOST'), 1);
  assert.equal(admissions(), beforeLost + 1);
  passed('lost-admission-and-decision-response-no-reenactment');

  stage = 'reconnect';
  const reconnectId = await job('BAUAR_RECONNECT', agent), reconnect = await admit(reconnectId, true);
  const waiting = await approval(reconnect.bossTaskId), beforeReconnect = admissions();
  // Drain any already emitted provider frames, then interrupt a real open stream.
  let observation;
  await until('active provider stream for transport interruption', async () => {
    observation ??= request(base, `${endpoint(reconnect.bossTaskId)}/events?after=${waiting.cursor}`, auth)
      .then(value => { observation = undefined; return value; }, () => { observation = undefined; });
    return proxy.activeStreams > 0;
  });
  proxy.disconnectStreams();
  await observation;
  assert.equal(effects('BAUAR_RECONNECT'), 0);
  const retainedReconnect = await privateA2a(reconnect.bossTaskId);
  assert.equal(retainedReconnect.runId, reconnect.uarRunId);
  await decide(reconnect.bossTaskId, waiting.id, true);
  await terminal(reconnect.bossTaskId, 'completed');
  assert.equal(effects('BAUAR_RECONNECT'), 1);
  assert.equal(admissions(), beforeReconnect);
  passed('observation-reconnect-original-run');

  stage = 'capture_crash';
  const captureId = await job('BAUAR_CAPTURE_CRASH', agent), beforeCapture = admissions();
  const captureFault = proxy.loseNext('POST', /\/full-harness\/v1\/tasks$/, true);
  const capturing = admit(captureId).catch(() => undefined);
  await until('actual admission accepted before host capture crash', () => captureFault.observed);
  await stop(host, 'SIGKILL');
  captureFault.release();
  await capturing;
  await hostStart();
  const captureUnknown = await admit(captureId);
  assert.ok(['outcome_unknown', 'recovery_unsupported', 'reconciliation_required'].includes(captureUnknown.recoveryState));
  assert.equal(admissions(), beforeCapture + 1);
  assert.equal(effects('BAUAR_CAPTURE_CRASH'), 0);
  passed('provider-admission-before-host-capture-crash');

  stage = 'intent_crash';
  const intentId = await job('BAUAR_INTENT_CRASH', agent), beforeIntent = admissions();
  assert.equal((await hostCommand({ operation: 'claim_intent', job_id: intentId })).checkpoint, 'selected_intent_committed');
  await stop(host, 'SIGKILL'); await hostStart();
  const interrupted = await expected(base, `/api/uar/jobs/${intentId}/admission`, { ...auth, method: 'POST', body: selection }, [503]);
  assert.ok(JSON.stringify(interrupted).includes('selected_attempt_outcome_unknown'));
  assert.equal((await hostCommand({ operation: 'read_intent', job_id: intentId })).kind, 'selected');
  assert.equal(admissions(), beforeIntent);
  assert.equal(effects('BAUAR_INTENT_CRASH'), 0);
  passed('durable-intent-crash-before-a2a');

  stage = 'native_compatibility';
  await nativeCompatibilityGate({ stopHost: () => stop(host), getHostStatus: () => childStatus(host), hostStart, config, configPath,
    admissions, job, agent, peer, hostCommand, getBase: () => base, auth, selection, effects,
    proxy, admit, approval, board, decide, terminal, passed });

  stage = 'runtime_epoch';
  const epochId = await job('BAUAR_EPOCH', agent), epoch = await admit(epochId);
  await approval(epoch.bossTaskId);
  const beforeEpoch = admissions();
  await provider.restart();
  const changed = await current(epoch.bossTaskId);
  assert.ok(['recovery_unsupported', 'reconciliation_required', 'outcome_unknown'].includes(changed.recoveryState));
  assert.notEqual(changed.executionState, 'completed');
  const epochReplay = await admit(epochId);
  assert.equal(epochReplay.uarTaskId, epoch.uarTaskId);
  assert.equal(admissions(), beforeEpoch);
  assert.equal(effects('BAUAR_EPOCH'), 0);
  passed('provider-epoch-restart-remains-unknown');

  // The independent real-kernel fixture uses its own private durable paths.
  stage = 'kernel_contract';
  const kernelRoot = join(root, 'kernel');
  await mkdir(kernelRoot);
  await writeFile(join(kernelRoot, 'config.json'), JSON.stringify({ ...config,
    home_dir: join(kernelRoot, 'home'), data_dir: join(kernelRoot, 'data') }), { mode: 0o600 });
  await writeFile(join(kernelRoot, 'selection.json'), JSON.stringify(selection), { mode: 0o600 });
  const kernelAdmissionBefore = admissions(), kernelEffectBefore = peer.effects.length;
  kernelChild = launch(kernelBinary, ['--exact', 'bauar_kernel_entry_contract', '--nocapture'], kernelRoot, {
    // Match the checked-in Cargo debug-test stack floor, as for the API host.
    RUST_MIN_STACK: '16777216',
    BAUAR_KERNEL_ROOT: kernelRoot, BAUAR_UAR_BEARER: provider.token, BAUAR_MODEL_KEY: modelCredential,
  }, { classifyStderr: true });
  const [code] = await once(kernelChild, 'exit');
  assert.equal(code, 0, 'Real kernel contract fixture failed');
  const kernelReceipt = JSON.parse(await readFile(join(kernelRoot, 'receipt.json'), 'utf8'));
  assert.equal(kernelReceipt.executedCases, 5, 'All real kernel contract cases must execute');
  assert.equal(kernelReceipt.cases.length, 5);
  assert.equal(admissions(), kernelAdmissionBefore, 'Native/legacy/ephemeral profiles must not POST selected admission');
  assert.equal(peer.effects.length, kernelEffectBefore, 'Native fixtures and selected ephemeral refusals have no MCP effect');
  for (const label of ['BAUAR_NATIVE_NORMAL', 'BAUAR_NATIVE_STREAM', 'BAUAR_NATIVE_EPHEMERAL',
    'BAUAR_NATIVE_SPAWN', 'BAUAR_LEGACY_MODEL']) {
    assert.ok(peer.modelCalls.some(call => call.label === label), `Actual model call missing for ${label}`);
  }
  assert.equal(peer.failures.length, 0, 'Private peer contract failures must remain empty');
  assert.ok(peer.modelCalls.length > 0 && peer.effects.length >= 3);
  passed('native-legacy-and-ephemeral-kernel-contract');
  stage = 'final_receipt';
  assert.equal(completed.length, 13, 'Every named complete gate scenario must execute');
  await writeFile(join(root, 'receipt.json'), JSON.stringify({ schemaVersion: 1, completed,
    executedCases: completed.length + kernelReceipt.executedCases, effects: peer.effects,
    realModelCalls: peer.modelCalls.length, primaryAssigneeWake: false, primaryBackgroundSweep: false,
    raceAssigneeWake: true, raceTaskBoardSweep: true,
    limitation: 'Manual selected admission and native automatic wake profiles only. Cron/deferred producers without JobAttemptRef remain native; automatic UAR cron/job selection is unsupported.' }, null, 2));
  console.log(JSON.stringify({ passed: true, executedCases: completed.length + kernelReceipt.executedCases, receipt: join(root, 'receipt.json') }));
} catch (error) {
  console.error(JSON.stringify({ peerMarkerlessInputShapes: peer?.modelInputShapes.filter(shape => shape.markerCount === 0) ?? [] }));
  console.error(JSON.stringify({ harnessFailureCheckpoint: { stage, cancellationSurface, cancellationStep,
    lastCompletedCase: completed.at(-1) ?? null, completedCaseCount: completed.length,
    host: childStatus(host), provider: provider?.status() ?? null, kernel: childStatus(kernelChild) } }));
  throw error;
} finally {
  await stop(kernelChild);
  await stop(host);
  await provider?.stop();
  await proxy?.close();
  await peer?.close();
}
