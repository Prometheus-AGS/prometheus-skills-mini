import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { readText } from '../platform/text.mjs';
import { receiptPath, writeReceipt } from './receipt.mjs';
import { pythonFloatToken } from './hash.mjs';
import { recordBoundary, flushDegraded, REACHABLE_STATUSES } from './record.mjs';

const golden = JSON.parse(readText(new URL('./fixtures/golden-receipt.json', import.meta.url))).event;

const withRoot = (run) => {
  const root = mkdtempSync(path.join(tempDir(), 'record-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const STATE = Object.freeze({
  source: 'cli',
  projectId: 'test-project',
  runId: golden.runId,
  activePath: { phaseId: golden.phaseId, changeId: null, taskId: null },
  exactNextWork: golden.exactNextWork,
  phases: {
    [golden.phaseId]: { status: 'complete', changes: {} },
  },
});

const hookEvent = (overrides = {}) => ({ ...golden, ...overrides });

const transportOf = (results) => {
  const calls = [];
  let i = 0;
  const deliver = (args) => {
    calls.push(args);
    const r = results[Math.min(i, results.length - 1)];
    i += 1;
    return typeof r === 'function' ? r(args) : r;
  };
  return { deliver, calls };
};

const accepted = (receiptSha256 = 'abc') => ({ transport: 'pk', status: 'accepted', receiptSha256 });
const degraded = (reason = 'pk executable unavailable') => ({ transport: 'pk', status: 'degraded', reason });

const sessionLogMarker = (root) => {
  const log = path.join(root, '.prometheus', 'session-log.md');
  return existsSync(log) ? readFileSync(log, 'utf8') : '';
};
const markerCount = (content, eventId) => (content.match(new RegExp(`karpathy-progress-event:${eventId}`, 'g')) || []).length;

test('a new event with pk accepting is recorded', () => {
  withRoot((root) => {
    const { deliver } = transportOf([accepted()]);

    const result = recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });

    assert.equal(result.status, 'recorded');
    assert.equal(result.eventId, golden.eventId);
    assert.equal(sessionLogMarker(root).includes(golden.eventId), true);
    assert.equal(markerCount(sessionLogMarker(root), golden.eventId), 1);
  });
});

test('a replay of the same hook event is a duplicate, appends nothing new', () => {
  withRoot((root) => {
    const { deliver } = transportOf([accepted()]);
    recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });
    const before = sessionLogMarker(root);

    const result = recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });

    assert.equal(result.status, 'duplicate');
    assert.equal(sessionLogMarker(root), before);
    assert.equal(markerCount(sessionLogMarker(root), golden.eventId), 1);
  });
});

test('an --input event with a different payload under the same eventId is a typed collision error', () => {
  withRoot((root) => {
    const { deliver } = transportOf([accepted()]);
    recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: false, deliver });
    const receiptBefore = readFileSync(receiptPath(root, golden.eventId), 'utf8');

    assert.throws(
      () =>
        recordBoundary({ root, event: hookEvent({ exactNextWork: 'a different payload entirely' }), state: STATE, fromHook: false, deliver }),
      /already belongs to a different payload/,
    );

    assert.equal(readFileSync(receiptPath(root, golden.eventId), 'utf8'), receiptBefore);
  });
});

test('a degraded event is retried on replay and becomes recorded, without a second session-log entry', () => {
  withRoot((root) => {
    const { deliver } = transportOf([degraded(), accepted()]);

    const first = recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });
    assert.equal(first.status, 'degraded');

    const second = recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });

    assert.equal(second.status, 'recorded');
    assert.equal(second.recoveredPendingDelivery, true);
    assert.equal(markerCount(sessionLogMarker(root), golden.eventId), 1);
  });
});

test('the receipt is complete:false BEFORE the transport is ever called', () => {
  withRoot((root) => {
    let sawPendingReceipt = false;
    const deliver = (args) => {
      const onDisk = JSON.parse(readFileSync(receiptPath(root, args.eventId), 'utf8'));
      sawPendingReceipt = onDisk.complete === false && onDisk.memory.status === 'pending';
      return accepted();
    };

    recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });

    assert.equal(sawPendingReceipt, true);
  });
});

test('the crash seam KPM_TEST_CRASH_BEFORE_MEMORY recovers on the next run', () => {
  withRoot((root) => {
    const { deliver } = transportOf([accepted()]);

    assert.throws(
      () => recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver, env: { KPM_TEST_CRASH_BEFORE_MEMORY: '1' } }),
      (error) => error.exitCode === 74,
    );
    const pending = JSON.parse(readFileSync(receiptPath(root, golden.eventId), 'utf8'));
    assert.equal(pending.complete, false);

    const recovered = recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });

    assert.equal(recovered.status, 'recorded');
    assert.equal(recovered.recoveredPendingDelivery, true);
    assert.equal(markerCount(sessionLogMarker(root), golden.eventId), 1);
  });
});

test('the crash seam KPM_TEST_CRASH_AFTER_PK recovers on the next run', () => {
  withRoot((root) => {
    const { deliver } = transportOf([accepted(), accepted('second-delivery')]);

    assert.throws(
      () => recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver, env: { KPM_TEST_CRASH_AFTER_PK: '1' } }),
      (error) => error.exitCode === 75,
    );
    const afterCrash = JSON.parse(readFileSync(receiptPath(root, golden.eventId), 'utf8'));
    assert.equal(afterCrash.complete, true, 'the receipt was written before the crash seam fired');

    const recovered = recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver });

    // The receipt was already complete:true, so this is a duplicate, not a re-delivery.
    assert.equal(recovered.status, 'duplicate');
  });
});

test('the set of reachable statuses from recordBoundary is exactly recorded | duplicate | degraded', () => {
  assert.deepEqual([...REACHABLE_STATUSES].sort(), ['degraded', 'duplicate', 'recorded']);

  withRoot((root) => {
    const seen = new Set();
    const { deliver } = transportOf([degraded()]);
    seen.add(recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver }).status);
    seen.add(recordBoundary({ root, event: hookEvent(), state: STATE, fromHook: true, deliver: () => accepted() }).status);
    seen.add(
      recordBoundary({ root, event: hookEvent({ eventId: 'kpm-second-event-0000000000000' }), state: STATE, fromHook: true, deliver: () => accepted() })
        .status,
    );
    for (const status of seen) assert.ok(REACHABLE_STATUSES.has(status), status);
  });
});

// --- Flush degraded (task 9.2) ---

const degradedReceipt = (root, eventId, recordedAt) => {
  writeReceipt(root, {
    event: { ...golden, eventId },
    elapsedHoursToken: pythonFloatToken(golden.elapsedHours),
    sessionLogAppended: true,
    memory: degraded(),
    complete: false,
    canonicalState: 'cli',
  });
  // writeReceipt stamps recordedAt itself; overwrite it directly so "oldest first" is testable.
  const p = receiptPath(root, eventId);
  const stored = JSON.parse(readFileSync(p, 'utf8'));
  writeFileSync(p, JSON.stringify({ ...stored, recordedAt }, null, 2) + '\n');
};

const queuedCompleteReceipt = (root, eventId) => {
  writeReceipt(root, {
    event: { ...golden, eventId },
    elapsedHoursToken: pythonFloatToken(golden.elapsedHours),
    sessionLogAppended: true,
    memory: { transport: 'outbox', status: 'queued', operationId: 'x' },
    complete: true,
    canonicalState: 'cli',
  });
};

test('flush delivers a degraded receipt with a working transport', () => {
  withRoot((root) => {
    degradedReceipt(root, 'kpm-degraded-one-000000000000', '2026-01-01T00:00:00.000Z');
    const { deliver } = transportOf([accepted()]);

    const report = flushDegraded({ root, deliver, limit: 25 });

    assert.equal(report.delivered, 1);
    assert.equal(report.stillDegraded, 0);
    const receipt = JSON.parse(readFileSync(receiptPath(root, 'kpm-degraded-one-000000000000'), 'utf8'));
    assert.equal(receipt.complete, true);
  });
});

test('flush leaves a queued+complete receipt alone', () => {
  withRoot((root) => {
    queuedCompleteReceipt(root, 'kpm-queued-complete-00000000');
    let called = false;
    const deliver = () => {
      called = true;
      return accepted();
    };

    const report = flushDegraded({ root, deliver, limit: 25 });

    assert.equal(called, false);
    assert.equal(report.delivered, 0);
    assert.equal(report.stillDegraded, 0);
  });
});

test('flush honours --limit and reports what was left unvisited', () => {
  withRoot((root) => {
    degradedReceipt(root, 'kpm-a0000000000000000000000000', '2026-01-01T00:00:00.000Z');
    degradedReceipt(root, 'kpm-b0000000000000000000000000', '2026-01-02T00:00:00.000Z');
    degradedReceipt(root, 'kpm-c0000000000000000000000000', '2026-01-03T00:00:00.000Z');
    const { deliver, calls } = transportOf([accepted()]);

    const report = flushDegraded({ root, deliver, limit: 1 });

    assert.equal(calls.length, 1);
    assert.equal(report.delivered, 1);
    assert.equal(report.unvisited, 2);
  });
});

test('flush visits oldest degraded receipts first', () => {
  withRoot((root) => {
    degradedReceipt(root, 'kpm-newer00000000000000000000', '2026-06-01T00:00:00.000Z');
    degradedReceipt(root, 'kpm-older00000000000000000000', '2026-01-01T00:00:00.000Z');
    const { deliver, calls } = transportOf([accepted()]);

    flushDegraded({ root, deliver, limit: 1 });

    assert.equal(calls[0].eventId, 'kpm-older00000000000000000000');
  });
});

test('flush with pk still absent leaves every visited receipt degraded and exits 0 (no throw)', () => {
  withRoot((root) => {
    degradedReceipt(root, 'kpm-still-degraded-000000000', '2026-01-01T00:00:00.000Z');
    const { deliver } = transportOf([degraded()]);

    const report = flushDegraded({ root, deliver, limit: 25 });

    assert.equal(report.delivered, 0);
    assert.equal(report.stillDegraded, 1);
    const receipt = JSON.parse(readFileSync(receiptPath(root, 'kpm-still-degraded-000000000'), 'utf8'));
    assert.equal(receipt.complete, false);
  });
});

test('flush with no degraded receipts at all does nothing and reports zeros', () => {
  withRoot((root) => {
    mkdirSync(path.join(root, '.prometheus', 'progress-memory-receipts'), { recursive: true });

    const report = flushDegraded({ root, deliver: () => accepted(), limit: 25 });

    assert.deepEqual(report, { delivered: 0, stillDegraded: 0, unvisited: 0 });
  });
});
