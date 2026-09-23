// Port of shared/lib/bottleneck-guard.sh (prometheus-skill-pack, 37 lines).
//
// A portable adapter over `prometheus kbd guard evaluate` — the runtime CLI owns all policy and
// state mutation; this module only decides where a boundary sits and shapes the call. Every
// external effect (spawning `prometheus`, reading the waypoint) is injected via `ctx`, matching
// `lib/doctor/kbd.mjs`'s pattern, so the boundary logic is testable without a real binary.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import {
  isBottleneckAvailable,
  isBottleneckActive,
  evaluateBottleneck,
  bottleneckSignalText,
} from './bottleneck-guard.mjs';

const repo = (waypoint) => {
  const root = mkdtempSync(path.join(tempDir(), 'bottleneck-guard-'));
  if (waypoint !== undefined) {
    mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(root, '.kbd-orchestrator', 'current-waypoint.json'), waypoint);
  }
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

// `prometheus kbd --help` output shape, trimmed to the one line the source greps for.
const helpWithGuard = () => ({ status: 0, stdout: '  guard        Evaluate lifecycle boundaries\n', stderr: '' });
const helpWithoutGuard = () => ({ status: 0, stdout: '  status       Show canonical state\n', stderr: '' });
const noCli = () => ({ status: 127, stdout: '', stderr: 'command not found' });

test('isBottleneckAvailable is true when the CLI exists and advertises guard', () => {
  const spawn = (name, args) => {
    assert.equal(name, 'prometheus');
    assert.deepEqual(args, ['kbd', '--help']);
    return helpWithGuard();
  };
  assert.equal(isBottleneckAvailable({ spawn }), true);
});

test('isBottleneckAvailable is false when the CLI is absent', () => {
  assert.equal(isBottleneckAvailable({ spawn: noCli }), false);
});

test('isBottleneckAvailable is false when the installed CLI has no guard subcommand', () => {
  assert.equal(isBottleneckAvailable({ spawn: helpWithoutGuard }), false);
});

test('isBottleneckActive requires availability, a runtime-owned waypoint, and a live status call', () => {
  const r = repo(JSON.stringify({ generatedBy: 'kbd-runtime' }));
  try {
    const spawn = (name, args) => {
      if (args[0] === 'kbd' && args[1] === '--help') return helpWithGuard();
      if (args.includes('status')) return { status: 0, stdout: '{}', stderr: '' };
      throw new Error(`unexpected spawn: ${name} ${args.join(' ')}`);
    };
    assert.equal(isBottleneckActive(r.root, { spawn }), true);
  } finally {
    r.dispose();
  }
});

test('isBottleneckActive is false when the waypoint is not runtime-owned', () => {
  const r = repo(JSON.stringify({ generatedBy: 'hand-written' }));
  try {
    assert.equal(isBottleneckActive(r.root, { spawn: helpWithGuard }), false);
  } finally {
    r.dispose();
  }
});

test('isBottleneckActive is false when no waypoint exists', () => {
  const r = repo();
  try {
    assert.equal(isBottleneckActive(r.root, { spawn: helpWithGuard }), false);
  } finally {
    r.dispose();
  }
});

test('evaluateBottleneck shapes the guard-evaluate call, --precommit only when requested', () => {
  let captured;
  const spawn = (name, args) => {
    if (args[0] === 'kbd' && args[1] === '--help') return helpWithGuard();
    captured = { name, args };
    return { status: 0, stdout: '{"exactSignal":"ok"}', stderr: '' };
  };

  const result = evaluateBottleneck('task', 'before', 'change-007', false, { spawn, root: '/repo' });

  assert.equal(captured.name, 'prometheus');
  assert.deepEqual(captured.args, [
    'kbd', '--path', '/repo', 'guard', 'evaluate',
    '--boundary', 'task', '--edge', 'before', '--subject', 'change-007',
    '--json', '--repair-projections',
  ]);
  assert.equal(result.status, 0);
});

test('evaluateBottleneck appends --precommit when the flag is set', () => {
  let captured;
  const spawn = (name, args) => {
    if (args[0] === 'kbd' && args[1] === '--help') return helpWithGuard();
    captured = args;
    return { status: 0, stdout: '{}', stderr: '' };
  };

  evaluateBottleneck('phase', 'after', 'the-boss-shipping-and-settings', true, { spawn, root: '.' });

  assert.equal(captured.at(-1), '--precommit');
});

test('evaluateBottleneck returns exit code 2 when the guard subcommand is unavailable', () => {
  const result = evaluateBottleneck('task', 'before', 'x', false, { spawn: noCli, root: '.' });
  assert.equal(result.status, 2);
});

test('bottleneckSignalText extracts the signal and position summary', () => {
  const output = JSON.stringify({
    exactSignal: 'Proceed with task change-007',
    position: 'karpathy-logs-node/the-boss-integration-prep',
    authoritativeRevision: 348,
  });

  const text = bottleneckSignalText(output);

  assert.equal(
    text,
    'Proceed with task change-007\nPosition: karpathy-logs-node/the-boss-integration-prep @ revision 348'
  );
});
