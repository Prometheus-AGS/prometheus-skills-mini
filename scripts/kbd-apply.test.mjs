// Integration coverage for scripts/kbd-apply.mjs, spawned as the real entry point (no shell),
// matching scripts/doctor.test.mjs's precedent for a carried CLI script.
//
// The most safety-critical scenario here is the "one task at a time" invariant: every
// begin-task/end-task boundary must fire its KBD hook and sync progress.json — never silently
// skip either. The mutation-check test below proves that by asserting on BOTH effects
// independently (the hooks-status.json bookkeeping hooksFire itself writes, and the
// progress.json `tasks_done`/`tasks_total` sync kbd-apply.mjs owns) against a native-kbd backend
// driven end-to-end through the real CLI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const kbdApply = path.join(repoRoot, 'scripts', 'kbd-apply.mjs');

// hooksFire (lib/kbd/hooks.mjs) matches against a builtin hooks.json at
// $KBD_ORCHESTRATOR_ROOT/hooks/hooks.json — with none configured, nothing matches and no
// bookkeeping is written, which is correct behaviour, not a bug. The mutation-check test below
// needs something to actually fire, so it points KBD_ORCHESTRATOR_ROOT at a scratch dir carrying
// one builtin entry for every kind:edge pair (a JSON {program,args} command runHookCommand can
// execute with no shell — see lib/kbd/hook-command.mjs).
function withOrchestratorRoot(root) {
  const orchestratorRoot = path.join(root, '.orchestrator-root');
  mkdirSync(path.join(orchestratorRoot, 'hooks'), { recursive: true });
  writeFileSync(
    path.join(orchestratorRoot, 'hooks', 'hooks.json'),
    JSON.stringify({
      hooks: [
        {
          id: 'test-reporter',
          event: '*:*',
          mode: 'augment',
          action: { command: JSON.stringify({ program: process.execPath, args: ['-e', '0'] }) },
        },
      ],
    })
  );
  return orchestratorRoot;
}

const run = (args, cwd, orchestratorRoot) =>
  spawnExecutable(process.execPath, [kbdApply, ...args], {
    cwd,
    env: { ...process.env, ...(orchestratorRoot ? { KBD_ORCHESTRATOR_ROOT: orchestratorRoot } : {}) },
  });

function world() {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-apply-'));
  const changeDir = path.join(root, '.kbd-orchestrator', 'changes', 'c1');
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(
    path.join(changeDir, 'tasks.json'),
    JSON.stringify({
      changeId: 'c1',
      tasks: [
        { id: '1', title: 'first task', done: false, doneAt: null, doneBy: null },
        { id: '2', title: 'second task', done: false, doneAt: null, doneBy: null },
      ],
    })
  );
  writeFileSync(path.join(changeDir, 'spec.md'), '# spec');

  const phaseDir = path.join(root, '.kbd-orchestrator', 'phases', 'phase-1');
  mkdirSync(phaseDir, { recursive: true });
  writeFileSync(
    path.join(phaseDir, 'progress.json'),
    JSON.stringify({
      schemaVersion: '2',
      phase: 'phase-1',
      childPointer: null,
      changes: [{ id: 'c1', tasks_done: 0, tasks_total: 2 }],
    })
  );
  writeFileSync(
    path.join(root, '.kbd-orchestrator', 'current-waypoint.json'),
    JSON.stringify({ phase: 'phase-1', childPointer: null, path: ['phase-1'] })
  );

  return { root, changeDir, phaseDir, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('detect resolves native-kbd for a change dir carrying tasks.json', () => {
  const w = world();
  try {
    const result = run(['detect'], w.root);
    assert.equal(result.stdout.trim(), 'native-kbd');
  } finally {
    w.dispose();
  }
});

test('list prints TSV rows for the native-kbd backend', () => {
  const w = world();
  try {
    const result = run(['list', 'c1'], w.root);
    assert.equal(result.status, 0);
    const lines = result.stdout.trim().split('\n');
    assert.deepEqual(lines, ['1\t0\tfirst task', '2\t0\tsecond task']);
  } finally {
    w.dispose();
  }
});

test('progress prints "total complete remaining"', () => {
  const w = world();
  try {
    const result = run(['progress', 'c1'], w.root);
    assert.equal(result.stdout.trim(), '2 0 2');
  } finally {
    w.dispose();
  }
});

test('begin-task then end-task marks the task done in the backend and prints the position signals', () => {
  const w = world();
  try {
    const begin = run(['begin-task', 'c1', '1', '1', '2', 'first', 'task'], w.root);
    assert.equal(begin.status, 0, begin.stderr);
    assert.match(begin.stdout, /Starting task 1 out of 2:\s+first task/);

    const end = run(['end-task', 'c1', '1', '1', '2', 'first', 'task'], w.root);
    assert.equal(end.status, 0, end.stderr);
    assert.match(end.stdout, /Completed task 1 out of 2:\s+first task/);
    assert.match(end.stdout, /Remaining tasks after task 1: 1 out of 2/);

    const tasks = JSON.parse(readFileSync(path.join(w.changeDir, 'tasks.json'), 'utf8'));
    assert.equal(tasks.tasks[0].done, true);
    assert.equal(tasks.tasks[1].done, false);
  } finally {
    w.dispose();
  }
});

test('verify fails while a task remains, passes once all tasks are done', () => {
  const w = world();
  try {
    assert.equal(run(['verify', 'c1'], w.root).status, 1);

    run(['begin-task', 'c1', '1', '1', '2', 'first'], w.root);
    run(['end-task', 'c1', '1', '1', '2', 'first'], w.root);
    run(['begin-task', 'c1', '2', '2', '2', 'second'], w.root);
    run(['end-task', 'c1', '2', '2', '2', 'second'], w.root);

    const verify = run(['verify', 'c1'], w.root);
    assert.equal(verify.status, 0, verify.stderr);
    assert.match(verify.stdout, /verify: PASS/);
  } finally {
    w.dispose();
  }
});

test('archive moves the change directory under changes/archive/', () => {
  const w = world();
  try {
    run(['begin-task', 'c1', '1', '1', '2', 'first'], w.root);
    run(['end-task', 'c1', '1', '1', '2', 'first'], w.root);
    run(['begin-task', 'c1', '2', '2', '2', 'second'], w.root);
    run(['end-task', 'c1', '2', '2', '2', 'second'], w.root);

    const archive = run(['archive', 'c1'], w.root);
    assert.equal(archive.status, 0, archive.stderr);
    assert.equal(existsSync(w.changeDir), false);
  } finally {
    w.dispose();
  }
});

// ---------------------------------------------------------------------------
// The "one task at a time" invariant: every task boundary fires its hook AND syncs
// progress.json. Both effects are asserted independently so a version that skips either one
// is caught — this is the scenario named in the task's own instruction as the one to
// mutation-check before declaring the port done.
// ---------------------------------------------------------------------------

test('end-task fires the task:after hook (hooks-status.json bookkeeping) AND syncs progress.json — both effects, independently', () => {
  const w = world();
  try {
    const orchestratorRoot = withOrchestratorRoot(w.root);
    run(['begin-task', 'c1', '1', '1', '2', 'first'], w.root, orchestratorRoot);
    run(['end-task', 'c1', '1', '1', '2', 'first'], w.root, orchestratorRoot);

    // Effect 1: the hook fire wrote hooks-status.json under the active phase dir (hooksFire's
    // own bookkeeping — lib/kbd/hooks.mjs's updateStatus/appendLog).
    const hooksStatusFile = path.join(w.phaseDir, 'hooks-status.json');
    assert.ok(existsSync(hooksStatusFile), 'hooks-status.json was not written — task:after hook did not fire');
    const hooksStatus = JSON.parse(readFileSync(hooksStatusFile, 'utf8'));
    assert.ok(hooksStatus.totalRuns > 0, 'hooks-status.json totalRuns is 0 — no hook actually ran');
    assert.equal(hooksStatus.lastRun.kind, 'task');
    assert.equal(hooksStatus.lastRun.edge, 'after');

    // Effect 2: progress.json's changes[].tasks_done was synced from the backend's authoritative
    // count (kbd-apply.mjs's own syncProgress, independent of the hook fire above).
    const progress = JSON.parse(readFileSync(path.join(w.phaseDir, 'progress.json'), 'utf8'));
    const changeRow = progress.changes.find((c) => c.id === 'c1');
    assert.equal(changeRow.tasks_done, 1, 'progress.json was not synced after end-task');
    assert.equal(changeRow.tasks_total, 2);
  } finally {
    w.dispose();
  }
});
