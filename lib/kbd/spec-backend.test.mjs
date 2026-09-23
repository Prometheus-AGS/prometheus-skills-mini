// Test-first port of the SpecBackend contract from kbd-apply.sh (prometheus-skill-pack, 602
// lines) — see spec-backend.mjs's header comment for the full judgment-call log. Covers backend
// detection (pinned override, per-change scoping, repo-wide fallback), the native-kbd adapter
// (the only adapter this repo can fully own — pure JSON, no external CLI), and the OpenSpec
// adapter's JSON-shape mapping (the `openspec` CLI call itself is injected via `ctx.spawn`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import {
  detectBackend,
  nkList,
  nkProgress,
  nkMarkDone,
  nkVerify,
  nkArchive,
  osList,
  osProgress,
  osMarkDone,
  osVerify,
  osArchive,
} from './spec-backend.mjs';

const world = () => {
  const root = mkdtempSync(path.join(tempDir(), 'spec-backend-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};

// ---------------------------------------------------------------------------
// detectBackend
// ---------------------------------------------------------------------------

test('detectBackend honours an explicit pin in project.json over any on-disk evidence', () => {
  const w = world();
  try {
    writeJson(path.join(w.root, '.kbd-orchestrator', 'project.json'), { specBackend: 'speckit' });
    mkdirSync(path.join(w.root, 'openspec'), { recursive: true });
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, spawn }), 'speckit');
  } finally {
    w.dispose();
  }
});

test('detectBackend scopes to a change id: native-kbd change dir wins even with openspec/ present elsewhere', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, 'openspec'), { recursive: true });
    writeJson(path.join(w.root, '.kbd-orchestrator', 'changes', 'my-change', 'tasks.json'), {
      changeId: 'my-change',
      tasks: [],
    });
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, change: 'my-change', spawn }), 'native-kbd');
  } finally {
    w.dispose();
  }
});

test('detectBackend scoped to a change resolves openspec only when the openspec CLI is present', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, 'openspec', 'changes', 'my-change'), { recursive: true });
    writeFileSync(path.join(w.root, 'openspec', 'changes', 'my-change', 'proposal.md'), '# x');
    const spawnFound = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, change: 'my-change', spawn: spawnFound }), 'openspec');

    const spawnMissing = () => {
      throw new Error('ENOENT');
    };
    assert.equal(detectBackend({ root: w.root, change: 'my-change', spawn: spawnMissing }), '');
  } finally {
    w.dispose();
  }
});

test('detectBackend falls back to the repo-wide heuristic when the change id matches no known shape', () => {
  const w = world();
  try {
    writeJson(path.join(w.root, '.kbd-orchestrator', 'changes', 'other-change', 'tasks.json'), {
      changeId: 'other-change',
      tasks: [],
    });
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, change: 'no-such-change', spawn }), 'native-kbd');
  } finally {
    w.dispose();
  }
});

test('detectBackend returns empty string when nothing matches', () => {
  const w = world();
  try {
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, spawn }), '');
  } finally {
    w.dispose();
  }
});

// ---------------------------------------------------------------------------
// native-kbd adapter
// ---------------------------------------------------------------------------

test('nkList reads tasks.json and reports id/done/title', () => {
  const w = world();
  try {
    writeJson(path.join(w.root, '.kbd-orchestrator', 'changes', 'c1', 'tasks.json'), {
      changeId: 'c1',
      tasks: [
        { id: '1', title: 'first', done: true },
        { id: '2', title: 'second', done: false },
      ],
    });
    const rows = nkList(w.root, 'c1');
    assert.deepEqual(rows, [
      { id: '1', done: true, title: 'first' },
      { id: '2', done: false, title: 'second' },
    ]);
  } finally {
    w.dispose();
  }
});

test('nkList lazily migrates a legacy change.md checkbox list into tasks.json', () => {
  const w = world();
  try {
    const dir = path.join(w.root, '.kbd-orchestrator', 'changes', 'legacy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'change.md'),
      '# Change\n\n## Tasks\n\n- [x] 1. done thing\n- [ ] 2. pending thing\n'
    );
    const rows = nkList(w.root, 'legacy');
    assert.deepEqual(rows, [
      { id: '1', done: true, title: 'done thing' },
      { id: '2', done: false, title: 'pending thing' },
    ]);
    // Migration is persisted: tasks.json now exists and a second read agrees.
    const persisted = JSON.parse(readFileSync(path.join(dir, 'tasks.json'), 'utf8'));
    assert.equal(persisted.tasks.length, 2);
  } finally {
    w.dispose();
  }
});

test('nkProgress reports total/complete/remaining', () => {
  const w = world();
  try {
    writeJson(path.join(w.root, '.kbd-orchestrator', 'changes', 'c1', 'tasks.json'), {
      changeId: 'c1',
      tasks: [
        { id: '1', title: 'a', done: true },
        { id: '2', title: 'b', done: false },
        { id: '3', title: 'c', done: false },
      ],
    });
    assert.deepEqual(nkProgress(w.root, 'c1'), { total: 3, complete: 1, remaining: 2 });
  } finally {
    w.dispose();
  }
});

test('nkMarkDone flips one task and regenerates tasks.md', () => {
  const w = world();
  try {
    const dir = path.join(w.root, '.kbd-orchestrator', 'changes', 'c1');
    writeJson(path.join(dir, 'tasks.json'), {
      changeId: 'c1',
      tasks: [{ id: '1', title: 'a', done: false, doneAt: null, doneBy: null }],
    });
    nkMarkDone(w.root, 'c1', '1', { now: () => '2026-01-01T00:00:00Z', tool: 'test-tool' });
    const persisted = JSON.parse(readFileSync(path.join(dir, 'tasks.json'), 'utf8'));
    assert.equal(persisted.tasks[0].done, true);
    assert.equal(persisted.tasks[0].doneAt, '2026-01-01T00:00:00Z');
    assert.equal(persisted.tasks[0].doneBy, 'test-tool');
    const md = readFileSync(path.join(dir, 'tasks.md'), 'utf8');
    assert.match(md, /- \[x\] 1 a/);
  } finally {
    w.dispose();
  }
});

test('nkVerify fails when tasks remain, passes when all done and spec.md or change.md exists', () => {
  const w = world();
  try {
    const dir = path.join(w.root, '.kbd-orchestrator', 'changes', 'c1');
    writeJson(path.join(dir, 'tasks.json'), { changeId: 'c1', tasks: [{ id: '1', title: 'a', done: false }] });
    assert.equal(nkVerify(w.root, 'c1'), false);

    writeJson(path.join(dir, 'tasks.json'), { changeId: 'c1', tasks: [{ id: '1', title: 'a', done: true }] });
    assert.equal(nkVerify(w.root, 'c1'), false, 'no spec.md/change.md yet');

    writeFileSync(path.join(dir, 'spec.md'), '# spec');
    assert.equal(nkVerify(w.root, 'c1'), true);
  } finally {
    w.dispose();
  }
});

test('nkArchive moves the change dir under changes/archive/<date>-<change>', () => {
  const w = world();
  try {
    const dir = path.join(w.root, '.kbd-orchestrator', 'changes', 'c1');
    writeJson(path.join(dir, 'tasks.json'), { changeId: 'c1', tasks: [] });
    const dest = nkArchive(w.root, 'c1', { dateStamp: () => '2026-01-01' });
    assert.equal(dest, path.join(w.root, '.kbd-orchestrator', 'changes', 'archive', '2026-01-01-c1'));
    assert.equal(existsSync(dir), false);
    assert.equal(existsSync(dest), true);
  } finally {
    w.dispose();
  }
});

// ---------------------------------------------------------------------------
// OpenSpec adapter (the `openspec` CLI call is injected; JSON→TSV/mark-done
// shape is tested directly)
// ---------------------------------------------------------------------------

test('osList maps the `openspec instructions apply --json` shape to id/done/title rows', () => {
  const spawn = () => ({
    status: 0,
    stdout: JSON.stringify({
      tasks: [
        { id: '1', done: true, description: 'first' },
        { id: '2', done: false, description: 'second' },
      ],
    }),
    stderr: '',
  });
  assert.deepEqual(osList('.', 'c1', { spawn }), [
    { id: '1', done: true, title: 'first' },
    { id: '2', done: false, title: 'second' },
  ]);
});

test('osProgress maps the JSON progress block', () => {
  const spawn = () => ({
    status: 0,
    stdout: JSON.stringify({ progress: { total: 3, complete: 1, remaining: 2 } }),
    stderr: '',
  });
  assert.deepEqual(osProgress('.', 'c1', { spawn }), { total: 3, complete: 1, remaining: 2 });
});

test('osList throws when the openspec CLI call fails (never a silent empty list)', () => {
  const spawn = () => ({ status: 1, stdout: '', stderr: 'boom' });
  assert.throws(() => osList('.', 'c1', { spawn }));
});

test('osMarkDone flips the Nth top-level checkbox by positional ordinal, ignoring indented sub-bullets', () => {
  const w = world();
  try {
    const tasksFile = path.join(w.root, 'openspec', 'changes', 'c1', 'tasks.md');
    mkdirSync(path.dirname(tasksFile), { recursive: true });
    writeFileSync(
      tasksFile,
      ['- [ ] first task', '  - [ ] nested sub-rule (not counted)', '- [ ] second task', ''].join('\n')
    );
    osMarkDone(w.root, 'c1', '2');
    const content = readFileSync(tasksFile, 'utf8');
    const lines = content.split('\n');
    assert.match(lines[0], /^- \[ \] first task$/);
    assert.match(lines[2], /^- \[x\] second task$/);
  } finally {
    w.dispose();
  }
});

test('osMarkDone falls back to a text match on the description for a non-numeric id', () => {
  const w = world();
  try {
    const tasksFile = path.join(w.root, 'openspec', 'changes', 'c1', 'tasks.md');
    mkdirSync(path.dirname(tasksFile), { recursive: true });
    writeFileSync(tasksFile, ['- [ ] add the widget', '- [ ] remove the gadget', ''].join('\n'));
    osMarkDone(w.root, 'c1', 'widget');
    const content = readFileSync(tasksFile, 'utf8');
    assert.match(content, /- \[x\] add the widget/);
    assert.match(content, /- \[ \] remove the gadget/);
  } finally {
    w.dispose();
  }
});

test('osVerify and osArchive delegate to the injected spawn and report pass/fail by exit status', () => {
  const okSpawn = () => ({ status: 0, stdout: '', stderr: '' });
  const failSpawn = () => ({ status: 1, stdout: '', stderr: 'nope' });
  assert.equal(osVerify('.', 'c1', { spawn: okSpawn }), true);
  assert.equal(osVerify('.', 'c1', { spawn: failSpawn }), false);
  assert.doesNotThrow(() => osArchive('.', 'c1', { spawn: okSpawn }));
  assert.throws(() => osArchive('.', 'c1', { spawn: failSpawn }));
});
