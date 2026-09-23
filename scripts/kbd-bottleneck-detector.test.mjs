// Smoke coverage for scripts/kbd-bottleneck-detector.mjs, spawned as the real entry point (no
// shell), matching scripts/doctor.test.mjs's precedent. Argv parsing and refusal paths are
// asserted directly; `status` additionally asserts the real reshape against whatever `prometheus`
// reports for THIS repo when the CLI happens to be on PATH (it commonly is, since this repo runs
// its own KBD session) — the live-guard-evaluation boundary itself is already covered at the unit
// level by lib/kbd/bottleneck-guard.test.mjs via an injected spawn.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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
