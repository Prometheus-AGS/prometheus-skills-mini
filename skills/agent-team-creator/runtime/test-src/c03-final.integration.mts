import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { pathToFileURL } from 'node:url';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type RecordValue = { [key: string]: Json };
const PROFILE = 'urn:prometheus:uar:collaboration:0.1.0-draft.2';
const SCHEMA_SOURCE = '41375cf6cd137a8a825be102c49516211c3fa2e5';
const FIRST_RUNTIME = 'a64bafbb3d4cc54a22a5eecef2362300a959de62';
const JWT_SECRET = 'c03-final-gate-secret-not-production';

function parseArgs(values: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index], value = values[index + 1];
    if (!flag?.startsWith('--') || !value) throw new Error(`Expected --name value, received ${flag ?? '<end>'}`);
    (result[flag.slice(2)] ??= []).push(value);
  }
  return result;
}

function one(args: Record<string, string[]>, name: string): string {
  const values = args[name];
  if (!values || values.length !== 1) throw new Error(`Expected exactly one --${name}`);
  return path.resolve(values[0]!);
}

function canonical(value: Json): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key]!)}`).join(',')}}`;
}

function sha(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function selfDigest(document: RecordValue): string {
  const copy = structuredClone(document); delete copy.contentDigest;
  return sha(canonical(copy));
}

function json(value: Json): string { return `${JSON.stringify(value, null, 2)}\n`; }
function read(file: string): RecordValue { return JSON.parse(fs.readFileSync(file, 'utf8')) as RecordValue; }
function write(file: string, value: Json): void { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, json(value)); }

function run(program: string, argv: string[], cwd?: string): string {
  const result = spawnSync(program, argv, { cwd, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(`${program} ${argv.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function cli(cliFile: string, command: string, input: RecordValue, scratch: string, expectFailure = false): RecordValue {
  const request = path.join(scratch, `${command}-${createHash('sha1').update(canonical(input)).digest('hex')}.json`);
  write(request, input);
  const result = spawnSync(process.execPath, [cliFile, command, '--input', request], { encoding: 'utf8', shell: false });
  if (expectFailure) {
    assert.notEqual(result.status, 0, `${command} unexpectedly succeeded`);
    return JSON.parse(result.stderr) as RecordValue;
  }
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout) as RecordValue;
}

function copyDirectory(source: string, target: string): void {
  fs.cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
}

function packaged(root: string, pack: string): { cli: string; assets: string } {
  const skill = path.join(root, 'dist', 'plugins', 'codex', pack, 'skills', 'agent-team-creator');
  const cliFile = path.join(skill, 'scripts', 'cli.mjs');
  if (!fs.existsSync(cliFile)) throw new Error(`Packaged Codex CLI is missing: ${cliFile}`);
  return { cli: cliFile, assets: path.join(skill, 'assets', 'uar-workspace') };
}

function offlineCase(root: string, pack: string, scratch: string): RecordValue {
  const payload = packaged(root, pack);
  const project = path.join(scratch, pack); fs.mkdirSync(project, { recursive: true });
  copyDirectory(payload.assets, path.join(project, 'team-v1'));
  const status = cli(payload.cli, 'uar-workspace-status', { project, workspace: 'team-v1', pageSize: 2 }, scratch);
  assert.deepEqual(status.counts, { agents: 3, teams: 2, workflows: 1, diagnostics: 0 });
  const built = cli(payload.cli, 'uar-package-build', { project, workspace: 'team-v1', out: 'built-v1' }, scratch);
  cli(payload.cli, 'uar-workspace-revise', { project, workspace: 'team-v1', nextVersion: '1.1.0', out: 'team-v2' }, scratch);
  const beforeHash = sha(fs.readFileSync(path.join(project, 'team-v1', 'teams', 'root.json')));
  const nextRoot = read(path.join(project, 'team-v2', 'teams', 'root.json'));
  nextRoot.purpose = 'C03 immutable revision proof';
  cli(payload.cli, 'uar-workspace-update', { project, workspace: 'team-v2', path: 'teams/root.json', document: nextRoot }, scratch);
  cli(payload.cli, 'uar-package-build', { project, workspace: 'team-v2', out: 'built-v2' }, scratch);
  const diff = cli(payload.cli, 'uar-package-diff', { beforeDirectory: path.join(project, 'built-v1'), afterDirectory: path.join(project, 'built-v2') }, scratch);
  assert.equal(sha(fs.readFileSync(path.join(project, 'team-v1', 'teams', 'root.json'))), beforeHash);
  cli(payload.cli, 'uar-workspace-revise', { project, workspace: 'team-v1', nextVersion: '1.0.0', out: 'refused-same' }, scratch, true);

  const badGraph = path.join(project, 'bad-graph'); copyDirectory(path.join(project, 'team-v1'), badGraph);
  const badTeam = read(path.join(badGraph, 'teams', 'root.json'));
  const member = (badTeam.members as RecordValue[])[0]!;
  (member.definition as RecordValue).id = 'urn:prometheus:mini:missing-agent';
  write(path.join(badGraph, 'teams', 'root.json'), badTeam);
  cli(payload.cli, 'uar-package-validate', { project, workspace: 'bad-graph' }, scratch, true);

  const privateCopy = path.join(project, 'private-authority'); copyDirectory(path.join(project, 'team-v1'), privateCopy);
  const privateTeam = read(path.join(privateCopy, 'teams', 'root.json'));
  privateTeam.representationGrantRefs = [{ grantId: 'forbidden' }]; write(path.join(privateCopy, 'teams', 'root.json'), privateTeam);
  cli(payload.cli, 'uar-package-validate', { project, workspace: 'private-authority' }, scratch, true);

  const migration = cli(payload.cli, 'uar-workspace-migrate', {
    project, workspace: 'required-loss', source: { package: {
      manifest: { profile: PROFILE, kind: 'PackageManifest', id: 'urn:c03:loss', version: '1.0.0', provenance: { source: 'c03', authors: ['gate'] }, requiredCapabilities: [], extensions: { 'c03.unsupported': { required: true, value: {} } }, entrypoints: [{ id: 'urn:c03:loss-team', version: '1.0.0' }], capabilityDeclarations: [], resolution: 'exact-version-and-digest' },
      definitions: [{ path: 'teams/root.json', document: read(path.join(project, 'team-v1', 'teams', 'root.json')) }],
    } },
  }, scratch);
  cli(payload.cli, 'uar-package-build', { project, workspace: 'required-loss', out: 'refused-loss' }, scratch, true);
  return { package: pack, manifestDigest: (built.manifest as RecordValue).contentDigest as string, status, diff, migration };
}

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return (server.address() as { port: number }).port;
}

async function mockLlm(): Promise<{ server: http.Server; baseUrl: string }> {
  const server = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url === '/v1/models') response.end(JSON.stringify({ object: 'list', data: [{ id: 'c03-model', object: 'model' }] }));
    else if (request.url === '/v1/chat/completions') response.end(JSON.stringify({ id: 'c03-completion', object: 'chat.completion', created: 0, model: 'c03-model', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'C03 live run complete.' } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
    else { response.statusCode = 404; response.end('{}'); }
  });
  const port = await listen(server); return { server, baseUrl: `http://127.0.0.1:${port}/v1` };
}

function config(file: string, data: string, llm: string, port: number, grpc: number): void {
  fs.writeFileSync(file, `security:\n  jwt_required: false\n  jwt_secret: "${JWT_SECRET}"\n  settings_mutation_auth_required: false\nresilience:\n  rate_limit_enabled: false\npersistence:\n  provider: "surreal"\n  database_url: "surrealkv://${data.replaceAll('\\', '/')}"\nllm:\n  model: "c03-model"\n  base_url: "${llm}"\nserver:\n  host: "127.0.0.1"\n  port: ${port}\n  grpc_port: ${grpc}\n  shutdown_timeout_secs: 5\n`);
}

async function freePort(): Promise<number> {
  const server = http.createServer(); const port = await listen(server); await new Promise<void>(resolve => server.close(() => resolve())); return port;
}

async function startUar(executable: string, configFile: string, cwd: string, port: number): Promise<ChildProcess> {
  const child = spawn(executable, ['--config', configFile], { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CREDENTIAL_ENCRYPTION_KEY: 'c03-gate-credential-key-32-bytes', UAR_BUILTIN_SKILLS_DIR: path.join(cwd, 'no-skills') } });
  let diagnostic = ''; child.stderr?.on('data', chunk => { diagnostic += String(chunk); });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`UAR exited before readiness: ${diagnostic}`);
    try { const response = await fetch(`http://127.0.0.1:${port}/readyz`); if (response.ok) return child; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill(); throw new Error(`UAR readiness timed out: ${diagnostic}`);
}

async function stop(child: ChildProcess): Promise<void> {
  child.kill('SIGTERM'); await new Promise<void>(resolve => { child.once('exit', () => resolve()); setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 10_000); });
}

async function api(base: string, method: string, route: string, workspace: string, body?: Json): Promise<RecordValue> {
  const response = await fetch(`${base}${route}`, { method, headers: { authorization: `Bearer ${JWT_SECRET}`, 'content-type': 'application/json', 'x-uar-workspace-id': workspace }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await response.json() as RecordValue;
  if (!response.ok) throw new Error(`${method} ${route} failed (${response.status}): ${JSON.stringify(value)}`);
  return value;
}

function agentPackage(uarRoot: string): { manifest: RecordValue; manifestUtf8: string; files: Record<string, string> } {
  const source = read(path.join(uarRoot, 'docs', 'agents', 'collaboration', 'v0.1.0-draft.2', 'examples', 'agent-definition.json'));
  source.id = 'urn:prometheus:c03:gate-agent'; source.version = '1.0.0'; source.skills = [];
  source.models = [{ role: 'primary', capabilities: ['text'], preferredAliases: ['c03-model'] }];
  source.requiredCapabilities = ['collaboration_definition_packages_v2']; source.extensions = {}; source.contentDigest = selfDigest(source);
  const content = json(source), definitionDigest = source.contentDigest as string;
  const manifest: RecordValue = { profile: PROFILE, kind: 'PackageManifest', id: 'urn:prometheus:c03:gate-agent-package', version: '1.0.0', provenance: { source: 'C03 final integration gate', authors: ['Prometheus-AGS'] }, requiredCapabilities: ['collaboration_definition_packages_v2'], extensions: {}, entrypoints: [{ id: source.id, version: source.version, digest: definitionDigest }], files: [{ path: 'agent.json', kind: 'AgentDefinition', definition: { id: source.id, version: source.version, digest: definitionDigest }, byteDigest: sha(content) }], lock: [], capabilityDeclarations: [{ capability: 'collaboration_definition_packages_v2', required: true }], resolution: 'exact-version-and-digest' };
  manifest.contentDigest = selfDigest(manifest); return { manifest, manifestUtf8: json(manifest), files: { 'agent.json': content } };
}

async function liveCase(uarRoot: string, executable: string, teamDirectory: string, scratch: string): Promise<RecordValue> {
  const checkpoint = run('git', ['rev-parse', 'HEAD'], uarRoot);
  assert.equal(checkpoint, run('git', ['rev-parse', 'fba2b34a'], uarRoot), 'UAR checkout must remain at the frozen final executable checkpoint');
  for (const ancestor of [SCHEMA_SOURCE, FIRST_RUNTIME]) run('git', ['merge-base', '--is-ancestor', ancestor, checkpoint], uarRoot);
  const llm = await mockLlm(), port = await freePort(), grpc = await freePort(), work = path.join(scratch, 'uar-live');
  fs.mkdirSync(work, { recursive: true }); const configFile = path.join(work, 'uar.yaml'); config(configFile, path.join(work, 'catalog.db'), llm.baseUrl, port, grpc);
  const base = `http://127.0.0.1:${port}`, workspace = 'c03-final-gate', teamManifest = fs.readFileSync(path.join(teamDirectory, 'manifest.json'), 'utf8');
  const teamFiles: Record<string, string> = {}; for (const item of (JSON.parse(teamManifest) as RecordValue).files as RecordValue[]) teamFiles[String(item.path)] = fs.readFileSync(path.join(teamDirectory, String(item.path)), 'utf8');
  const agent = agentPackage(uarRoot); let child = await startUar(executable, configFile, work, port);
  try {
    const capabilities = await api(base, 'GET', '/api/v1/collaboration/capabilities', workspace);
    await api(base, 'POST', '/api/v1/collaboration/packages:preflight', workspace, { commandId: 'c03-team-preflight', manifest: teamManifest, files: teamFiles });
    const teamInstall = await api(base, 'POST', '/api/v1/collaboration/packages:install', workspace, { commandId: 'c03-team-install', manifest: teamManifest, files: teamFiles });
    const teamManifestObject = JSON.parse(teamManifest) as RecordValue;
    const teamExport = await api(base, 'POST', '/api/v1/collaboration/packages:export', workspace, { package: { id: teamManifestObject.id, version: teamManifestObject.version, digest: teamManifestObject.contentDigest }, target: { kind: 'canonicalDraft2' } });
    await api(base, 'POST', '/api/v1/collaboration/packages:preflight', workspace, { commandId: 'c03-agent-preflight', manifest: agent.manifestUtf8, files: agent.files });
    const agentInstall = await api(base, 'POST', '/api/v1/collaboration/packages:install', workspace, { commandId: 'c03-agent-install', manifest: agent.manifestUtf8, files: agent.files });
    const owner = String(capabilities.bindingOwnerId), grantId = 'urn:prometheus:c03:gate-grant', runtimeId = 'agent-instance:c03-gate', constraint = sha('c03-gate-constraints');
    const grant: RecordValue = { profile: PROFILE, kind: 'RepresentationGrant', exportClass: 'private-authority-state', grantId, issuerPrincipalId: owner, subjectPrincipalId: 'principal:c03-subject', granteeAgentInstanceId: runtimeId, organizationId: 'organization:c03', office: 'C03 gate', purpose: 'Disclosed final-gate execution', audienceScopes: ['organization:c03'], actionScopes: ['run.execute'], resourceScopes: ['package:c03'], dataScopes: ['gate.input'], approvalRequirements: [], disclosureRequirements: ['disclose-agent-assistance'], consentEvidenceRef: 'protected-evidence://c03/consent', organizationalAuthorityEvidenceRef: 'protected-evidence://c03/authority', revision: 1, status: 'active', notBefore: '2020-01-01T00:00:00Z', expiresAt: '2099-12-31T23:59:59Z', constraintDigest: constraint, revocation: null, retention: { policy: 'delete-on-expiry', deleteAfter: '2100-01-31T00:00:00Z' }, offboarding: { mode: 'revoke-immediately', requiredActions: ['disable-binding'] }, restrictions: { forbiddenClaims: ['human-authorship', 'human-approval'], notes: ['C03 gate only'] } };
    await api(base, 'POST', '/api/v1/collaboration/representation-grants', workspace, { commandId: 'c03-grant-install', grant });
    const binding: RecordValue = { profile: PROFILE, kind: 'DeploymentBinding', id: 'urn:prometheus:c03:gate-binding', version: '1.0.0', provenance: { source: 'C03 final integration gate', authors: ['Prometheus-AGS'] }, requiredCapabilities: ['collaboration_deployment_bindings_v2'], extensions: {}, exportClass: 'private-installed-state', package: { id: agent.manifest.id, version: agent.manifest.version, digest: agent.manifest.contentDigest }, ownerId: owner, workspaceId: workspace, runtimeInstanceId: runtimeId, revision: 1, modelBindings: [{ requestedAlias: 'c03-model', providerId: 'openai', modelId: 'c03-model', credentialRef: 'protected-credential://c03/model' }], skillBindings: [], storage: { backend: 'uar', connectionRef: 'protected-connection://c03/catalog', durableTransactions: true }, policyRevision: 'policy:c03:1', effectiveLimits: { concurrentTurns: 1, maxMembers: 1, maxDepth: 1, maxPendingTasks: 8 }, effectiveBudget: { maxTokens: 1000, maxCostMicrounits: 0, currency: 'USD', maxElapsedSeconds: 120 }, contextGrants: [], representationGrantRefs: [{ grantId, revision: 1, constraintDigest: constraint }], effectiveBindingReceiptRef: null, status: 'active' };
    binding.contentDigest = selfDigest(binding);
    await api(base, 'POST', '/api/v1/collaboration/deployment-bindings:preflight', workspace, { commandId: 'c03-binding-preflight', binding });
    const bindingInstall = await api(base, 'POST', '/api/v1/collaboration/deployment-bindings', workspace, { commandId: 'c03-binding-install', binding });
    const runReceipt = await api(base, 'POST', '/api/uar/runs', workspace, { deployment_binding_id: binding.id, input: 'Return the deterministic C03 gate sentence.' });
    let runState: RecordValue = runReceipt; for (let attempt = 0; attempt < 300; attempt++) { runState = await api(base, 'GET', `/api/uar/runs/${runReceipt.run_id}`, workspace); if (['completed','failed','cancelled'].includes(String(runState.status))) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    assert.equal(runState.status, 'completed');
    const effective = await api(base, 'GET', `/api/v1/collaboration/deployment-bindings/${encodeURIComponent(String(binding.id))}/effective-receipt`, workspace);
    const template = await api(base, 'POST', `/api/v1/collaboration/deployment-bindings/${encodeURIComponent(String(binding.id))}/template:export`, workspace);
    await stop(child); child = await startUar(executable, configFile, work, port);
    const coldPackage = await api(base, 'GET', `/api/v1/collaboration/packages/${encodeURIComponent(String(agent.manifest.id))}/versions/1.0.0`, workspace);
    const coldGrant = await api(base, 'GET', `/api/v1/collaboration/representation-grants/${encodeURIComponent(grantId)}`, workspace);
    const coldBinding = await api(base, 'GET', `/api/v1/collaboration/deployment-bindings/${encodeURIComponent(String(binding.id))}`, workspace);
    return { checkpoint, capabilities, teamInstall, teamExport, agentInstall, bindingInstall, run: { id: runReceipt.run_id, status: runState.status }, effective, template, cold: { packageDigest: (coldPackage.manifest as RecordValue)?.contentDigest ?? agent.manifest.contentDigest, grantRevision: (coldGrant.grant as RecordValue)?.revision ?? coldGrant.revision, bindingRevision: (coldBinding.binding as RecordValue)?.revision ?? coldBinding.revision } };
  } finally { await stop(child); await new Promise<void>(resolve => llm.server.close(() => resolve())); }
}

export async function runC03FinalGate(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv), miniRoot = one(args, 'mini-root'), fullRoot = one(args, 'full-root'), uarRoot = one(args, 'uar-root'), executable = one(args, 'uar-executable');
  const receipts = args.receipt?.map(item => path.resolve(item)) ?? []; if (receipts.length < 3) throw new Error('Pass the mini, full, and UAR --receipt destinations');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'c03-final-'));
  try {
    const mini = offlineCase(miniRoot, 'prometheus-skills-mini', scratch), full = offlineCase(fullRoot, 'prometheus-skill-pack', scratch);
    assert.equal(mini.manifestDigest, full.manifestDigest, 'packaged full and mini creator outputs diverged');
    const teamDirectory = path.join(scratch, 'prometheus-skills-mini', 'built-v1');
    const live = await liveCase(uarRoot, executable, teamDirectory, scratch);
    const receipt: RecordValue = { schemaVersion: 1, gate: 'afc-c03-team-authoring-workspace', result: 'passed', checkpoints: { schemaSource: SCHEMA_SOURCE, firstDraft2RuntimeAncestor: FIRST_RUNTIME, finalExecutableCheckpoint: live.checkpoint }, packagedOutputs: { mini, full, sharedManifestDigest: mini.manifestDigest }, live, boundaries: { creatorTeamPackageExecuted: false, reason: 'UAR ordinary binding execution requires one AgentDefinition entrypoint; the creator package retains one TeamDefinition entrypoint.', liveRunFixture: 'separate provider-schema single-Agent package', durableTeamInstance: 'unsupported' }, platform: { node: process.version, os: process.platform, arch: process.arch, windowsExecutionClaimed: process.platform === 'win32' } };
    const bytes = json(receipt); for (const file of receipts) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); }
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) runC03FinalGate().catch(error => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
