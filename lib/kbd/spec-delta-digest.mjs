// SHA-256 over a phase's OpenSpec change deltas (VLBV CR-04). Port of the full pack's
// shared/scripts/kbd-spec-delta-digest.sh (1.15.0) with the identical digest input, so the value
// stamped into a v2 contract's method.specDeltaDigest agrees across both packs.
//
// The digest covers every file under openspec/changes/<change>/specs/ for each change
// registered to the phase in canonical KBD state; once a change is archived, the last
// openspec/changes/archive/*-<change>/specs/ (in byte order) is used instead. Lines
// "<change>/<posix path under specs/>\t<sha256>\n" are sorted in byte order and hashed, so the
// value is independent of file-system order and of the archive location.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { sha256Of } from './adopted-contract.mjs';

const byteOrder = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
const isDirectory = (dir) => existsSync(dir) && statSync(dir).isDirectory();

/** Every regular file under `dir`, as posix paths relative to it. */
function filesUnder(dir) {
  const found = [];
  const walk = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) found.push(rel);
    }
  };
  walk(dir, '');
  return found;
}

/** The specs directory of `change`: live first, else its latest archived copy, else null. */
function specsDirectory(root, change) {
  const live = path.join(root, 'openspec', 'changes', change, 'specs');
  if (isDirectory(live)) return live;
  const archive = path.join(root, 'openspec', 'changes', 'archive');
  if (!isDirectory(archive)) return null;
  const archived = readdirSync(archive)
    .filter((name) => name.endsWith(`-${change}`) && isDirectory(path.join(archive, name, 'specs')))
    .sort(byteOrder);
  return archived.length > 0 ? path.join(archive, archived.at(-1), 'specs') : null;
}

/**
 * The phase's spec-delta digest from a canonical status JSON. Returns the 64-hex digest, or
 * null when the phase has no OpenSpec deltas (the source's exit 3).
 */
export function specDeltaDigest({ root, phase, status }) {
  const changes = Object.keys(status?.phases?.[phase]?.changes ?? {}).sort(byteOrder);
  const lines = [];
  for (const change of changes) {
    const dir = specsDirectory(root, change);
    if (!dir) continue;
    for (const rel of filesUnder(dir)) {
      lines.push(`${change}/${rel}\t${sha256Of(readFileSync(path.join(dir, rel)))}`);
    }
  }
  if (lines.length === 0) return null;
  return sha256Of(`${lines.sort(byteOrder).join('\n')}\n`);
}
