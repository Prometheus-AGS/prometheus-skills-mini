// Port of the cited_paths resolver inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// WHY THIS EXISTS (from the source): file_tree is built at maxdepth 2, but
// most repo content lives at depth 3+. An artifact citing a real path
// therefore drew a false "unverifiable claim" no matter how correct the
// citation. Resolving exactly what the artifact CITES and stamping each
// EXISTS/MISSING/EXTERNAL is bounded by the artifact, not by repo size.

import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// PORT NOTE: the source's own regex (`[A-Za-z0-9_][A-Za-z0-9_./-]*\....`) cannot
// match a leading '/', so an absolute-path citation like `` `/Users/x/f.rs` ``
// is never captured by the source either — the EXTERNAL branch below is reachable
// only via a citation that starts alphanumeric but is later found to start with
// '/' after some other transform, which never occurs in the source's own code
// path. Ported byte-for-byte rather than "fixed": widening the class would be a
// behavior change with no observed failure driving it (A-2).
const CITATION_RE = /`([A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:sh|md|json|rs|toml|js|mjs|ts|tsx|py|yml|yaml|wit))(?::\d+(?:-\d+)?)?`/g;

const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'dist', '.refiner', 'build', 'vendor']);

function indexByBasename(root) {
  const index = new Map();
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (e.isFile()) {
        const rel = path.relative(root, path.join(dir, e.name)).split(path.sep).join('/');
        if (!index.has(e.name)) index.set(e.name, []);
        index.get(e.name).push(rel);
      }
    }
  }
  try {
    if (statSync(root).isDirectory()) walk(root);
  } catch {
    // root does not exist: index stays empty
  }
  return index;
}

/**
 * @param {string} text the artifact text to scan for backtick-quoted citations
 * @param {string} root repository root to resolve citations against
 * @returns {string[]} one line per unique citation, sorted, "EXISTS|MISSING|EXTERNAL <path> [-> resolution]"
 */
export function resolveCitedPaths(text, root) {
  const seen = new Set();
  const out = [];
  const index = indexByBasename(root);

  for (const m of text.matchAll(CITATION_RE)) {
    const p = m[1];
    if (seen.has(p)) continue;
    seen.add(p);

    if (p.startsWith('/')) {
      out.push(`EXTERNAL ${p}  (outside this repository — not resolvable here)`);
      continue;
    }

    if (existsSync(path.join(root, p))) {
      out.push(`EXISTS   ${p}`);
      continue;
    }

    const hits = index.get(path.basename(p)) ?? [];
    if (hits.length === 1) {
      out.push(`EXISTS   ${p}  -> ${hits[0]}`);
    } else if (hits.length > 1) {
      out.push(`EXISTS   ${p}  -> ${hits.length} matches (${[...hits].sort().slice(0, 3).join(', ')})`);
    } else {
      out.push(`MISSING  ${p}`);
    }
  }

  return out.sort();
}
