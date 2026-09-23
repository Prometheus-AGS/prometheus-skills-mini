// Port of kbd-next-child.sh (prometheus-skill-pack, 154 lines).
//
// Entry point only: parse argv, resolve the waypoint's sibling-child list, flip the waypoint,
// fire child:after/child:before via lib/kbd/hooks.mjs. Uses lib/kbd/waypoint.mjs for path[]
// resolution/rendering and lib/kbd/runtime-authority.mjs for the runtime-authoritative branch.
//
// Judgment call: the source has two branches — runtime-authority mode (drives `prometheus kbd
// phase activate` and reads canonical sibling state via `prometheus kbd status --json`) and a
// legacy mode (mutates current-waypoint.json directly). Both are ported, matching the source's
// own dual-mode design; runtime-authority is genuinely the primary path this repo expects
// (progress.mjs's markImplementationComplete already special-cases it the same way).
//
// Judgment call: hook firing uses a minimal `runCommand` that executes only {program,args}-shaped
// hook commands via spawnExecutable — the source's hooks.json ships genuine shell-string commands
// (conditionals, `&&`), which this repo's node-scripts.md constitution forbids running via a
// shell. A hook whose command needs shell semantics is skipped with a warning rather than
// silently mis-executed. See lib/kbd/hooks.mjs's own header comment for the same divergence,
// already documented there.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../lib/platform/spawn.mjs';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';
import { isRuntimeAuthoritative } from '../lib/kbd/runtime-authority.mjs';
import { hooksFire } from '../lib/kbd/hooks.mjs';
import { kbdExistingPathTokens } from '../lib/kbd/waypoint.mjs';
import { runHookCommand } from '../lib/kbd/hook-command.mjs';

function die(message) {
  process.stderr.write(`kbd-next-child: ${message}\n`);
  process.exit(1);
}
function warn(message) {
  process.stderr.write(`kbd-next-child: warn: ${message}\n`);
}

const WP = path.join('.kbd-orchestrator', 'current-waypoint.json');

function readWaypoint() {
  if (!existsSync(WP)) die('no current-waypoint.json — run /kbd-new-phase first');
  try {
    return JSON.parse(readFileSync(WP, 'utf8'));
  } catch {
    die(`malformed waypoint at ${WP}`);
  }
  return undefined;
}

async function runtimeAuthorityPath(target) {
  const statusResult = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
  if (statusResult?.status !== 0) die('runtime status unavailable');
  const state = JSON.parse(statusResult.stdout);

  const activeId = state?.activePath?.phaseId;
  if (!activeId) die('runtime has no active phase');
  const parentId = state?.phases?.[activeId]?.parentPhaseId;

  let prior = '';
  let parentPath;
  let effectiveParentId = activeId;
  if (parentId) {
    prior = state.phases[activeId].slug;
    parentPath = (state.activePath.phasePath ?? []).slice(0, -1);
    effectiveParentId = parentId;
  } else {
    parentPath = state.activePath.phasePath ?? [];
  }

  const children = Object.entries(state.phases ?? {})
    .filter(([, v]) => v.parentPhaseId === effectiveParentId)
    .map(([id, v]) => ({ id, slug: v.slug }));
  if (children.length === 0) die('no children defined — run /kbd-new-child first');

  let next;
  if (target) {
    next = children.find((c) => c.slug === target);
    if (!next) die(`no such child: ${target}`);
  } else if (!prior) {
    [next] = children;
  } else {
    const priorIndex = children.findIndex((c) => c.slug === prior);
    next = children[priorIndex + 1];
    if (!next) die(`already on last child '${prior}'`);
  }

  const ancestorArgs = parentPath.flatMap((ancestor) => (ancestor ? ['--ancestor', ancestor] : []));
  const activateResult = spawnExecutable('prometheus', [
    'kbd', '--path', '.', 'phase', 'activate',
    '--command-id', `phase-next-child:${effectiveParentId}:${next.id}`,
    '--id', next.id, ...ancestorArgs,
    '--exact-next-work', `/kbd-assess ${next.slug}`,
  ]);
  if (activateResult?.status !== 0) die(`phase activate failed: ${activateResult?.stderr ?? ''}`);

  process.stdout.write(`\nCompleted kbd-next-child — now on ${next.slug}\n`);
  process.stdout.write(`  from: ${prior || 'none'}\n`);
  process.stdout.write(`  to:   ${next.slug}\n`);
  process.stdout.write(`  Next: /kbd-assess ${next.slug}\n`);
}

async function legacyPath(waypoint, target) {
  const parent = waypoint.phase ?? '';
  if (!parent) die('no active phase');

  const children = waypoint.childPhases ?? [];
  if (children.length === 0) die('no children defined — run /kbd-new-child first');
  const total = children.length;
  const prior = waypoint.childPointer ?? '';

  let next;
  if (target) {
    if (!children.includes(target)) die(`no such child: ${target} (available: ${children.join(' ')})`);
    next = target;
  } else if (!prior) {
    [next] = children;
  } else {
    const priorIndex = children.indexOf(prior);
    next = children[priorIndex + 1];
    if (!next) die(`already on last child '${prior}' — run /kbd-reflect, then /kbd-next-phase`);
  }

  const orchestratorRoot = process.env.KBD_ORCHESTRATOR_ROOT ?? '.';
  const hookCtx = { orchestratorRoot, cwd: '.', runCommand: runHookCommand, phasePath: parent, sourceTool: 'kbd-next-child' };

  let fromLabel = '(none)';
  if (prior) {
    fromLabel = prior;
    const priorIndexOneBased = children.indexOf(prior) + 1;
    try {
      await hooksFire('child', 'after', prior, priorIndexOneBased, total, hookCtx);
    } catch {
      warn('child:after hook fire failed');
    }
  }

  const now = new Date().toISOString();
  const existingTokens = kbdExistingPathTokens(WP, '.');
  let newPath;
  if (existingTokens.length > 1 && existingTokens.at(-1) === prior) {
    newPath = [...existingTokens.slice(0, -1), next];
  } else if (existingTokens.length > 0) {
    newPath = [...existingTokens, next];
  }

  const nextWaypoint = {
    ...waypoint,
    childPointer: next,
    ...(newPath ? { path: newPath } : {}),
    currentTask: `run kbd-assess for ${parent}/${next}`,
    exactNextCommand: `/kbd-assess ${parent}/${next}`,
    updatedAt: now,
  };
  atomicWrite(WP, JSON.stringify(nextWaypoint, null, 2));

  const nextIndexOneBased = children.indexOf(next) + 1;
  try {
    await hooksFire('child', 'before', next, nextIndexOneBased, total, hookCtx);
  } catch {
    warn('child:before hook fire failed');
  }

  process.stdout.write(`\nCompleted kbd-next-child — now on ${parent}/${next}\n`);
  process.stdout.write(`  from: ${fromLabel}\n`);
  process.stdout.write(`  to:   ${next}\n`);
  process.stdout.write(`  Next: /kbd-assess ${parent}/${next}\n`);
}

async function main(argv) {
  const target = argv[0] ?? '';
  readWaypoint();

  if (isRuntimeAuthoritative('.')) {
    await runtimeAuthorityPath(target);
    return;
  }

  const waypoint = readWaypoint();
  await legacyPath(waypoint, target);
}

main(process.argv.slice(2)).catch((error) => die(error?.message ?? String(error)));
