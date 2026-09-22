// The human-readable session log: one markdown record per recorded boundary,
// appended under a lock, deduplicated by a marker. A port of markdown_record
// and append_session_log (record-progress.py:315-358).
//
// This does not import lib/refiner: that module's read-modify-write append
// is for a bounded per-artifact log, not this unbounded, cross-tool file.
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { acquireLock } from '../platform/lock.mjs';

/** The source pack's own lock file name, so the two packs exclude each other on one project root. */
export const SESSION_LOG_LOCK_SUFFIX = '.karpathy-progress.lock';

const sessionLogPath = (root) => path.join(root, '.prometheus', 'session-log.md');
const markerFor = (eventId) => `<!-- karpathy-progress-event:${eventId} -->`;

/**
 * The markdown record for one boundary, in the source pack's exact shape.
 * `elapsedHoursToken` is the token as the recorder received it (see hash.mjs):
 * the source pack's f-string renders `1` and `1.0` differently though they are
 * the same JS number, and the record must match whichever was actually recorded.
 */
export function markdownRecord(event, { elapsedHoursToken }) {
  const files = event.touchedFiles.length > 0 ? event.touchedFiles.map((file) => `\`${file}\``).join(', ') : 'none';
  const checks =
    event.verification.length > 0
      ? event.verification.map((item) => `  - \`${item.command}\` → exit ${item.exitCode}: ${item.summary}`).join('\n')
      : '  - none recorded';
  return (
    `\n${markerFor(event.eventId)}\n` +
    `## Progress boundary — ${event.observedAt}\n\n` +
    `- Event: \`${event.eventId}\`\n` +
    `- Boundary: \`${event.boundary}\` / \`${event.status}\`\n` +
    `- Position: \`${event.phaseId}\` / \`${event.changeId ?? '-'}\` / \`${event.taskId ?? '-'}\`\n` +
    `- Class and elapsed time: \`${event.taskClass}\` / \`${elapsedHoursToken}\` hours\n` +
    `- Commit: \`${event.commitSha ?? 'uncommitted'}\`\n` +
    `- Files: ${files}\n` +
    `- Blocker: ${event.blocker ?? 'none'}\n` +
    `- Exact next work: ${event.exactNextWork ?? 'none recorded'}\n` +
    `- Verification:\n${checks}\n`
  );
}

/**
 * Append `record` for `eventId`, unless its marker is already present. Returns
 * whether it was appended. The lock is held across BOTH the marker check and
 * the append — a replay racing a first write must not see a false negative —
 * and is released even when the write throws.
 */
export function appendSessionLog(root, eventId, record) {
  const log = sessionLogPath(root);
  mkdirSync(path.dirname(log), { recursive: true });
  const release = acquireLock(`${log}${SESSION_LOG_LOCK_SUFFIX}`);
  try {
    const existing = existsSync(log) ? readFileSync(log, 'utf8') : '';
    if (existing.includes(markerFor(eventId))) return false;
    appendFileSync(log, record, 'utf8');
    return true;
  } finally {
    release();
  }
}
