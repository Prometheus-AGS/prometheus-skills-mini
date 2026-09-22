import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { outcomeConformance, checkConformance } from './contract.mjs';
import { checks } from './kbd.mjs';

const check = checks.find((c) => c.id === 'mini-kbd-state');
assert.ok(check, 'mini-kbd-state must exist');

const run = async (ctx) => {
  const outcome = await check.run(ctx);
  assert.deepEqual(outcomeConformance(outcome, check.id), [], JSON.stringify(outcome));
  return outcome;
};

const repo = (waypoint) => {
  const root = mkdtempSync(path.join(tempDir(), 'doctor-kbd-'));
  if (waypoint !== undefined) {
    mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(root, '.kbd-orchestrator', 'current-waypoint.json'), waypoint);
  }
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const cli = (payload) => () => ({ status: 0, stdout: JSON.stringify(payload), stderr: '' });
const noCli = () => () => ({ status: 127, stdout: '', stderr: 'command not found' });

test('the CLI and the projection agreeing is a pass', async () => {
  const r = repo(JSON.stringify({ phase: 'karpathy-logs-node' }));
  try {
    const outcome = await run({ repoRoot: r.root, spawn: cli({ phase: { id: 'karpathy-logs-node' } }) });

    assert.equal(outcome.status, 'pass');
    assert.match(outcome.summary, /karpathy-logs-node/);
  } finally {
    r.dispose();
  }
});

// The canonical runtime is the source of truth and the waypoint is a projection. When they
// disagree, something has written state out of band — exactly what the spec forbids.
test('the CLI and the projection disagreeing is a failure, naming both', async () => {
  const r = repo(JSON.stringify({ phase: 'stale-phase' }));
  try {
    const outcome = await run({ repoRoot: r.root, spawn: cli({ phase: { id: 'karpathy-logs-node' } }) });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.detail, /stale-phase/);
    assert.match(outcome.detail, /karpathy-logs-node/);
  } finally {
    r.dispose();
  }
});

test('no CLI but a parseable projection is a warning, not a failure', async () => {
  const r = repo(JSON.stringify({ phase: 'karpathy-logs-node' }));
  try {
    const outcome = await run({ repoRoot: r.root, spawn: noCli() });

    assert.equal(outcome.status, 'warn');
    assert.match(outcome.summary + outcome.detail, /karpathy-logs-node/);
  } finally {
    r.dispose();
  }
});

test('an unparseable projection is a failure that names the file', async () => {
  const r = repo('{ not json');
  try {
    const outcome = await run({ repoRoot: r.root, spawn: noCli() });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.summary + outcome.detail, /current-waypoint\.json/);
  } finally {
    r.dispose();
  }
});

test('neither present is a skip: this may simply not be a KBD project', async () => {
  const r = repo(undefined);
  try {
    const outcome = await run({ repoRoot: r.root, spawn: noCli() });

    assert.equal(outcome.status, 'skip');
  } finally {
    r.dispose();
  }
});

test('the check satisfies the contract statically', () => {
  for (const c of checks) assert.deepEqual(checkConformance(c), [], c.id);
});
