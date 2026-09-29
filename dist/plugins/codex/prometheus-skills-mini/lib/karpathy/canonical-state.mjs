// Where the recorder learns which project, run and phase it is recording for,
// and — when it can — whether the event agrees with canonical KBD state.
//
// The source pack reads `prometheus kbd status --json` and refuses every event
// it cannot confirm. This pack may depend only on node, git and the openspec CLI
// (openspec/config.yaml), so the prometheus CLI is optional: state comes from it
// when it works, and from the `.kbd-orchestrator/current-waypoint.json`
// projection otherwise. The caller is told which, so a receipt can say whether
// its event was confirmed or only best-effort.
//
// `.kbd-orchestrator/project.json` is never read: its projectId differs from
// the canonical one, and the event id is a hash over the project id, so reading
// it would silently fork every event id.
import path from 'node:path';
import { spawnExecutable } from '../platform/spawn.mjs';
import { readText } from '../platform/text.mjs';

/** A hung CLI must not hang the recorder; it is then treated as absent. */
const STATUS_TIMEOUT_MS = 5000;

export class CanonicalStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CanonicalStateError';
  }
}

const text = (value) => (typeof value === 'string' && value !== '' ? value : null);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const missingIdentity = (state) => [
  ...(state.projectId ? [] : ['projectId']),
  ...(state.runId ? [] : ['runId']),
  ...(state.activePath.phaseId ? [] : ['active phase']),
];

// A CLI that is missing, exits non-zero, times out, or prints something that is
// not a JSON object is treated alike: absent. A broken CLI must not be worse
// than a missing one.
const fromCli = ({ root, env, spawn }) => {
  let result;
  try {
    result = spawn(env.PROMETHEUS_BIN || 'prometheus', ['kbd', '--path', root, 'status', '--json'], {
      cwd: root,
      timeout: STATUS_TIMEOUT_MS,
    });
  } catch {
    return null;
  }
  if (result.error || result.status !== 0) return null;
  let status;
  try {
    status = JSON.parse(result.stdout);
  } catch {
    return null;
  }
  if (!isObject(status)) return null;
  const active = isObject(status.activePath) ? status.activePath : {};
  return {
    source: 'cli',
    projectId: text(status.projectId),
    runId: text(status.runId),
    activePath: { phaseId: text(active.phaseId), changeId: text(active.changeId), taskId: text(active.taskId) },
    exactNextWork: text(status.exactNextWork),
    phases: isObject(status.phases) ? status.phases : {},
  };
};

const fromProjection = ({ root, read }) => {
  let waypoint;
  try {
    waypoint = JSON.parse(read(path.join(root, '.kbd-orchestrator', 'current-waypoint.json')));
  } catch {
    return null;
  }
  if (!isObject(waypoint)) return null;
  return {
    source: 'projection',
    projectId: text(waypoint.projectId),
    runId: text(waypoint.runId),
    activePath: {
      phaseId: text(waypoint.activePhaseId) ?? text(waypoint.phase),
      changeId: text(waypoint.change),
      taskId: text(waypoint.currentTask),
    },
    exactNextWork: text(waypoint.exactNextCommand),
    phases: {},
  };
};

/**
 * Canonical state from the CLI, else from the projection. Throws when neither
 * yields a project id, a run id and an active phase: without them there is no
 * event id to record under, which is a refusal, not a degradation.
 */
export function readCanonicalState({ root, env = process.env, spawn = spawnExecutable, read = readText }) {
  const candidates = [fromCli({ root, env, spawn }), fromProjection({ root, read })].filter(Boolean);
  const usable = candidates.find((state) => missingIdentity(state).length === 0);
  if (usable) return usable;
  const missing = candidates.length > 0 ? missingIdentity(candidates[candidates.length - 1]) : ['projectId', 'runId', 'active phase'];
  throw new CanonicalStateError(
    `canonical state has no ${missing.join(', ')}: neither \`prometheus kbd status\` nor current-waypoint.json supplied it`,
  );
}

const subjectStatus = (event, phase) => {
  if (event.boundary === 'phase') return { actual: phase.status };
  const change = isObject(phase.changes) ? phase.changes[event.changeId] : undefined;
  if (!isObject(change)) return { reason: 'canonical change does not exist in the phase' };
  if (event.boundary === 'change') return { actual: change.implementationStatus || change.status };
  const task = isObject(change.tasks) ? change.tasks[event.taskId] : undefined;
  if (!isObject(task)) return { reason: 'canonical task does not exist in the change' };
  return { actual: task.status };
};

/**
 * The source pack's canonical_validate (record-progress.py:283-313): a different
 * run, an unknown phase, change or task, or a different status. Only the CLI can
 * answer these; in projection mode nothing can be checked, so nothing is refused.
 * No reason carries a value from the event.
 */
export function agreementReasons(event, state) {
  if (state.source !== 'cli') return [];
  if (event.runId !== state.runId) return ['canonical run disagreement: the event names a different run'];
  const phase = state.phases[event.phaseId];
  if (!isObject(phase)) return ['canonical phase does not exist'];
  const { actual, reason } = subjectStatus(event, phase);
  if (reason) return [reason];
  return actual === event.status ? [] : [`canonical ${event.boundary} status disagrees with the event`];
}
