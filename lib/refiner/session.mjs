// Workflow dispatch and the session hygiene checks, replacing
// workflow-dispatch.sh (151 lines), post-execute-check.sh (69),
// finalize-session.sh (31) and log-reflection.sh (21).
//
// Three of those four only WARN and exit 0 unconditionally. That is deliberate
// upstream and is preserved here: they are session hygiene, not gates. A missing
// refinement_log.md is worth telling the operator about, but failing on it would
// block a session on nothing.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createAtomicWrite } from '../platform/atomic-write.mjs';
import { readText } from '../platform/text.mjs';

const atomicWrite = createAtomicWrite({});

const artifactDir = (root, artifactName) => path.join(root, '.refiner', 'artifacts', artifactName);

const parses = (file) => {
  if (!existsSync(file)) return true;
  try {
    JSON.parse(readText(file));
    return true;
  } catch {
    return false;
  }
};

// Events are one JSON object per line. The log is APPENDED: it is the record of
// what happened, so replacing it would discard the history it exists to keep.
// atomic-write replaces a whole file, so the append is read-modify-write through
// it — which also means a half-written line cannot survive a crash.
export function dispatchEvent({ root = process.cwd(), artifactName, eventType, phase = null }) {
  const stateFile = path.join(artifactDir(root, artifactName), 'state.json');
  if (!existsSync(stateFile)) {
    process.stderr.write(`WARN: no state for "${artifactName}", skipping dispatch\n`);
    return { status: 'skipped', reason: `no state for artifact "${artifactName}"` };
  }

  let state;
  try {
    state = JSON.parse(readText(stateFile));
  } catch (error) {
    process.stderr.write(`WARN: state for "${artifactName}" is unreadable: ${error.message}\n`);
    return { status: 'skipped', reason: 'state is unreadable' };
  }

  const event = {
    event_type: eventType,
    artifact_name: artifactName,
    refinement_id: state.refinement_id ?? '',
    artifact_type: state.artifact_type ?? '',
    content_type: state.content_type ?? '',
    phase,
    current_iteration: state.current_iteration ?? 0,
    at: new Date().toISOString(),
  };

  const logPath = path.join(artifactDir(root, artifactName), 'workflow.log');
  const existing = existsSync(logPath) ? readText(logPath) : '';
  atomicWrite(logPath, `${existing}${JSON.stringify(event)}\n`);

  return { status: 'dispatched', event, log: logPath };
}

// ── Advisory checks: warn, never fail ───────────────────────────────────────

const isEmptyDir = (dir) => {
  try {
    return readdirSync(dir).length === 0;
  } catch {
    return true;
  }
};

export function postExecuteCheck({ root = process.cwd() } = {}) {
  const warnings = [];
  if (!existsSync(path.join(root, 'artifact_manifest.json'))) {
    warnings.push('artifact_manifest.json not found after execution');
  }
  const dist = path.join(root, 'dist');
  if (!existsSync(dist) || isEmptyDir(dist)) warnings.push('dist/ is empty after execution');
  if (!existsSync(path.join(root, 'refinement_log.md'))) warnings.push('refinement_log.md not found');

  for (const warning of warnings) process.stderr.write(`WARN: ${warning}\n`);
  return { ok: true, warnings };
}

export function finalizeSession({ root = process.cwd() } = {}) {
  const warnings = [];
  for (const file of ['artifact_manifest.json', 'constraints.json']) {
    if (!parses(path.join(root, file))) warnings.push(`${file} is corrupted`);
  }

  for (const warning of warnings) process.stderr.write(`WARN: ${warning}\n`);
  return { ok: true, warnings };
}

export function logReflectionCheck({ root = process.cwd() } = {}) {
  const warnings = [];
  if (!existsSync(path.join(root, 'refinement_log.md'))) {
    warnings.push('refinement_log.md not found — reflection may not have logged properly');
  }
  if (!existsSync(path.join(root, 'decisions.md'))) {
    warnings.push('decisions.md not found — convergence decision may not be recorded');
  }

  for (const warning of warnings) process.stderr.write(`WARN: ${warning}\n`);
  return { ok: true, warnings };
}
