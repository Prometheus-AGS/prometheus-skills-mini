// Port of kbd-child-exit.sh (prometheus-skill-pack, 183 lines).
//
// Entry point only: `--enter` descends into the selected childPointer; the default `exit` mode
// writes handoff-out.md, rolls progress up the ancestor chain (lib/kbd/rollup.mjs), pops path[],
// and restores the parent's cursor. Uses lib/kbd/waypoint.mjs for path/node-dir resolution,
// lib/kbd/runtime-authority.mjs + lib/kbd/bottleneck-guard.mjs for the runtime-authoritative
// branch, lib/kbd/hooks.mjs for child:after.
//
// Judgment call: same runCommand divergence as kbd-next-child.mjs — see lib/kbd/hook-command.mjs.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../lib/platform/spawn.mjs';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';
import { isRuntimeAuthoritative } from '../lib/kbd/runtime-authority.mjs';
import { isBottleneckActive, evaluateBottleneck, bottleneckSignalText } from '../lib/kbd/bottleneck-guard.mjs';
import { hooksFire } from '../lib/kbd/hooks.mjs';
import { kbdExistingPathTokens, kbdNodeDir, kbdNodeChain } from '../lib/kbd/waypoint.mjs';
import { rollupChain } from '../lib/kbd/rollup.mjs';
import { runHookCommand } from '../lib/kbd/hook-command.mjs';

function die(message) {
  process.stderr.write(`kbd-child-exit: ${message}\n`);
  process.exit(1);
}
function warn(message) {
  process.stderr.write(`kbd-child-exit: warn: ${message}\n`);
}

const WP = path.join('.kbd-orchestrator', 'current-waypoint.json');

function readWaypoint() {
  if (!existsSync(WP)) die('no current-waypoint.json');
  try {
    return JSON.parse(readFileSync(WP, 'utf8'));
  } catch {
    die('malformed waypoint');
  }
  return undefined;
}

function runEnter(waypoint) {
  if (isRuntimeAuthoritative('.')) {
    const label = (waypoint.path ?? []).join(' › ');
    process.stdout.write(`\nEntered child — runtime active path is ${label}\n`);
    return;
  }

  const pointer = waypoint.childPointer ?? '';
  if (!pointer) die('no childPointer selected — run /kbd-next-child <name> first');
  const chain = kbdExistingPathTokens(WP, '.');
  const depth = chain.length;
  const entered = depth >= 1 && chain[depth - 1] === pointer ? chain : [...chain, pointer];

  const nodeDir = kbdNodeDir(...entered);
  if (!existsSync(nodeDir)) die(`child node dir not found: ${nodeDir}`);
  const label = kbdNodeChain(entered);
  const now = new Date().toISOString();
  const next = {
    ...waypoint,
    path: entered,
    childPointer: null,
    currentTask: `work inside ${label}`,
    exactNextCommand: `/kbd-assess ${label}`,
    updatedAt: now,
  };
  atomicWrite(WP, JSON.stringify(next, null, 2));
  process.stdout.write(`\nEntered child — now inside ${label}\n  /kbd-new-child here nests under this node.\n`);
}

function resolveStatus(childDir) {
  const progressFile = path.join(childDir, 'progress.json');
  if (!existsSync(progressFile)) return 'UNKNOWN';
  try {
    const progress = JSON.parse(readFileSync(progressFile, 'utf8'));
    const implStatus = String(progress?.completion?.implementation?.status ?? '').toUpperCase();
    if (implStatus === 'COMPLETE') return 'DONE';
    if (progress?.reflect_complete === true) return 'DONE';
    return 'INCOMPLETE';
  } catch {
    return 'UNKNOWN';
  }
}

function writeHandoffOut(childDir, chainLabel, status, parentLabel) {
  const content = [
    `# Handoff out — ${chainLabel}`,
    '',
    `**Status:** ${status}`,
    '',
    '## Deliverables',
    '',
    '<!-- TBD: paths to artifacts this child produced -->',
    '',
    '## Goal completion',
    '',
    `See reflection.md. Status: ${status}.`,
    '',
    '## Unresolved items',
    '',
    '<!-- TBD -->',
    '',
    `## Recommendations to the parent (${parentLabel})`,
    '',
    '<!-- TBD: what the parent should do with this result -->',
    '',
  ].join('\n');
  atomicWrite(path.join(childDir, 'handoff-out.md'), content);
}

async function runExit(waypoint) {
  const tokens = kbdExistingPathTokens(WP, '.');
  const depth = tokens.length;
  if (depth <= 1) die(`not inside a child (path depth ${depth}) — nothing to exit`);

  const childName = tokens[depth - 1];
  const childDir = kbdNodeDir(...tokens);
  const parentTokens = tokens.slice(0, -1);
  const parentDir = kbdNodeDir(...parentTokens);
  const parentLabel = kbdNodeChain(parentTokens);

  if (!existsSync(path.join(childDir, 'reflection.md'))) {
    die(`child '${childName}' has no reflection.md — run /kbd-reflect for the child first`);
  }

  const status = resolveStatus(childDir);
  writeHandoffOut(childDir, kbdNodeChain(tokens), status, parentLabel);

  const runtimeAuthoritative = isRuntimeAuthoritative('.');
  const orchestratorRoot = process.env.KBD_ORCHESTRATOR_ROOT ?? '.';
  const hookCtx = { orchestratorRoot, cwd: '.', runCommand: runHookCommand, phasePath: childName, sourceTool: 'kbd-child-exit' };

  if (runtimeAuthoritative) {
    const statusResult = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
    if (statusResult?.status !== 0) die('runtime status unavailable');
    const state = JSON.parse(statusResult.stdout);
    const pathCount = (state?.activePath?.phasePath ?? []).length;
    if (pathCount <= 1) die('runtime is not inside a child phase');
    const childRuntimeId = state?.activePath?.phaseId;
    if (!childRuntimeId) die('runtime omitted active child phase');
    const parentId = state.activePath.phasePath[state.activePath.phasePath.length - 2];

    const bottleneckAvailable = isBottleneckActive('.');
    if (bottleneckAvailable) {
      const pre = evaluateBottleneck('phase', 'after', childRuntimeId, true, { root: '.' });
      if (pre.status !== 0) die('child phase completion precommit evaluation blocked');
    }
    const transitionResult = spawnExecutable('prometheus', [
      'kbd', '--path', '.', 'phase', 'transition',
      '--command-id', `phase-complete:${childRuntimeId}`,
      '--id', childRuntimeId, '--status', 'complete',
    ]);
    if (transitionResult?.status !== 0) die('child phase completion transition failed');
    if (bottleneckAvailable) {
      const post = evaluateBottleneck('phase', 'after', childRuntimeId, false, { root: '.' });
      if (post.status !== 0) die('child phase completion postcommit evaluation blocked');
      process.stdout.write(`${bottleneckSignalText(post.stdout)}\n`);
    }
    try {
      await hooksFire('phase', 'after', childRuntimeId, depth, depth, hookCtx);
    } catch {
      warn('phase:after hook fire failed');
    }

    const ancestorArgs = (state.activePath.phasePath ?? [])
      .slice(0, -2)
      .flatMap((ancestor) => (ancestor ? ['--ancestor', ancestor] : []));
    const activateResult = spawnExecutable('prometheus', [
      'kbd', '--path', '.', 'phase', 'activate',
      '--command-id', `phase-exit:${childName}`,
      '--id', parentId, ...ancestorArgs,
      '--exact-next-work', '/kbd-status',
    ]);
    if (activateResult?.status !== 0) die('phase activate (parent) failed');
    try {
      await hooksFire('child', 'after', childName, depth, depth, hookCtx);
    } catch {
      warn('child:after hook fire failed');
    }

    process.stdout.write(`\nCompleted kbd-child-exit — exited ${kbdNodeChain(tokens)}\n`);
    process.stdout.write(`  status:   ${status}\n`);
    process.stdout.write(`  handoff:  ${path.join(childDir, 'handoff-out.md')}\n`);
    process.stdout.write(`  resumed:  ${parentLabel}\n`);
    process.stdout.write('  Next:     /kbd-status\n');
    return;
  }

  try {
    rollupChain('.', tokens);
  } catch {
    warn('rollup failed (continuing)');
  }

  const now = new Date().toISOString();
  const next = {
    ...waypoint,
    path: parentTokens,
    childPointer: null,
    currentTask: `resumed ${parentLabel} after child exit`,
    exactNextCommand: '/kbd-status',
    updatedAt: now,
  };
  atomicWrite(WP, JSON.stringify(next, null, 2));

  try {
    await hooksFire('child', 'after', childName, depth, depth, hookCtx);
  } catch {
    warn('child:after hook fire failed');
  }

  process.stdout.write(`\nCompleted kbd-child-exit — exited ${kbdNodeChain(tokens)}\n`);
  process.stdout.write(`  status:   ${status}\n`);
  process.stdout.write(`  handoff:  ${path.join(childDir, 'handoff-out.md')}\n`);
  process.stdout.write(`  rolled up into: ${path.join(parentDir, 'progress.json')} (children.${childName})\n`);
  process.stdout.write(`  resumed:  ${parentLabel}\n`);
  process.stdout.write('  Next:     /kbd-status\n');
}

async function main(argv) {
  const mode = argv[0] === '--enter' ? 'enter' : 'exit';
  const waypoint = readWaypoint();

  if (mode === 'enter') {
    runEnter(waypoint);
    return;
  }
  await runExit(waypoint);
}

main(process.argv.slice(2)).catch((error) => die(error?.message ?? String(error)));
