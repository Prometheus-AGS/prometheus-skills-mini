// Building a progress event for a hook boundary, and reading one given as
// text. A port of event_from_hook, parse_hook_subject, touched_files, git_value
// and load_event (record-progress.py:88-197).
//
// git is the only process here. It is asked only to read (rev-parse, diff,
// ls-files), through spawnExecutable with an args array, and a git that is
// absent or fails yields null / no files rather than an error: a repository
// with no commits is a state the recorder must record in, not refuse.
import { createHash } from 'node:crypto';
import { spawnExecutable } from '../platform/spawn.mjs';
import { eventFromText } from './hash.mjs';

export const BOUNDARIES = Object.freeze(['task', 'change', 'phase']);
const MAX_TOUCHED_FILES = 500;
/** Paths the recorder itself writes; a boundary event must not list them. */
const RECORDER_OWNED = Object.freeze(['.prometheus/progress-memory-receipts/', '.prometheus/memory-outbox/']);
const SESSION_LOG = '.prometheus/session-log.md';

/** `kpm-` + the first 32 hex of SHA-256 over the NUL-joined identity, an absent part as ''. */
export function hookEventId({ projectId, runId, boundary, phaseId, changeId, taskId }) {
  const identity = [projectId, runId, boundary, phaseId, changeId, taskId, 'complete']
    .map((part) => (part === null || part === undefined ? '' : String(part)))
    .join('\0');
  return `kpm-${createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 32)}`;
}

/** KBD_HOOK_NAME names the subject as `change/task` or `change:task`; the active path fills the rest. */
export function parseHookSubject(boundary, name, activePath) {
  const separator = name.includes('/') ? '/' : name.includes(':') ? ':' : null;
  const [namedChange, namedTask = ''] = separator ? [name.slice(0, name.indexOf(separator)), name.slice(name.indexOf(separator) + 1)] : [name];
  if (boundary === 'task') {
    return { changeId: namedChange || activePath.changeId || null, taskId: namedTask || activePath.taskId || null };
  }
  if (boundary === 'change') return { changeId: namedChange || activePath.changeId || null, taskId: null };
  return { changeId: null, taskId: null };
}

const gitStdout = (git, root, args) => {
  try {
    const result = git('git', args, { cwd: root, encoding: 'utf8' });
    return result.status === 0 && typeof result.stdout === 'string' ? result.stdout : null;
  } catch {
    return null;
  }
};

const gitValue = (git, root, args) => {
  const out = gitStdout(git, root, args);
  return out && out.trim() !== '' ? out.trim() : null;
};

/** Changed and untracked paths, sorted, minus the recorder's own files, at most 500. */
export function touchedFilesFrom(git, root) {
  const paths = new Set();
  for (const args of [['diff', '--name-only', '-z', 'HEAD'], ['ls-files', '--others', '--exclude-standard', '-z']]) {
    const out = gitStdout(git, root, args);
    if (out === null) continue;
    for (const item of out.split('\0')) if (item !== '') paths.add(item);
  }
  return [...paths]
    .filter((p) => p !== SESSION_LOG && !RECORDER_OWNED.some((owned) => p.startsWith(owned)))
    .sort()
    .slice(0, MAX_TOUCHED_FILES);
}

/** The event for a completed boundary, from canonical state and the hook environment. */
export function eventFromHook({ boundary, state, root = process.cwd(), env = process.env, git = spawnExecutable, now = () => new Date() }) {
  if (!BOUNDARIES.includes(boundary)) throw new TypeError(`unsupported hook boundary: ${boundary}`);
  const { changeId, taskId } = parseHookSubject(boundary, env.KBD_HOOK_NAME ?? '', state.activePath);
  const elapsed = Number(env.KBD_TASK_ELAPSED_HOURS ?? '0');
  if (env.KBD_TASK_ELAPSED_HOURS !== undefined && (env.KBD_TASK_ELAPSED_HOURS.trim() === '' || Number.isNaN(elapsed))) {
    throw new TypeError('KBD_TASK_ELAPSED_HOURS must be numeric');
  }
  const phaseId = state.activePath.phaseId;
  return {
    schemaVersion: 1,
    eventId: hookEventId({ projectId: state.projectId, runId: state.runId, boundary, phaseId, changeId, taskId }),
    observedAt: now().toISOString(),
    runId: state.runId,
    boundary,
    status: 'complete',
    phaseId,
    changeId,
    taskId,
    taskClass: (env.KBD_TASK_CLASS ?? 'product').toLowerCase(),
    elapsedHours: elapsed,
    touchedFiles: touchedFilesFrom(git, root),
    verification: [],
    commitSha: gitValue(git, root, ['rev-parse', 'HEAD']),
    blocker: null,
    exactNextWork: state.exactNextWork ?? null,
  };
}

/** An event given as text (--input): parsed, with its elapsedHours token kept. */
export function readInputEvent(text) {
  let parsed;
  try {
    // JSON.parse accepts CRLF between tokens; nothing to normalise.
    parsed = eventFromText(text);
  } catch (error) {
    throw new TypeError(`progress event is invalid JSON: ${error.message}`);
  }
  if (parsed.event === null || typeof parsed.event !== 'object' || Array.isArray(parsed.event)) {
    throw new TypeError('progress event must be a JSON object');
  }
  return parsed;
}
