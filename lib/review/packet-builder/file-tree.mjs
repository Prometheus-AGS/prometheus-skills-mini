// Port of the file_tree assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines):
// `find . -maxdepth 2`, pruning bulk directories, sorted.

import { readdirSync } from 'node:fs';
import path from 'node:path';

const PRUNE = new Set(['node_modules', '.git', 'target', 'dist', '.refiner']);

/**
 * Top 2 levels of a directory tree (depth 0 = the root itself, depth 1 =
 * direct children, depth 2 = grandchildren), pruning bulk directories.
 * Deterministic (sorted), matching `find . -maxdepth 2 | sort`.
 *
 * @param {string} root
 * @returns {string} newline-joined relative paths, each prefixed "./"
 */
export function buildFileTree(root) {
  const out = new Set(['.']);

  function listDir(dir, relPrefix, depthRemaining) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (PRUNE.has(e.name)) continue;
      const rel = relPrefix ? `${relPrefix}/${e.name}` : e.name;
      out.add(`./${rel}`);
      if (e.isDirectory() && depthRemaining > 0) {
        listDir(path.join(dir, e.name), rel, depthRemaining - 1);
      }
    }
  }

  listDir(root, '', 1);
  return [...out].sort().join('\n');
}
