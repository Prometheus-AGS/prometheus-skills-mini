// The refiner's state lifecycle, replacing state-init.sh (105 lines),
// state-checkpoint.sh (47) and state-finalize.sh (57).
//
// Those scripts shell out to python3 for JSON and UUIDs and to `date -u` for
// timestamps. None of that survives C4 (no Python) or the command policy, and
// none of it needs to: JSON.parse/stringify, crypto.randomUUID() and
// toISOString() are stdlib. The port is mechanical, which is why it is short.
//
// Writes go through lib/platform/atomic-write.mjs. Upstream wrote state.json in
// place; a truncating write to a predictable path is the data-loss bug this
// project already fixed once, and state.json sits beside artifacts worth more
// than it is.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createAtomicWrite } from '../platform/atomic-write.mjs';
import { readText } from '../platform/text.mjs';

const atomicWrite = createAtomicWrite({});

const MAX_ITERATIONS = 5;

const now = () => new Date().toISOString();

const artifactDir = (root, artifactName) =>
  path.join(root, '.refiner', 'artifacts', artifactName);

const stateFile = (root, artifactName) => path.join(artifactDir(root, artifactName), 'state.json');

const readStateFile = (root, artifactName) => {
  const file = stateFile(root, artifactName);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readText(file));
  } catch {
    // A corrupt state file is a degraded read, not a crash: the caller decides
    // whether to start fresh.
    return null;
  }
};

const persist = (root, artifactName, state) => {
  mkdirSync(artifactDir(root, artifactName), { recursive: true });
  atomicWrite(stateFile(root, artifactName), `${JSON.stringify(state, null, 2)}\n`);
  return state;
};

const freshState = ({ artifactName, artifactType, contentType, priorRefinementId }) => {
  const at = now();
  return {
    refinement_id: randomUUID(),
    prior_refinement_id: priorRefinementId ?? null,
    artifact_name: artifactName,
    artifact_type: artifactType,
    content_type: contentType,
    started_at: at,
    updated_at: at,
    current_iteration: 0,
    max_iterations: MAX_ITERATIONS,
    goals: [],
    constraints: [],
    phases_completed: [],
    convergence_status: 'running',
    iteration_history: [],
  };
};

// Three branches, exactly as upstream: resume a running artifact, seed a new
// cycle from a finalized one, or start fresh.
export function initState({
  root,
  artifactName,
  artifactType = 'content',
  contentType = 'direct:content',
}) {
  const existing = readStateFile(root, artifactName);

  if (existing?.convergence_status === 'running') {
    // Resume. Only updated_at moves — truncating here would discard the
    // iterations the artifact has already earned.
    return persist(root, artifactName, { ...existing, updated_at: now() });
  }

  return persist(
    root,
    artifactName,
    freshState({
      artifactName,
      artifactType,
      contentType,
      priorRefinementId: existing?.refinement_id ?? null,
    }),
  );
}

export function checkpointState({ root, artifactName, phase = 'unknown', note = null }) {
  const existing = readStateFile(root, artifactName);
  if (!existing) {
    // An unknown artifact is a degraded checkpoint, never a thrown error: a
    // checkpoint is a signal, and losing one must not fail the work it records.
    return { status: 'degraded', reason: `no state for artifact "${artifactName}"` };
  }

  const at = now();
  return persist(root, artifactName, {
    ...existing,
    updated_at: at,
    current_iteration: (existing.current_iteration ?? 0) + 1,
    iteration_history: [
      ...(existing.iteration_history ?? []),
      { iteration: (existing.current_iteration ?? 0) + 1, phase, note, at },
    ],
  });
}

export function finalizeState({ root, artifactName, status = 'converged' }) {
  const existing = readStateFile(root, artifactName);
  if (!existing) {
    return { status: 'degraded', reason: `no state for artifact "${artifactName}"` };
  }

  const at = now();
  return persist(root, artifactName, {
    ...existing,
    updated_at: at,
    finalized_at: at,
    convergence_status: status,
  });
}
