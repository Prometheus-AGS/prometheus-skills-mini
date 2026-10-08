// Bounded post-lint real-path gate; H28 remains a separate, historical receipt.
// Usage: node bauar-postlint-gate.mjs <current-api-host-test-bin> <uar-bin> <uar-source>
// Requires completed root-owned compilation. Does not build or use shared services.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { isDeepStrictEqual } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { startPeer, startFaultProxy } from './bauar-harness-peer.mjs';
import { providerFixture, secret, until, expected, launch, alive, stop, childStatus, instanceId } from './bauar-harness-runtime.mjs';

assert.equal(process.versions.node.split('.')[0], '24', 'Use the accepted Node 24 runtime');
assert.equal(process.argv.length, 5, 'Three explicit binary/source paths required');
const [hostBinary, uarBinary, uarSource] = process.argv.slice(2).map(value => resolve(value));
for (const binary of [hostBinary, uarBinary]) await access(binary);
const root = await mkdtemp(join(tmpdir(), 'bauar-postlint-'));
const hostRoot = join(root, 'boss'), configPath = join(hostRoot, 'config.json');
const owner = secret(), other = secret(), master = secret(), modelCredential = secret();
const mcpCredential = 'Bearer ' + secret();
const hash = value => '$sha256$' + createHash('sha256').update(value).digest('hex');
const completed = [], auth = { token: owner };
let peer, proxy, provider, host, base, selection;
let stage = 'setup';
const endpoint = task => '/api/uar/delegations/' + task;
const view = body => body.delegation ?? body;
const admissions = () => proxy.observations.filter(item => item.method === 'POST' && item.path.endsWith('/full-harness/v1/tasks')).length;
const effects = label => peer.effects.filter(item => item === label).length;
function passed(name) {
  assert.ok(!completed.includes(name)); completed.push(name);
  console.error(JSON.stringify({ postlintCompletedCase: name, completedCaseCount: completed.length }));
}
async function hostStart() {
  await rm(join(hostRoot, 'ready.json'), { force: true });
  await rm(join(hostRoot, 'stop'), { force: true });
  host = launch(hostBinary, ['--exact', 'bauar_private_host', '--nocapture'], hostRoot, {
    RUST_MIN_STACK: '16777216', BAUAR_HOST_ROOT: hostRoot, BAUAR_HOST_CONFIG: configPath,
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
  const temporary = join(commands, id + '.tmp');
  await writeFile(temporary, JSON.stringify(operation), { mode: 0o600 });
  await rename(temporary, join(commands, id + '.request'));
  return until('real private storage checkpoint', async () => {
    alive(host);
    try { return JSON.parse(await readFile(join(commands, id + '.response'), 'utf8')); }
    catch { return false; }
  });
}
async function job(label, agent) {
  const row = await expected(base, '/api/tasks', { ...auth, method: 'POST',
    body: { title: label, description: 'Perform the bound safe fixture effect once.', assigned_to: agent } }, [201]);
  assert.ok(row.id); return row.id;
}
async function admit(id, streaming = false) {
  return view(await expected(base, '/api/uar/jobs/' + id + '/admission', {
    ...auth, method: 'POST', body: { ...selection, streaming } }, [202]));
}
async function current(task) { return view(await expected(base, endpoint(task), auth, [200, 202])); }
async function board(id) { return expected(base, '/api/tasks/' + id, auth); }
async function approval(task) {
  let after = 0;
  return until('actual provider exact approval event', async () => {
    const observed = await expected(base, endpoint(task) + '/events?after=' + after, auth);
    const event = observed.events.find(item => item.parts?.some(part => part.type === 'approval_required'));
    for (const item of observed.events) after = Math.max(after, item.eventId);
    if (event) {
      const part = event.parts.find(part => part.type === 'approval_required');
      assert.ok(part.approval_id); return { id: part.approval_id };
    }
    assert.ok(!observed.delegation.terminalAt, 'Provider ended before required approval');
    return false;
  });
}
async function decide(task, id, statuses = [200], revision) {
  const snapshot = await current(task);
  return view(await expected(base, endpoint(task) + '/approve', { ...auth, method: 'POST',
    body: { approvalId: id, expectedRevision: revision ?? snapshot.revision, approved: true } }, statuses));
}
async function terminal(task) {
  return until('actual terminal provider outcome', async () => {
    const observed = await expected(base, endpoint(task) + '/events?after=0', auth);
    const projection = observed.delegation;
    if (!projection.terminalAt) return false;
    assert.equal(projection.executionState, 'completed');
    const receipt = await expected(provider.base, '/api/uar/full-harness/v1/tasks/' + projection.uarTaskId, provider.auth);
    assert.ok(receipt.task_id === projection.uarTaskId && receipt.run_id === projection.uarRunId
      && receipt.runtime_epoch === projection.runtimeEpoch, 'Terminal receipt must retain original correlation');
    assert.ok(receipt.terminal_at && Number.isSafeInteger(receipt.cursor), 'Actual terminal provider cursor required');
    if (projection.cursor < receipt.cursor) return false;
    assert.equal(projection.cursor, receipt.cursor, 'All original terminal events must be applied');
    return projection;
  });
}
async function privateA2a(task) {
  const result = await expected(base, '/a2a', { ...auth, method: 'POST',
    body: { jsonrpc: '2.0', id: 'postlint-get', method: 'tasks/get', params: { id: task } } });
  assert.ok(result.result && !result.error, 'Actual private A2A task must be available to its owner');
  return result.result;
}
function storedIntent(id) {
  // Read the real collaboration row only. Never modify or print its payload.
  const db = new DatabaseSync(join(hostRoot, 'memory.db'), { readOnly: true });
  try {
    const row = db.prepare('SELECT payload FROM task_queue WHERE id = ?').get(id);
    assert.ok(row?.payload instanceof Uint8Array, 'Actual durable intent payload required');
    const saved = JSON.parse(Buffer.from(row.payload).toString('utf8'));
    assert.equal(saved.tag, 'bossfang_job_dispatch');
    assert.equal(saved.version, 1);
    assert.equal(saved.intent.harness, 'uar');
    assert.ok(saved.intent.original.job.jobId === id);
    return saved;
  } finally { db.close(); }
}

try {
  peer = await startPeer({ effectFile: join(root, 'effects.jsonl'), mcpCredential, modelCredential });
  proxy = await startFaultProxy();
  provider = await providerFixture({ root, binary: uarBinary, source: uarSource, peer, proxy, mcpCredential, modelCredential });
  await provider.start(); selection = await provider.seed();
  await mkdir(hostRoot, { recursive: true });
  const config = { home_dir: join(hostRoot, 'home'), data_dir: join(hostRoot, 'data'), api_key: hash(master),
    task_board: { assignee_wake: false },
    users: [{ name: 'bauar-owner', role: 'owner', api_key_hash: hash(owner) },
      { name: 'bauar-other', role: 'owner', api_key_hash: hash(other) }],
    default_model: { provider: 'openai', model: 'gpt-5.4-mini', api_key_env: 'BAUAR_MODEL_KEY', base_url: peer.base + '/v1' },
    uar: { enabled: true, selected_instance_id: instanceId, instances: [{ id: instanceId, ownership: 'external',
      endpoints: provider.endpoints, workspace_locality: 'local', profile: 'uar.service-instance/1',
      credential_ref: 'env://BAUAR_UAR_BEARER', required_capabilities: ['full_harness_delegation_v1'] }] } };
  await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
  await hostStart();
  const manifest = 'name = "bauar-assignee"\nmodule = "builtin:chat"\n[model]\nprovider = "openai"\nmodel = "gpt-5.4-mini"\napi_key_env = "BAUAR_MODEL_KEY"\nbase_url = '
    + JSON.stringify(peer.base + '/v1') + '\nsystem_prompt = "Execute the fixture request."\n';
  const agent = (await expected(base, '/api/agents', { ...auth, method: 'POST', body: { manifest_toml: manifest } }, [201])).agent_id;
  assert.ok(agent, 'Actual stored assigned agent required');

  stage = 'nullable_checkpoint';
  const interruptedId = await job('BAUAR_INTENT_CRASH', agent), beforeIntent = admissions();
  assert.equal((await hostCommand({ operation: 'claim_intent', job_id: interruptedId })).checkpoint, 'selected_intent_committed');
  const empty = storedIntent(interruptedId);
  assert.equal(empty.intent.checkpoint, null, 'None must persist as the original JSON null');
  await stop(host, 'SIGKILL'); await hostStart();
  assert.ok(isDeepStrictEqual(storedIntent(interruptedId), empty), 'Restart must preserve the original nullable intent');
  const interrupted = await expected(base, '/api/uar/jobs/' + interruptedId + '/admission', {
    ...auth, method: 'POST', body: selection }, [503]);
  assert.ok(JSON.stringify(interrupted).includes('selected_attempt_outcome_unknown'));
  assert.equal((await hostCommand({ operation: 'read_intent', job_id: interruptedId })).kind, 'selected');
  assert.equal(admissions(), beforeIntent);
  assert.equal(effects('BAUAR_INTENT_CRASH'), 0);
  passed('nullable-checkpoint-restart-no-readmission');

  stage = 'selected_refusal_and_checkpoint';
  const label = 'BAUAR_NORMAL', id = await job(label, agent), before = admissions();
  const run = await admit(id), task = run.bossTaskId;
  assert.ok(task && run.uarTaskId && run.uarRunId);
  const pending = await approval(task);
  assert.equal(effects(label), 0, 'No effect before exact approval');
  const beforeRefusal = await current(task), revision = beforeRefusal.revision;
  await decide(task, 'wrong-exact-id', [409], revision);
  assert.ok(isDeepStrictEqual(await current(task), beforeRefusal), 'Wrong approval ID must leave the original projection unchanged');
  await decide(task, pending.id, [409], Math.max(0, revision - 1));
  assert.ok(isDeepStrictEqual(await current(task), beforeRefusal), 'Stale approval revision must leave the original projection unchanged');
  await expected(base, endpoint(task) + '/approve', { ...auth, method: 'POST', body: { approved: true } }, [422]);
  assert.ok(isDeepStrictEqual(await current(task), beforeRefusal), 'Missing approval ID must leave the original projection unchanged');
  await expected(base, endpoint(task), { token: other }, [404]);
  const replay = await admit(id, true);
  assert.ok(replay.uarTaskId === run.uarTaskId);
  assert.equal(admissions(), before + 1, 'Replay cannot create another provider attempt');
  await decide(task, pending.id);
  const done = await terminal(task);
  assert.ok(done.uarRunId === run.uarRunId);
  assert.equal(effects(label), 1);
  const beforeDuplicate = await current(task);
  await decide(task, pending.id, [409]);
  assert.equal(effects(label), 1, 'Duplicate exact approval cannot execute again');
  assert.ok(isDeepStrictEqual(await current(task), beforeDuplicate), 'Duplicate approval must leave the original terminal projection unchanged');
  const snapshot = await expected(base, endpoint(task) + '/events?after=0', auth);
  assert.equal(snapshot.delegation.cursor, done.cursor);
  assert.notEqual((await board(id)).status, 'completed');
  await stop(host, 'SIGKILL'); await hostStart();
  assert.notEqual((await board(id)).status, 'completed');
  const originalObservations = () => proxy.observations.filter(item => item.path.startsWith('/api/uar/full-harness/v1/tasks/' + run.uarTaskId)).length;
  const beforeRetainedRead = originalObservations(), retained = await privateA2a(task);
  assert.equal(retained.recoveryState, snapshot.delegation.recoveryState, 'Fully committed terminal history must retain recovery state');
  assert.ok(isDeepStrictEqual(retained.history, snapshot.events), 'Committed history must survive original-run lookup and restart');
  assert.ok(isDeepStrictEqual(await expected(base, '/a2a/tasks/' + task, auth), retained), 'REST/RPC parity must remain exact');
  assert.ok(retained.job.jobId === id && retained.job.attempt === 1 && retained.runId === run.uarRunId);
  assert.equal(retained.historyIsExecutable, false);
  await hostCommand({ operation: 'reconcile' });
  const committed = await board(id), saved = storedIntent(id);
  assert.equal(committed.status, 'completed');
  assert.ok(saved.intent.checkpoint && typeof saved.intent.checkpoint === 'object' && !Array.isArray(saved.intent.checkpoint));
  assert.ok(isDeepStrictEqual(Object.keys(saved.intent.checkpoint).sort(), ['binding', 'epoch', 'task', 'run', 'revision', 'status'].sort()), 'Box must not change persisted checkpoint keys');
  assert.ok(saved.intent.checkpoint.task === run.uarTaskId && saved.intent.checkpoint.run === run.uarRunId
    && saved.intent.checkpoint.epoch === run.runtimeEpoch && saved.intent.checkpoint.binding.job.jobId === id);
  assert.equal(saved.intent.checkpoint.status, 'completed');
  await stop(host, 'SIGKILL'); await hostStart();
  await hostCommand({ operation: 'reconcile' });
  assert.ok(isDeepStrictEqual(storedIntent(id), saved), 'Boxed checkpoint must deserialize and reconcile without rewriting its JSON');
  assert.ok(isDeepStrictEqual(await board(id), committed), 'Outcome reconciliation must be idempotent');
  assert.ok(isDeepStrictEqual((await privateA2a(task)).history, retained.history));
  assert.equal(admissions(), before + 1);
  assert.equal(originalObservations(), beforeRetainedRead, 'Sealed terminal presentation must not reopen the provider');
  passed('exact-refusals-and-object-checkpoint-restart');

  stage = 'root_task_parameters';
  const beforeParams = admissions(), beforeEffects = peer.effects.length;
  for (const method of ['tasks/get', 'tasks/cancel']) {
    for (const params of [undefined, { id: 42 }]) {
      const result = await expected(base, '/a2a', { ...auth, method: 'POST',
        body: { jsonrpc: '2.0', id: 'postlint-invalid', method, ...(params === undefined ? {} : { params }) } });
      assert.equal(result.jsonrpc, '2.0'); assert.equal(result.id, 'postlint-invalid');
      assert.equal(result.error?.code, -32602); assert.equal(result.result, undefined);
      if (params === undefined) assert.equal(result.error.message, 'params required');
      else assert.ok(typeof result.error.message === 'string' && result.error.message.length > 0);
    }
  }
  assert.equal(admissions(), beforeParams); assert.equal(peer.effects.length, beforeEffects);
  passed('root-get-cancel-original-parameter-errors');

  stage = 'connection_and_schema';
  const listed = await expected(base, '/api/uar/connections', auth);
  assert.ok(Array.isArray(listed.connections), 'Actual enabled connection route must return its typed collection');
  await expected(base, '/api/uar/connections', {}, [401]);
  const spec = await expected(base, '/api/openapi.json', auth);
  for (const [path, method] of [['/api/uar/connections', 'get'], ['/api/uar/connections/refresh', 'post'], ['/api/uar/diagnostics/delegation', 'post']]) {
    assert.ok(spec.paths?.[path]?.[method], 'Moved OpenAPI descriptor must remain present');
  }
  // Inspecting the schema does not invoke refresh, diagnostics, or any tool.
  assert.equal(admissions(), beforeParams); assert.equal(peer.effects.length, beforeEffects);
  passed('enabled-connections-and-openapi-descriptors');
  assert.equal(peer.failures.length, 0, 'Private peer contract failures must remain empty');
  assert.equal(peer.effects.length, 1, 'Exactly one real approved effect in this bounded gate');
  assert.ok(peer.modelCalls.length > 0, 'Actual provider model requests required');
  assert.equal(completed.length, 4);
  const receipt = join(root, 'receipt.json');
  await writeFile(receipt, JSON.stringify({ schemaVersion: 1, gate: 'bossfang-postlint', completed,
    executedCases: completed.length, providerAdmissions: admissions(), realEffects: peer.effects.length,
    realModelCalls: peer.modelCalls.length, primaryAssigneeWake: false, backgroundSweep: false,
    omissions: ['Accepted steer unavailable in actual provider profile', 'disabled-feature runtime not exercised',
      'no refresh or diagnostic invocation', 'no sidecar editing, channel delivery, or full H28 rerun'],
    historicalH28ReusedAsCurrentEvidence: false }, null, 2));
  console.log(JSON.stringify({ passed: true, gate: 'bossfang-postlint', executedCases: completed.length, receipt }));
} catch {
  console.error(JSON.stringify({ postlintFailure: { stage, completedCaseCount: completed.length,
    host: childStatus(host), provider: provider?.status() ?? null } }));
  // Never print raw request/response/assertion objects, prompts or credentials.
  process.exitCode = 1;
} finally {
  await stop(host); await provider?.stop(); await proxy?.close(); await peer?.close();
}
