// Delivery to pk: an optional, bounded, shell-free transport. A port of
// memory_write (record-progress.py:399-478), minus the Python outbox
// fallback — that is a second transport this pack does not run. Any pk
// failure here is `degraded`; the receipt is the retry queue (see
// record.mjs and the decision log).
import { createHash } from 'node:crypto';
import { spawnExecutable } from '../platform/spawn.mjs';

/** Upstream's own default, in seconds. */
export const KPM_PK_TIMEOUT_SECONDS_DEFAULT = 5;
const MIN_TIMEOUT_SECONDS = 0.1;
const MAX_TIMEOUT_SECONDS = 10;

function timeoutMillisFrom(env) {
  const raw = env.KPM_PK_TIMEOUT_SECONDS;
  if (raw === undefined) return KPM_PK_TIMEOUT_SECONDS_DEFAULT * 1000;
  const seconds = Number(raw);
  if (raw.trim() === '' || Number.isNaN(seconds)) {
    throw new TypeError('KPM_PK_TIMEOUT_SECONDS must be numeric');
  }
  if (seconds < MIN_TIMEOUT_SECONDS || seconds > MAX_TIMEOUT_SECONDS) {
    throw new TypeError(
      `KPM_PK_TIMEOUT_SECONDS must be between ${MIN_TIMEOUT_SECONDS} and ${MAX_TIMEOUT_SECONDS}`,
    );
  }
  return seconds * 1000;
}

const reasonFor = (result) => {
  if (result.error) {
    if (result.error.code === 'ENOENT') return 'pk executable unavailable';
    if (result.error.code === 'ETIMEDOUT' || result.signal) return 'pk timed out';
    return result.error.message;
  }
  return `pk exited ${result.status}`;
};

/**
 * Deliver `record` to `pk ingest` for `eventId`. Exit 0 is `accepted`; every
 * other outcome — a non-zero exit, pk missing, a timeout, or spawn itself
 * throwing (e.g. `pk` resolving to a script) — is `degraded` with a reason.
 * Never throws for a delivery failure; only a bad `KPM_PK_TIMEOUT_SECONDS`
 * throws, and it does so before anything is spawned.
 */
export function deliverToPk({ eventId, record, env = process.env, spawn = spawnExecutable }) {
  const timeout = timeoutMillisFrom(env);
  const program = env.PK_BIN || 'pk';
  const args = ['ingest', '--scope', 'project', '--source', `karpathy-progress-memory:${eventId}`];

  let result;
  try {
    result = spawn(program, args, { input: record, timeout, shell: false });
  } catch (error) {
    return { transport: 'pk', status: 'degraded', reason: error.message };
  }

  if (result.status === 0) {
    const receipt = (result.stdout ?? '').trim();
    return {
      transport: 'pk',
      status: 'accepted',
      receiptSha256: receipt ? createHash('sha256').update(receipt, 'utf8').digest('hex') : null,
    };
  }
  return { transport: 'pk', status: 'degraded', reason: reasonFor(result) };
}
