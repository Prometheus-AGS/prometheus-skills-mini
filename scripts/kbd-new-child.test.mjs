// Smoke coverage for scripts/kbd-new-child.mjs, spawned as the real entry point (no shell), in
// an isolated scratch cwd (never touches this repo's own live .kbd-orchestrator/ state).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-new-child.mjs');
const run = (args, cwd) => spawnExecutable(process.execPath, [script, ...args], { cwd, env: { ...process.env } });

function world() {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-new-child-'));
  mkdirSync(path.join(root, '.kbd-orchestrator', 'phases', 'phase-1'), { recursive: true });
  writeFileSync(
    path.join(root, '.kbd-orchestrator', 'current-waypoint.json'),
    JSON.stringify({ phase: 'phase-1', childPointer: null, path: ['phase-1'], sourceTool: 'test' })
  );
  writeFileSync(
    path.join(root, '.kbd-orchestrator', 'phases', 'phase-1', 'progress.json'),
    JSON.stringify({ phase: 'phase-1', childPhases: [] })
  );
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('refuses an invalid child name', () => {
  const w = world();
  try {
    const result = run(['Not Valid'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid name/);
  } finally {
    w.dispose();
  }
});

test('refuses with no current-waypoint.json', () => {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-new-child-empty-'));
  try {
    const result = run(['auth-refactor'], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no current-waypoint\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('creates a child under phases/<phase>/children/<child> with goals.md, handoff-in.md, scope.json', () => {
  const w = world();
  try {
    const result = run(['auth-refactor', 'split user-model', 'migrate sessions'], w.root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ready for \/kbd-assess/);

    const childDir = path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'children', 'auth-refactor');
    const goals = readFileSync(path.join(childDir, 'goals.md'), 'utf8');
    assert.match(goals, /split user-model/);
    assert.match(goals, /migrate sessions/);
    assert.ok(existsSync(path.join(childDir, 'handoff-in.md')));

    const scope = JSON.parse(readFileSync(path.join(childDir, 'scope.json'), 'utf8'));
    assert.ok(scope.allowedWritePaths[0].includes('auth-refactor'));

    const progress = JSON.parse(readFileSync(path.join(childDir, 'progress.json'), 'utf8'));
    assert.equal(progress.phase, 'auth-refactor');
    assert.equal(progress.parentPhase, 'phase-1');

    const parentProgress = JSON.parse(
      readFileSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'progress.json'), 'utf8')
    );
    assert.deepEqual(parentProgress.childPhases, ['auth-refactor']);
    assert.equal(parentProgress.childPointer, 'auth-refactor');

    const waypoint = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), 'utf8'));
    assert.deepEqual(waypoint.path, ['phase-1', 'auth-refactor']);
  } finally {
    w.dispose();
  }
});

test('refuses a duplicate child name already in childPhases', () => {
  const w = world();
  try {
    run(['auth-refactor'], w.root);
    const result = run(['auth-refactor'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists under/);
  } finally {
    w.dispose();
  }
});

test('refuses beyond maxChildDepth', () => {
  const w = world();
  try {
    writeFileSync(path.join(w.root, '.kbd-orchestrator', 'project.json'), JSON.stringify({ maxChildDepth: 1 }));
    const result = run(['too-deep'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /maxChildDepth/);
  } finally {
    w.dispose();
  }
});
