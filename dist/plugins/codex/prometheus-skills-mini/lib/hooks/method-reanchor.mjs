// Compact selected-method recovery pointers for SessionStart and PreCompact (full #195).
// Cheap file reads only, because the KBD control hooks run inside a 1000 ms budget: it names
// the active phase's derived method-context index and adopted contract and echoes a labelled
// snapshot. It resolves nothing, claims no authority and intercepts no tool.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SLUG = /^[a-z0-9][a-z0-9._-]*$/;
const SNAPSHOT_FIELDS = ['selectedMethod', 'phaseId', 'sourceRevision', 'status', 'blockers', 'policyConflicts', 'control'];

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function activePhasePath(projectRoot) {
  const waypoint = readJson(path.join(projectRoot, '.kbd-orchestrator', 'current-waypoint.json'));
  if (!waypoint) return [];
  const components = Array.isArray(waypoint.path) && waypoint.path.length ? waypoint.path : [waypoint.phase];
  return components.every((part) => typeof part === 'string' && SLUG.test(part) && !part.includes('..')) ? components : [];
}

/** Lines to print at session start or after compaction; empty when there is no active phase. */
export function methodReanchorLines(projectRoot) {
  if (!projectRoot) return [];
  const phasePath = activePhasePath(projectRoot);
  if (!phasePath.length) return [];
  const directory = ['.kbd-orchestrator', 'phases', ...phasePath.flatMap((part, index) => (index ? ['children', part] : [part]))].join('/');
  const index = readJson(path.join(projectRoot, ...directory.split('/'), 'method-context.json'));
  const snapshot = index
    ? `Method snapshot (derived; re-resolve canonical authority): ${JSON.stringify(Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, index[field]])))}`
    : 'Method snapshot unavailable: resolve selected method and contract before dependent work; do not infer them from old commands or memory.';
  return [
    `KBD METHOD RECOVERY: ${directory}/method-context.md; contract: ${directory}/adopted-contract.json`,
    snapshot,
    'Recovery preserves latest supersession, original evidence, candidate freshness, consumed budgets and unresolved effects. Reconcile uncertain effects before retry.',
    'For selected VLBV: only the complete agreed value-phase boundary with separate authority permits generated-code verification. Host-policy conflicts remain explicit; no generic tool interception is claimed.',
  ];
}
