// Smoke coverage for scripts/kbd-new-phase.mjs, spawned as the real entry point (no shell), in
// an isolated scratch cwd (never touches this repo's own live .kbd-orchestrator/ state).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-new-phase.mjs');
const run = (args, cwd) => spawnExecutable(process.execPath, [script, ...args], { cwd, env: { ...process.env } });

function world() {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-new-phase-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('refuses an invalid phase name', () => {
  const w = world();
  try {
    const result = run(['Not_Valid!'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid name/);
  } finally {
    w.dispose();
  }
});

test('refuses a name collision', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1'), { recursive: true });
    const result = run(['phase-1'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /phase already exists/);
  } finally {
    w.dispose();
  }
});

test('creates goals.md, progress.json, and flips the waypoint + project.json', () => {
  const w = world();
  try {
    const result = run(['phase-1', 'first goal', 'second goal'], w.root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ready for \/kbd-assess/);

    const phaseDir = path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1');
    const goals = readFileSync(path.join(phaseDir, 'goals.md'), 'utf8');
    assert.match(goals, /- first goal/);
    assert.match(goals, /- second goal/);

    const progress = JSON.parse(readFileSync(path.join(phaseDir, 'progress.json'), 'utf8'));
    assert.equal(progress.phase, 'phase-1');
    assert.equal(progress.schemaVersion, '2');

    const waypoint = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), 'utf8'));
    assert.equal(waypoint.phase, 'phase-1');
    assert.equal(waypoint.status, 'assessment_ready');
    assert.deepEqual(waypoint.path, ['phase-1']);

    const project = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'project.json'), 'utf8'));
    assert.equal(project.activePhase, 'phase-1');
  } finally {
    w.dispose();
  }
});

test('a second phase preserves previousPhase and bumps revision', () => {
  const w = world();
  try {
    run(['phase-1'], w.root);
    const result = run(['phase-2'], w.root);
    assert.equal(result.status, 0, result.stderr);
    const waypoint = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), 'utf8'));
    assert.equal(waypoint.phase, 'phase-2');
    assert.equal(waypoint.previousPhase, 'phase-1');
    assert.equal(waypoint.revision, 2);
  } finally {
    w.dispose();
  }
});

test('refuses when the existing waypoint is malformed JSON, and writes nothing', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), '{ not json');
    const result = run(['phase-1'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /malformed waypoint/);
    assert.equal(existsSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1')), false);
  } finally {
    w.dispose();
  }
});
