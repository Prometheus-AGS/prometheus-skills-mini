// Port of shared/lib/rollup.sh (prometheus-skill-pack, 89 lines).
//
// Aggregates child-loop progress up the ancestor chain. `rollupChildren(nodeDir)` recomputes
// one node's `children` block from each child dir's own progress.json; `rollupChain(root, path)`
// rolls up every ancestor along a path, deepest first.
//
// Reuses `implementationCompleted`/`implementationTotal`/`dimensionStatus` from progress.mjs and
// `kbdNodeDir` from waypoint.mjs — both already ported — rather than reimplementing the
// completion-precedence logic a second time, per the task's explicit instruction.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';
import { implementationCompleted, implementationTotal, dimensionStatus } from './progress.mjs';
import { kbdNodeDir } from './waypoint.mjs';

/** Read and parse a progress.json, returning null on any I/O or parse failure. */
function readProgressSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Recompute `nodeDir`'s `children` block from each subdirectory of `nodeDir/children/` that has
 * a valid progress.json. Non-destructive: only the `children` key is rewritten. A no-op when
 * `nodeDir/progress.json` is absent, or when the node is runtime-authoritative
 * (`generatedBy === 'kbd-runtime'` — child summaries are reducer-derived there, matching the
 * source's early return).
 */
export function rollupChildren(nodeDir) {
  const progressFile = path.join(nodeDir, 'progress.json');
  if (!existsSync(progressFile)) return;

  const progress = readProgressSafe(progressFile);
  if (progress === null) return;
  if (progress.generatedBy === 'kbd-runtime') return;

  const childrenRoot = path.join(nodeDir, 'children');
  const aggregated = {};

  if (existsSync(childrenRoot)) {
    for (const entry of readdirSync(childrenRoot).sort()) {
      const childDir = path.join(childrenRoot, entry);
      if (!statSync(childDir).isDirectory()) continue;

      const childProgressFile = path.join(childDir, 'progress.json');
      if (!existsSync(childProgressFile)) continue;
      const childProgress = readProgressSafe(childProgressFile);
      if (childProgress === null) continue;

      const handoffFile = path.join(childDir, 'handoff-out.md');
      const handoff = existsSync(handoffFile) ? `children/${entry}/handoff-out.md` : null;

      const implDone = implementationCompleted(childProgress);
      const implTotal = implementationTotal(childProgress);
      const certStatus = dimensionStatus(childProgress, 'certification');

      const isComplete =
        String(dimensionStatus(childProgress, 'implementation')).toUpperCase() === 'COMPLETE' ||
        childProgress.reflect_complete === true;
      const status = isComplete ? 'DONE' : childProgress.active_change ? 'IN_PROGRESS' : 'PENDING';

      aggregated[entry] = {
        status,
        implementation_completed: implDone,
        implementation_total: implTotal,
        changes_completed: implDone,
        changes_total: implTotal,
        certification_status: certStatus,
        handoff,
        completed_at: childProgress.updatedAt ?? childProgress.last_updated ?? null,
      };
    }
  }

  atomicWrite(progressFile, JSON.stringify({ ...progress, children: aggregated }, null, 2));
}

/** Roll up every ancestor that can have children, from the deepest node up to the top phase. */
export function rollupChain(root, tokens) {
  for (let i = tokens.length; i >= 1; i -= 1) {
    const prefix = tokens.slice(0, i);
    rollupChildren(path.join(root, kbdNodeDir(...prefix)));
  }
}
