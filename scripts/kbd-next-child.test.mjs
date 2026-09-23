// Smoke coverage for scripts/kbd-next-child.mjs, spawned as the real entry point (no shell), in
// an isolated scratch cwd so it never touches this repo's own live .kbd-orchestrator/ state.
// `isRuntimeAuthoritative` reads `.kbd-orchestrator/current-waypoint.json` relative to `root`
// ('.' — i.e. `cwd`), so a scratch cwd with a non-runtime waypoint exercises the legacy branch.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-next-child.mjs');
const run = (args, cwd) => spawnExecutable(process.execPath, [script, ...args], { cwd, env: { ...process.env } });

function world(waypoint) {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-next-child-'));
  mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
  writeFileSync(path.join(root, '.kbd-orchestrator', 'current-waypoint.json'), JSON.stringify(waypoint));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('refuses with no current-waypoint.json', () => {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-next-child-empty-'));
  try {
    const result = run([], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no current-waypoint\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('refuses when no children are defined', () => {
  const w = world({ phase: 'phase-1', childPhases: [], childPointer: null });
  try {
    const result = run([], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no children defined/);
  } finally {
    w.dispose();
  }
});

test('advances childPointer to the first child with no argument', () => {
  const w = world({ phase: 'phase-1', childPhases: ['a', 'b'], childPointer: null, path: ['phase-1'] });
  try {
    const result = run([], w.root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /now on phase-1\/a/);
    const waypoint = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), 'utf8'));
    assert.equal(waypoint.childPointer, 'a');
  } finally {
    w.dispose();
  }
});

test('refuses to advance past the last child', () => {
  const w = world({ phase: 'phase-1', childPhases: ['a', 'b'], childPointer: 'b', path: ['phase-1', 'b'] });
  try {
    const result = run([], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already on last child/);
  } finally {
    w.dispose();
  }
});

test('jumps to an explicitly named child', () => {
  const w = world({ phase: 'phase-1', childPhases: ['a', 'b'], childPointer: 'a', path: ['phase-1', 'a'] });
  try {
    const result = run(['b'], w.root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /now on phase-1\/b/);
  } finally {
    w.dispose();
  }
});
