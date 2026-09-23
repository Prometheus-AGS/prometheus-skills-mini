// Port of shared/lib/progress.sh (prometheus-skill-pack, 218 lines).
//
// Canonical KBD completion semantics. `completion.implementation` is the only source for the
// implementation counter when present; legacy `changes_completed`/`changes_total` remain
// supported as aliases for pre-v4 ledgers. Evidence, certification and publication are
// independent dimensions and must never be read as reducing implementation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import {
  implementationCompleted,
  implementationTotal,
  dimensionStatus,
  validateProgress,
  markImplementationComplete,
} from './progress.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'progress-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const write = (dir, name, value) => {
  const file = path.join(dir, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
  return file;
};

// ---------------------------------------------------------------------------
// implementationCompleted / implementationTotal — precedence order
// ---------------------------------------------------------------------------

test('completion.implementation wins over every legacy alias', () => {
  const progress = {
    completion: { implementation: { completed: 5, total: 10 } },
    implementation_completed: 1,
    implementation_total: 1,
    changes_completed: 1,
    changes_total: 1,
  };
  assert.equal(implementationCompleted(progress), 5);
  assert.equal(implementationTotal(progress), 10);
});

test('implementation_completed/_total is read when completion is absent', () => {
  const progress = { implementation_completed: 3, implementation_total: 7, changes_completed: 1, changes_total: 1 };
  assert.equal(implementationCompleted(progress), 3);
  assert.equal(implementationTotal(progress), 7);
});

test('changes_completed/_total is the final fallback', () => {
  const progress = { changes_completed: 2, changes_total: 4 };
  assert.equal(implementationCompleted(progress), 2);
  assert.equal(implementationTotal(progress), 4);
});

test('defaults to 0 when nothing is present', () => {
  assert.equal(implementationCompleted({}), 0);
  assert.equal(implementationTotal({}), 0);
});

// ---------------------------------------------------------------------------
// dimensionStatus
// ---------------------------------------------------------------------------

test('dimensionStatus reads an explicit completion.<dimension>.status', () => {
  const progress = { completion: { evidence: { status: 'BLOCKED' } } };
  assert.equal(dimensionStatus(progress, 'evidence'), 'BLOCKED');
});

test('dimensionStatus derives implementation status from completed vs total when absent', () => {
  assert.equal(dimensionStatus({ changes_completed: 4, changes_total: 4 }, 'implementation'), 'COMPLETE');
  assert.equal(dimensionStatus({ changes_completed: 2, changes_total: 4 }, 'implementation'), 'IN_PROGRESS');
});

test('dimensionStatus reports NOT_TRACKED for a non-implementation dimension with no status', () => {
  assert.equal(dimensionStatus({}, 'certification'), 'NOT_TRACKED');
});

// ---------------------------------------------------------------------------
// validateProgress — schema-v2 completion invariants
// ---------------------------------------------------------------------------

test('a minimal valid v2 ledger with no completion block passes', () => {
  const progress = {
    schemaVersion: '2',
    phase: 'karpathy-logs-node',
    last_updated: '2026-09-22T00:00:00Z',
    last_updated_by: 'kbd-plan',
    changes: [{ id: 'change-001', status: 'PENDING', implementation_status: 'PENDING' }],
  };
  assert.equal(validateProgress(progress), true);
});

test('rejects duplicate change ids in a v2 ledger', () => {
  const progress = {
    schemaVersion: '2',
    phase: 'p',
    last_updated: 't',
    last_updated_by: 'x',
    changes: [
      { id: 'dup', status: 'PENDING', implementation_status: 'PENDING' },
      { id: 'dup', status: 'PENDING', implementation_status: 'PENDING' },
    ],
  };
  assert.equal(validateProgress(progress), false);
});

test('rejects implementation.completed greater than implementation.total', () => {
  const progress = { completion: { implementation: { completed: 5, total: 3 } } };
  assert.equal(validateProgress(progress), false);
});

test('requires completion.primaryCounter === "implementation" when a completion block exists', () => {
  const progress = { completion: { primaryCounter: 'evidence', implementation: { completed: 0, total: 0, status: 'IN_PROGRESS' } } };
  assert.equal(validateProgress(progress), false);
});

test('rejects a legacy alias that disagrees with the derived implementation counter', () => {
  const progress = {
    completion: { primaryCounter: 'implementation', implementation: { completed: 2, total: 4, status: 'IN_PROGRESS' } },
    changes_completed: 3,
  };
  assert.equal(validateProgress(progress), false);
});

test('rejects an invalid dimension status value', () => {
  const progress = {
    completion: {
      primaryCounter: 'implementation',
      implementation: { completed: 0, total: 0, status: 'IN_PROGRESS' },
      evidence: { status: 'MADE_UP' },
    },
  };
  assert.equal(validateProgress(progress), false);
});

test('cross-checks implementation_status rows against the derived counter when present', () => {
  const progress = {
    changes: [
      { id: 'a', implementation_status: 'COMPLETE' },
      { id: 'b', implementation_status: 'PENDING' },
    ],
    changes_completed: 2, // disagrees: only 1 row is COMPLETE
    changes_total: 2,
  };
  assert.equal(validateProgress(progress), false);
});

test('accepts a row-derived count that agrees with the legacy counter', () => {
  const progress = {
    changes: [
      { id: 'a', implementation_status: 'COMPLETE' },
      { id: 'b', implementation_status: 'PENDING' },
    ],
    changes_completed: 1,
    changes_total: 2,
  };
  assert.equal(validateProgress(progress), true);
});

// ---------------------------------------------------------------------------
// markImplementationComplete — legacy (non-runtime-authoritative) path
// ---------------------------------------------------------------------------

test('marks one change complete in an object-array ledger and derives the counter', async () => {
  const s = scratch();
  try {
    const file = write(s.root, 'progress.json', {
      changes: [
        { id: 'change-001', status: 'PENDING', implementation_status: 'PENDING' },
        { id: 'change-002', status: 'PENDING', implementation_status: 'PENDING' },
      ],
    });

    await markImplementationComplete(file, 'change-001');

    const after = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(after.changes.find((c) => c.id === 'change-001').implementation_status, 'COMPLETE');
    assert.equal(after.completion.implementation.completed, 1);
    assert.equal(after.completion.implementation.total, 2);
    assert.equal(after.completion.implementation.status, 'IN_PROGRESS');
    assert.equal(after.implementation_completed, 1);
    assert.equal(after.changes_completed, 1);
  } finally {
    s.dispose();
  }
});

test('marking the last change complete sets status COMPLETE', async () => {
  const s = scratch();
  try {
    const file = write(s.root, 'progress.json', {
      changes: [{ id: 'only', status: 'PENDING', implementation_status: 'PENDING' }],
    });

    await markImplementationComplete(file, 'only');

    const after = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(after.completion.implementation.status, 'COMPLETE');
  } finally {
    s.dispose();
  }
});

test('evidence/certification/publication are seeded NOT_TRACKED, never touched otherwise', async () => {
  const s = scratch();
  try {
    const file = write(s.root, 'progress.json', {
      changes: [{ id: 'a', status: 'PENDING', implementation_status: 'PENDING' }],
      completion: { evidence: { status: 'IN_PROGRESS', summary: 'partial', blockers: ['x'] } },
    });

    await markImplementationComplete(file, 'a');

    const after = JSON.parse(readFileSync(file, 'utf8'));
    // Pre-existing evidence dimension is preserved, not reset.
    assert.equal(after.completion.evidence.status, 'IN_PROGRESS');
    assert.equal(after.completion.evidence.summary, 'partial');
    // certification/publication get the NOT_TRACKED seed since absent.
    assert.equal(after.completion.certification.status, 'NOT_TRACKED');
    assert.equal(after.completion.publication.status, 'NOT_TRACKED');
  } finally {
    s.dispose();
  }
});

test('rejects an unknown change id and leaves the file untouched', async () => {
  const s = scratch();
  try {
    const file = write(s.root, 'progress.json', {
      changes: [{ id: 'a', status: 'PENDING', implementation_status: 'PENDING' }],
    });
    const before = readFileSync(file, 'utf8');

    await assert.rejects(() => markImplementationComplete(file, 'nonexistent'), /unknown change id/);

    assert.equal(readFileSync(file, 'utf8'), before);
  } finally {
    s.dispose();
  }
});

test('a string-list ledger has no per-change row to flip; the counter still derives', async () => {
  const s = scratch();
  try {
    const file = write(s.root, 'progress.json', {
      changes: ['change-001', 'change-002'],
      changes_completed: 1, // caller already advanced this before calling
      changes_total: 2,
    });

    await markImplementationComplete(file, 'change-001');

    const after = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(after.completion.implementation.completed, 1);
    assert.equal(after.completion.implementation.total, 2);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// markImplementationComplete — runtime-authoritative path
// ---------------------------------------------------------------------------

test('runtime-authoritative mode delegates to `prometheus kbd change transition`', async () => {
  const s = scratch();
  try {
    const kbdDir = path.join(s.root, '.kbd-orchestrator');
    const file = write(s.root, '.kbd-orchestrator/progress.json', {
      generatedBy: 'kbd-runtime',
      phase: 'karpathy-logs-node',
    });
    let captured;
    const spawn = (name, args) => {
      captured = { name, args };
      return { status: 0, stdout: '', stderr: '' };
    };

    await markImplementationComplete(file, 'change-007', { spawn, root: s.root });

    assert.equal(captured.name, 'prometheus');
    assert.deepEqual(captured.args, [
      'kbd', '--path', s.root, 'change', 'transition',
      '--command-id', 'implementation-complete:karpathy-logs-node:change-007',
      '--phase', 'karpathy-logs-node',
      '--id', 'change-007', '--status', 'complete',
    ]);
  } finally {
    s.dispose();
  }
});

test('runtime-authoritative mode rejects when phase is missing from the ledger', async () => {
  const s = scratch();
  try {
    const file = write(s.root, '.kbd-orchestrator/progress.json', { generatedBy: 'kbd-runtime' });
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });

    await assert.rejects(
      () => markImplementationComplete(file, 'change-007', { spawn, root: s.root }),
      /active phase is required/
    );
  } finally {
    s.dispose();
  }
});

test('runtime-authoritative mode surfaces a failed transition rather than swallowing it', async () => {
  const s = scratch();
  try {
    const file = write(s.root, '.kbd-orchestrator/progress.json', {
      generatedBy: 'kbd-runtime',
      phase: 'p',
    });
    const spawn = () => ({ status: 1, stdout: '', stderr: 'rejected' });

    await assert.rejects(() => markImplementationComplete(file, 'change-007', { spawn, root: s.root }));
  } finally {
    s.dispose();
  }
});

test('runtime-authoritative mode fires the change:after hook when a hooksFire callback is given', async () => {
  const s = scratch();
  try {
    const file = write(s.root, '.kbd-orchestrator/progress.json', {
      generatedBy: 'kbd-runtime',
      phase: 'p',
    });
    const spawn = () => ({ status: 0, stdout: '', stderr: '' });
    let fired;
    const hooksFire = (...args) => {
      fired = args;
    };

    await markImplementationComplete(file, 'change-007', { spawn, root: s.root, hooksFire });

    assert.deepEqual(fired, ['change', 'after', 'change-007', 1, 1]);
  } finally {
    s.dispose();
  }
});
