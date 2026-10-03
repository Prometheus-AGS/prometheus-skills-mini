// Port of shared/lib/waypoint.sh (prometheus-skill-pack, 226 lines).
//
// Pure-JS helpers for reading the KBD waypoint, rendering the phase chain, resolving the
// on-disk node dir for an arbitrary-depth path[], and validating worktree-root membership.
//
// Judgment call: the source's `is_descendant` canonicalizes both paths via `cd && pwd -P`
// specifically to defeat a macOS symlink ambiguity (/var vs /private/var). That problem has no
// Windows analogue, so this port uses `fs.realpathSync` — falling back to `path.resolve` when a
// path does not exist yet (e.g. a file about to be created), matching the plan's explicit
// instruction and check-child-scope.mjs's identical need.
//
// Judgment call: `waypointLoad`/`chainSeparator`/`waypointChain`/`kbdNodeChain` take an
// explicit `env` parameter (defaulting to `process.env`) instead of reading `process.env`
// directly, matching this repo's injected-ctx convention (memory.mjs, bottleneck-guard.mjs) so
// locale-dependent behaviour is testable without mutating the real environment.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

/** Emit every documented waypoint field with its documented default applied. */
export function waypointLoad(filePath) {
  if (!filePath || !existsSync(filePath)) {
    throw new Error(`waypoint_load: missing file: ${filePath}`);
  }
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const s = (value, fallback) => (value === undefined || value === null ? fallback : value);

  const explicitPath = Array.isArray(raw.path) && raw.path.length > 0 ? raw.path : null;
  const derivedPath = [raw.phase, raw.childPointer].filter((v) => v !== undefined && v !== null && v !== '');
  const pathValue = explicitPath ? explicitPath.join(',') : derivedPath.join(',');

  return {
    phase: s(raw.phase, ''),
    previousPhase: s(raw.previousPhase, ''),
    change: s(raw.change, ''),
    status: s(raw.status, ''),
    currentTask: s(raw.currentTask, ''),
    nextPendingChange: s(raw.nextPendingChange, ''),
    sourceTool: s(raw.sourceTool, ''),
    nextChange: s(raw.nextChange, ''),
    nextTask: s(raw.nextTask, ''),
    exactNextCommand: s(raw.exactNextCommand, ''),
    parentPhase: s(raw.parentPhase, ''),
    childPhases: (raw.childPhases ?? []).join(','),
    childPointer: s(raw.childPointer, ''),
    path: pathValue,
    backend: s(raw.backend, ''),
    wave: s(raw.wave, ''),
    lastCompletedChange: s(raw.lastCompletedChange, ''),
    completionMetric: s(raw.completionMetric, 'implementation'),
    implementationCompleted: String(s(raw.implementationCompleted, s(raw.changesCompleted, 0))),
    implementationTotal: String(s(raw.implementationTotal, s(raw.changesTotal, 0))),
    certificationStatus: s(raw.certificationStatus, 'NOT_TRACKED'),
    publicationStatus: s(raw.publicationStatus, 'NOT_TRACKED'),
    updatedAt: s(raw.updatedAt, ''),
  };
}

/** The active chain separator: U+203A `›` + space, or ` > ` under a POSIX/C locale. */
export function chainSeparator(env = process.env) {
  const locale = env.LC_ALL || env.LANG || '';
  if (locale === 'POSIX' || locale === 'C' || locale.startsWith('C.')) return ' > ';
  return '› ';
}

/** Render "parent › phase › pointer" with empty slots elided. */
export function waypointChain(parent, phase, pointer, env = process.env) {
  const sepTrim = chainSeparator(env).trim();
  let out = '';
  if (parent) out = parent;
  if (phase) out = out ? `${out} ${sepTrim} ${phase}` : phase;
  if (pointer) out = out ? `${out} ${sepTrim} ${pointer}` : pointer;
  return out;
}

/** Expand `${HOME}`/`$HOME`/`${USER}`/`$USER` against `env`. Unrecognised tokens pass through. */
export function expandKbdPath(input, env = process.env) {
  let out = input;
  out = out.split('${HOME}').join(env.HOME ?? '');
  out = out.split('${USER}').join(env.USER ?? '');
  out = out.split('$HOME').join(env.HOME ?? '');
  out = out.split('$USER').join(env.USER ?? '');
  return out;
}

/**
 * Canonicalize a path that may not exist yet (e.g. a file about to be created). Resolves the
 * deepest existing ancestor with `fs.realpathSync` — defeating a macOS /var-vs-/private/var
 * symlink ambiguity the same way the source's `cd && pwd -P` did — then rejoins the remaining,
 * not-yet-existing segments. A `path.resolve`-only fallback here would silently disagree with a
 * sibling call that resolved an ancestor which DOES exist (e.g. `root` itself), producing a
 * false "not a descendant" for a not-yet-created nested path.
 */
function canonicalize(target) {
  let existing = target;
  const remainder = [];
  while (!existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break; // reached the filesystem root without finding an ancestor
    remainder.unshift(path.basename(existing));
    existing = parent;
  }
  try {
    return path.join(realpathSync(existing), ...remainder);
  } catch {
    return path.resolve(target);
  }
}

/** Whether `child` is a real descendant of `parent` (same path does NOT count). */
export function isDescendant(child, parent) {
  if (!child || !parent) return false;
  const cChild = canonicalize(child);
  const cParent = canonicalize(parent);
  if (cChild === cParent) return false;
  return cChild.startsWith(cParent + path.sep);
}

/** The on-disk node dir (repo-relative) for an arbitrary-depth path[]. */
export function kbdNodeDir(...segments) {
  if (segments.length < 1) throw new Error('kbdNodeDir: at least one segment is required');
  let out = `.kbd-orchestrator/phases/${segments[0]}`;
  for (const seg of segments.slice(1)) {
    if (!seg) continue;
    out = `${out}/children/${seg}`;
  }
  return out;
}

/** Render the N-level breadcrumb for a path[] array. */
export function kbdNodeChain(segments, env = process.env) {
  if (segments.length < 1) throw new Error('kbdNodeChain: at least one segment is required');
  const sep = chainSeparator(env);
  let out = segments[0];
  for (const seg of segments.slice(1)) {
    if (!seg) continue;
    out = `${out}${sep}${seg}`;
  }
  return out;
}

/** The waypoint's path[] as tokens, synthesized from v2 fields when .path is absent. */
function pathFromWaypoint(waypointPath) {
  if (!existsSync(waypointPath)) return null;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(waypointPath, 'utf8'));
  } catch {
    return null;
  }
  if (Array.isArray(parsed.path) && parsed.path.length > 0) return parsed.path;
  return [parsed.phase, parsed.childPointer].filter((v) => v !== undefined && v !== null && v !== '');
}

/**
 * The longest existing prefix of the waypoint's path[], trimming stale child pointers instead
 * of propagating non-existent nodes into derived state. `root` anchors the on-disk lookup
 * (defaults to cwd, matching the source's implicit reliance on `$PWD`-relative node dirs).
 */
export function kbdExistingPathTokens(waypointPath, root = '.') {
  const tokens = pathFromWaypoint(waypointPath);
  if (!tokens || tokens.length === 0) return [];

  const valid = [];
  let current = path.join(root, '.kbd-orchestrator', 'phases', tokens[0]);
  if (!existsSync(current)) return [];
  valid.push(tokens[0]);

  for (let i = 1; i < tokens.length; i += 1) {
    const next = path.join(current, 'children', tokens[i]);
    if (!existsSync(next)) break;
    current = next;
    valid.push(tokens[i]);
  }

  return valid;
}

/** Resolve the active node dir (repo-relative) from the waypoint's path[]. */
export function kbdCurrentNodeDir(waypointPath, root = '.') {
  const tokens = kbdExistingPathTokens(waypointPath, root);
  if (tokens.length === 0) return null;
  return kbdNodeDir(...tokens);
}
