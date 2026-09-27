// Smoke coverage for scripts/kbd-next-phase.mjs, spawned as the real entry point (no shell), in
// an isolated scratch cwd (never touches this repo's own live .kbd-orchestrator/ state).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-next-phase.mjs');
const run = (args, cwd) => spawnExecutable(process.execPath, [script, ...args], { cwd, env: { ...process.env } });

function snapshotTree(root) {
  const snapshot = [];

  function visit(directory) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isDirectory()) {
        snapshot.push(`directory:${relative}`);
        visit(absolute);
      } else {
        snapshot.push(`file:${relative}:${readFileSync(absolute).toString('base64')}`);
      }
    }
  }

  visit(root);
  return snapshot;
}

function world() {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-next-phase-'));
  mkdirSync(path.join(root, '.kbd-orchestrator', 'phases', 'phase-1'), { recursive: true });
  writeFileSync(
    path.join(root, '.kbd-orchestrator', 'current-waypoint.json'),
    JSON.stringify({ phase: 'phase-1', stage: 'reflect_complete', changesTotal: 3, changesCompleted: 3 })
  );
  writeFileSync(path.join(root, '.kbd-orchestrator', 'project.json'), JSON.stringify({ name: 'demo-project' }));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('help exits zero with usage and never mutates KBD state or artifacts', () => {
  const w = world();
  const emptyRoot = mkdtempSync(path.join(tempDir(), 'kbd-next-phase-help-empty-'));
  try {
    writeFileSync(
      path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'reflection.md'),
      '# Reflection\n\n## Recommended Next Phase\n\nKeep this artifact unchanged.\n'
    );
    const before = snapshotTree(w.root);

    for (const flag of ['-h', '--help']) {
      const result = run([flag], w.root);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Usage: node scripts\/kbd-next-phase\.mjs \[phase-name\]/);
      assert.equal(result.stderr, '');
      assert.deepEqual(snapshotTree(w.root), before);
    }

    const emptyBefore = snapshotTree(emptyRoot);
    const emptyResult = run(['--help'], emptyRoot);
    assert.equal(emptyResult.status, 0, emptyResult.stderr);
    assert.match(emptyResult.stdout, /Usage:/);
    assert.equal(emptyResult.stderr, '');
    assert.deepEqual(snapshotTree(emptyRoot), emptyBefore);
  } finally {
    w.dispose();
    rmSync(emptyRoot, { recursive: true, force: true });
  }
});

test('errors when current-waypoint.json is absent', () => {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-next-phase-empty-'));
  try {
    const result = run([], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /current-waypoint\.json not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('seeds a new phase from an explicit name when no reflection.md exists', () => {
  const w = world();
  try {
    const result = run(['ux-refresh'], w.root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /KBD NEXT PHASE/);
    assert.match(result.stdout, /New phase:\s+ux-refresh/);

    const goals = readFileSync(
      path.join(w.root, '.kbd-orchestrator', 'phases', 'ux-refresh', 'goals.md'),
      'utf8'
    );
    assert.match(goals, /No seed content found in reflection/);

    const waypoint = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), 'utf8'));
    assert.equal(waypoint.phase, 'ux-refresh');
    assert.equal(waypoint.previousPhase, 'phase-1');
  } finally {
    w.dispose();
  }
});

test('extracts the "Recommended Next Phase" section from reflection.md as seed content', () => {
  const w = world();
  try {
    writeFileSync(
      path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'reflection.md'),
      [
        '# Reflection',
        '',
        '## Summary',
        '',
        'Everything went fine.',
        '',
        '## Recommended Next Phase',
        '',
        '- polish the dashboard',
        '- ship dark mode',
        '',
      ].join('\n')
    );
    const result = run(['phase-2-polish'], w.root);
    assert.equal(result.status, 0, result.stderr);
    const goals = readFileSync(
      path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-2-polish', 'goals.md'),
      'utf8'
    );
    assert.match(goals, /polish the dashboard/);
    assert.match(goals, /ship dark mode/);
    assert.doesNotMatch(goals, /Everything went fine/);
  } finally {
    w.dispose();
  }
});

test('refuses a name collision with an existing phase directory', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'taken'), { recursive: true });
    const result = run(['taken'], w.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists/);
  } finally {
    w.dispose();
  }
});
