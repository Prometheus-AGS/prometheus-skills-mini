// The Node CLI a carried KBD skill invokes at task, change and phase
// boundaries: `node scripts/record-progress.mjs --from-hook --boundary <b>`,
// `--input <file|->`, or `--flush-degraded`. A port of main() and argument
// parsing (record-progress.py:541-671), minus the Python outbox path.
//
// This file holds no logic of its own: parse arguments, call lib/karpathy/,
// print one JSON line, set the exit code. Everything else lives in the
// modules it imports.
import { existsSync, fstatSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { agreementReasons, readCanonicalState } from '../lib/karpathy/canonical-state.mjs';
import { eventFromHook, readInputEvent } from '../lib/karpathy/event.mjs';
import { CrashSeam, flushDegraded, ProgressError, recordBoundary } from '../lib/karpathy/record.mjs';
import { deliverToPk } from '../lib/karpathy/transport.mjs';
import { validateEvent } from '../lib/karpathy/validate.mjs';
import { readText } from '../lib/platform/text.mjs';

const BOUNDARIES = ['task', 'change', 'phase'];

/**
 * The source pack's own project-root marker (record-progress.py:64-71): a
 * `.prometheus/project.json` file AND a `.kbd-orchestrator` directory, both
 * present at the same level. `lib/hooks/context.mjs`'s `findProjectRoot`
 * checks only the first half — it is shared by six other hook payloads and
 * this file does not widen its contract — so the second half is checked here.
 */
function projectRoot(start) {
  let cursor = path.resolve(start);
  const top = path.parse(cursor).root;
  for (;;) {
    if (existsSync(path.join(cursor, '.prometheus', 'project.json')) && existsSync(path.join(cursor, '.kbd-orchestrator'))) {
      return cursor;
    }
    if (cursor === top) return null;
    const parent = path.dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}

function parseArgs(argv) {
  const args = { projectRoot: '.', input: '-', fromHook: false, boundary: null, flushDegraded: false, limit: 25 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project-root') args.projectRoot = argv[++i];
    else if (arg === '--input') args.input = argv[++i];
    else if (arg === '--from-hook') args.fromHook = true;
    else if (arg === '--boundary') args.boundary = argv[++i];
    else if (arg === '--flush-degraded') args.flushDegraded = true;
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else throw new ProgressError(`unrecognized argument: ${arg}`);
  }
  if (args.boundary !== null && !BOUNDARIES.includes(args.boundary)) {
    throw new ProgressError(`--boundary must be one of ${BOUNDARIES.join(', ')}`);
  }
  return args;
}

/**
 * fd 0 is read only when it is a FIFO or a real file — never a TTY, which
 * would otherwise hang waiting for input that is never coming. The same
 * guard `scripts/hook-entry.mjs` uses for its own stdin read.
 */
function readInputText(spec) {
  if (spec !== '-') return readText(spec);
  const stat = fstatSync(0);
  if (!stat.isFIFO() && !stat.isFile()) {
    throw new ProgressError('--input - requires piped or redirected stdin, not a terminal');
  }
  return readFileSync(0, 'utf8');
}

async function run(argv) {
  const args = parseArgs(argv);
  const root = projectRoot(args.projectRoot);
  if (!root) {
    throw new ProgressError('project root with .prometheus/project.json and .kbd-orchestrator was not found');
  }

  const deliver = (delivery) => deliverToPk({ ...delivery, env: process.env });

  if (args.flushDegraded) {
    const report = flushDegraded({ root, deliver, limit: args.limit });
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }

  let event;
  let elapsedHoursToken;
  const fromHook = args.fromHook;
  if (fromHook) {
    if (!args.boundary) throw new ProgressError('--from-hook requires --boundary');
  }
  const state = readCanonicalState({ root });

  if (fromHook) {
    event = eventFromHook({ boundary: args.boundary, state, root });
    // eventFromHook always builds elapsedHours as a number it derived itself
    // (KBD_TASK_ELAPSED_HOURS or the 0 default); the hash module's own default
    // (Python's float form) is exactly right for it, so no token is threaded.
    elapsedHoursToken = undefined;
  } else {
    const text = readInputText(args.input);
    const parsed = readInputEvent(text);
    event = parsed.event;
    elapsedHoursToken = parsed.elapsedHoursToken ?? undefined;
  }

  const validationReasons = validateEvent(event, { elapsedHoursToken });
  if (validationReasons.length > 0) throw new ProgressError(validationReasons.join('; '));

  if (fromHook) {
    const reasons = agreementReasons(event, state);
    if (reasons.length > 0) throw new ProgressError(reasons.join('; '));
  }

  if (!state.projectId) throw new ProgressError('canonical status has no projectId for project-scoped memory');

  const result = recordBoundary({ root, event, elapsedHoursToken, state, fromHook, deliver });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

// Compare resolved real PATHS, not URL strings — the exact pattern
// scripts/hook-entry.mjs uses and documents: file://${path} truncates at '#'
// or '?', and import.meta.url reports the realpath while argv[1] keeps a
// symlinked path (macOS /var -> /private/var), so only realpathSync on both
// sides is correct on every platform.
const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  try {
    await run(process.argv.slice(2));
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof CrashSeam) {
      process.exitCode = error.exitCode;
    } else {
      process.stderr.write(`karpathy-progress-memory: ${error.message}\n`);
      process.exitCode = 2;
    }
  }
}
