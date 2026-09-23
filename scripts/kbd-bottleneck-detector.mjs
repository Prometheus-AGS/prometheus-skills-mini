// Port of kbd-bottleneck-detector.sh (prometheus-skill-pack, 43 lines).
//
// Entry point only: parse argv, call `spawnExecutable('prometheus', ...)` directly for `status`
// (a plain JSON reshape the source did with `jq`) and reuse `lib/kbd/bottleneck-guard.mjs`'s
// `evaluateBottleneck` for `evaluate`/`repair` — no logic duplicated here.
//
// Judgment call: the source's `status` mode pipes `prometheus kbd status --json` through a `jq`
// filter that picks a fixed field subset and renames `.activePath` to `position`. `JSON.parse` +
// a literal object reshape below is the direct Node equivalent — no new dependency, no shell.
// `.blockers` is tolerant of either an id-keyed object (the live runtime's actual shape, verified
// against this repo's own `prometheus kbd status --json`) or an array — `jq`'s `.blockers[]?`
// iterates both; `blockerValues()` below does the same.
//
// Judgment call: the source's unknown-mode branch exits `64` (EX_USAGE), distinct from every
// other failure's exit `1`. Preserved exactly via `die(message, 64)`.

import { spawnExecutable } from '../lib/platform/spawn.mjs';
import { evaluateBottleneck } from '../lib/kbd/bottleneck-guard.mjs';

const USAGE = `Usage: node scripts/kbd-bottleneck-detector.mjs status
       node scripts/kbd-bottleneck-detector.mjs evaluate <task|phase|zeespec> <before|after> <subject>
       node scripts/kbd-bottleneck-detector.mjs repair <task|phase|zeespec> <before|after> <subject>`;

function die(message, code = 1) {
  process.stderr.write(`kbd-bottleneck-detector: ${message}\n`);
  process.exit(code);
}

/** `.blockers` may be an id-keyed object (the runtime's own JSON shape) or an array (jq's
 * `.blockers[]?` iterates either) — accept both, matching the source's tolerance. */
function blockerValues(blockers) {
  if (Array.isArray(blockers)) return blockers;
  if (blockers && typeof blockers === 'object') return Object.values(blockers);
  return [];
}

function reshapeStatus(json) {
  const parsed = JSON.parse(json);
  return {
    revision: parsed.revision,
    lifecycle: parsed.lifecycle,
    position: parsed.activePath,
    exactNextWork: parsed.exactNextWork,
    outstandingObligations: parsed.boundaryObligations ?? {},
    latestBoundaryReceipts: parsed.latestBoundaryReceipts ?? {},
    activeGates: parsed.activeGates ?? {},
    latestGateReceipts: parsed.latestGateReceipts ?? {},
    unresolvedBlockers: blockerValues(parsed.blockers).filter((b) => b?.resolved === false),
  };
}

function runStatus() {
  const result = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
  if (result?.status !== 0) die(`prometheus kbd status failed: ${result?.stderr ?? ''}`);
  process.stdout.write(`${JSON.stringify(reshapeStatus(result.stdout), null, 2)}\n`);
}

function runEvaluate(mode, args) {
  const [boundary, edge, subject] = args;
  if (!boundary || !edge || !subject) die(`usage: ${mode} <task|phase|zeespec> <before|after> <subject>`);
  const precommit = mode === 'repair';
  const result = evaluateBottleneck(boundary, edge, subject, precommit, { root: '.' });
  if (result.status === 2) die('guard subcommand unavailable (prometheus CLI missing or predates guard)');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

function main(argv) {
  const [mode, ...rest] = argv;
  const resolvedMode = mode ?? 'status';
  switch (resolvedMode) {
    case 'status':
      return runStatus();
    case 'evaluate':
    case 'repair':
      return runEvaluate(resolvedMode, rest);
    default:
      die(`unknown mode ${JSON.stringify(resolvedMode)} (use status, evaluate, or repair)\n\n${USAGE}`, 64);
  }
}

main(process.argv.slice(2));
