// Real CLI + signed canonical state + copied plugin payload regression.
// No status files, decision sinks, helper stubs, live home, or live KBD phase.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kbd installed helpers ')));
const phase = 'packaging-regression';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 }); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function run(exe, args, cwd, env, expected = 0) {
  const result = spawnSync(exe, args, { cwd, env, encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, expected, `${exe} ${args.join(' ')}\n${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  return `${result.stdout}${result.stderr}`;
}
function isolated(label) {
  const base = path.join(scratch, label), home = path.join(base, 'home with spaces');
  fs.mkdirSync(home, { recursive: true });
  const env = { SystemRoot: process.env.SystemRoot, ComSpec: process.env.ComSpec, PATH: process.env.PATH, HOME: home, USERPROFILE: home,
    CODEX_HOME: path.join(home, '.codex'), CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'),
    XDG_CACHE_HOME: path.join(home, '.cache'), TMPDIR: path.join(base, 'tmp'),
    PROMETHEUS_DATA_DIR: path.join(base, 'canonical data'), PROMETHEUS_DEVICE_KEY_FILE: path.join(base, 'device-key.json'),
    PROMETHEUS_KBD_CONTROL_PLANE: '0', PROMETHEUS_CONTROL_ENDPOINT: 'http://127.0.0.1:1',
    PROMETHEUS_LEARNING_CORTEX: '0', PROMETHEUS_LEARNING_PK: '0',
    PYTHONDONTWRITEBYTECODE: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull,
  };
  env.TEMP = env.TMPDIR; env.TMP = env.TMPDIR;
  fs.mkdirSync(env.TMPDIR, { recursive: true });
  const pair = crypto.generateKeyPairSync('ed25519');
  const pub = pair.publicKey.export({ format: 'jwk' }), priv = pair.privateKey.export({ format: 'jwk' });
  write(env.PROMETHEUS_DEVICE_KEY_FILE, { schemaVersion: '1', keyId: `ed25519:${hash(Buffer.from(pub.x, 'base64url'))}`,
    privateKey: Buffer.from(priv.d, 'base64url').toString('base64') });
  return { base, home, env };
}
function contract(status) {
  return { contractVersion: '1', kind: 'kbd.adopted-contract',
    identity: { projectId: status.projectId, runId: status.runId, phaseId: phase },
    digestNormalization: { algorithm: 'sha256', command: 'lib/kbd/adopted-contract.mjs contractDigest', stalenessRule: 'latest adoption digest must match' },
    adoptionSource: 'isolated packaging regression', decisionOwner: 'local tester', amendmentPolicy: 'explicit supersedes',
    releaseClaim: { userOperation: 'Adopt and validate from an ordinary consumer', supportedEnvironments: ['local'], currentCapabilities: 'installed helpers' },
    statusVocabulary: ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXERCISED'],
    scenarioMatrix: [{ id: 'PK-1', ownerTask: 'T1', productionEntry: 'installed helper', oracle: 'READY', negativeControl: 'missing contract', fixtures: 'temporary consumer', evidence: 'process output' }],
    functionalScope: ['PK-1'], exclusions: ['semantic changes'], requiredSafetyChecks: ['isolated canonical writer'],
    budgets: { timeMinutes: 10, toolCalls: 100, repairAttempts: 2, noProgressLimit: 2, tokenBudget: 'UNKNOWN', tokenFallback: 'time and tools', exhaustion: 'BLOCKED' },
    evidenceInvalidation: 'digest changes', workerRoutes: { agent: 'local', model: 'none' },
    boundaryPacket: { postImplementationOnly: true, singleRun: true, commands: ['integration'], stopConditions: ['failure'] },
    status: { implementationComplete: true } };
}
function exercise(label, payload, box, installed = false) {
  const { base, env } = box;
  const project = path.join(base, 'consumer with spaces'); fs.mkdirSync(project);
  fs.mkdirSync(path.join(project, '.kbd-orchestrator'));
  const native = (...args) => run('prometheus', ['kbd', '--path', project, ...args], project, env);
  native('status', '--json');
  native('phase', 'create', '--command-id', 'create', '--id', phase, '--title', 'Packaging regression');
  native('phase', 'activate', '--command-id', 'activate', '--id', phase);
  native('change', 'register', '--command-id', 'change', '--phase', phase, '--id', 'C1', '--title', 'Consumer helpers');
  native('task', 'register', '--command-id', 'task', '--phase', phase, '--change', 'C1', '--id', 'T1', '--title', 'Adopt contract');
  const status = JSON.parse(native('status', '--json'));
  const phaseDir = path.join(project, '.kbd-orchestrator/phases', phase);
  const relative = `.kbd-orchestrator/phases/${phase}/adopted-contract.json`, file = path.join(project, relative);
  write(file, contract(status));
  // Authored phase coverage input, separate from the CLI's canonical task registration.
  write(path.join(phaseDir, 'tasks.json'), { tasks: [{ id: 'T1', title: 'Adopt contract' }] });
  const adoptFile = path.join(payload, 'scripts/kbd-contract-adopt.mjs');
  const readyFile = path.join(payload, 'scripts/kbd-phase-readiness-check.mjs');
  const adopt = (expected = 0) => run(process.execPath, [adoptFile, relative], project, env, expected);
  const ready = (expected = 0) => run(process.execPath, [readyFile, '--phase', phase], project, env, expected);
  const stageCode = `
    import { pathToFileURL } from 'node:url';
    import fs from 'node:fs';
    const [modulePath, project, phaseDir, contractFile, action] = process.argv.slice(1);
    const { stageGate, stageHandoffWrite } = await import(pathToFileURL(modulePath));
    const ctx = { cwd: project, phaseDir };
    if (action === 'write') {
      stageHandoffWrite('plan', 'Consumer contract adopted', [], { ...ctx, identity: JSON.parse(fs.readFileSync(contractFile)).identity });
    } else {
      const result = stageGate('execute', ctx);
      process.stdout.write(result.stdout); process.stderr.write(result.stderr); process.exit(result.status);
    }
  `;
  const gate = (expected = 0, action = 'gate', cwd = project) => run(process.execPath, ['--input-type=module', '-e', stageCode,
    path.join(payload, 'lib/kbd/stage-gate.mjs'), project, phaseDir, file, action], cwd, env, expected);
  assert.match(ready(2), /BLOCKED missing=adoption/);
  assert.match(adopt(), /^ADOPTED /);
  const stamped = fs.readFileSync(file), after = JSON.parse(native('status', '--json'));
  assert.equal(Object.keys(after.decisions).length, 1);
  assert.match(Object.values(after.decisions)[0].summary, new RegExp(`ADOPTED-CONTRACT path=${relative}`));
  assert.match(read(file).identity.contractDigest, /^[a-f0-9]{64}$/);
  const journal = native('audit', '--json');
  assert.match(adopt(), /^ALREADY-ADOPTED /);
  assert.equal(native('audit', '--json'), journal, 'repeat adoption must not append a canonical event');
  assert.deepEqual(fs.readFileSync(file), stamped);
  assert.equal(JSON.parse(native('status', '--json')).revision, after.revision);
  assert.match(ready(), /^READY /);
  gate(0, 'write'); gate(); gate(0, 'gate', base);
  // Execute the quoted commands printed in the docs as argument arrays: no shell dependency.
  for (const [name, helper, marker] of [['kbd-plan', 'kbd-contract-adopt', 'ALREADY-ADOPTED'], ['kbd-execute', 'kbd-phase-readiness-check', 'READY']]) {
    const text = fs.readFileSync(path.join(payload, 'skills', name, 'SKILL.md'), 'utf8');
    const example = text.split('\n').find(line => line.includes(`node "<package-root>/scripts/${helper}.mjs"`));
    assert.ok(example, `${name} must document absolute package execution`);
    const command = example.replaceAll('`', '').replaceAll('<package-root>', payload).replaceAll('<phase>', phase);
    const args = [...command.matchAll(/"([^"]*)"|(\S+)/g)].map(m => m[1] ?? m[2]);
    assert.equal(args.shift(), 'node');
    assert.match(run(process.execPath, args, project, env), new RegExp(`^${marker} `));
  }
  assert.ok(run(process.execPath, [adoptFile, '--help'], project, env).includes(`node "${adoptFile}"`));
  assert.ok(run(process.execPath, [readyFile, '--help'], project, env).includes(`node "${readyFile}"`));
  fs.unlinkSync(file);
  assert.match(adopt(1), /contract not found/);
  assert.match(ready(2), /BLOCKED missing=contract/);
  assert.match(gate(2), /BLOCKED missing=contract/);
  fs.writeFileSync(file, '{invalid');
  assert.match(adopt(2), /not valid JSON/);
  assert.match(ready(5), /MALFORMED contract/);
  assert.match(gate(2), /MALFORMED contract/);
  const foreign = JSON.parse(stamped); foreign.identity.runId = 'foreign-run'; write(file, foreign);
  assert.match(ready(3), /REJECT-IDENTITY/); assert.match(gate(2), /REJECT-IDENTITY/);
  const stale = JSON.parse(stamped); stale.releaseClaim.currentCapabilities += ' changed'; write(file, stale);
  assert.match(ready(4), /REJECT-STALE/); assert.match(gate(2), /REJECT-STALE/);
  fs.writeFileSync(file, stamped);
  if (installed) {
    fs.renameSync(readyFile, `${readyFile}.saved`);
    try { assert.match(ready(1), /MODULE_NOT_FOUND/); }
    finally { fs.renameSync(`${readyFile}.saved`, readyFile); }
    for (const helper of ['kbd-contract-adopt.mjs', 'kbd-phase-readiness-check.mjs']) {
      assert.deepEqual(fs.readFileSync(path.join(payload, 'scripts', helper)), fs.readFileSync(path.join(root, 'scripts', helper)));
    }
  }
  assert.match(ready(), /^READY /); gate();
  assert.equal(fs.existsSync(path.join(project, 'shared')), false);
  assert.equal(fs.existsSync(path.join(project, 'scripts')), false);
  console.log(`PASS ${label}: adoption, READY, real gate, idempotent journal, documented commands/help, missing/malformed/identity/stale state${installed ? ', missing helper, copied payload parity' : ''}; consumer has no scripts`);
}
try {
  exercise('source', root, isolated('source'));
  for (const platform of ['claude', 'codex']) {
    const payload = path.join(root, 'dist/plugins', platform, 'prometheus-skills-mini');
    exercise(`generated ${platform}`, payload, isolated(`generated ${platform}`));
    const box = isolated(`installed ${platform}`), installed = path.join(box.base, 'installed package with spaces');
    // Mini's plugin-cache installation surface is a copy, not a full-pack generation store.
    fs.cpSync(payload, installed, { recursive: true });
    exercise(`installed ${platform}`, installed, box, true);
  }
  console.log('PASS all isolated package surfaces');
} finally { fs.rmSync(scratch, { recursive: true, force: true }); }
