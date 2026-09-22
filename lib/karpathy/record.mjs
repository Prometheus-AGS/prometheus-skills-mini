// Orchestration: new event, replay, and the flush trigger. A port of main()
// (record-progress.py:541-671), minus argument parsing (scripts/record-progress.mjs
// owns that) and the Python outbox path (dropped; see transport.mjs).
//
// The receipt is written TWICE for a new event: complete:false with
// memory.status "pending" before the transport is ever called, then the final
// state after. That is what makes a crash between the two recoverable — a
// receipt with complete:false (or memory.status "degraded") is retried from
// its own event snapshot on the next run, never re-validated against a fresh
// event.
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { acquireLock } from '../platform/lock.mjs';
import { eventIdentitySha256, eventSha256 } from './hash.mjs';
import { appendSessionLog, markdownRecord } from './session-log.mjs';
import { readReceipt, receiptPath, writeReceipt } from './receipt.mjs';

/** The only statuses `recordBoundary` can return. `queued` is read from a receipt, never emitted here. */
export const REACHABLE_STATUSES = Object.freeze(new Set(['recorded', 'duplicate', 'degraded']));

export class ProgressError extends Error {}

/** `os._exit(74)` / `os._exit(75)` — the source pack's crash-test seams. */
class CrashSeam extends Error {
  constructor(exitCode) {
    super(`test crash seam: exit ${exitCode}`);
    this.exitCode = exitCode;
  }
}

/** Python's `Path.with_suffix('.lock')`: replaces the extension, it does not append to it. */
const receiptLockPath = (root, eventId) => {
  const target = receiptPath(root, eventId);
  return path.join(path.dirname(target), `${path.basename(target, '.json')}.lock`);
};

const statusFor = (memory) => (memory.status === 'accepted' ? 'recorded' : memory.status);

function deliverAndWriteReceipt({ root, event, elapsedHoursToken, sessionLogAppended, canonicalState, deliver, env }) {
  const memory = deliver({ eventId: event.eventId, record: markdownRecord(event, { elapsedHoursToken }) });
  if (env.KPM_TEST_CRASH_AFTER_PK === '1') {
    // The receipt reflecting this delivery is written BEFORE the seam fires, exactly as
    // it would be in the moment right before a real crash — that is the state the
    // recovery test exists to prove.
    writeReceipt(root, { event, elapsedHoursToken, sessionLogAppended, memory, complete: memory.status !== 'degraded', canonicalState });
    throw new CrashSeam(75);
  }
  const complete = memory.status !== 'degraded';
  const receipt = writeReceipt(root, { event, elapsedHoursToken, sessionLogAppended, memory, complete, canonicalState });
  return { memory, complete, receipt };
}

/**
 * Record one boundary. `fromHook` selects which hash a prior receipt is
 * checked against — `eventIdentitySha256` for a hook event, `eventSha256`
 * for one given as text — per the source pack's own asymmetry.
 */
export function recordBoundary({ root, event, elapsedHoursToken, state, fromHook, deliver, env = process.env }) {
  const target = receiptPath(root, event.eventId);
  // acquireLock does not create parent directories; the receipts directory may
  // not exist yet for a brand-new event, since writeReceipt has not run yet.
  mkdirSync(path.dirname(target), { recursive: true });
  const release = acquireLock(receiptLockPath(root, event.eventId));
  try {
    const prior = readReceipt(root, event.eventId);
    if (prior) {
      const expected = fromHook ? eventIdentitySha256(event) : eventSha256(event, { elapsedHoursToken });
      const actual = fromHook ? prior.eventIdentitySha256 : prior.eventSha256;
      if (actual !== expected) {
        throw new ProgressError(`eventId ${event.eventId} already belongs to a different payload`);
      }
      if (!prior.event || typeof prior.event !== 'object') {
        throw new ProgressError(`existing progress receipt for ${event.eventId} has no durable event snapshot`);
      }
      const priorDegraded = prior.memory && prior.memory.status === 'degraded';
      if (prior.complete !== true || priorDegraded) {
        const { memory, complete, receipt } = deliverAndWriteReceipt({
          root,
          event: prior.event,
          elapsedHoursToken: prior.elapsedHoursToken ?? elapsedHoursToken,
          sessionLogAppended: Boolean(prior.sessionLogAppended),
          canonicalState: prior.canonicalState,
          deliver,
          env,
        });
        return {
          status: statusFor(memory),
          eventId: prior.event.eventId,
          recoveredPendingDelivery: true,
          memory,
          receipt,
        };
      }
      return {
        status: 'duplicate',
        eventId: event.eventId,
        deliveryComplete: prior.complete === true,
        memory: prior.memory,
        receipt: target,
      };
    }

    const record = markdownRecord(event, { elapsedHoursToken });
    const appended = appendSessionLog(root, event.eventId, record);
    writeReceipt(root, {
      event,
      elapsedHoursToken,
      sessionLogAppended: appended,
      memory: { transport: 'pending', status: 'pending' },
      complete: false,
      canonicalState: state.source,
    });
    if (env.KPM_TEST_CRASH_BEFORE_MEMORY === '1') throw new CrashSeam(74);

    const { memory, receipt } = deliverAndWriteReceipt({
      root,
      event,
      elapsedHoursToken,
      sessionLogAppended: appended,
      canonicalState: state.source,
      deliver,
      env,
    });
    return { status: statusFor(memory), eventId: event.eventId, sessionLogAppended: appended, memory, receipt };
  } finally {
    release();
  }
}

/**
 * Retry delivery for every receipt that is incomplete or degraded, oldest
 * (`recordedAt`) first, up to `limit`. This pack's own trigger: upstream
 * receipts are never replayed by themselves, so a degraded one would stay
 * degraded forever without it.
 */
export function flushDegraded({ root, deliver, limit = 25 }) {
  const directory = path.join(root, '.prometheus', 'progress-memory-receipts');
  const ids = existsSync(directory)
    ? readdirSync(directory)
        .filter((name) => name.endsWith('.json'))
        .map((name) => {
          const receipt = JSON.parse(readFileSync(path.join(directory, name), 'utf8'));
          return { eventId: receipt.eventId, recordedAt: receipt.recordedAt, receipt };
        })
        .filter(({ receipt }) => receipt.complete !== true || (receipt.memory && receipt.memory.status === 'degraded'))
        .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0))
    : [];

  const visited = ids.slice(0, limit);
  let delivered = 0;
  let stillDegraded = 0;
  for (const { eventId, receipt } of visited) {
    const release = acquireLock(receiptLockPath(root, eventId));
    try {
      const elapsedHoursToken = receipt.elapsedHoursToken;
      const { memory, complete } = deliverAndWriteReceipt({
        root,
        event: receipt.event,
        elapsedHoursToken,
        sessionLogAppended: Boolean(receipt.sessionLogAppended),
        canonicalState: receipt.canonicalState,
        deliver,
        env: process.env,
      });
      if (complete) delivered += 1;
      else stillDegraded += 1;
      void memory;
    } finally {
      release();
    }
  }
  return { delivered, stillDegraded, unvisited: ids.length - visited.length };
}
