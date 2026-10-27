// Rendering and persistence of the derived method-context index. The files are readable
// recovery indexes beside the phase contract, never an authority ledger.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../../platform/atomic-write.mjs';
import { ownedPath, within } from './paths.mjs';

export const INDEX_JSON = 'method-context.json';
export const INDEX_MARKDOWN = 'method-context.md';

// Fields that change on every lifecycle event without changing meaning; excluded so a refresh
// does not change provenance hashes.
const VOLATILE = ['generatedAt', 'sourceRevision'];
const semantic = (context) => JSON.stringify(Object.fromEntries(Object.entries(context).filter(([key]) => !VOLATILE.includes(key))));

export function renderMethodContext(context) {
  return '# Derived method context\n\n'
    + `Method: ${context.selectedMethod}; phase: ${context.phaseId}; revision: ${context.sourceRevision ?? 'UNKNOWN'}; status: ${context.status}.\n\n`
    + 'This is a recovery index, not execution permission. Resolve current canonical decisions and contract before dependent action.\n\n'
    + `\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n`;
}

// Contain the nearest existing ancestor of a path that may not exist yet, so a symlinked
// ancestor cannot redirect the directory creation.
function assertContainedAncestor(root, target) {
  let cursor = target;
  while (!existsSync(cursor)) cursor = path.dirname(cursor);
  if (!within(root, realpathSync(cursor))) throw new Error('method context directory escapes project root');
}

/** Write the JSON and Markdown index; returns false (no write) when only volatile fields changed. */
export function writeMethodContext(project, context) {
  const root = realpathSync(project);
  const directory = ownedPath(root, context.phaseDirectory);
  assertContainedAncestor(root, directory);
  const existing = path.join(directory, INDEX_JSON);
  try {
    if (existsSync(existing) && semantic(JSON.parse(readFileSync(existing, 'utf8'))) === semantic(context)) return false;
  } catch { /* an unreadable index is rewritten */ }
  atomicWrite(ownedPath(root, `${context.phaseDirectory}/${INDEX_JSON}`), `${JSON.stringify(context, null, 2)}\n`);
  atomicWrite(ownedPath(root, `${context.phaseDirectory}/${INDEX_MARKDOWN}`), renderMethodContext(context));
  return true;
}
