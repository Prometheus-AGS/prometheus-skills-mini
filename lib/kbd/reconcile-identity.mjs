// Change-identity guard for reconcile (issue #194). Inspection only: every finding is raised as an
// IdentityError for the scan to report; nothing here writes, repairs or merges an identity.
//
// Two layers are kept apart on purpose. A repeated ID in progress.json is a PROJECTION fact and never
// proves canonical duplication; map-key/embedded-ID disagreements are CANONICAL facts and only the
// signed runtime can repair them (`prometheus kbd change repair-identity`, full CLI only).
import { readBackendTasks } from './reconcile-artifacts.mjs';

export class IdentityError extends Error {}

const quote = (value) => JSON.stringify(value);

/** progress.json rows keyed by change ID. Repeated or missing IDs are reported with every row index. */
export function progressRowsById(phase, changes) {
  const rows = new Map();
  const positions = new Map();
  const issues = [];
  for (const [index, row] of changes.entries()) {
    if (typeof row?.id !== 'string' || !row.id) { issues.push(`progress row ${index} has no valid change ID`); continue; }
    positions.set(row.id, [...(positions.get(row.id) ?? []), index]);
    if (!rows.has(row.id)) rows.set(row.id, row);
  }
  for (const [id, at] of positions) {
    if (at.length > 1) issues.push(`progress.json repeats change ID ${quote(id)} at rows ${at.join(', ')}`);
  }
  if (issues.length) {
    throw new IdentityError(`phase ${phase}: ${issues.join('; ')}; this is a projection-only finding and does not by itself show canonical duplication - inspect canonical keys and embedded IDs before any repair`);
  }
  return rows;
}

/** Canonical change/task map keys that disagree with their embedded IDs, or IDs held by two keys. */
export function assertCanonicalIdentity(phase, state) {
  const owners = new Map();
  const issues = [];
  for (const [key, change] of Object.entries(state?.phases?.[phase]?.changes ?? {})) {
    if (key !== change.id) issues.push(`change key ${quote(key)} differs from embedded ID ${quote(change.id)}`);
    if (owners.has(change.id)) issues.push(`canonical change ID ${quote(change.id)} appears at keys ${quote(owners.get(change.id))} and ${quote(key)}`);
    owners.set(change.id, key);
    for (const [taskKey, task] of Object.entries(change.tasks ?? {})) {
      if (taskKey !== task.id) issues.push(`change ${quote(key)} task key ${quote(taskKey)} differs from embedded ID ${quote(task.id)}`);
    }
  }
  if (issues.length) {
    throw new IdentityError(`phase ${phase}: ${issues.join('; ')}; reconcile does not repair canonical identity - inspect it with the runtime (prometheus kbd change inspect-identity, where the installed CLI provides it) and use a signed identity repair`);
  }
}

/**
 * Retired change IDs left by authorized identity repairs, alias -> surviving key. A CLI that predates
 * identity repair has no `changeIdentityRepairs` in its status; that is the normal case and yields an
 * empty map. An alias that maps to two targets is never guessed.
 */
export function retiredAliases(state, phase) {
  const aliases = new Map();
  for (const repair of Object.values(state?.changeIdentityRepairs ?? {})) {
    if (repair.phaseId !== phase) continue;
    const target = repair.input?.resolution?.targetKey;
    for (const source of Object.keys(repair.originalChanges ?? {})) {
      if (source === target) continue;
      if (aliases.has(source) && aliases.get(source) !== target) {
        throw new IdentityError(`phase ${phase}: retired change alias ${quote(source)} maps to ${quote(aliases.get(source))} and ${quote(target)}; inspect the identity repairs`);
      }
      aliases.set(source, target);
    }
  }
  return aliases;
}

/** Reads a change's backend artifact under its surviving name, then under each retired alias. */
export function readBackendFor(root, names, pinned) {
  let first;
  for (const name of names) {
    try { return { artifact: readBackendTasks(root, name, pinned), backendChange: name }; }
    catch (error) {
      first ??= error;
      // Only an absent artifact falls through to the next name; a corrupt one is reported.
      if (!/^no unique task artifact/.test(error.message)) throw error;
    }
  }
  throw first;
}
