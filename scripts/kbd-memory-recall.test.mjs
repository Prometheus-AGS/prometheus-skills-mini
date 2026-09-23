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
