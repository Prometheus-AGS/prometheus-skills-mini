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
// The shape the real runtime returns, verified against `prometheus kbd status --json`.
const canonicalCli = (phaseId, phasePath = [phaseId]) => cli({ activePath: { phasePath, phaseId } });
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

// Round 5: phaseOf() looked for `phase`/`activePhase`, which the canonical payload does
// not have — it uses `activePath.phaseId`. A WORKING CLI therefore read as unavailable,
// because the check swallowed its own parse failure into "not installed".
test('the canonical activePath shape is read', async () => {
  const r = repo(JSON.stringify({ phase: 'the-boss-integration-prep' }));
  try {
    const outcome = await run({
      repoRoot: r.root,
      spawn: canonicalCli('the-boss-integration-prep', ['karpathy-logs-node', 'the-boss-integration-prep']),
    });

    assert.equal(outcome.status, 'pass');
    assert.match(outcome.summary, /the-boss-integration-prep/);
  } finally {
    r.dispose();
  }
});

// Found by running the fixed check on this repo: the projection represents a nested phase
// as `phase` (the PARENT) plus `childPointer` (the active child), so comparing `phase`
// against canonical `phaseId` compares a parent to a child and reports drift on a
// consistent tree. The real waypoint here has phase=karpathy-logs-node,
// childPointer=the-boss-integration-prep, and canonical phaseId=the-boss-integration-prep.
test('a nested phase agrees: childPointer is the active phase, not the parent', async () => {
  const r = repo(JSON.stringify({ phase: 'karpathy-logs-node', parentPhase: 'karpathy-logs-node', childPointer: 'the-boss-integration-prep' }));
  try {
    const outcome = await run({
      repoRoot: r.root,
      spawn: canonicalCli('the-boss-integration-prep', ['karpathy-logs-node', 'the-boss-integration-prep']),
    });

    assert.equal(outcome.status, 'pass', outcome.detail);
  } finally {
    r.dispose();
  }
});

test('a nested projection pointing at a DIFFERENT child still disagrees', async () => {
  const r = repo(JSON.stringify({ phase: 'karpathy-logs-node', childPointer: 'some-other-child' }));
  try {
    const outcome = await run({
      repoRoot: r.root,
      spawn: canonicalCli('the-boss-integration-prep', ['karpathy-logs-node', 'the-boss-integration-prep']),
    });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.detail, /some-other-child/);
  } finally {
    r.dispose();
  }
});

// phaseId alone, with no phasePath: this is what pins the primary reader, since a
// payload carrying both is still resolved by the fallback branch.
test('activePath.phaseId is read on its own', async () => {
  const r = repo(JSON.stringify({ phase: 'solo-phase' }));
  try {
    const outcome = await run({
      repoRoot: r.root,
      spawn: cli({ activePath: { phaseId: 'solo-phase' } }),
    });

    assert.equal(outcome.status, 'pass');
    assert.match(outcome.summary, /solo-phase/);
  } finally {
    r.dispose();
  }
});

test('a CLI that runs but returns unreadable output fails, and is not called absent', async () => {
  const r = repo(JSON.stringify({ phase: 'x' }));
  try {
    for (const stdout of ['not json at all', JSON.stringify({ schemaVersion: '2' })]) {
      const outcome = await run({ repoRoot: r.root, spawn: () => ({ status: 0, stdout, stderr: '' }) });

      assert.equal(outcome.status, 'fail', stdout);
      assert.doesNotMatch(outcome.summary, /not available|not installed/i);
    }
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
