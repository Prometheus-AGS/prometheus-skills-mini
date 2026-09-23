// Port of shared/lib/rollup.sh (prometheus-skill-pack, 89 lines).
//
// Aggregates child-loop progress up the ancestor chain. Reuses implementationCompleted /
// implementationTotal / dimensionStatus from progress.mjs (already ported) and kbdNodeDir from
// waypoint.mjs, per the task's explicit instruction not to reimplement either.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { rollupChildren, rollupChain } from './rollup.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'rollup-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
  return file;
};

// ---------------------------------------------------------------------------
// rollupChildren
// ---------------------------------------------------------------------------

test('rollupChildren is a no-op when progress.json is absent', () => {
  const s = scratch();
  try {
    // Should not throw, and should not create a progress.json.
    rollupChildren(s.root);
    assert.equal(existsSync(path.join(s.root, 'progress.json')), false);
  } finally {
    s.dispose();
  }
});

test('rollupChildren is a no-op in runtime-authority mode (generatedBy kbd-runtime)', () => {
  const s = scratch();
  try {
    const prog = writeJson(path.join(s.root, 'progress.json'), { generatedBy: 'kbd-runtime' });
    const before = readFileSync(prog, 'utf8');
    rollupChildren(s.root);
    assert.equal(readFileSync(prog, 'utf8'), before);
  } finally {
    s.dispose();
  }
});

test('rollupChildren aggregates each child dir into a children{} block', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), {});
    writeJson(path.join(s.root, 'children', 'child-a', 'progress.json'), {
      completion: { implementation: { completed: 2, total: 4, status: 'IN_PROGRESS' } },
      active_change: 'change-002',
      updatedAt: '2026-09-20T00:00:00Z',
    });

    rollupChildren(s.root);

    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.equal(after.children['child-a'].implementation_completed, 2);
    assert.equal(after.children['child-a'].implementation_total, 4);
    assert.equal(after.children['child-a'].changes_completed, 2);
    assert.equal(after.children['child-a'].changes_total, 4);
    assert.equal(after.children['child-a'].status, 'IN_PROGRESS');
    assert.equal(after.children['child-a'].certification_status, 'NOT_TRACKED');
    assert.equal(after.children['child-a'].handoff, null);
    assert.equal(after.children['child-a'].completed_at, '2026-09-20T00:00:00Z');
  } finally {
    s.dispose();
  }
});

test('rollupChildren marks a child DONE when completion.implementation.status is COMPLETE', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), {});
    writeJson(path.join(s.root, 'children', 'child-a', 'progress.json'), {
      completion: { implementation: { completed: 4, total: 4, status: 'COMPLETE' } },
    });

    rollupChildren(s.root);

    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.equal(after.children['child-a'].status, 'DONE');
  } finally {
    s.dispose();
  }
});

test('rollupChildren marks a child DONE when reflect_complete is true, even mid-implementation', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), {});
    writeJson(path.join(s.root, 'children', 'child-a', 'progress.json'), {
      reflect_complete: true,
      completion: { implementation: { completed: 1, total: 4, status: 'IN_PROGRESS' } },
    });

    rollupChildren(s.root);

    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.equal(after.children['child-a'].status, 'DONE');
  } finally {
    s.dispose();
  }
});

test('rollupChildren marks a child PENDING when there is no active_change and it is not complete', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), {});
    writeJson(path.join(s.root, 'children', 'child-a', 'progress.json'), {
      completion: { implementation: { completed: 0, total: 4, status: 'IN_PROGRESS' } },
    });

    rollupChildren(s.root);

    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.equal(after.children['child-a'].status, 'PENDING');
  } finally {
    s.dispose();
  }
});

test('rollupChildren references handoff-out.md when present in the child dir', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), {});
    writeJson(path.join(s.root, 'children', 'child-a', 'progress.json'), {});
    writeFileSync(path.join(s.root, 'children', 'child-a', 'handoff-out.md'), '# handoff');

    rollupChildren(s.root);

    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.equal(after.children['child-a'].handoff, 'children/child-a/handoff-out.md');
  } finally {
    s.dispose();
  }
});

test('rollupChildren skips a child dir with unparsable JSON rather than throwing', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), {});
    mkdirSync(path.join(s.root, 'children', 'broken-child'), { recursive: true });
    writeFileSync(path.join(s.root, 'children', 'broken-child', 'progress.json'), '{ not valid json');

    rollupChildren(s.root);

    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.equal('broken-child' in after.children, false);
  } finally {
    s.dispose();
  }
});

test('rollupChildren only rewrites the children key, preserving everything else', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), { phase: 'p0', schemaVersion: '2' });
    writeJson(path.join(s.root, 'children', 'child-a', 'progress.json'), {});

    rollupChildren(s.root);

    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.equal(after.phase, 'p0');
    assert.equal(after.schemaVersion, '2');
  } finally {
    s.dispose();
  }
});

test('rollupChildren produces an empty children{} block when there is no children/ dir', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'progress.json'), {});
    rollupChildren(s.root);
    const after = JSON.parse(readFileSync(path.join(s.root, 'progress.json'), 'utf8'));
    assert.deepEqual(after.children, {});
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// rollupChain
// ---------------------------------------------------------------------------

test('rollupChain rolls up every ancestor along a path, deepest first', () => {
  const s = scratch();
  try {
    const orch = path.join(s.root, '.kbd-orchestrator');
    writeJson(path.join(orch, 'phases', 'p0', 'progress.json'), {});
    writeJson(path.join(orch, 'phases', 'p0', 'children', 'c1', 'progress.json'), {});
    writeJson(
      path.join(orch, 'phases', 'p0', 'children', 'c1', 'children', 'g2', 'progress.json'),
      { completion: { implementation: { completed: 1, total: 2, status: 'IN_PROGRESS' } } }
    );

    rollupChain(s.root, ['p0', 'c1', 'g2']);

    const c1After = JSON.parse(
      readFileSync(path.join(orch, 'phases', 'p0', 'children', 'c1', 'progress.json'), 'utf8')
    );
    assert.equal(c1After.children['g2'].implementation_completed, 1);

    const p0After = JSON.parse(readFileSync(path.join(orch, 'phases', 'p0', 'progress.json'), 'utf8'));
    assert.equal(p0After.children['c1'].implementation_completed, 0);
  } finally {
    s.dispose();
  }
});

test('rollupChain is a no-op for a single-segment path with no progress.json', () => {
  const s = scratch();
  try {
    // Should not throw even though nothing exists on disk.
    rollupChain(s.root, ['p0']);
  } finally {
    s.dispose();
  }
});
