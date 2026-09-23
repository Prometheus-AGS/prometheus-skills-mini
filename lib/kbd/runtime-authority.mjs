// Port of shared/lib/runtime-authority.sh (prometheus-skill-pack, 31 lines).
// See runtime-authority.test.mjs for the source-behaviour note.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Whether `.kbd-orchestrator/current-waypoint.json` under `root` was produced by the canonical
 * `prometheus kbd` runtime, as opposed to a hand-authored or legacy projection.
 *
 * A missing file or unparsable JSON is "not authoritative" rather than an error — the caller is
 * asking a yes/no question about ownership, not asking this function to validate the waypoint.
 */
export function isRuntimeAuthoritative(root = '.') {
  const waypointPath = path.join(root, '.kbd-orchestrator', 'current-waypoint.json');
  if (!existsSync(waypointPath)) return false;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(waypointPath, 'utf8'));
  } catch {
    return false;
  }

  return parsed?.generatedBy === 'kbd-runtime';
}

/**
 * Throws when `target` (a path under `.kbd-orchestrator/`, named for the error message) belongs
 * to a runtime-authoritative projection and would therefore be written out of band. Callers that
 * gain their own write path call this immediately before writing, so a stale write attempt fails
 * loudly instead of silently diverging from canonical state.
 */
export function assertProjectionWritable(root, target) {
  if (isRuntimeAuthoritative(root)) {
    throw new Error(
      `kbd-runtime: direct write rejected for ${target} — the canonical runtime already owns this projection`
    );
  }
}
