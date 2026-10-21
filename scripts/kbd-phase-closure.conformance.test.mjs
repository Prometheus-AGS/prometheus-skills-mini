// Canonical phase closure + scope authority conformance for mini (mini #66, full #192).
// Runs the corpus vendored from the full pack (test/conformance/kbd-phase-closure, PIN.json)
// through mini's own entry points on the source tree and both generated payloads, with the
// real `prometheus` binary (PROMETHEUS_CLI_TEST_BINARY or PATH), real ssh-keygen signatures and
// isolated HOME/XDG/data roots. Without a typed-closure prometheus the suite skips, unless
// PROMETHEUS_CLI_REQUIRED=1 (as for the other real-process suites), which turns it into a failure.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { contractDigest, contractSnapshotBytes, scenarioDigests } from '../lib/kbd/adopted-contract.mjs';
import { canonical, checkAssert, checkExpect, fixture, step, surface } from '../test/conformance/kbd-phase-closure-adapter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendored = path.join(root, 'test/conformance/kbd-phase-closure');
const corpus = path.join(vendored, 'v1');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const version = (cmd, args) => {
  const out = spawnSync(cmd, args, { encoding: 'utf8' });
  return `${out.stdout || out.stderr || ''}`.trim().split('\n')[0];
};

const requested = process.env.PROMETHEUS_CLI_TEST_BINARY || 'prometheus';
const probe = spawnSync(requested, ['kbd', 'phase', '--help'], { encoding: 'utf8' });
const typedClosure = probe.status === 0 && /disposition/.test(probe.stdout);
if (process.env.PROMETHEUS_CLI_REQUIRED === '1' && !typedClosure) {
  throw new Error(`PROMETHEUS_CLI_REQUIRED=1 but ${requested} lacks typed phase closure (prometheus kbd phase disposition)`);
}
const prometheusBin = typedClosure
  ? (path.isAbsolute(requested) ? requested : spawnSync('sh', ['-c', `command -v ${requested}`], { encoding: 'utf8' }).stdout.trim())
  : null;
const runtime = typedClosure ? {} : { skip: `typed-closure prometheus not found (${requested}); set PROMETHEUS_CLI_TEST_BINARY, or PROMETHEUS_CLI_REQUIRED=1 to fail instead` };
const cases = fs.readdirSync(path.join(corpus, 'cases')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(corpus, 'cases', f), 'utf8')));

test('vendored corpus matches its recorded checksums', () => {
  const sums = fs.readFileSync(path.join(vendored, 'SHA256SUMS'), 'utf8').trim().split('\n');
  assert.ok(sums.length > 0);
  for (const line of sums) {
    const [digest, relative] = line.split(/\s+/);
    assert.equal(sha256(fs.readFileSync(path.join(corpus, relative))), digest, `vendored ${relative} drifted from PIN.json`);
  }
});

test('golden vectors: mini digests are byte-identical to the full pack', () => {
  const golden = path.join(corpus, 'golden');
  const contract = JSON.parse(fs.readFileSync(path.join(golden, 'contract.json'), 'utf8'));
  const digests = JSON.parse(fs.readFileSync(path.join(golden, 'digests.json'), 'utf8'));
  assert.equal(contractSnapshotBytes(contract), fs.readFileSync(path.join(golden, 'contract.snapshot.json'), 'utf8'));
  assert.equal(contractDigest(contract), digests.contractDigest);
  assert.deepEqual(scenarioDigests(contract), digests.scenarioDigests);
  const vectors = JSON.parse(fs.readFileSync(path.join(golden, 'vectors.json'), 'utf8'));
  const identity = fs.readFileSync(path.join(golden, vectors.closureIdentityFile), 'utf8');
  assert.equal(identity, canonical(JSON.parse(identity)));
  assert.equal(sha256(identity), vectors.closureKey);
  const manifest = fs.readFileSync(path.join(golden, vectors.manifestFile), 'utf8').slice(0, -1);
  assert.equal(manifest, canonical(JSON.parse(manifest)));
  assert.equal(sha256(manifest), vectors.manifestSha256);
});

const SURFACES = [
  ['source', root],
  ['generated claude', path.join(root, 'dist/plugins/claude/prometheus-skills-mini')],
  ['generated codex', path.join(root, 'dist/plugins/codex/prometheus-skills-mini')],
];

for (const [label, packageRoot] of SURFACES) {
  test(`corpus on ${label}`, runtime, async () => {
    const target = surface(label, packageRoot);
    for (const entry of ['adopt', 'closeEval', 'template', 'nextPhase', 'stageGate']) {
      assert.ok(fs.existsSync(target[entry]), `${label}: ${entry} entry point missing at ${target[entry]}`);
    }
    const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mini-closure ')));
    const receipt = { schema: 'kbd.conformance-receipt/v1', corpus: 'kbd-phase-closure/v1', pack: 'prometheus-skills-mini',
      surface: label, packageRoot, commit: spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
      versions: { prometheus: version(prometheusBin, ['--version']), node: process.version, sshKeygen: version('ssh', ['-V']), os: `${os.platform()} ${os.release()}` },
      cases: [], notRun: ['remote control plane', 'Windows and Linux hosts', 'installed generations (mini installs via the plugin marketplace)'] };
    const failures = [];
    try {
      for (const kase of cases) {
        const ctx = fixture(scratch, kase.id, prometheusBin);
        ctx.surface = target;
        const record = { id: kase.id, acceptance: kase.acceptance, result: 'PASS', steps: [] };
        for (const [index, spec] of kase.steps.entries()) {
          const outcome = await step(ctx, spec);
          const problems = spec.op === 'assert' ? checkAssert(ctx, spec.args ?? {}) : (outcome ? checkExpect(outcome, spec.expect) : []);
          record.steps.push({ index, op: spec.op, exit: outcome?.exit ?? null, problems });
          if (problems.length) {
            record.result = 'FAIL';
            failures.push(`${kase.id} step ${index} (${spec.op}): ${problems.join('; ')}\n  stdout: ${outcome?.stdout?.slice(-1200) ?? ''}\n  stderr: ${outcome?.stderr?.slice(-1200) ?? ''}`);
            break;
          }
        }
        receipt.cases.push(record);
      }
    } finally {
      receipt.passed = receipt.cases.filter((c) => c.result === 'PASS').length;
      receipt.total = cases.length;
      const dir = process.env.KBD_CONFORMANCE_RECEIPTS;
      if (dir) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `mini-${label.replace(/\s+/g, '-')}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`);
      }
      if (!failures.length) fs.rmSync(scratch, { recursive: true, force: true });
    }
    assert.deepEqual(failures, [], `${label}: ${failures.length} corpus case(s) failed\n${failures.join('\n')}`);
  });
}
