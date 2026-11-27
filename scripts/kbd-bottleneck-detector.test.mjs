// Smoke coverage for scripts/kbd-bottleneck-detector.mjs, spawned as the real entry point (no
// shell), matching scripts/doctor.test.mjs's precedent. Argv parsing and refusal paths are
// asserted directly; `status` additionally asserts the real reshape against whatever `prometheus`
// reports for THIS repo when the CLI happens to be on PATH (it commonly is, since this repo runs
// its own KBD session) — the live-guard-evaluation boundary itself is already covered at the unit
// level by lib/kbd/bottleneck-guard.test.mjs via an injected spawn.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-bottleneck-detector.mjs');
const run = (args) => spawnExecutable(process.execPath, [script, ...args], { cwd: repoRoot });

test('an unknown mode is refused with a usable message and exit 64', () => {
  const result = run(['wat']);
  assert.equal(result.status, 64);
  assert.match(result.stderr, /unknown mode/);
});

test('evaluate without enough arguments is refused with a usage message', () => {
  const result = run(['evaluate', 'task']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /usage: evaluate/);
});

test('status either reshapes a real prometheus response or refuses cleanly (never a stack trace)', () => {
  const result = run(['status']);
  assert.doesNotMatch(result.stderr, /at .*\.mjs:\d+/);
  if (result.status === 0) {
    const reshaped = JSON.parse(result.stdout);
    for (const key of [
      'revision', 'lifecycle', 'position', 'exactNextWork', 'outstandingObligations',
      'latestBoundaryReceipts', 'activeGates', 'latestGateReceipts', 'unresolvedBlockers',
    ]) {
      assert.ok(key in reshaped, `reshaped status is missing ${key}`);
    }
    assert.ok(Array.isArray(reshaped.unresolvedBlockers), 'unresolvedBlockers must always be an array');
  }
});

// `advise` must work where the `prometheus` CLI is absent, and must change nothing: PATH is
// emptied so no helper can be found, and the records file is compared before and after.
test('advise recommends one disposition without the prometheus CLI and leaves its input unchanged', () => {
  const directory = mkdtempSync(path.join(tempDir(), 'kbd-advise-'));
  try {
    const file = path.join(directory, 'attempts.json');
    const record = { blocker: 'release-signing', completed: true, waitingOnApproval: false, evidence: 'ci-run-812', kind: 'setup' };
    const records = `${JSON.stringify([record, record])}\n`;
    writeFileSync(file, records);

    const result = spawnExecutable(process.execPath, [script, 'advise', file], { cwd: directory, env: { ...process.env, PATH: '' } });

    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.advisory, true);
    assert.equal(parsed.advice[0].recommendation.disposition, 'bounded-setup-repair');
    assert.equal(readFileSync(file, 'utf8'), records);
    assert.deepEqual(readdirSync(directory), ['attempts.json']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('advise refuses an unreadable records file without a stack trace', () => {
  const result = run(['advise', path.join(repoRoot, 'no-such-attempts.json')]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cannot read attempt records/);
  assert.doesNotMatch(result.stderr, /at .*\.mjs:\d+/);
});
