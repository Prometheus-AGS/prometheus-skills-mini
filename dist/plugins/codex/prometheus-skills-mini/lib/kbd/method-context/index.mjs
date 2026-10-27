// Entry logic for `scripts/kbd-method-context.mjs` and the handoff reader.
//
//   node <pack-root>/scripts/kbd-method-context.mjs [--project <root>] [--phase <id>] [--write] [--json] [--require-resolved]
//
// Exit codes: 0 index produced, 2 usage/discovery failure or (with --require-resolved) a
// BLOCKED index. The `prometheus` CLI is optional; without it the index reports every
// canonical fact as unresolved instead of failing the session.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { readDisposition } from '../phase-disposition.mjs';
import { fromProjection, runStatus, STATUS_TIMEOUT_MS } from '../handoff/state.mjs';
import { discoverMethodContext } from './discover.mjs';
import { fileReference, posix, safeReferencePath } from './paths.mjs';
import { INDEX_JSON, INDEX_MARKDOWN, renderMethodContext, writeMethodContext } from './render.mjs';

export const USAGE = 'usage: kbd-method-context [--project <root>] [--phase <id>] [--write] [--json] [--require-resolved]';

const VALUE_FLAGS = { '--project': 'project', '--phase': 'phase' };
const SWITCH_FLAGS = { '--write': 'write', '--json': 'json', '--require-resolved': 'requireResolved' };

export function parseArgs(argv) {
  const options = { project: process.cwd(), phase: undefined, write: false, json: false, requireResolved: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (VALUE_FLAGS[arg] && argv[i + 1] !== undefined) options[VALUE_FLAGS[arg]] = argv[++i];
    else if (SWITCH_FLAGS[arg]) options[SWITCH_FLAGS[arg]] = true;
    else return { error: `unknown or incomplete argument: ${arg}` };
  }
  return { options };
}

/** Canonical reads when the runtime answers; the waypoint projection only names the phase otherwise. */
function readCanonical(root, phase, env) {
  const cli = runStatus(root, env, STATUS_TIMEOUT_MS);
  if (!cli.status) {
    const projection = fromProjection(root);
    return { status: null, disposition: null, fallbackPhasePath: projection.phasePath, statusError: cli.error };
  }
  const phaseId = phase ?? cli.status.activePath?.phaseId;
  const disposition = phaseId ? readDisposition({ root, phase: phaseId }) : { status: 1 };
  return { status: cli.status, disposition: disposition.status === 0 ? disposition.json : null };
}

export function runMethodContext(argv, { env = process.env, now = new Date() } = {}) {
  const parsed = parseArgs(argv);
  if (parsed.error) return { exitCode: 2, out: [], err: [`method-context: ${parsed.error}`, USAGE] };
  const { options } = parsed;
  try {
    const root = realpathSync(options.project);
    const canonical = readCanonical(root, options.phase, env);
    const context = discoverMethodContext({ project: root, phase: options.phase, now, ...canonical });
    if (options.write) writeMethodContext(root, context);
    const text = options.json ? `${JSON.stringify(context, null, 2)}\n` : renderMethodContext(context);
    const err = canonical.statusError ? [`method-context: canonical status unavailable: ${canonical.statusError}`] : [];
    return { exitCode: options.requireResolved && context.status === 'BLOCKED' ? 2 : 0, out: [text.trimEnd()], err };
  } catch (error) {
    return { exitCode: 2, out: [], err: [`method-context: ${error.message}`] };
  }
}

/**
 * Identity of the policy files a handoff or delegated role must re-read: the phase's index,
 * its adopted contract and the project-owned references the index names. Read-only; hashes
 * observe identity and grant no execution authority.
 */
export function phaseMethodReferences(root, phaseDirectoryAbsolute) {
  const directory = posix(path.relative(root, phaseDirectoryAbsolute));
  const references = [INDEX_MARKDOWN, INDEX_JSON, 'adopted-contract.json'].map((name) => fileReference(root, `${directory}/${name}`));
  const indexFile = path.join(phaseDirectoryAbsolute, INDEX_JSON);
  if (existsSync(indexFile)) {
    try {
      const listed = JSON.parse(readFileSync(indexFile, 'utf8')).references;
      for (const item of Array.isArray(listed) ? listed : []) {
        if (safeReferencePath(item?.path)) references.push(fileReference(root, item.path));
      }
    } catch { /* an unreadable index stays an explicit hashed reference above */ }
  }
  return references.filter((item, index) => references.findIndex((other) => other.path === item.path) === index);
}
