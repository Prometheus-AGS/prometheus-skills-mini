// Project-owned path and file-identity helpers for the derived method-context index.
// Every reference the index records is a project-relative path whose real location stays inside
// the project root, so a decision summary or a symlinked ancestor cannot redirect a read or write.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const SLUG = /^[a-z0-9][a-z0-9._-]*$/;
const METHOD_NAME = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,63}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

export const within = (root, target) => target === root || target.startsWith(root + path.sep);
export const posix = (value) => value.split(path.sep).join('/');

/** Absolute path of `relative` under `root`; throws when it (or its real location) escapes. */
export function ownedPath(root, relative) {
  const target = path.resolve(root, relative);
  if (!within(root, target) || (existsSync(target) && !within(root, realpathSync(target)))) {
    throw new Error('method reference escapes project root');
  }
  return target;
}

/** Identity of one project file: observed with its sha256, missing, or unreadable. */
export function fileReference(root, relative) {
  let file;
  try {
    file = ownedPath(root, relative);
  } catch {
    return { path: relative, observation: 'unreadable', sha256: null };
  }
  if (!existsSync(file)) return { path: relative, observation: 'missing', sha256: null };
  try {
    return { path: relative, observation: 'observed', sha256: sha256(readFileSync(file)) };
  } catch {
    return { path: relative, observation: 'unreadable', sha256: null };
  }
}

/** A reference path from a decision summary: relative, control-character-free, no `..`. */
export const safeReferencePath = (value) => typeof value === 'string' && value.length > 0
  && !CONTROL_OR_BACKSLASH.test(value) && !path.isAbsolute(value) && !value.split('/').includes('..');

export const safeMethodName = (value) => typeof value === 'string' && METHOD_NAME.test(value);

const phaseSegments = (segments) => segments.flatMap((slug, index) => (index ? ['children', slug] : [slug]));

function assertSlugs(slugs) {
  for (const slug of slugs) {
    if (typeof slug !== 'string' || !SLUG.test(slug) || slug.includes('..')) throw new Error('unsafe phase projection slug');
  }
}

/** Phase projection directory resolved through canonical ancestry (parentPhaseId chain). */
export function phaseDirectory(root, state, id) {
  const chain = [];
  const visited = new Set();
  for (let cursor = id; cursor;) {
    if (visited.has(cursor)) throw new Error('cyclic canonical phase ancestry');
    visited.add(cursor);
    const phase = state.phases?.[cursor];
    if (!phase) throw new Error(`canonical phase missing: ${cursor}`);
    chain.unshift(phase.slug || phase.id);
    cursor = phase.parentPhaseId;
  }
  assertSlugs(chain);
  return ownedPath(root, path.join('.kbd-orchestrator', 'phases', ...phaseSegments(chain)));
}

/** Phase projection directory from a waypoint phase path, used only when canonical status is absent. */
export function projectionPhaseDirectory(root, phasePath) {
  assertSlugs(phasePath);
  return ownedPath(root, path.join('.kbd-orchestrator', 'phases', ...phaseSegments(phasePath)));
}
