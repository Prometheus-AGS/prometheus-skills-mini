// Port of shared/lib/check-child-scope.sh + shared/scripts/lib/path-scope.sh's `pscope_*`
// helpers used by it (prometheus-skill-pack, 102 + relevant lines).
//
// PreToolUse(Write|Edit|MultiEdit) advisory enforcement of a child loop's scope.json. When the
// waypoint path[] is inside a child (depth > 1), writes outside that child's allowedWritePaths
// are flagged. This is HOOK-LEVEL (advisory) isolation, not an OS sandbox — the threat model is
// agent drift, not an adversary.
//
// Judgment call: the source canonicalizes paths via `cd && pwd -P` specifically to defeat a
// macOS /var-vs-/private/var symlink ambiguity. That problem has no Windows analogue, so this
// port uses `fs.realpathSync`, falling back to `path.resolve` when the path does not exist yet
// (e.g. a file about to be created) — per the task's explicit instruction.
//
// Judgment call: the source matches `allowedWritePaths` globs via a `python3 -c` subprocess
// using `fnmatch.fnmatch`. This repo forbids new python/shell dependencies, so `matchesAnyGlob`
// below is a small from-scratch glob-to-regex translator instead (`*` = any run of characters
// except `/`, `**` = any run of characters including `/`, `?` = one character) — the same
// semantics `fnmatch` gives a POSIX-style glob without regex metacharacters. Because there is no
// interpreter to fail, the source's "fail open to 'in' on interpreter error" branch has no
// analogue here; a genuinely malformed pattern falls through to "no match" instead, which is the
// stricter (safer) direction to diverge in for an advisory-only check.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

/**
 * Canonicalize a path that may not exist yet (e.g. a file about to be created). Resolves the
 * deepest existing ancestor with `fs.realpathSync` — defeating a macOS /var-vs-/private/var
 * symlink ambiguity the same way the source's `cd && pwd -P` did — then rejoins the remaining,
 * not-yet-existing segments with plain `path.resolve` semantics.
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

/** Make `filePath` relative to `root`, both canonicalized. Paths outside root pass through. */
function relativize(root, filePath) {
  if (!path.isAbsolute(filePath)) return filePath; // already relative
  const rootReal = canonicalize(root);
  const fileReal = canonicalize(filePath);
  const withSep = rootReal.endsWith(path.sep) ? rootReal : rootReal + path.sep;
  return fileReal.startsWith(withSep) ? fileReal.slice(withSep.length) : fileReal;
}

/** Paths every guard treats as in-scope regardless of allowedWritePaths. */
function isAlwaysAllowed(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return normalized === 'SCRATCHPAD.md' || normalized.startsWith('.kbd-orchestrator/');
}

/** Translate one glob (`*`, `**`, `?`) into an anchored RegExp, POSIX-fnmatch-equivalent. */
function globToRegExp(glob) {
  let pattern = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        pattern += '.*';
        i += 1;
      } else {
        pattern += '[^/]*';
      }
    } else if (ch === '?') {
      pattern += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(ch)) {
      pattern += `\\${ch}`;
    } else {
      pattern += ch;
    }
  }
  return new RegExp(`^${pattern}$`);
}

/** Whether `relativePath` matches any glob in `globs` (POSIX fnmatch semantics). */
export function matchesAnyGlob(relativePath, globs) {
  const normalized = relativePath.split(path.sep).join('/');
  return globs.some((glob) => globToRegExp(glob).test(normalized));
}

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** The waypoint's path[] as tokens, synthesized from v2 fields when .path is absent. */
function pathTokens(waypoint) {
  if (Array.isArray(waypoint.path) && waypoint.path.length > 0) return waypoint.path;
  return [waypoint.phase, waypoint.childPointer].filter((v) => v !== undefined && v !== null && v !== '');
}

function nodeDirFor(tokens) {
  let out = `.kbd-orchestrator/phases/${tokens[0]}`;
  for (const seg of tokens.slice(1)) {
    if (!seg) continue;
    out = `${out}/children/${seg}`;
  }
  return out;
}

const allow = () => ({ decision: 'allow' });

/**
 * Evaluate one PreToolUse(Write|Edit|MultiEdit) hook input against the active child's
 * scope.json. `input` is the raw hook JSON payload (`{ tool_input: { file_path | path } }`).
 * `ctx.root` is the orchestrator root (pass `null`/absent to mean "not found" — callers resolve
 * this the same way `stageGate` does, by walking up from cwd for `.kbd-orchestrator/`).
 * `ctx.mode` is `off` | `warn` (default) | `ask`, mirroring `PROMETHEUS_CHILD_SCOPE_ENFORCE`.
 *
 * Returns `{ decision: 'allow' }`, `{ decision: 'warn', message }`, or
 * `{ decision: 'ask', message, hookOutput }` — never throws, matching the source's
 * always-exit-0 hook contract (the caller decides what exit code that maps to).
 */
export function checkChildScope(input, ctx = {}) {
  const mode = ctx.mode ?? 'warn';
  if (mode === 'off') return allow();

  const root = ctx.root;
  if (!root) return allow();

  const filePath = input?.tool_input?.file_path || input?.tool_input?.path || '';
  if (!filePath) return allow();

  const waypointFile = path.join(root, '.kbd-orchestrator', 'current-waypoint.json');
  if (!existsSync(waypointFile)) return allow();
  const waypoint = readJsonSafe(waypointFile);
  if (waypoint === null) return allow();

  const tokens = pathTokens(waypoint);
  if (tokens.length === 0) return allow();
  if (tokens.length <= 1) return allow(); // not inside a child

  const node = nodeDirFor(tokens);
  const scopeFile = path.join(root, node, 'scope.json');
  if (!existsSync(scopeFile)) return allow();
  const scope = readJsonSafe(scopeFile);
  if (scope === null) return allow();

  const allowed = Array.isArray(scope.allowedWritePaths) ? scope.allowedWritePaths : [];
  if (allowed.length === 0) return allow();

  const relative = relativize(root, filePath).split(path.sep).join('/');
  if (isAlwaysAllowed(relative)) return allow();

  const normalizedNode = node.split(path.sep).join('/');
  if (relative === normalizedNode || relative.startsWith(`${normalizedNode}/`)) return allow();

  if (matchesAnyGlob(relative, allowed)) return allow();

  const childLabel = tokens.join(' › ');
  if (mode === 'ask') {
    const reason =
      `File ${relative} is outside the scope of child loop ${childLabel} ` +
      `(allowedWritePaths in ${node}/scope.json). Approve to widen the child's scope, ` +
      'or deny to keep the inner loop contained.';
    return {
      decision: 'ask',
      message: reason,
      hookOutput: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: reason,
        },
      },
    };
  }

  return {
    decision: 'warn',
    message:
      `NOTICE: ${relative} is outside the declared scope of child loop ${childLabel}. ` +
      '(warn mode — not blocked; set PROMETHEUS_CHILD_SCOPE_ENFORCE=ask to require approval)',
  };
}
