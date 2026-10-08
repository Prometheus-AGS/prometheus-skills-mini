// C05 production gate: preseed a C03 binding, then delegate through BossFang's
// real managed UAR sidecar. Run with Node.js 22+ after building all four binaries.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const bossRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const flags = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[i + 1]]);
  return pairs;
}, []));
for (const key of ['boss-bin', 'uar-bin', 'sidecar-bin', 'stub-bin', 'uar-root']) {
  if (!flags[key]) throw new Error(`required --${key} PATH`);
}
const bins = Object.fromEntries(['boss', 'uar', 'sidecar', 'stub'].map(key => [key, resolve(flags[`${key}-bin`])]));
const uarRoot = resolve(flags['uar-root']);
const fixtureRoot = join(uarRoot, 'tests/fixtures/collaboration');
const instanceId = 'agent-instance:c03';
const workspaceId = 'workspace:c03';
const principal = 'user:00000000-0000-0000-0000-72006f0074a0';
const input = 'C05 echo this back';
const cancelInput = 'C05 cancel before effect';
const detachInput = 'C05 detach observer';
const completion = 'C05_BOUND_RUN_OK';
const children = new Set();
let root;

function check(condition, message) { assert.ok(condition, message); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function digest(document) {
  const { contentDigest: _discard, ...rest } = document;
  return `sha256:${createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex')}`;
}
function sha256(bytes) { return `sha256:${createHash('sha256').update(bytes).digest('hex')}`; }
function shellQuote(value) { return `'${value.replaceAll("'", "'\\''")}'`; }
function jwt(secret, subject) {
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ sub: subject, exp: Math.floor(Date.now() / 1000) + 3600 });
  const signed = `${header}.${payload}`;
  return `${signed}.${createHmac('sha256', secret).update(signed).digest('base64url')}`;
}
async function freePort() {
  const server = createServer();
  await new Promise((done, fail) => server.once('error', fail).listen(0, '127.0.0.1', done));
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}
function launch(name, command, args, cwd, env = {}) {
  const logfile = createWriteStream(join(root, `${name}.log`), { flags: 'a', mode: 0o600 });
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.pipe(logfile, { end: false });
  child.stderr.pipe(logfile, { end: false });
  child.once('error', error => logfile.write(`process launch failed: ${error.message}\n`));
  child.once('close', () => { children.delete(child); logfile.end(); });
  children.add(child);
  return child;
}
async function stop(child) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(done => child.once('close', done));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise(done => setTimeout(done, 5000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
  await exited;
}
async function request(base, path, { method = 'GET', body, token, workspace, timeoutMs = 10000 } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (workspace) headers['x-uar-workspace-id'] = workspace;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  const raw = await response.text();
  let value; try { value = JSON.parse(raw); } catch { value = raw; }
  return { status: response.status, body: value };
}
async function expected(base, path, options, statuses) {
  const result = await request(base, path, options);
  check(statuses.includes(result.status), `${options?.method ?? 'GET'} ${path}: HTTP ${result.status} ${JSON.stringify(result.body)}`);
  return result.body;
}
async function until(label, action, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try { const value = await action(); if (value) return value; }
    catch (error) { last = error; }
    await new Promise(done => setTimeout(done, 250));
  }
  throw new Error(`timed out waiting for ${label}: ${last?.message ?? 'condition not reached'}`);
}
async function fixture(name) { return readFile(join(fixtureRoot, name), 'utf8'); }
function gitHead(path) { return execFileSync('git', ['-C', path, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
async function eventsUntil(base, taskId, auth, predicate, timeoutMs = 30000) {
  const events = [];
  let cursor = 0;
  await until(`events for ${taskId}`, async () => {
    const observed = await expected(base, `/api/uar/delegations/${taskId}/events?after=${cursor}`, auth, [200]);
    events.push(...observed.events);
    cursor = Math.max(cursor, ...observed.events.map(event => event.cursor));
    return predicate(events) ? true : null;
  }, timeoutMs);
  return events;
}
function approvalId(events) {
  return events.find(event => event.type === 'agui.tool_call.approval_required')?.data?.approval_id;
}

async function run() {
  if (flags.root) await mkdir(resolve(flags.root), { recursive: true });
  root = await mkdtemp(join(flags.root ? resolve(flags.root) : tmpdir(), 'afc-c05-gate-'));
  for (const binary of Object.values(bins)) await access(binary);
  const [stubPort, seedPort, grpcPort, bossPort] = await Promise.all([freePort(), freePort(), freePort(), freePort()]);
  const db = join(root, 'uar-surreal');
  const bossHome = join(root, 'boss-home');
  await mkdir(bossHome, { recursive: true });
  const stubBase = `http://127.0.0.1:${stubPort}/v1`;
  const seedBase = `http://127.0.0.1:${seedPort}`;
  const bossBase = `http://127.0.0.1:${bossPort}`;
  const secret = randomBytes(32).toString('hex');
  const bossKey = randomBytes(32).toString('hex');
  const gateToken = randomBytes(32).toString('hex');
  const seedToken = jwt(secret, principal);
  const skills = join(root, 'builtin-skills');
  const skillPath = join(skills, 'sample-skill', 'SKILL.md');
  await mkdir(dirname(skillPath), { recursive: true });
  const skillSource = (await fixture('builtin-skills/sample-skill/SKILL.md')).replace('  - native_echo\n', '  - native_echo\n  - terminal_exec\n');
  await writeFile(skillPath, skillSource);
  const skillDigest = sha256(skillSource);
  const marker = join(root, 'tool-effect.log');
  const detachMarker = join(root, 'detach-effect.log');
  const command = `printf 'C05_EFFECT_OK\\n' >> ${shellQuote(marker)}`;
  const noEffectCommand = `printf 'UNEXPECTED_EFFECT\\n' >> ${shellQuote(marker)}`;
  const detachCommand = `printf 'C05_DETACH_EFFECT\\n' >> ${shellQuote(detachMarker)}`;
  const childEnv = {
    UAR_BUILTIN_SKILLS_DIR: skills,
    UAR_RESILIENCE__RATE_LIMIT_ENABLED: 'false',
    UAR_NATIVE_TOOLS__TERMINAL_EXEC_ENABLED: 'true',
    UAR_NATIVE_TOOLS__TERMINAL_USE_SANDBOX: 'false',
  };
  const stubFixtures = [
    { model: 'gpt-5.4-mini', last_user_message: input, has_tools: true, has_tool_result: false,
      response: { kind: 'tool_call', name: 'terminal_exec', arguments: JSON.stringify({ command }) } },
    { model: 'gpt-5.4-mini', last_user_message: input, has_tools: true, has_tool_result: true,
      response: { kind: 'content', text: completion } },
    ...[[cancelInput, noEffectCommand], [detachInput, detachCommand]].flatMap(([value, toolCommand]) => [
      { model: 'gpt-5.4-mini', last_user_message: value, has_tools: true, has_tool_result: false,
        response: { kind: 'tool_call', name: 'terminal_exec', arguments: JSON.stringify({ command: toolCommand }) } },
      { model: 'gpt-5.4-mini', last_user_message: value, has_tools: true, has_tool_result: true,
        response: { kind: 'content', text: `${value} done` } },
    ]),
  ];
  const stubFixturePath = join(root, 'stub-fixtures.json');
  await writeFile(stubFixturePath, JSON.stringify(stubFixtures));
  const stub = launch('stub', bins.stub, [stubFixturePath], uarRoot, { ...childEnv, STUB_LLM_PORT: String(stubPort) });
  await until('stub listener', async () => { try { await fetch(stubBase, { signal: AbortSignal.timeout(1000) }); return true; } catch { return false; } });

  const seedConfig = join(root, 'seed-uar.yaml');
  await writeFile(seedConfig, `security:\n  jwt_required: false\n  jwt_secret: "${secret}"\n  settings_admin_key: "${randomBytes(24).toString('hex')}"\nresilience:\n  rate_limit_enabled: false\npersistence:\n  provider: "surreal"\n  database_url: "surrealkv://${db}"\nservice_instance:\n  instance_id: "${instanceId}"\n  ownership: "managed"\n  workspace_location: "local"\nllm:\n  model: "gpt-5.4-mini"\n  base_url: "${stubBase}"\nserver:\n  host: "127.0.0.1"\n  port: ${seedPort}\n  grpc_port: ${grpcPort}\n  shutdown_timeout_secs: 30\n`, { mode: 0o600 });
  const seed = launch('seed-uar', bins.uar, ['--config', seedConfig], uarRoot, childEnv);
  await until('standalone UAR readiness', async () => (await request(seedBase, '/readyz')).status === 200, 90000);
  const seedAuth = { token: seedToken, workspace: workspaceId };
  const capabilities = await expected(seedBase, '/api/v1/collaboration/capabilities', seedAuth, [200]);
  const ownerId = capabilities.bindingOwnerId;
  check(typeof ownerId === 'string' && ownerId.includes(principal), 'C03 owner is not the authenticated BossFang principal');
  const agent = JSON.parse(await fixture('agent-definition.json'));
  // The C03 catalog fixture intentionally allows one message. A C05 tool
  // round-trip needs the call, result, and following model turn intact.
  agent.contextStrategy.value.max_messages = 20;
  for (const ref of [agent.skills[0], agent.sourceDescriptor.skills[0]]) {
    ref.digest = skillDigest;
    ref.requiredTools.push('terminal_exec');
  }
  agent.contentDigest = digest(agent);
  const team = JSON.parse(await fixture('team-definition.json'));
  team.members[0].definition.digest = agent.contentDigest;
  team.contentDigest = digest(team);
  const files = {
    'agent-definition.json': `${JSON.stringify(agent, null, 2)}\n`,
    'team-definition.json': `${JSON.stringify(team, null, 2)}\n`,
    'workflow-definition.json': await fixture('workflow-definition.json'),
  };
  const manifest = JSON.parse(await fixture('package-manifest.json'));
  manifest.entrypoints[0].digest = agent.contentDigest;
  manifest.files[0].definition.digest = agent.contentDigest;
  manifest.files[0].byteDigest = sha256(files['agent-definition.json']);
  manifest.files[1].definition.digest = team.contentDigest;
  manifest.files[1].byteDigest = sha256(files['team-definition.json']);
  manifest.lock[0].reference.digest = agent.contentDigest;
  manifest.contentDigest = digest(manifest);
  const packageResult = await expected(seedBase, '/api/v1/collaboration/packages:install', {
    ...seedAuth, method: 'POST', body: { commandId: 'c05-package', manifest: JSON.stringify(manifest), files },
  }, [201]);
  check(packageResult.receipt?.catalogRevision === 1, 'package was not installed in fresh catalog');
  await expected(seedBase, '/api/v1/collaboration/representation-grants', {
    ...seedAuth, method: 'POST', body: { commandId: 'c05-grant', expectedRevision: 0, grant: JSON.parse(await fixture('representation-grant-v1.json')) },
  }, [201]);
  const binding = JSON.parse(await fixture('deployment-binding.json'));
  binding.ownerId = ownerId;
  binding.package.digest = manifest.contentDigest;
  binding.skillBindings[0].digest = skillDigest;
  binding.skillBindings[0].requiredTools.push('terminal_exec');
  binding.skillBindings[0].installedLocation = `file://${skillPath}`;
  binding.contentDigest = digest(binding);
  const installed = await expected(seedBase, '/api/v1/collaboration/deployment-bindings', {
    ...seedAuth, method: 'POST', body: { commandId: 'c05-binding', expectedRevision: 0, binding },
  }, [201]);
  check(installed.preflight?.activationSupported === true,
    `C03 binding activation not supported: ${JSON.stringify(installed.preflight?.diagnostics)}`);
  await stop(seed); // SurrealKV has one writer; the supervisor opens this exact database next.

  const configPath = join(root, 'boss.toml');
  const toml = value => JSON.stringify(value);
  await writeFile(configPath, `home_dir = ${toml(bossHome)}\ndata_dir = ${toml(join(bossHome, 'data'))}\napi_key = ${toml(bossKey)}\n[uar]\nenabled = true\nmodel = "gpt-5.4-mini"\nbase_url = ${toml(stubBase)}\nsurreal_data_dir = ${toml(db)}\nselected_instance_id = ${toml(instanceId)}\n[[uar.instances]]\nid = ${toml(instanceId)}\nownership = "managed"\nworkspace_locality = "local"\nworkspace = ${toml(db)}\nprofile = "uar.service-instance/1"\ncapabilities = ["full_harness_delegation_v1", "service_instance_placement_v1"]\nrequired_capabilities = ["full_harness_delegation_v1"]\n[uar.instances.sidecar]\nenabled = true\nrestart = false\ncommand = ${toml(join(bossRoot, 'scripts/integration/afc-c05-sidecar-proxy.mjs'))}\n`, { mode: 0o600 });
  const boss = launch('boss', bins.boss, ['--config', configPath, 'start', '--foreground', '--bind', `127.0.0.1:${bossPort}`], uarRoot,
    { ...childEnv, LIBREFANG_HOME: bossHome, LIBREFANG_API_KEY: bossKey,
      C05_REAL_SIDECAR_BIN: bins.sidecar, C05_DROP_FIRST_ADMISSION: '1',
      C05_DROP_FIRST_APPROVAL: '1',
      C05_GATE_TOKEN: gateToken, C05_PRINCIPAL: principal,
      C05_PROXY_DROP_MARKER: join(root, 'dropped-admission.json'),
      C05_PROXY_APPROVAL_DROP_MARKER: join(root, 'dropped-approval.json'),
      C05_PROXY_ERROR_MARKER: join(root, 'proxy-error.log'),
      C05_PROXY_ENV_MARKER: join(root, 'sidecar-storage.txt'),
      C05_SIDECAR_LOG: join(root, 'managed-sidecar.log') });
  await until('BossFang health', async () => (await request(bossBase, '/api/health')).status === 200, 90000);
  const bossAuth = { token: bossKey };
  let lastBindingState = '';
  const status = await until('managed sidecar binding', async () => {
    const value = await expected(bossBase, '/api/uar/status', bossAuth, [200]);
    const bindingState = JSON.stringify({ state: value.state, compatibility: value.compatibility });
    if (bindingState !== lastBindingState) {
      console.error(`C05 binding status: ${bindingState}`);
      lastBindingState = bindingState;
    }
    if (value.state !== 'healthy' && value.last_error) throw new Error(`sidecar ${value.state}: ${value.last_error}`);
    return value.state === 'healthy' && value.effective_binding ? value : null;
  }, 90000);
  check(status.selected_instance_id === instanceId, 'wrong selected managed instance');
  check(status.effective_binding.ownership === 'managed', 'selected UAR is not managed');
  check(status.effective_binding.capabilities.includes('full_harness_delegation_v1'), 'full-run capability absent');
  const sidecarBase = status.endpoint;
  const sidecarAuth = { token: gateToken, workspace: workspaceId };
  const sidecarCapabilities = await expected(sidecarBase, '/__c05/api/v1/collaboration/capabilities', sidecarAuth, [200]);
  const sidecarBinding = await request(sidecarBase,
    `/__c05/api/v1/collaboration/deployment-bindings/${encodeURIComponent(binding.id)}`, sidecarAuth);
  console.error(`C05 catalog handoff: ${JSON.stringify({
    seedOwner: ownerId, sidecarOwner: sidecarCapabilities.bindingOwnerId,
    bindingStatus: sidecarBinding.status,
  })}`);
  check(sidecarCapabilities.bindingOwnerId === ownerId, 'managed sidecar changed the authenticated owner');
  check(sidecarBinding.status === 200, 'managed sidecar did not load the installed binding from persistent storage');
  // The effective binding receipt pins endpoint roles. A managed restart that
  // selects a new port requires an explicit, revisioned rebind before runs.
  const rebound = structuredClone(binding);
  rebound.revision = 2;
  rebound.contentDigest = digest(rebound);
  const reboundResult = await expected(sidecarBase,
    '/__c05/api/v1/collaboration/deployment-bindings', {
      ...sidecarAuth, method: 'POST',
      body: { commandId: 'c05-rebind-after-restart', expectedRevision: 1, binding: rebound },
    }, [201]);
  check(reboundResult.binding?.revision === 2 && reboundResult.preflight?.activationSupported === true,
    'managed sidecar did not revision the persisted binding for its current endpoint roles');
  const effective = status.effective_binding;
  const admission = {
    bossTaskId: 'c05-managed-bound-task', delegationId: 'new', admissionKey: 'new',
    targetBindingId: binding.id, workspaceId,
    definition: { id: agent.id, version: agent.version, digest: agent.contentDigest },
    definitionDiagnostics: [{ code: 'gate.definition', message: 'exact C05 diagnostic', path: '/definition' }],
    run: { input, service_placement: {
      intent: 'new', expectedInstanceId: effective.instance_id, expectedProfile: effective.profile,
      expectedWorkspaceLocation: effective.workspace_locality, bindingId: binding.id,
      credentialRef: effective.credential_ref, requiredCapabilities: ['full_harness_delegation_v1'],
      expectedEndpoints: {
        runtime: effective.endpoints.runtime, administration: effective.endpoints.administration,
        models: effective.endpoints.models, console: effective.endpoints.console,
      },
    } },
  };
  const path = '/api/uar/delegations';
  const noAuth = await request(bossBase, path, { method: 'POST', body: admission });
  check(noAuth.status === 401, `unauthenticated delegation was not refused: ${noAuth.status}`);
  const first = await expected(bossBase, path, { ...bossAuth, method: 'POST', body: admission, timeoutMs: 45000 }, [202]);
  check(first.verifiedPrincipal === principal && first.admissionState === 'unresolved', 'dropped remote response was not retained as unresolved admission');
  await access(join(root, 'dropped-admission.json'));
  check(JSON.stringify(first.definition) === JSON.stringify(admission.definition), 'exact definition identity was not retained');
  check(JSON.stringify(first.definitionDiagnostics) === JSON.stringify(admission.definitionDiagnostics), 'definition diagnostics were not retained');
  const replay = await expected(bossBase, path, { ...bossAuth, method: 'POST', body: admission }, [200]);
  check(replay.admissionKey === first.admissionKey && replay.uarTaskId && replay.uarRunId, 'replay did not reconcile the original UAR admission');
  check(JSON.stringify(replay.definition) === JSON.stringify(admission.definition), 'replay changed exact definition identity');
  check(JSON.stringify(replay.definitionDiagnostics) === JSON.stringify(admission.definitionDiagnostics), 'replay changed definition diagnostics');
  const conflict = await request(bossBase, path, { ...bossAuth, method: 'POST', body: { ...admission, run: { ...admission.run, input: 'changed input' } } });
  check(conflict.status === 409 && conflict.body.code === 'admission_digest_conflict', `changed replay was not refused: ${JSON.stringify(conflict)}`);
  const a2a = await expected(bossBase, '/a2a', { ...bossAuth, method: 'POST', body: {
    jsonrpc: '2.0', id: 1, method: 'tasks/get', params: { id: admission.bossTaskId },
  } }, [200]);
  check(a2a.result?.id === admission.bossTaskId && !a2a.error, 'root A2A did not resolve the BossFang projection');
  const steer = await expected(bossBase, `${path}/${admission.bossTaskId}/steer`, {
    ...bossAuth, method: 'POST', body: { input: 'C05 unsupported steer' },
  }, [200]);
  check(steer.outcome === 'unsupported' && steer.code === 'capability_unsupported', 'steer was not typed unsupported');
  const pendingEvents = await eventsUntil(bossBase, admission.bossTaskId, bossAuth, events => Boolean(approvalId(events)));
  const pendingApprovalId = approvalId(pendingEvents);
  const pendingApprovalView = await expected(bossBase, `${path}/${admission.bossTaskId}`, bossAuth, [200]);
  const wrongApproval = await request(bossBase, `${path}/${admission.bossTaskId}/approve`, {
    ...bossAuth, method: 'POST', body: { approvalId: 'c05-wrong-approval', expectedRevision: pendingApprovalView.revision, approved: true },
  });
  check(wrongApproval.status === 409, `wrong approval was not refused: ${wrongApproval.status}`);
  check((await readFile(marker, 'utf8').catch(() => '')).length === 0, 'effect ran before verified approval');
  const approved = await expected(bossBase, `${path}/${admission.bossTaskId}/approve`, {
    ...bossAuth, method: 'POST', body: { approvalId: pendingApprovalId, expectedRevision: pendingApprovalView.revision, approved: true },
  }, [202]);
  check(approved.uarTaskId === replay.uarTaskId, 'approval changed UAR task identity');
  check(approved.effectState === 'effect_unconfirmed', 'lost approval response did not retain effect uncertainty');
  await access(join(root, 'dropped-approval.json'));
  const reconciledApproval = await expected(bossBase, `${path}/${admission.bossTaskId}`, bossAuth, [200]);
  check(reconciledApproval.effectState === 'effect_unconfirmed',
    'remote lookup cleared effect uncertainty without settlement evidence');
  const completed = await until('UAR-owned tool loop completion', async () => {
    const value = await expected(bossBase, `${path}/${admission.bossTaskId}`, bossAuth, [200]);
    return ['completed', 'failed', 'cancelled', 'done', 'error'].includes(value.executionState) ? value : null;
  }, 90000);
  if (completed.executionState === 'failed') {
    const failedEvents = await expected(bossBase,
      `${path}/${admission.bossTaskId}/events?after=0`, bossAuth, [200]);
    console.error(`C05 failed run events: ${JSON.stringify(failedEvents.events.map(event => ({
      type: event.type,
      error: event.data?.error ?? event.data?.message ?? event.data?.reason,
    })))}`);
    const failedStubRequests = await expected(`http://127.0.0.1:${stubPort}`,
      '/_stub/requests', {}, [200]);
    console.error(`C05 stub request count: ${failedStubRequests.requests.length}`);
    const nativeRun = await request(sidecarBase,
      `/__c05/api/uar/runs/${completed.uarRunId}`, sidecarAuth);
    console.error(`C05 native run: ${JSON.stringify({ httpStatus: nativeRun.status,
      status: nativeRun.body?.status, effectiveModel: nativeRun.body?.effective_model })}`);
    const nativeStream = await request(sidecarBase,
      `/__c05/api/uar/runs/${completed.uarRunId}/stream`, { ...sidecarAuth, timeoutMs: 15000 });
    console.error(`C05 native errors: ${String(nativeStream.body).split('\n').filter(line => line.startsWith('event: agui.error') || (line.startsWith('data:') && line.includes('"kind":"error"'))).join('\n')}`);
  }
  check(['completed', 'done'].includes(completed.executionState), `bound run did not complete: ${JSON.stringify(completed)}`);
  const events = await eventsUntil(bossBase, admission.bossTaskId, bossAuth,
    observed => JSON.stringify(observed).includes(completion) && JSON.stringify(observed).includes('C05_EFFECT_OK'));
  const eventJson = JSON.stringify(events);
  check(eventJson.includes(completion), 'completed bound run content missing from observed events');
  check(eventJson.includes('C05_EFFECT_OK'), 'terminal tool result missing from observed events');
  const replayAfterEffect = await expected(bossBase, path, { ...bossAuth, method: 'POST', body: admission }, [200]);
  check(replayAfterEffect.uarTaskId === replay.uarTaskId && replayAfterEffect.uarRunId === replay.uarRunId, 'replay after effect created a new executor');
  check((await readFile(marker, 'utf8')).trim() === 'C05_EFFECT_OK', 'tool effect executed more or less than once');
  const stubRequests = await expected(`http://127.0.0.1:${stubPort}`, '/_stub/requests', {}, [200]);
  check(stubRequests.requests.length === 2, `expected one two-turn model loop, got ${stubRequests.requests.length} requests`);
  const cancelAdmission = structuredClone(admission);
  cancelAdmission.bossTaskId = 'c05-cancel-before-effect';
  cancelAdmission.run.input = cancelInput;
  const cancelCreated = await expected(bossBase, path, { ...bossAuth, method: 'POST', body: cancelAdmission }, [201]);
  check(cancelCreated.uarTaskId, 'cancel run did not enter UAR');
  await eventsUntil(bossBase, cancelAdmission.bossTaskId, bossAuth, observed => Boolean(approvalId(observed)));
  const cancelAck = await expected(bossBase, `${path}/${cancelAdmission.bossTaskId}/cancel`, { ...bossAuth, method: 'POST' }, [200]);
  check(cancelAck.cancellation.requested && cancelAck.cancellation.acknowledged, 'cancel request was not acknowledged by UAR');
  const cancelled = await until('terminal UAR cancellation', async () => {
    const value = await expected(bossBase, `${path}/${cancelAdmission.bossTaskId}`, bossAuth, [200]);
    return value.cancellation.terminal ? value : null;
  }, 30000);
  check(cancelled.executionState === 'cancelled', 'cancelled task did not reach terminal cancellation');
  check((await readFile(marker, 'utf8')).trim() === 'C05_EFFECT_OK', 'cancelled tool produced a second effect');
  const detachAdmission = structuredClone(admission);
  detachAdmission.bossTaskId = 'c05-detach-observer';
  detachAdmission.run.input = detachInput;
  const detachCreated = await expected(bossBase, path, { ...bossAuth, method: 'POST', body: detachAdmission }, [201]);
  check(detachCreated.uarTaskId, 'detach run did not enter UAR');
  const detachEvents = await eventsUntil(bossBase, detachAdmission.bossTaskId, bossAuth, observed => Boolean(approvalId(observed)));
  const detached = await expected(bossBase, `${path}/${detachAdmission.bossTaskId}/detach`, {
    ...bossAuth, method: 'POST', body: { observerId: 'c05-gate-observer' },
  }, [200]);
  check(detached.detached && !detached.cancellation.requested, 'detach cancelled the UAR run');
  const detachApprovalView = await expected(bossBase, `${path}/${detachAdmission.bossTaskId}`, bossAuth, [200]);
  await expected(bossBase, `${path}/${detachAdmission.bossTaskId}/approve`, {
    ...bossAuth, method: 'POST', body: { approvalId: approvalId(detachEvents), expectedRevision: detachApprovalView.revision, approved: true },
  }, [200]);
  await until('detached run completion', async () => {
    const value = await expected(bossBase, `${path}/${detachAdmission.bossTaskId}`, bossAuth, [200]);
    return ['completed', 'done'].includes(value.executionState) ? value : null;
  }, 30000);
  check((await readFile(detachMarker, 'utf8')).trim() === 'C05_DETACH_EFFECT', 'detached UAR executor did not continue');
  const receipt = {
    gate: 'AFC-C05-managed-sidecar', status: 'passed', bossHead: gitHead(bossRoot), uarHead: gitHead(uarRoot),
    root, managedInstance: instanceId, workspaceId, ownerVerified: first.verifiedPrincipal === principal,
    bossTaskId: replay.bossTaskId, uarTaskId: replay.uarTaskId, uarRunId: replay.uarRunId,
    runtimeEpoch: replay.runtimeEpoch, executionState: completed.executionState,
    lostRemoteResponseReconciled: true, lostApprovalResponsePreserved: true,
    replayStable: true, changedReplayRefused: true,
    unauthenticatedRefused: true, approvalForwarded: true, cancellationTerminal: true,
    detachPreservedExecution: true, steerRefused: true, rootA2aLookup: true,
    toolLoopObserved: true, effectExactlyOnce: true,
    modelRequests: stubRequests.requests.length, completionObserved: true, eventCount: events.length,
  };
  await writeFile(join(root, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`C05_GATE_RECEIPT=${JSON.stringify(receipt)}`);
  await stop(boss);
  await stop(stub);
}

try { await run(); }
catch (error) { console.error(`C05 gate failed; logs under ${root ?? '(unallocated)'}: ${error.stack ?? error}`); process.exitCode = 1; }
finally { await Promise.all([...children].map(stop)); }
