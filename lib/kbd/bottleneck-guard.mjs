// Port of shared/lib/bottleneck-guard.sh (prometheus-skill-pack, 37 lines).
// See bottleneck-guard.test.mjs for the injected-ctx note.

import { spawnExecutable } from '../platform/spawn.mjs';
import { isRuntimeAuthoritative } from './runtime-authority.mjs';

/**
 * Whether `prometheus` is on PATH and its installed version advertises the `guard` subcommand.
 * A CLI that exists but predates `guard` must be treated the same as an absent CLI — this is
 * the one thing that distinguishes "unavailable" from merely "returned an error", the same
 * distinction `lib/doctor/kbd.mjs` had to get right for its own CLI-availability check.
 */
export function isBottleneckAvailable(ctx = {}) {
  const spawn = ctx.spawn ?? spawnExecutable;
  const result = spawn('prometheus', ['kbd', '--help']);
  if (result?.status !== 0) return false;
  return /^\s+guard\s/m.test(String(result.stdout ?? ''));
}

/**
 * Whether the bottleneck guard should actually be consulted for `root`: the CLI must be
 * available, the waypoint must be runtime-owned (a hand-authored or legacy projection has no
 * canonical state to evaluate against), and a live status call must succeed.
 */
export function isBottleneckActive(root, ctx = {}) {
  const spawn = ctx.spawn ?? spawnExecutable;
  if (!isBottleneckAvailable(ctx)) return false;
  if (!isRuntimeAuthoritative(root)) return false;
  const result = spawn('prometheus', ['kbd', '--path', root, 'status', '--json']);
  return result?.status === 0;
}

/**
 * Evaluate one lifecycle boundary. Mirrors the source's positional signature exactly:
 * `kbd_bottleneck_evaluate <task|change|phase|zeespec> <before|after> <subject> <precommit>`.
 *
 * Returns the raw spawn result (never throws) — exit code 2 means the guard subcommand is
 * unavailable, matching the source's `return 2` on that path; callers distinguish "guard says
 * no" (an ordinary non-zero exit from `prometheus` itself) from "guard could not be asked at
 * all" (2) the same way the bash callers do.
 */
export function evaluateBottleneck(boundary, edge, subject, precommit, ctx = {}) {
  const spawn = ctx.spawn ?? spawnExecutable;
  const root = ctx.root ?? '.';
  if (!isBottleneckAvailable(ctx)) return { status: 2, stdout: '', stderr: 'guard subcommand unavailable' };

  const args = [
    'kbd', '--path', root, 'guard', 'evaluate',
    '--boundary', boundary, '--edge', edge, '--subject', subject,
    '--json', '--repair-projections',
  ];
  if (precommit) args.push('--precommit');

  return spawn('prometheus', args);
}

/**
 * Render a guard-evaluate JSON payload's `exactSignal` and position summary as the two-line
 * human-readable text the source's `jq` pipeline produced.
 */
export function bottleneckSignalText(output) {
  const parsed = JSON.parse(output);
  return `${parsed.exactSignal}\nPosition: ${parsed.position} @ revision ${parsed.authoritativeRevision}`;
}
