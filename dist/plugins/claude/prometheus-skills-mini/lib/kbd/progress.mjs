// Port of shared/lib/progress.sh (prometheus-skill-pack, 218 lines).
//
// Canonical KBD completion semantics. `completion.implementation` is the only source for the
// implementation counter when present; legacy `changes_completed`/`changes_total` remain
// supported as aliases for pre-v4 ledgers. Evidence, certification and publication are
// independent dimensions and MUST NOT be read as reducing implementation.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../platform/spawn.mjs';
import { atomicWrite } from '../platform/atomic-write.mjs';

const VALID_DIMENSION_STATUSES = new Set([
  'NOT_TRACKED', 'NOT_REQUIRED', 'PENDING', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED',
]);

/** The single source of truth for the implementation-completed counter. */
export function implementationCompleted(progress) {
  return (
    progress?.completion?.implementation?.completed ??
    progress?.implementation_completed ??
    progress?.changes_completed ??
    0
  );
}

/** The single source of truth for the implementation-total counter. */
export function implementationTotal(progress) {
  return (
    progress?.completion?.implementation?.total ??
    progress?.implementation_total ??
    progress?.changes_total ??
    0
  );
}

/**
 * `completion.<dimension>.status`, falling back to a derived COMPLETE/IN_PROGRESS for the
 * implementation dimension specifically (the counter always implies a status), and NOT_TRACKED
 * for any other dimension with no explicit status.
 */
export function dimensionStatus(progress, dimension) {
  const explicit = progress?.completion?.[dimension]?.status;
  if (explicit !== undefined) return explicit;
  if (dimension === 'implementation') {
    return implementationCompleted(progress) >= implementationTotal(progress) ? 'COMPLETE' : 'IN_PROGRESS';
  }
  return 'NOT_TRACKED';
}

/** `changes` as a flat array, whether the ledger stores it as an array or an id-keyed map. */
function changesList(progress) {
  const changes = progress?.changes;
  if (Array.isArray(changes)) return changes;
  if (changes && typeof changes === 'object') return Object.values(changes);
  return [];
}

/** Object-shaped rows within `changes` (string-list ledgers contribute nothing here). */
function objectRows(progress) {
  return changesList(progress).filter((row) => row && typeof row === 'object');
}

/**
 * The schema-v2 completion invariant checker. Returns a boolean — never throws — matching the
 * source's `jq -e ... || return 1` shape: a caller that wants a reason should inspect the
 * progress object itself, not expect this function to explain the failure.
 */
export function validateProgress(progress) {
  const done = implementationCompleted(progress);
  const total = implementationTotal(progress);

  if (!(typeof done === 'number' && done >= 0)) return false;
  if (!(typeof total === 'number' && total >= 0)) return false;
  if (!(done <= total)) return false;

  if (progress.completion) {
    const completion = progress.completion;
    if (completion.primaryCounter !== 'implementation') return false;
    if (typeof completion.implementation !== 'object' || completion.implementation === null) return false;
    if (!VALID_DIMENSION_STATUSES.has(completion.implementation.status)) return false;

    for (const dim of [completion.evidence, completion.certification, completion.publication]) {
      if (dim != null && !VALID_DIMENSION_STATUSES.has(dim.status)) return false;
    }

    if ('changes_completed' in progress && progress.changes_completed !== done) return false;
    if ('changes_total' in progress && progress.changes_total !== total) return false;
    if ('implementation_completed' in progress && progress.implementation_completed !== done) return false;
    if ('implementation_total' in progress && progress.implementation_total !== total) return false;
  }

  if (progress.schemaVersion === '2') {
    if (!(typeof progress.phase === 'string' && progress.phase.length > 0)) return false;
    if (!(typeof progress.last_updated === 'string' && progress.last_updated.length > 0)) return false;
    if (!(typeof progress.last_updated_by === 'string' && progress.last_updated_by.length > 0)) return false;
    if (!Array.isArray(progress.changes)) return false;

    const rows = progress.changes;
    const rowsValid = rows.every(
      (row) =>
        row &&
        typeof row === 'object' &&
        typeof row.id === 'string' &&
        row.id.length > 0 &&
        'status' in row &&
        'implementation_status' in row
    );
    if (!rowsValid) return false;

    const ids = rows.map((row) => row.id);
    if (new Set(ids).size !== ids.length) return false;
  }

  const rows = objectRows(progress);
  if (rows.length > 0 && rows.some((row) => 'implementation_status' in row)) {
    const allHaveStatus = rows.every((row) => 'implementation_status' in row);
    if (!allHaveStatus) return false;
    const completeCount = rows.filter((row) => row.implementation_status === 'COMPLETE').length;
    if (completeCount !== done) return false;
  }

  return true;
}

/** Throwing wrapper around validateProgress, for call sites that need a reason attached. */
function assertValidProgress(progress, file) {
  if (!validateProgress(progress)) {
    throw new Error(`kbd-progress: completion invariant failed: ${file}`);
  }
}

/**
 * Apply `mark_change` to a copy of `progress`: flip the named change's `implementation_status`
 * to `COMPLETE` when it is an object row; a string-list ledger has no per-change row to flip, so
 * this is a no-op there and the counter is expected to have been advanced by the caller already.
 * Throws when `changeId` is not present in either shape, matching the source's `error(...)`.
 */
function markChangeComplete(progress, changeId) {
  const changes = progress.changes;

  if (Array.isArray(changes)) {
    const known = changes.some(
      (row) => (row && typeof row === 'object' && row.id === changeId) || row === changeId
    );
    if (!known) throw new Error(`unknown change id: ${changeId}`);
    return {
      ...progress,
      changes: changes.map((row) =>
        row && typeof row === 'object' && row.id === changeId
          ? { ...row, implementation_status: 'COMPLETE' }
          : row
      ),
    };
  }

  if (changes && typeof changes === 'object') {
    if (!(changeId in changes)) throw new Error(`unknown change id: ${changeId}`);
    return {
      ...progress,
      changes: { ...changes, [changeId]: { ...changes[changeId], implementation_status: 'COMPLETE' } },
    };
  }

  throw new Error(`unknown change id: ${changeId}`);
}

/**
 * Mark one change's code/integration contract complete and atomically derive the implementation
 * counter. Evidence/certification/publication fields are deliberately left untouched (seeded to
 * NOT_TRACKED only when absent).
 *
 * Two branches, exactly matching the source:
 * - **Runtime-authoritative** (`generatedBy === 'kbd-runtime'`): delegates to
 *   `prometheus kbd change transition`, then fires the `change:after` hook if a `hooksFire`
 *   callback was supplied. Nothing is written to `file` directly in this mode — the runtime CLI
 *   owns that.
 * - **Legacy**: read → transform → validate → atomic write. A failed validation or an unknown
 *   change id leaves the file untouched (throws before any write).
 */
export async function markImplementationComplete(file, changeId, ctx = {}) {
  const spawn = ctx.spawn ?? spawnExecutable;
  const progress = JSON.parse(readFileSync(file, 'utf8'));

  if (progress.generatedBy === 'kbd-runtime') {
    const root = ctx.root ?? resolveRootFromLedgerPath(file);
    const phase = progress.phase;
    if (!phase) throw new Error('kbd-progress: active phase is required');

    const result = spawn('prometheus', [
      'kbd', '--path', root, 'change', 'transition',
      '--command-id', `implementation-complete:${phase}:${changeId}`,
      '--phase', phase,
      '--id', changeId, '--status', 'complete',
    ]);
    if (result?.status !== 0) {
      throw new Error(`kbd-progress: change transition failed: ${result?.stderr ?? ''}`);
    }

    if (typeof ctx.hooksFire === 'function') {
      ctx.hooksFire('change', 'after', changeId, 1, 1);
    }
    return;
  }

  const marked = markChangeComplete(progress, changeId);
  const done = objectRows(marked).length > 0 && objectRows(marked).some((r) => 'implementation_status' in r)
    ? objectRows(marked).filter((r) => r.implementation_status === 'COMPLETE').length
    : marked.changes_completed ?? marked.implementation_completed ?? 0;
  const total = marked.implementation_total ?? marked.changes_total ?? changesList(marked).length;

  const next = {
    ...marked,
    completion: {
      ...(marked.completion ?? {}),
      primaryCounter: 'implementation',
      implementation: { completed: done, total, status: done >= total ? 'COMPLETE' : 'IN_PROGRESS' },
      evidence: marked.completion?.evidence ?? { status: 'NOT_TRACKED', summary: null, blockers: [] },
      certification: marked.completion?.certification ?? { status: 'NOT_TRACKED', summary: null, blockers: [] },
      publication: marked.completion?.publication ?? { status: 'NOT_TRACKED', summary: null, blockers: [] },
    },
    implementation_completed: done,
    implementation_total: total,
    changes_completed: done,
    changes_total: total,
  };

  assertValidProgress(next, file);
  await atomicWrite(file, JSON.stringify(next, null, 2));
}

/** Derive the project root from a ledger path under `.kbd-orchestrator/`, as the source does. */
function resolveRootFromLedgerPath(file) {
  const marker = `${path.sep}.kbd-orchestrator${path.sep}`;
  const index = file.indexOf(marker);
  if (index !== -1) return file.slice(0, index) || '.';
  if (file.startsWith(`.kbd-orchestrator${path.sep}`) || file.startsWith('.kbd-orchestrator/')) return '.';
  throw new Error(`kbd-progress: cannot resolve project root from ${file}`);
}
