// Shared by the six payloads. Upstream each bash script re-implemented project-root
// discovery with its own `while [ "$cursor" != "/" ]` loop; in Node it is written
// once, works from cmd.exe and PowerShell alike, and stops at the filesystem root
// on every platform rather than assuming a leading "/".
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readText } from '../platform/text.mjs';

// Walks up for `.prometheus/project.json`, the marker upstream uses. Returns null
// rather than throwing: "no project here" is an ordinary outcome for a hook that
// may fire in any directory.
export function findProjectRoot(start) {
  let cursor = typeof start === 'string' && start ? path.resolve(start) : process.cwd();
  // path.parse().root is "/" on POSIX and "C:\\" on Windows; comparing against it
  // terminates correctly on both instead of looping forever.
  const root = path.parse(cursor).root;
  for (;;) {
    if (existsSync(path.join(cursor, '.prometheus', 'project.json'))) return cursor;
    if (cursor === root) return null;
    const parent = path.dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}

export function readProjectId(projectRoot) {
  if (!projectRoot) return null;
  try {
    return JSON.parse(readText(path.join(projectRoot, '.prometheus', 'project.json'))).projectId ?? null;
  } catch {
    return null;
  }
}

// The PAUSE advisory records operator intent. It never intercepts a tool — it is
// reported at session start and after a compaction so the position is re-anchored.
export function isPaused(projectRoot) {
  if (!projectRoot) return false;
  return existsSync(path.join(projectRoot, '.kbd-orchestrator', 'PAUSE'));
}

// Every payload funnels through this. A hook signals; it does not gate. A missing
// service, an absent file or a thrown error is a degraded result reported to
// stderr, never a non-zero exit — otherwise an optional service becomes mandatory.
export async function degradeSafely(hookId, work) {
  try {
    return { hookId, status: 'ok', ...(await work()) };
  } catch (error) {
    process.stderr.write(`${hookId}: degraded: ${error.message}\n`);
    return { hookId, status: 'degraded', reason: error.message };
  }
}

// `input.cwd` comes from the harness payload and is not guaranteed to be a string.
export const cwdOf = (input) => (typeof input?.cwd === 'string' ? input.cwd : process.cwd());
