import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const PROFILE = 'urn:prometheus:uar:collaboration:0.1.0-draft.2';
const SCHEMA_SOURCE = '41375cf6cd137a8a825be102c49516211c3fa2e5';
const FIRST_RUNTIME = 'a64bafbb3d4cc54a22a5eecef2362300a959de62';
const FINAL_RUNTIME = '7a02a249396fd77f297cdb3f9672c4ca35341a63';
const JWT_SECRET = 'c03-final-gate-secret-not-production';
function ownerToken() {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const claims = encode({
        sub: 'c03-final-gate-owner',
        name: 'C03 Final Gate Owner',
        roles: ['service'],
        tenant_id: null,
        uar_instance_id: 'c03-final-gate-uar',
        exp: Math.floor(Date.now() / 1000) + 3_600,
    });
    const unsigned = `${header}.${claims}`;
    return `${unsigned}.${createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url')}`;
}
function parseArgs(values) {
    const result = {};
    for (let index = 0; index < values.length; index += 2) {
        const flag = values[index], value = values[index + 1];
        if (!flag?.startsWith('--') || !value)
            throw new Error(`Expected --name value, received ${flag ?? '<end>'}`);
        (result[flag.slice(2)] ??= []).push(value);
    }
    return result;
}
function one(args, name) {
    const values = args[name];
    if (!values || values.length !== 1)
        throw new Error(`Expected exactly one --${name}`);
    return path.resolve(values[0]);
}
function value(args, name) {
    const values = args[name];
    if (!values || values.length !== 1)
        throw new Error(`Expected exactly one --${name}`);
    return values[0];
}
function canonical(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
function sha(value) {
    return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
function selfDigest(document) {
    const copy = structuredClone(document);
    delete copy.contentDigest;
    return sha(canonical(copy));
}
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, json(value)); }
function run(program, argv, cwd) {
    const result = spawnSync(program, argv, { cwd, encoding: 'utf8', shell: false });
    if (result.status !== 0)
        throw new Error(`${program} ${argv.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
    return result.stdout.trim();
}
function cli(cliFile, command, input, scratch, expectFailure = false) {
    const request = path.join(scratch, `${command}-${createHash('sha1').update(canonical(input)).digest('hex')}.json`);
    write(request, input);
    const result = spawnSync(process.execPath, [cliFile, command, '--input', request], { encoding: 'utf8', shell: false });
    if (expectFailure) {
        assert.notEqual(result.status, 0, `${command} unexpectedly succeeded`);
        return JSON.parse(result.stderr);
    }
    if (result.status !== 0)
        throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
    return JSON.parse(result.stdout);
}
function copyDirectory(source, target) {
    fs.cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
}
function fileMap(root) {
    const result = {};
    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
            const absolute = path.join(directory, entry.name), relative = path.relative(root, absolute).split(path.sep).join('/');
            if (entry.isDirectory())
                visit(absolute);
            else if (entry.isFile())
                result[relative] = sha(fs.readFileSync(absolute));
        }
    };
    visit(root);
    return result;
}
function parity(miniRoot, fullRoot) {
    const miniSource = path.join(miniRoot, 'skills', 'agent-team-creator');
    const fullSource = path.join(fullRoot, 'skills', 'process', 'agent-team-creator');
    const miniDist = path.join(miniRoot, 'dist', 'plugins', 'codex', 'prometheus-skills-mini', 'skills', 'agent-team-creator');
    const fullDist = path.join(fullRoot, 'dist', 'plugins', 'codex', 'prometheus-skill-pack', 'skills', 'agent-team-creator');
    const miniSourceFiles = fileMap(miniSource), fullSourceFiles = fileMap(fullSource), miniDistFiles = fileMap(miniDist), fullDistFiles = fileMap(fullDist);
    assert.deepEqual(miniDistFiles, miniSourceFiles, 'mini Codex distribution differs from its canonical creator source');
    assert.deepEqual(fullDistFiles, fullSourceFiles, 'full Codex distribution differs from its canonical creator source');
    delete miniSourceFiles['runtime/test-src/c03-final.integration.mts'];
    delete miniSourceFiles['tests/c03-final.integration.mjs'];
    delete miniDistFiles['runtime/test-src/c03-final.integration.mts'];
    delete miniDistFiles['tests/c03-final.integration.mjs'];
    assert.deepEqual(miniSourceFiles, fullSourceFiles, 'shared full/mini creator source bytes diverged');
    assert.deepEqual(miniDistFiles, fullDistFiles, 'shared full/mini packaged creator bytes diverged');
    return { miniSourceTree: sha(canonical(fileMap(miniSource))), fullSourceTree: sha(canonical(fileMap(fullSource))), miniCodexTree: sha(canonical(fileMap(miniDist))), fullCodexTree: sha(canonical(fileMap(fullDist))) };
}
function repositoryChecks(miniRoot, fullRoot) {
    run('npm', ['run', 'check'], miniRoot);
    run('npm', ['run', 'check:distribution'], miniRoot);
    run('npm', ['run', 'spec:validate'], miniRoot);
    run('npm', ['--prefix', 'site', 'run', 'build:deploy'], miniRoot);
    run('openspec', ['validate', 'afc-c03-team-authoring-workspace', '--strict'], miniRoot);
    run('npm', ['run', 'check:distribution'], fullRoot);
    run('npm', ['run', 'docs:sync:check'], fullRoot);
    run('npm', ['run', 'docs:check'], fullRoot);
    run('openspec', ['validate', 'afc-c03-team-authoring-workspace', '--strict'], fullRoot);
    return { miniRules: 'passed', miniDistribution: 'passed', miniSpecs: 'passed', miniDocs: 'passed', fullDistribution: 'passed', fullDocs: 'passed', fullSpecs: 'passed' };
}
function packaged(root, pack) {
    const skill = path.join(root, 'dist', 'plugins', 'codex', pack, 'skills', 'agent-team-creator');
    const cliFile = path.join(skill, 'scripts', 'cli.mjs');
    if (!fs.existsSync(cliFile))
        throw new Error(`Packaged Codex CLI is missing: ${cliFile}`);
    return { cli: cliFile, assets: path.join(skill, 'assets', 'uar-workspace') };
}
function offlineCase(root, pack, scratch) {
    const payload = packaged(root, pack);
    const project = path.join(scratch, pack);
    fs.mkdirSync(project, { recursive: true });
    copyDirectory(payload.assets, path.join(project, 'team-v1'));
    const status = cli(payload.cli, 'uar-workspace-status', { project, workspace: 'team-v1', pageSize: 2 }, scratch);
    assert.deepEqual(status.counts, { agents: 3, teams: 2, workflows: 2, diagnostics: 0 });
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
    const badGraph = path.join(project, 'bad-graph');
    copyDirectory(path.join(project, 'team-v1'), badGraph);
    const badTeam = read(path.join(badGraph, 'teams', 'root.json'));
    const member = badTeam.members[0];
    member.definition.id = 'urn:prometheus:mini:missing-agent';
    write(path.join(badGraph, 'teams', 'root.json'), badTeam);
    cli(payload.cli, 'uar-package-validate', { project, workspace: 'bad-graph' }, scratch, true);
    const privateCopy = path.join(project, 'private-authority');
    copyDirectory(path.join(project, 'team-v1'), privateCopy);
    const privateTeam = read(path.join(privateCopy, 'teams', 'root.json'));
    privateTeam.representationGrantRefs = [{ grantId: 'forbidden' }];
    write(path.join(privateCopy, 'teams', 'root.json'), privateTeam);
    cli(payload.cli, 'uar-package-validate', { project, workspace: 'private-authority' }, scratch, true);
    const migration = cli(payload.cli, 'uar-workspace-migrate', {
        project, workspace: 'required-loss', source: { package: {
                manifest: { profile: PROFILE, kind: 'PackageManifest', id: 'urn:c03:loss', version: '1.0.0', provenance: { source: 'c03', authors: ['gate'] }, requiredCapabilities: [], extensions: { 'c03.unsupported': { required: true, value: {} } }, entrypoints: [{ id: 'urn:c03:loss-team', version: '1.0.0' }], capabilityDeclarations: [], resolution: 'exact-version-and-digest' },
                definitions: [{ path: 'teams/root.json', document: read(path.join(project, 'team-v1', 'teams', 'root.json')) }],
            } },
    }, scratch);
    cli(payload.cli, 'uar-package-build', { project, workspace: 'required-loss', out: 'refused-loss' }, scratch, true);
    return { package: pack, manifestDigest: built.manifest.contentDigest, status, diff, migration };
}
async function listen(server) {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    return server.address().port;
}
async function mockLlm() {
    const server = http.createServer((request, response) => {
        if (request.url === '/v1/models') {
            response.setHeader('content-type', 'application/json');
            response.end(JSON.stringify({ object: 'list', data: [{ id: 'c03-model', object: 'model' }] }));
        }
        else if (request.url === '/v1/chat/completions') {
            request.resume();
            response.setHeader('content-type', 'text/event-stream');
            const first = { id: 'c03-completion', object: 'chat.completion.chunk', created: 0, model: 'c03-model', choices: [{ index: 0, finish_reason: null, delta: { role: 'assistant', content: 'C03 live run complete.' } }] };
            const last = { id: 'c03-completion', object: 'chat.completion.chunk', created: 0, model: 'c03-model', choices: [{ index: 0, finish_reason: 'stop', delta: {} }] };
            response.end(`data: ${JSON.stringify(first)}\n\ndata: ${JSON.stringify(last)}\n\ndata: [DONE]\n\n`);
        }
        else {
            response.statusCode = 404;
            response.setHeader('content-type', 'application/json');
            response.end('{}');
        }
    });
    const port = await listen(server);
    return { server, baseUrl: `http://127.0.0.1:${port}/v1` };
}
function config(file, data, llm, port, grpc) {
    fs.writeFileSync(file, `security:\n  jwt_required: false\n  jwt_secret: "${JWT_SECRET}"\n  settings_mutation_auth_required: false\nresilience:\n  rate_limit_enabled: false\npersistence:\n  provider: "surreal"\n  database_url: "surrealkv://${data.replaceAll('\\', '/')}"\nllm:\n  model: "c03-model"\n  base_url: "${llm}"\nproviders:\n  - id: "openai"\n    display_name: "C03 mock provider"\n    base_url: "${llm}"\n    protocol: "chat"\n    default_model: "c03-model"\n    enabled: true\n    models:\n      - id: "c03-model"\n        display_name: "C03 mock model"\n        context_window: 128000\n        max_output_tokens: 1024\n        supports_tools: true\n        supports_streaming: true\n        enabled: true\nserver:\n  host: "127.0.0.1"\n  port: ${port}\n  grpc_port: ${grpc}\n  shutdown_timeout_secs: 5\n`);
}
async function freePort() {
    const server = http.createServer();
    const port = await listen(server);
    await new Promise(resolve => server.close(() => resolve()));
    return port;
}
async function startUar(executable, configFile, cwd, port) {
    const child = spawn(executable, ['--config', configFile], { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CREDENTIAL_ENCRYPTION_KEY: 'c03-gate-credential-key-32-bytes', UAR_BUILTIN_SKILLS_DIR: path.join(cwd, 'no-skills') } });
    let diagnostic = '';
    child.stderr?.on('data', chunk => { diagnostic += String(chunk); });
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null)
            throw new Error(`UAR exited before readiness: ${diagnostic}`);
        try {
            const response = await fetch(`http://127.0.0.1:${port}/readyz`);
            if (response.ok)
                return { child, diagnostics: () => diagnostic };
        }
        catch { /* startup */ }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    child.kill();
    throw new Error(`UAR readiness timed out: ${diagnostic}`);
}
async function stop(process) {
    const { child } = process;
    child.kill('SIGTERM');
    await new Promise(resolve => { child.once('exit', () => resolve()); setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 10_000); });
}
async function api(base, method, route, workspace, body) {
    const response = await fetch(`${base}${route}`, { method, headers: { authorization: `Bearer ${ownerToken()}`, 'content-type': 'application/json', 'x-uar-workspace-id': workspace }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const value = await response.json();
    if (!response.ok)
        throw new Error(`${method} ${route} failed (${response.status}): ${JSON.stringify(value)}`);
    return value;
}
async function runReplay(base, runId, workspace) {
    const response = await fetch(`${base}/api/uar/runs/${encodeURIComponent(runId)}/stream?last_event_id=0&stream_mode=agui_spec`, {
        headers: { authorization: `Bearer ${ownerToken()}`, 'last-event-id': '0', 'x-uar-workspace-id': workspace },
    });
    const body = await response.text();
    if (!response.ok)
        throw new Error(`GET run replay failed (${response.status}): ${body}`);
    return body;
}
function agentPackage(uarRoot, checkpoint) {
    const source = JSON.parse(run('git', ['show', `${checkpoint}:docs/agents/collaboration/v0.1.0-draft.2/examples/agent-definition.json`], uarRoot));
    source.id = 'urn:prometheus:c03:gate-agent';
    source.version = '1.0.0';
    source.skills = [];
    source.models = [{ role: 'primary', capabilities: ['text'], preferredAliases: ['c03-model'] }];
    source.requiredCapabilities = ['collaboration_definition_packages_v2'];
    source.extensions = {};
    source.contentDigest = selfDigest(source);
    const content = json(source), definitionDigest = source.contentDigest;
    const manifest = { profile: PROFILE, kind: 'PackageManifest', id: 'urn:prometheus:c03:gate-agent-package', version: '1.0.0', provenance: { source: 'C03 final integration gate', authors: ['Prometheus-AGS'] }, requiredCapabilities: ['collaboration_definition_packages_v2'], extensions: {}, entrypoints: [{ id: source.id, version: source.version, digest: definitionDigest }], files: [{ path: 'agent.json', kind: 'AgentDefinition', definition: { id: source.id, version: source.version, digest: definitionDigest }, byteDigest: sha(content) }], lock: [], capabilityDeclarations: [{ capability: 'collaboration_definition_packages_v2', required: true }], resolution: 'exact-version-and-digest' };
    manifest.contentDigest = selfDigest(manifest);
    return { manifest, manifestUtf8: json(manifest), files: { 'agent.json': content } };
}
async function liveCase(uarRoot, executable, checkpointRef, teamDirectory, scratch) {
    const checkpoint = run('git', ['rev-parse', checkpointRef], uarRoot);
    assert.equal(checkpoint, FINAL_RUNTIME, 'UAR executable checkpoint must be the frozen final C03 production head');
    for (const ancestor of [SCHEMA_SOURCE, FIRST_RUNTIME])
        run('git', ['merge-base', '--is-ancestor', ancestor, checkpoint], uarRoot);
    const llm = await mockLlm(), port = await freePort(), grpc = await freePort(), work = path.join(scratch, 'uar-live');
    fs.mkdirSync(work, { recursive: true });
    const configFile = path.join(work, 'uar.yaml');
    config(configFile, path.join(work, 'catalog.db'), llm.baseUrl, port, grpc);
    const base = `http://127.0.0.1:${port}`, workspace = 'c03-final-gate', teamManifest = fs.readFileSync(path.join(teamDirectory, 'manifest.json'), 'utf8');
    const teamFiles = {};
    for (const item of JSON.parse(teamManifest).files)
        teamFiles[String(item.path)] = fs.readFileSync(path.join(teamDirectory, String(item.path)), 'utf8');
    const agent = agentPackage(uarRoot, checkpoint);
    let uar = await startUar(executable, configFile, work, port);
    try {
        const capabilities = await api(base, 'GET', '/api/v1/collaboration/capabilities', workspace);
        await api(base, 'POST', '/api/v1/collaboration/packages:preflight', workspace, { commandId: 'c03-team-preflight', manifest: teamManifest, files: teamFiles });
        const teamInstall = await api(base, 'POST', '/api/v1/collaboration/packages:install', workspace, { commandId: 'c03-team-install', manifest: teamManifest, files: teamFiles });
        const teamManifestObject = JSON.parse(teamManifest);
        const teamExport = await api(base, 'POST', '/api/v1/collaboration/packages:export', workspace, { package: { id: teamManifestObject.id, version: teamManifestObject.version, digest: teamManifestObject.contentDigest }, target: { kind: 'canonicalDraft2' } });
        await api(base, 'POST', '/api/v1/collaboration/packages:preflight', workspace, { commandId: 'c03-agent-preflight', manifest: agent.manifestUtf8, files: agent.files });
        const agentInstall = await api(base, 'POST', '/api/v1/collaboration/packages:install', workspace, { commandId: 'c03-agent-install', manifest: agent.manifestUtf8, files: agent.files });
        const owner = String(capabilities.bindingOwnerId), grantId = 'urn:prometheus:c03:gate-grant', runtimeId = 'agent-instance:c03-gate', constraint = sha('c03-gate-constraints');
        const grant = { profile: PROFILE, kind: 'RepresentationGrant', exportClass: 'private-authority-state', grantId, issuerPrincipalId: owner, subjectPrincipalId: 'principal:c03-subject', granteeAgentInstanceId: runtimeId, organizationId: 'organization:c03', office: 'C03 gate', purpose: 'Disclosed final-gate execution', audienceScopes: ['organization:c03'], actionScopes: ['run.execute'], resourceScopes: ['package:c03'], dataScopes: ['gate.input'], approvalRequirements: [], disclosureRequirements: ['disclose-agent-assistance'], consentEvidenceRef: 'protected-evidence://c03/consent', organizationalAuthorityEvidenceRef: 'protected-evidence://c03/authority', revision: 1, status: 'active', notBefore: '2020-01-01T00:00:00Z', expiresAt: '2099-12-31T23:59:59Z', constraintDigest: constraint, revocation: null, retention: { policy: 'delete-on-expiry', deleteAfter: '2100-01-31T00:00:00Z' }, offboarding: { mode: 'revoke-immediately', requiredActions: ['disable-binding'] }, restrictions: { forbiddenClaims: ['human-authorship', 'human-approval'], notes: ['C03 gate only'] } };
        await api(base, 'POST', '/api/v1/collaboration/representation-grants', workspace, { commandId: 'c03-grant-install', grant });
        const binding = { profile: PROFILE, kind: 'DeploymentBinding', id: 'urn:prometheus:c03:gate-binding', version: '1.0.0', provenance: { source: 'C03 final integration gate', authors: ['Prometheus-AGS'] }, requiredCapabilities: ['collaboration_deployment_bindings_v2'], extensions: {}, exportClass: 'private-installed-state', package: { id: agent.manifest.id, version: agent.manifest.version, digest: agent.manifest.contentDigest }, ownerId: owner, workspaceId: workspace, runtimeInstanceId: runtimeId, revision: 1, modelBindings: [{ requestedAlias: 'c03-model', providerId: 'openai', modelId: 'c03-model', credentialRef: 'protected-credential://c03/model' }], skillBindings: [], storage: { backend: 'uar', connectionRef: 'protected-connection://c03/catalog', durableTransactions: true }, policyRevision: 'policy:c03:1', effectiveLimits: { concurrentTurns: 1, maxMembers: 1, maxDepth: 1, maxPendingTasks: 8 }, effectiveBudget: { maxTokens: 1000, maxCostMicrounits: 0, currency: 'USD', maxElapsedSeconds: 120 }, contextGrants: [], representationGrantRefs: [{ grantId, revision: 1, constraintDigest: constraint }], effectiveBindingReceiptRef: null, status: 'active' };
        binding.contentDigest = selfDigest(binding);
        await api(base, 'POST', '/api/v1/collaboration/deployment-bindings:preflight', workspace, { commandId: 'c03-binding-preflight', binding });
        const bindingInstall = await api(base, 'POST', '/api/v1/collaboration/deployment-bindings', workspace, { commandId: 'c03-binding-install', binding });
        const runReceipt = await api(base, 'POST', '/api/uar/runs', workspace, { deployment_binding_id: binding.id, input: 'Return the deterministic C03 gate sentence.' });
        let runState = runReceipt;
        for (let attempt = 0; attempt < 300; attempt++) {
            runState = await api(base, 'GET', `/api/uar/runs/${runReceipt.run_id}`, workspace);
            if (['done', 'error', 'cancelled'].includes(String(runState.status)))
                break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const replay = await runReplay(base, String(runReceipt.run_id), workspace);
        assert.equal(runState.status, 'done', `Bound run failed: state=${JSON.stringify(runState)} replay=${JSON.stringify(replay)} stderr=${JSON.stringify(uar.diagnostics())}`);
        const effective = await api(base, 'GET', `/api/v1/collaboration/deployment-bindings/${encodeURIComponent(String(binding.id))}/effective-receipt`, workspace);
        const template = await api(base, 'POST', `/api/v1/collaboration/deployment-bindings/${encodeURIComponent(String(binding.id))}/template:export`, workspace);
        await stop(uar);
        uar = await startUar(executable, configFile, work, port);
        const coldPackage = await api(base, 'GET', `/api/v1/collaboration/packages/${encodeURIComponent(String(agent.manifest.id))}/versions/1.0.0`, workspace);
        const coldGrant = await api(base, 'GET', `/api/v1/collaboration/representation-grants/${encodeURIComponent(grantId)}`, workspace);
        const coldBinding = await api(base, 'GET', `/api/v1/collaboration/deployment-bindings/${encodeURIComponent(String(binding.id))}`, workspace);
        return { checkpoint, executableDigest: sha(fs.readFileSync(executable)), capabilities, teamInstall, teamExport, agentInstall, bindingInstall, run: { id: runReceipt.run_id, status: runState.status }, effective, template, cold: { packageDigest: coldPackage.manifest?.contentDigest ?? agent.manifest.contentDigest, grantRevision: coldGrant.grant?.revision ?? coldGrant.revision, bindingRevision: coldBinding.binding?.revision ?? coldBinding.revision } };
    }
    finally {
        await stop(uar);
        await new Promise(resolve => llm.server.close(() => resolve()));
    }
}
export async function runC03FinalGate(argv = process.argv.slice(2)) {
    const args = parseArgs(argv), miniRoot = one(args, 'mini-root'), fullRoot = one(args, 'full-root'), uarRoot = one(args, 'uar-root'), executable = one(args, 'uar-executable'), checkpointRef = value(args, 'uar-checkpoint');
    const receipts = args.receipt?.map(item => path.resolve(item)) ?? [];
    if (receipts.length < 3)
        throw new Error('Pass the mini, full, and UAR --receipt destinations');
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'c03-final-'));
    try {
        const payloadParity = parity(miniRoot, fullRoot);
        const mini = offlineCase(miniRoot, 'prometheus-skills-mini', scratch), full = offlineCase(fullRoot, 'prometheus-skill-pack', scratch);
        assert.equal(mini.manifestDigest, full.manifestDigest, 'packaged full and mini creator outputs diverged');
        const compatibility = repositoryChecks(miniRoot, fullRoot);
        const teamDirectory = path.join(scratch, 'prometheus-skills-mini', 'built-v1');
        const live = await liveCase(uarRoot, executable, checkpointRef, teamDirectory, scratch);
        const receipt = { schemaVersion: 1, gate: 'afc-c03-team-authoring-workspace', result: 'passed', checkpoints: { schemaSource: SCHEMA_SOURCE, firstDraft2RuntimeAncestor: FIRST_RUNTIME, finalExecutableCheckpoint: live.checkpoint }, payloadParity, compatibility, packagedOutputs: { mini, full, sharedManifestDigest: mini.manifestDigest }, live, boundaries: { creatorTeamPackageExecuted: false, reason: 'UAR ordinary binding execution requires one AgentDefinition entrypoint; the creator package retains one TeamDefinition entrypoint.', liveRunFixture: 'separate provider-schema single-Agent package', durableTeamInstance: 'unsupported' }, platform: { node: process.version, os: process.platform, arch: process.arch, windowsExecutionClaimed: process.platform === 'win32' } };
        const bytes = json(receipt);
        for (const file of receipts) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, bytes);
        }
    }
    finally {
        fs.rmSync(scratch, { recursive: true, force: true });
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
    runC03FinalGate().catch(error => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
