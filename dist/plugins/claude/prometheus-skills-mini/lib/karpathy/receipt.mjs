// Receipts: the durable record of one recorded boundary, kept in the source
// pack's on-disk shape. A port of receipt_path and write_receipt
// (record-progress.py:59-63, :509-540).
//
// Writes go through lib/platform/atomic-write.mjs (temp file in the same
// directory, exclusive create, then rename) rather than upstream's
// NamedTemporaryFile + fsync + os.replace: same two-phase shape, the platform
// helper's job is specifically to make that rename survive Windows AV/indexer
// interference (A-2's named retry scenario), which upstream does not need to.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';
import { readText } from '../platform/text.mjs';
import { eventIdentitySha256, eventSha256 } from './hash.mjs';

const RECEIPTS_DIR = ['.prometheus', 'progress-memory-receipts'];

/** `.prometheus/progress-memory-receipts/<sha256(eventId)>.json`. */
export function receiptPath(root, eventId) {
  const digest = createHash('sha256').update(eventId, 'utf8').digest('hex');
  return path.join(root, ...RECEIPTS_DIR, `${digest}.json`);
}

/**
 * Read the receipt for `eventId`, or `null` if none exists. A receipt that
 * exists but cannot be parsed is a typed error, never treated as absent — a
 * corrupt receipt on disk is not the same fact as "never recorded".
 */
export function readReceipt(root, eventId) {
  const target = receiptPath(root, eventId);
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(readText(target));
  } catch (error) {
    throw new Error(`receipt is unreadable: ${target}: ${error.message}`);
  }
}

/**
 * Write the receipt for `event`, replacing any existing one. `canonicalState`
 * is this pack's own extension (`"cli"` or `"projection"`): the source pack's
 * `write_receipt` does not emit it, and the source pack's reader takes
 * receipts with `prior.get(...)`, so the extra key is ignored, never rejected.
 */
export function writeReceipt(root, { event, elapsedHoursToken, sessionLogAppended, memory, complete, canonicalState }) {
  const directory = path.join(root, ...RECEIPTS_DIR);
  mkdirSync(directory, { recursive: true });
  const payload = {
    schemaVersion: 1,
    eventId: event.eventId,
    eventSha256: eventSha256(event, { elapsedHoursToken }),
    eventIdentitySha256: eventIdentitySha256(event),
    event,
    sessionLogAppended,
    memory,
    complete,
    canonicalState,
    recordedAt: new Date().toISOString(),
  };
  const target = receiptPath(root, event.eventId);
  atomicWrite(target, `${JSON.stringify(payload, null, 2)}\n`);
  return target;
}

/** Every receipt file name in the receipts directory, or []. Used by --flush-degraded. */
export function allReceiptIds(root) {
  const directory = path.join(root, ...RECEIPTS_DIR);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length));
}
