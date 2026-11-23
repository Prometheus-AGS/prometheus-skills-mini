// Issue #241 exercises both copied Mini plugin packages from a separate consumer and home.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../', import.meta.url));
const namespace = 'prometheus-kbd-scope-amendment';
const cli = process.env.PROMETHEUS_CLI_TEST_BINARY ?? 'prometheus';
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content), { mode: 0o600 });
}

function isolated(scratch) {
  const home = path.join(scratch, 'home');
  const env = {
    PATH: path.isAbsolute(cli) ? path.dirname(cli) + path.delimiter + process.env.PATH : process.env.PATH,
    HOME: home, USERPROFILE: home, SystemRoot: process.env.SystemRoot, XDG_CONFIG_HOME: path.join(home, '.config'),
    PROMETHEUS_KBD_CONTROL_PLANE: '0', PROMETHEUS_CONTROL_ENDPOINT: 'http://127.0.0.1:1',
    PROMETHEUS_DATA_DIR: path.join(scratch, 'data'), PROMETHEUS_DEVICE_KEY_FILE: path.join(scratch, 'device.json'),
    PROMETHEUS_LEARNING_LOG_DIR: path.join(home, 'learning'), GIT_CONFIG_GLOBAL: os.devNull,
    GIT_CONFIG_NOSYSTEM: '1', OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1',
    PK_BIN: path.join(home, 'offline-pk'), // Real recorder persists its documented degraded receipt.
  };
  const pair = generateKeyPairSync('ed25519');
  const key = pair.privateKey.export({ format: 'jwk' });
  const publicHash = createHash('sha256').update(Buffer.from(key.x, 'base64url')).digest('hex');
  write(env.PROMETHEUS_DEVICE_KEY_FILE, { schemaVersion: '1', keyId: 'ed25519:' + publicHash,
    privateKey: Buffer.from(key.d, 'base64url').toString('base64') });
  return env;
}

function fixtureContract(status, phase) {
  return {
    contractVersion: '1', kind: 'kbd.adopted-contract', identity: { projectId: status.projectId, runId: status.runId, phaseId: phase },
    digestNormalization: { algorithm: 'sha256', command: 'lib/kbd/adopted-contract.mjs contractDigest', stalenessRule: 'latest adoption digest must match' },
    adoptionSource: 'acceptance', decisionOwner: 'operator', amendmentPolicy: 'explicit supersedes',
    releaseClaim: { userOperation: 'Preserve postponed work', supportedEnvironments: ['local'], currentCapabilities: 'installed helpers' },
    statusVocabulary: ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXERCISED'],
    scenarioMatrix: [{ id: 'S-1', ownerTask: 'T1', productionEntry: 'phase evaluator', oracle: 'recorded outcome',
      negativeControl: 'invalid signature', fixtures: 'local consumer', evidence: 'terminal state' }],
    functionalScope: ['Close phase'], exclusions: ['publication'], requiredSafetyChecks: ['authoritative writer'],
    budgets: { timeMinutes: 10, toolCalls: 100, repairAttempts: 2, noProgressLimit: 2, tokenBudget: 'UNKNOWN',
      tokenFallback: 'time and tools', exhaustion: 'BLOCKED' },
    evidenceInvalidation: 'digest changes', workerRoutes: { agent: 'local', model: 'none' },
    boundaryPacket: { postImplementationOnly: true, singleRun: true, commands: ['integration'], stopConditions: ['failure'] },
    status: { implementationComplete: true },
  };
}

function consumer(platform, t) {
  const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mini 241 ')));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const cwd = path.join(scratch, 'consumer');
  const payload = path.join(scratch, 'installed package');
  fs.mkdirSync(path.join(cwd, '.kbd-orchestrator'), { recursive: true });
  fs.cpSync(path.join(source, 'dist/plugins', platform, 'prometheus-skills-mini'), payload, { recursive: true });
  const env = isolated(scratch);
  const run = (exe, args, expected = 0) => {
    const r = spawnSync(exe, args, { cwd, env, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
    assert.equal(r.status, expected, [exe, ...args, r.error?.message, r.stdout, r.stderr].join('\n'));
    return r;
  };
  const native = (...args) => run(cli, ['kbd', '--path', cwd, ...args]).stdout;
  const helper = (name, args, expected = 0) => run(process.execPath, [path.join(payload, 'scripts', name + '.mjs'), ...args], expected);
  return { cwd, scratch, env, payload, run, native, helper };
}

for (const platform of ['claude', 'codex']) test('installed Mini operator exit, hooks and task projections on ' + platform, t => {
  const { cwd, scratch, env, payload, run, native, helper } = consumer(platform, t);
  const phase = 'operator-exit';
  const dir = path.join(cwd, '.kbd-orchestrator/phases', phase);
  native('phase', 'create', '--id', phase, '--title', 'Operator exit', '--command-id', 'create');
  native('phase', 'activate', '--id', phase, '--command-id', 'activate');
  native('guard', 'evaluate', '--boundary', 'phase', '--edge', 'before', '--subject', phase, '--json', '--repair-projections');
  native('phase', 'transition', '--command-id', 'start-phase', '--id', phase, '--status', 'in-progress');
  native('change', 'register', '--command-id', 'change', '--phase', phase, '--id', 'C1', '--title', 'Consumer');
  const task = ['--phase', phase, '--change', 'C1', '--id', 'T1'];
  native('task', 'register', '--command-id', 'register-task', ...task, '--title', 'Adopt contract', '--sequence', '1');
  native('task', 'transition', '--command-id', 'start-task', ...task, '--status', 'in-progress');
  native('task', 'transition', '--command-id', 'finish-task', ...task, '--status', 'complete');
  const status = JSON.parse(native('status', '--json'));
  const progress = path.join(dir, 'progress.json');
  const original = json(progress);
  write(progress, { ...original, changes: [] });
  write(path.join(cwd, 'openspec/changes/C1/tasks.md'), '- [ ] Adopt contract\n- [ ] Unmapped task\n');
  const report = JSON.parse(helper('kbd-apply', ['reconcile', phase, '--json'], 1).stdout);
  assert.deepEqual(report.taskCounts, {
    runtime: { completed: 1, total: 1 }, projection: { completed: 0, total: 0 }, backend: { completed: 0, total: 2 },
  });
  assert.ok(report.drift.some(item => item.kind === 'ledger-ahead'));
  assert.ok(report.drift.some(item => item.kind === 'unmappable'));
  write(progress, original);

  const rel = '.kbd-orchestrator/phases/' + phase + '/adopted-contract.json';
  const contract = fixtureContract(status, phase);
  write(path.join(cwd, rel), contract);
  helper('kbd-contract-adopt', [rel]);
  const decision = 'Move remaining work to the successor phase.';
  const details = { operatorDecision: { reference: 'decision-log#move', text: decision },
    exercised: [], withdrawn: [{ kind: 'scenario', id: 'S-1', destination: 'next-phase' },
      { kind: 'scope', id: 'Close phase', destination: 'next-phase' }],
    budgetAccounting: { class: 'unmetered' }, limits: ['No scenarios exercised.'] };
  const input = path.join(scratch, 'details.json'), manifest = path.join(scratch, 'exit.json'), signer = path.join(scratch, 'key');
  write(input, details);
  const templateArgs = ['supersede-exit', '--phase', phase, '--details', input, '--reason', decision, '--approver', 'owner'];
  write(manifest, helper('kbd-scope-authority-template', templateArgs).stdout);
  run('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', signer]);
  write(path.join(env.XDG_CONFIG_HOME, 'prometheus/kbd-scope-allowed-signers'),
    'owner namespaces="' + namespace + '" ' + fs.readFileSync(signer + '.pub', 'utf8'));
  run('ssh-keygen', ['-Y', 'sign', '-f', signer, '-n', namespace, manifest]);
  const close = ['--phase', phase, '--superseded', manifest, '--signature', manifest + '.sig'];
  // A valid signed exit must still refuse fixture-only inputs without invoking the live writer.
  const disposition = () => JSON.parse(native('phase', 'disposition', '--id', phase, '--json'));
  const statusFile = path.join(scratch, 'status.json'), dispositionFile = path.join(scratch, 'disposition.json');
  write(statusFile, JSON.parse(native('status', '--json')));
  write(dispositionFile, disposition());
  const sink = path.join(scratch, 'would-record');
  for (const pair of [['--status-file', statusFile], ['--disposition-file', dispositionFile], ['--decision-sink', sink]]) {
    const refused = helper('kbd-phase-close-eval', [...close, ...pair], 2);
    assert.match(refused.stdout, /requires the canonical writer/);
    assert.equal(disposition().disposition, 'OPEN');
  }
  assert.equal(fs.existsSync(sink), false);
  helper('kbd-phase-close-eval', close);
  assert.equal(json(path.join(dir, 'closure.json')).disposition, 'CLOSED_UNMET');
  assert.match(fs.readFileSync(path.join(dir, 'closure-packet.md'), 'utf8'), /S-1 → next-phase/);
  const reflection = path.join(dir, 'reflection.md');
  write(reflection, '## Lessons Learned\n- Record withdrawn scope with its destination.\n');
  const finalize = ['--phase', phase, '--accepted'];
  const after = json(progress);
  write(progress, { ...after, reflect_gate: 'rejected' });
  assert.match(helper('kbd-reflection-finalize', finalize, 1).stderr, /Rejected reflection/);
  const lessons = path.join(env.PROMETHEUS_LEARNING_LOG_DIR, 'lessons.jsonl');
  assert.equal(fs.existsSync(lessons), false);
  write(progress, { ...after, reflect_gate: 'accepted' });
  const actionFile = path.join(payload, 'scripts/kbd-reflection-writeback.mjs');
  fs.renameSync(actionFile, actionFile + '.held');
  assert.match(helper('kbd-reflection-finalize', finalize, 1).stderr, /memory-reflection-writeback/);
  fs.renameSync(actionFile + '.held', actionFile);
  helper('kbd-reflection-finalize', finalize);
  helper('kbd-reflection-finalize', finalize);
  assert.equal(fs.readFileSync(lessons, 'utf8').trim().split('\n').length, 1);
  assert.equal(json(lessons).text, 'Record withdrawn scope with its destination.');
  const events = fs.readFileSync(path.join(dir, 'hooks.log.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const successful = events.filter(event => event.status === 0);
  assert.deepEqual(successful.map(event => event.hookId).sort(),
    ['karpathy-progress-phase-boundary', 'memory-reflection-writeback', 'method-context-phase-after']);
  assert.ok(successful.every(event => event.name === phase));
  assert.ok(events.some(event => event.hookId === 'memory-reflection-writeback' && event.status !== 0));
  assert.match(fs.readFileSync(path.join(cwd, '.prometheus/session-log.md'), 'utf8'), /CLOSED_UNMET/);
  assert.ok(fs.existsSync(path.join(dir, 'method-context.json')));
});

test('installed Mini closes a nested bound phase from its historical evidence and delivers to its projection', t => {
  const { cwd, native, helper } = consumer('codex', t);
  const parent = 'outer', phase = 'outer::inner';
  native('phase', 'create', '--id', parent, '--title', 'Parent phase', '--command-id', 'create-parent');
  native('phase', 'activate', '--id', parent, '--command-id', 'activate-parent');
  native('guard', 'evaluate', '--boundary', 'phase', '--edge', 'before', '--subject', parent, '--json', '--repair-projections');
  native('phase', 'transition', '--id', parent, '--status', 'in-progress', '--command-id', 'start-parent');
  native('phase', 'create', '--id', phase, '--slug', 'inner', '--parent', parent, '--title', 'Child phase', '--command-id', 'create-child');
  native('phase', 'activate', '--id', phase, '--ancestor', parent, '--command-id', 'activate-child');
  native('guard', 'evaluate', '--boundary', 'phase', '--edge', 'before', '--subject', phase, '--json', '--repair-projections');
  native('phase', 'transition', '--id', phase, '--status', 'in-progress', '--command-id', 'start-child');
  const flat = path.join(cwd, '.kbd-orchestrator/phases', phase);
  const projected = path.join(cwd, '.kbd-orchestrator/phases/outer/children/inner');
  const rel = path.relative(cwd, path.join(flat, 'adopted-contract.json'));
  const status = JSON.parse(native('status', '--json'));
  const contract = fixtureContract(status, phase);
  write(path.join(cwd, rel), contract);
  const expectedOwnerError = /owner-task: S-1: ownerTask T1 is not a registered task/;
  assert.match(helper('kbd-contract-adopt', [rel, '--lint-only'], 2).stderr, expectedOwnerError);
  assert.match(helper('kbd-contract-adopt', [rel], 2).stderr, expectedOwnerError);
  const disposition = () => JSON.parse(native('phase', 'disposition', '--id', phase, '--json'));
  assert.equal(disposition().contractBound, false);
  native('phase', 'bind-contract', '--id', parent, '--contract-path', '.kbd-orchestrator/phases/outer/adopted-contract.json',
    '--contract-digest', 'a'.repeat(64), '--scenario-digest', 'S-1=' + 'b'.repeat(64),
    '--plan-revision', String(status.planRevision), '--adoption-decision', 'prior-binding');
  const parentContract = '.kbd-orchestrator/phases/outer/adopted-contract.json';
  write(path.join(cwd, parentContract), fixtureContract(status, parent));
  const amendment = helper('kbd-scope-authority-template', ['amend-contract', '--phase', parent, '--contract', parentContract,
    '--approver', 'owner', '--reason', 'Update the prior bound contract'], 2);
  assert.equal(amendment.stdout, '');
  assert.match(amendment.stderr, expectedOwnerError);
  native('change', 'register', '--command-id', 'change', '--phase', phase, '--id', 'C1', '--title', 'Consumer');
  native('task', 'register', '--command-id', 'register-task', '--phase', phase, '--change', 'C1', '--id', 'T1',
    '--title', 'Adopt contract', '--sequence', '1');
  helper('kbd-contract-adopt', [rel]);
  const digest = disposition().binding.contractDigest;
  assert.ok(fs.existsSync(path.join(flat, 'adopted', digest + '.json')));
  const source = 'receipt.txt';
  const observed = native('phase', 'disposition', '--id', phase, '--json');
  assert.equal(JSON.parse(observed).disposition, 'OPEN');
  write(path.join(cwd, source), observed);
  const values = Object.fromEntries(Object.entries({ timeMinutes: 1, toolCalls: 10, repairAttempts: 0, noProgress: 0 })
    .map(([key, value]) => [key, { value, class: 'measured' }]));
  write(path.join(flat, 'boundary-results.json'), {
    phase, projectId: status.projectId, runId: status.runId, contractDigest: digest,
    sourceDigests: { [source]: createHash('sha256').update(observed).digest('hex') },
    budgetConsumption: { source: 'local process observations', values },
    scenarios: [{ id: 'S-1', status: 'PASS', attempted: 'query child disposition',
      observed: 'real CLI returned OPEN before closure', evidence: source }],
  });
  helper('kbd-phase-close-eval', ['--phase', phase]);
  assert.equal(disposition().disposition, 'CLOSED');
  const packet = json(path.join(flat, 'closure.json'));
  assert.equal(packet.phaseId, phase);
  assert.equal(packet.contractDigest, digest);
  assert.equal(packet.scenarios.find(s => s.id === 'S-1').verdict, 'PASS');
  assert.ok(fs.existsSync(path.join(flat, 'closure-packet.md')));
  const hooks = fs.readFileSync(path.join(projected, 'hooks.log.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(hooks.map(h => h.hookId).sort(), ['karpathy-progress-phase-boundary', 'method-context-phase-after']);
  assert.ok(hooks.every(h => h.name === phase && h.status === 0));
  assert.equal(fs.existsSync(path.join(flat, 'hooks.log.jsonl')), false);
});
