// Smoke coverage for scripts/kbd-child-exit.mjs, spawned as the real entry point (no shell), in
// an isolated scratch cwd (never touches this repo's own live .kbd-orchestrator/ state).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-child-exit.mjs');
const run = (args, cwd) => spawnExecutable(process.execPath, [script, ...args], { cwd, env: { ...process.env } });

function world() {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-child-exit-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

function writeWaypoint(root, waypoint) {
  mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
  writeFileSync(path.join(root, '.kbd-orchestrator', 'current-waypoint.json'), JSON.stringify(waypoint));
}

test('refuses with no current-waypoint.json', () => {
  const w = world();
  try {
    const result = run([], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no current-waypoint\.json/);
  } finally {
    w.dispose();
  }
});

test('exit refuses when path depth is 1 (not inside a child)', () => {
  const w = world();
  try {
    writeWaypoint(w.root, { phase: 'phase-1', childPointer: null, path: ['phase-1'] });
    mkdirSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1'), { recursive: true });
    const result = run([], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not inside a child/);
  } finally {
    w.dispose();
  }
});

test('exit refuses when the child has no reflection.md', () => {
  const w = world();
  try {
    writeWaypoint(w.root, { phase: 'phase-1', childPointer: 'c1', path: ['phase-1', 'c1'] });
    mkdirSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1'), { recursive: true });
    mkdirSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'children', 'c1'), { recursive: true });
    const result = run([], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no reflection\.md/);
  } finally {
    w.dispose();
  }
});

test('exit writes handoff-out.md, rolls up, and pops path[] when reflection.md exists', () => {
  const w = world();
  try {
    writeWaypoint(w.root, { phase: 'phase-1', childPointer: 'c1', path: ['phase-1', 'c1'] });
    const phaseDir = path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1');
    const childDir = path.join(phaseDir, 'children', 'c1');
    mkdirSync(childDir, { recursive: true });
    writeFileSync(path.join(childDir, 'reflection.md'), '# Reflection\n');
    writeFileSync(
      path.join(childDir, 'progress.json'),
      JSON.stringify({ completion: { implementation: { status: 'COMPLETE' } } })
    );
    writeFileSync(path.join(phaseDir, 'progress.json'), JSON.stringify({ phase: 'phase-1' }));

    const result = run([], w.root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /exited phase-1/);
    assert.ok(existsSync(path.join(childDir, 'handoff-out.md')));

    const waypoint = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), 'utf8'));
    assert.deepEqual(waypoint.path, ['phase-1']);
    assert.equal(waypoint.childPointer, null);
  } finally {
    w.dispose();
  }
});

test('--enter refuses when no childPointer is selected', () => {
  const w = world();
  try {
    writeWaypoint(w.root, { phase: 'phase-1', childPointer: null, path: ['phase-1'] });
    const result = run(['--enter'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no childPointer selected/);
  } finally {
    w.dispose();
  }
});
