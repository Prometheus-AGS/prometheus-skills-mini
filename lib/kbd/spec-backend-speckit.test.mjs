// Spec Kit (speckit) adapter coverage for lib/kbd/spec-backend.mjs — the sk* port of the bash
// `sk_*` functions plus speckit detection. Pure filesystem markdown parsing (no `specify` CLI,
// no spawn), so unlike the OpenSpec adapter tests nothing is injected: a temp-dir fixture is the
// whole world. GitHub Spec Kit v1.1.2 layout (pinned in config/spec-engines.json):
// specs/<change>/{spec.md,plan.md,tasks.md}, tasks.md a "- [ ] T001 description" checklist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import {
  detectBackend,
  skList,
  skProgress,
  skMarkDone,
  skVerify,
  skArchive,
  specEngines,
} from './spec-backend.mjs';

const world = () => {
  const root = mkdtempSync(path.join(tempDir(), 'spec-backend-speckit-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeSpecKitChange = (root, change, { spec = true, tasks = '- [ ] T001 first\n- [ ] T002 second\n' } = {}) => {
  const dir = path.join(root, 'specs', change);
  mkdirSync(dir, { recursive: true });
  if (spec) writeFileSync(path.join(dir, 'spec.md'), '# Spec\n');
  writeFileSync(path.join(dir, 'tasks.md'), tasks);
  return dir;
};

// ---------------------------------------------------------------------------
// detection
// ---------------------------------------------------------------------------

test('detectBackend resolves speckit for a change with specs/<change>/tasks.md', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'feat-x');
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, change: 'feat-x', spawn }), 'speckit');
  } finally {
    w.dispose();
  }
});

test('detectBackend change-scoped speckit detection also accepts spec.md or plan.md without tasks.md', () => {
  const w = world();
  try {
    for (const file of ['spec.md', 'plan.md']) {
      const dir = path.join(w.root, 'specs', `only-${file.replace('.', '-')}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, file), '# x\n');
    }
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, change: 'only-spec-md', spawn }), 'speckit');
    assert.equal(detectBackend({ root: w.root, change: 'only-plan-md', spawn }), 'speckit');
  } finally {
    w.dispose();
  }
});

test('detectBackend repo-wide: openspec is the default engine when both openspec/ and specs/ evidence exist', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, 'openspec'), { recursive: true });
    writeSpecKitChange(w.root, 'feat-x');
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, spawn }), 'openspec');
    // ...and repo-wide speckit evidence still resolves to speckit when openspec/ is absent.
    const w2 = world();
    try {
      writeSpecKitChange(w2.root, 'feat-x');
      assert.equal(detectBackend({ root: w2.root, spawn }), 'speckit');
    } finally {
      w2.dispose();
    }
  } finally {
    w.dispose();
  }
});

test('detectBackend repo-wide: .specify/ or any specs/*/tasks.md is speckit evidence', () => {
  const w = world();
  try {
    mkdirSync(path.join(w.root, '.specify'), { recursive: true });
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    assert.equal(detectBackend({ root: w.root, spawn }), 'speckit');
  } finally {
    w.dispose();
  }
});

// ---------------------------------------------------------------------------
// list / progress
// ---------------------------------------------------------------------------

test('skList parses T-token ids and falls back to ordinals, stripping the token from the title', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'feat-x', {
      tasks: [
        '# Tasks',
        '',
        '- [ ] T001 set up the thing',
        '  * [x] nested sub-task',
        '- [x] plain line without token',
        '- [X] UPPERCASE X box',
        '',
      ].join('\n'),
    });
    assert.deepEqual(skList(w.root, 'feat-x'), [
      { id: 'T001', done: false, title: 'set up the thing' },
      { id: '2', done: true, title: 'nested sub-task' },
      { id: '3', done: true, title: 'plain line without token' },
      { id: '4', done: true, title: 'UPPERCASE X box' },
    ]);
  } finally {
    w.dispose();
  }
});

test('skList falls back to the single specs/*/tasks.md when the change has no own tasks.md', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'the-only-change');
    assert.equal(skList(w.root, 'unmatched-change-id').length, 2);
  } finally {
    w.dispose();
  }
});

test('skList refuses the fallback when zero or multiple specs/*/tasks.md exist, and ignores archive/', () => {
  const w = world();
  try {
    assert.throws(() => skList(w.root, 'nope'), /no tasks\.md found/);
    writeSpecKitChange(w.root, 'a');
    writeSpecKitChange(w.root, 'b');
    assert.throws(() => skList(w.root, 'nope'), /no tasks\.md found/);
    // An archived change's tasks.md must not shadow the fallback (bash `ls | head -1` flaw).
    rmSync(path.join(w.root, 'specs', 'b'), { recursive: true, force: true });
    skArchive(w.root, 'a', { dateStamp: () => '2026-01-01' });
    mkdirSync(path.join(w.root, 'specs', 'live'), { recursive: true });
    writeFileSync(path.join(w.root, 'specs', 'live', 'tasks.md'), '- [ ] only live task\n');
    assert.deepEqual(skList(w.root, 'unmatched'), [{ id: '1', done: false, title: 'only live task' }]);
  } finally {
    w.dispose();
  }
});

test('skProgress reports total/complete/remaining over checkbox lines', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'feat-x', {
      tasks: '- [x] T001 done\n- [ ] T002 open\n- [ ] T003 open\n',
    });
    assert.deepEqual(skProgress(w.root, 'feat-x'), { total: 3, complete: 1, remaining: 2 });
  } finally {
    w.dispose();
  }
});

// ---------------------------------------------------------------------------
// mark-done
// ---------------------------------------------------------------------------

test('skMarkDone flips a T-token task by text match on the first open line containing it', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'feat-x');
    skMarkDone(w.root, 'feat-x', 'T002');
    const content = readFileSync(path.join(w.root, 'specs', 'feat-x', 'tasks.md'), 'utf8');
    assert.match(content, /- \[ \] T001 first/);
    assert.match(content, /- \[x\] T002 second/);
  } finally {
    w.dispose();
  }
});

test('skMarkDone flips a plain task by T-token text match too, and an ordinal flips the nth checkbox', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'feat-x', { tasks: '- [ ] first\n- [ ] second\n' });
    skMarkDone(w.root, 'feat-x', 'second');
    let content = readFileSync(path.join(w.root, 'specs', 'feat-x', 'tasks.md'), 'utf8');
    assert.match(content, /- \[ \] first/);
    assert.match(content, /- \[x\] second/);

    skMarkDone(w.root, 'feat-x', '1'); // ordinal 1 = "first"
    content = readFileSync(path.join(w.root, 'specs', 'feat-x', 'tasks.md'), 'utf8');
    assert.match(content, /- \[x\] first/);
  } finally {
    w.dispose();
  }
});

test('skMarkDone via the registry entry dispatches identically', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'feat-x');
    specEngines.speckit.markDone(w.root, 'feat-x', 'T001');
    const content = readFileSync(path.join(w.root, 'specs', 'feat-x', 'tasks.md'), 'utf8');
    assert.match(content, /- \[x\] T001 first/);
  } finally {
    w.dispose();
  }
});

// ---------------------------------------------------------------------------
// verify / archive
// ---------------------------------------------------------------------------

test('skVerify requires all boxes checked AND specs/<change>/spec.md to exist', () => {
  const w = world();
  try {
    writeSpecKitChange(w.root, 'feat-x');
    assert.equal(skVerify(w.root, 'feat-x'), false, 'open tasks');

    skMarkDone(w.root, 'feat-x', 'T001');
    skMarkDone(w.root, 'feat-x', 'T002');
    assert.equal(skVerify(w.root, 'feat-x'), true, 'all done + spec.md present');

    // spec.md missing → fail even with everything checked.
    writeSpecKitChange(w.root, 'no-spec', { spec: false });
    skMarkDone(w.root, 'no-spec', 'T001');
    skMarkDone(w.root, 'no-spec', 'T002');
    assert.equal(skVerify(w.root, 'no-spec'), false, 'no spec.md');

    // Unknown change → fail, never throw.
    assert.equal(skVerify(w.root, 'no-such-change'), false);
  } finally {
    w.dispose();
  }
});

test('skArchive moves specs/<change> to specs/archive/<date>-<change> and creates the archive dir', () => {
  const w = world();
  try {
    const dir = writeSpecKitChange(w.root, 'feat-x');
    const dest = skArchive(w.root, 'feat-x', { dateStamp: () => '2026-01-01' });
    assert.equal(dest, path.join(w.root, 'specs', 'archive', '2026-01-01-feat-x'));
    assert.equal(existsSync(dir), false);
    assert.equal(existsSync(path.join(dest, 'tasks.md')), true);

    // Archiving an unknown change is a hard error, not a silent no-op.
    assert.throws(() => skArchive(w.root, 'no-such-change', { dateStamp: () => '2026-01-01' }), /no such change dir/);
  } finally {
    w.dispose();
  }
});
