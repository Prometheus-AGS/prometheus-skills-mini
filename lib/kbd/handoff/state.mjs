// Read-only view of KBD position for a handoff. Never writes progress.json, the waypoint or
// runtime state, and never issues a lease or mutating `prometheus kbd` command.
//
// Source order: `prometheus kbd status --json` (canonical, bounded by a timeout with stdin
// closed, because an interactive or hung CLI must not stall the handoff), else the projection
// files. A CLI that is missing, fails, times out or prints non-JSON is treated as absent, as in
// lib/karpathy/canonical-state.mjs. `PROMETHEUS_BIN` names the executable, as it does there; a
// value ending in `.mjs` or `.js` runs through this Node executable, because Node cannot start
// a script file without a shell on Windows.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../../platform/spawn.mjs';

export const STATUS_TIMEOUT_MS = 15000;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => (typeof value === 'string' && value !== '' ? value : null);

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function runStatus(root, env, timeoutMs) {
  const bin = env.PROMETHEUS_BIN || 'prometheus';
  const args = ['kbd', '--path', root, 'status', '--json'];
  const options = { cwd: root, timeout: timeoutMs, stdio: ['ignore', 'pipe', 'pipe'], env };
  const [program, argv] = /\.m?js$/i.test(bin) ? [process.execPath, [bin, ...args]] : [bin, args];
  let result;
  try {
    result = spawnExecutable(program, argv, options);
  } catch (error) {
    return { error: error.message };
  }
  if (result.error) return { error: result.error.code === 'ENOENT' ? 'prometheus CLI not found' : result.error.message };
  if (result.status !== 0) return { error: `prometheus kbd status exited ${result.status ?? result.signal}` };
  try {
    const parsed = JSON.parse(result.stdout);
    return isObject(parsed) ? { status: parsed } : { error: 'prometheus kbd status printed no JSON object' };
  } catch {
    return { error: 'prometheus kbd status printed invalid JSON' };
  }
}

function obligationList(status) {
  const raw = status.boundaryObligations;
  const entries = Array.isArray(raw) ? raw : isObject(raw) ? Object.values(raw) : [];
  return entries.filter(isObject).map((entry) => ({
    key: text(entry.key) ?? `${entry.boundary}:${entry.subject}`,
    boundary: text(entry.boundary) ?? 'unknown',
    subject: text(entry.subject) ?? '',
    signal: text(entry.exactSignal),
  }));
}

// Status of every change and phase the runtime knows, so an obligation can be classified.
function subjectStatuses(status) {
  const phases = isObject(status.phases) ? status.phases : {};
  const change = {};
  const phase = {};
  for (const [id, row] of Object.entries(phases)) {
    if (!isObject(row)) continue;
    phase[id] = text(row.status);
    for (const [changeId, changeRow] of Object.entries(isObject(row.changes) ? row.changes : {})) {
      if (change[changeId] !== 'complete') change[changeId] = text(changeRow?.status);
    }
  }
  return { change, phase };
}

function fromCli(status) {
  const active = isObject(status.activePath) ? status.activePath : {};
  const phasePath = Array.isArray(active.phasePath) ? active.phasePath.filter(text) : [];
  const leaf = phasePath.at(-1) ?? text(active.phaseId);
  const phaseRow = leaf && isObject(status.phases) ? status.phases[leaf] : null;
  const changeId = text(active.changeId);
  return {
    source: 'cli',
    phasePath: phasePath.length ? phasePath : [leaf].filter(Boolean),
    stage: text(active.stageId),
    lifecycle: text(status.lifecycle),
    nextChange: changeId,
    nextTask: text(active.taskId),
    activeChangeStatus: changeId ? text(phaseRow?.changes?.[changeId]?.status) : null,
    obligations: obligationList(status),
    subjects: subjectStatuses(status),
  };
}

export function fromProjection(root) {
  const waypoint = readJson(path.join(root, '.kbd-orchestrator', 'current-waypoint.json')) ?? {};
  const phasePath = Array.isArray(waypoint.path) && waypoint.path.length
    ? waypoint.path.filter(text)
    : [text(waypoint.phase), text(waypoint.childPointer)].filter(Boolean);
  const stageStatus = text(waypoint.stageStatus);
  const stage = text(waypoint.stageId) ?? text(waypoint.stage);
  return {
    source: 'projection',
    phasePath,
    stage: stage && stageStatus ? `${stage} (${stageStatus.toLowerCase()})` : stage,
    lifecycle: text(waypoint.lifecycle) ?? text(waypoint.status),
    nextChange: text(waypoint.nextChange) ?? text(waypoint.change),
    nextTask: text(waypoint.nextTask) ?? text(waypoint.currentTask),
    activeChangeStatus: null,
    obligations: null,
    subjects: { change: {}, phase: {} },
  };
}

/** Position from the runtime when it answers, else from the projection files. */
export function readPosition({ root, env = process.env, timeoutMs = STATUS_TIMEOUT_MS }) {
  const cli = runStatus(root, env, timeoutMs);
  if (cli.status) return fromCli(cli.status);
  return { ...fromProjection(root), statusError: cli.error };
}

/**
 * Classify open boundary obligations (a Starting receipt with no Completed receipt).
 *
 * - expected: the active phase path, and the active change while it is not complete.
 * - blocking: an open task (begin-task without end-task), or a change/phase that the runtime
 *   already marks complete or does not know - an interrupted close the repair command fixes.
 * - carried: a change/phase off the active position that is started and not finished, such as
 *   carry-over in an earlier open phase. Not an interrupted close; reported as a prerequisite.
 */
export function classifyObligations(position) {
  const result = { blocking: [], carried: [] };
  if (!Array.isArray(position.obligations)) return result;
  for (const entry of position.obligations) {
    if (entry.boundary === 'phase' && position.phasePath.includes(entry.subject)) continue;
    const status = position.subjects?.[entry.boundary]?.[entry.subject] ?? null;
    if (entry.boundary === 'change' && entry.subject === position.nextChange && status !== 'complete') continue;
    const isCarried = (entry.boundary === 'change' || entry.boundary === 'phase') && status !== null && status !== 'complete';
    result[isCarried ? 'carried' : 'blocking'].push({ ...entry, status });
  }
  return result;
}

/** The repair command an operator runs for one blocking obligation. */
export function repairCommand(entry) {
  const boundary = entry.boundary === 'task' ? 'task' : entry.boundary === 'phase' ? 'phase' : 'change';
  return `prometheus kbd guard evaluate --boundary ${boundary} --edge after --subject ${entry.subject} --json --repair-projections`;
}

/**
 * The phase path to hand off: the active path, or the prefix of it ending at `requested`, or a
 * top-level phase directory by that name. Null when no such phase directory exists.
 */
export function selectPhasePath(root, position, requested) {
  const phasesRoot = path.join(root, '.kbd-orchestrator', 'phases');
  let candidate = position.phasePath;
  if (requested) {
    const index = position.phasePath.indexOf(requested);
    candidate = index >= 0 ? position.phasePath.slice(0, index + 1) : [requested];
  }
  if (!candidate.length) return null;
  const dir = path.join(phasesRoot, candidate[0], ...candidate.slice(1).flatMap((segment) => ['children', segment]));
  return existsSync(dir) ? { phasePath: candidate, dir } : null;
}

/** The phase artifacts a handoff reads; absent files are null. */
export function readPhaseFiles(phaseDir) {
  const optional = (name) => {
    const file = path.join(phaseDir, name);
    return existsSync(file) ? file : null;
  };
  return {
    progress: readJson(path.join(phaseDir, 'progress.json')),
    plan: optional('plan.md'),
    execution: optional('execution.md'),
    assessment: optional('assessment.md'),
    goals: optional('goals.md'),
  };
}
