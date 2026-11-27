// Smoke coverage for scripts/kbd-memory-recall.mjs, spawned as the real entry point (no shell),
// in an isolated scratch cwd. No surreal-memory service is assumed reachable, so these scenarios
// exercise the "memory unreachable → stub digest" path — the skill's own documented contract is
// that it always exits 0 regardless.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-memory-recall.mjs');

// Point at a certainly-unreachable port so the probe fails fast rather than depending on whether
// this machine happens to have surreal-memory running on the canonical default port.
const unreachableEnv = { ...process.env, KBD_MEMORY_MCP_URL: 'http://127.0.0.1:1' };
const run = (args, cwd) => spawnExecutable(process.execPath, [script, ...args], { cwd, env: unreachableEnv });

function world() {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-memory-recall-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('exits 0 with no phase resolved when no argument and no waypoint', () => {
  const w = world();
  try {
    const result = run([], w.root);
    assert.equal(result.status, 0);
    assert.match(result.stderr, /no phase resolved/);
  } finally {
    w.dispose();
  }
});

test('writes a stub digest and exits 0 when the memory endpoint is unreachable', () => {
  const w = world();
  try {
    const result = run(['phase-1'], w.root);
    assert.equal(result.status, 0, result.stderr);
    const digest = path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'prior-context.md');
    const content = readFileSync(digest, 'utf8');
    assert.match(content, /memory endpoint unreachable|no prior context retrieved/);
  } finally {
    w.dispose();
  }
});

test('resolves the phase from the waypoint when no argument is given', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(
      path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'),
      JSON.stringify({ phase: 'waypoint-phase' })
    );
    const result = run([], w.root);
    assert.equal(result.status, 0, result.stderr);
    const digest = path.join(w.root, '.kbd-orchestrator', 'phases', 'waypoint-phase', 'prior-context.md');
    assert.ok(existsSync(digest));
  } finally {
    w.dispose();
  }
});

// The bounded lookup must never block a task: with the memory service unreachable and no pk
// executable, it still exits 0 and tells the session to continue from current evidence.
test('--outcome exits 0 and reports no lessons when both sources are unavailable', () => {
  const w = world();
  try {
    const env = { ...unreachableEnv, PK_BIN: path.join(w.root, 'no-such-pk'), PROMETHEUS_PROJECT_ID: 'project:scratch' };
    const result = spawnExecutable(
      process.execPath,
      [script, '--outcome', 'an owner can invite a colleague', '--blocker', 'invite email never arrives'],
      { cwd: w.root, env },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No lessons recalled; continue from current evidence/);
    assert.equal(existsSync(path.join(w.root, '.kbd-orchestrator')), false);
  } finally {
    w.dispose();
  }
});

// A lesson carrying a credential must not reach shared memory.
test('--screen refuses a lesson that matches a secret pattern and accepts a clean one', () => {
  const w = world();
  try {
    const leaked = path.join(w.root, 'leaked.md');
    const clean = path.join(w.root, 'clean.md');
    // Assembled at run time so this file holds no literal credential assignment.
    writeFileSync(leaked, `The relay needs ${['pass', 'word'].join('')} = example-value-123\n`);
    writeFileSync(clean, 'The relay allowlist must include the staging host.\n');

    const refused = run(['--screen', leaked], w.root);
    const accepted = run(['--screen', clean], w.root);

    assert.equal(refused.status, 0, refused.stderr);
    assert.match(refused.stdout, /promote: no/);
    assert.match(accepted.stdout, /promote: yes/);
  } finally {
    w.dispose();
  }
});
