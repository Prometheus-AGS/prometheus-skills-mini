// Port of kbd-new-child.sh (prometheus-skill-pack, 289 lines).
//
// Creates a child phase under the ACTIVE node (arbitrary depth, waypoint v3): goals.md,
// progress.json, handoff-in.md (parent→child contract), scope.json (context-isolation
// contract), registers the child on the parent's childPhases[], flips the waypoint's path[],
// fires child:before.
//
// Judgment call: same runCommand divergence as kbd-next-child.mjs — see lib/kbd/hook-command.mjs.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../lib/platform/spawn.mjs';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';
import { isRuntimeAuthoritative } from '../lib/kbd/runtime-authority.mjs';
import { isBottleneckActive, evaluateBottleneck, bottleneckSignalText } from '../lib/kbd/bottleneck-guard.mjs';
import { hooksFire } from '../lib/kbd/hooks.mjs';
import { kbdExistingPathTokens, kbdNodeDir, kbdNodeChain, chainSeparator } from '../lib/kbd/waypoint.mjs';
import { runHookCommand } from '../lib/kbd/hook-command.mjs';

function die(message) {
  process.stderr.write(`kbd-new-child: ${message}\n`);
  process.exit(1);
}
function warn(message) {
  process.stderr.write(`kbd-new-child: warn: ${message}\n`);
}

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const WP = path.join('.kbd-orchestrator', 'current-waypoint.json');

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function validateName(name) {
  if (!name) die('usage: kbd-new-child.mjs <child-name> [goal-1] [goal-2] …');
  if (name.includes('..')) die('invalid name: parent traversal not allowed');
  if (name.includes('/')) die('invalid name: slashes not allowed');
  if (name === '.' || name === '..') die(`invalid name: '${name}'`);
  if (!NAME_RE.test(name)) die(`invalid name '${name}': must match ^[a-z0-9][a-z0-9._-]*$`);
}

async function main(argv) {
  const [name, ...goals] = argv;
  validateName(name);

  if (!existsSync(WP)) die('no current-waypoint.json — run /kbd-new-phase first');
  const waypoint = readJsonSafe(WP);
  if (waypoint === null) die(`malformed waypoint at ${WP}`);

  const fullChain = kbdExistingPathTokens(WP, '.');
  if (fullChain.length === 0) die('could not resolve current path from waypoint');
  const fullDepth = fullChain.length;
  const wpPointer = waypoint.childPointer ?? '';

  // Selected-but-not-entered → sibling add (strip trailing pointer token); entered/descended →
  // nest under the deepest node.
  const curTokens =
    fullDepth > 1 && wpPointer && fullChain[fullDepth - 1] === wpPointer ? fullChain.slice(0, -1) : fullChain;
  const curDepth = curTokens.length;

  let maxDepth = 4;
  const projectFile = path.join('.kbd-orchestrator', 'project.json');
  if (existsSync(projectFile)) {
    const md = readJsonSafe(projectFile)?.maxChildDepth;
    if (md) maxDepth = md;
  }
  if (curDepth + 1 > maxDepth) {
    die(`maxChildDepth (${maxDepth}) reached at ${kbdNodeChain(curTokens)} — cannot nest deeper`);
  }

  const parentNodeDir = kbdNodeDir(...curTokens);
  const parentLabel = kbdNodeChain(curTokens);

  const parentProgressFile = path.join(parentNodeDir, 'progress.json');
  const parentProgress = existsSync(parentProgressFile) ? readJsonSafe(parentProgressFile) : null;
  if (parentProgress) {
    const inList = (parentProgress.childPhases ?? []).includes(name);
    if (inList) die(`child '${name}' already exists under ${parentLabel} — try /kbd-next-child ${name}`);
  }

  const childDir = path.join(parentNodeDir, 'children', name);
  if (existsSync(childDir)) die(`child directory already exists: ${childDir}`);

  const now = new Date().toISOString();
  mkdirSync(childDir, { recursive: true });

  const sep = chainSeparator();
  const goalLines = goals.length > 0 ? goals.map((g) => `- ${g}`) : ['<!-- TBD: enumerate child goals before /kbd-assess -->'];
  atomicWrite(path.join(childDir, 'goals.md'), `# Goals — ${parentLabel}${sep}${name}\n\n${goalLines.join('\n')}\n`);

  atomicWrite(
    path.join(childDir, 'handoff-in.md'),
    [
      `# Handoff in — ${parentLabel}${sep}${name}`,
      '',
      `**Spawned by:** ${parentLabel}`,
      '',
      '## Why this child was spawned',
      '',
      '<!-- TBD: the specific sub-goal the parent could not complete inline -->',
      '',
      '## Inputs (paths from the parent node)',
      '',
      `- ${parentNodeDir}/assessment.md`,
      `- ${parentNodeDir}/plan.md`,
      '',
      '## Success criteria',
      '',
      '<!-- TBD: what "done" means for this child -->',
      '',
      '## Expected deliverables',
      '',
      '<!-- TBD: artifacts the parent expects back via handoff-out.md -->',
      '',
    ].join('\n')
  );

  atomicWrite(
    path.join(childDir, 'scope.json'),
    JSON.stringify(
      {
        allowedWritePaths: [`${childDir}/**`],
        deniedPaths: [],
        inheritsConstraints: true,
        __note:
          "Edit allowedWritePaths to widen the child loop's write surface. .kbd-orchestrator/** and " +
          'SCRATCHPAD.md are always allowed. Enforced advisorily by check-child-scope.mjs.',
      },
      null,
      2
    )
  );

  const childLabel = kbdNodeChain([...curTokens, name]);

  if (isRuntimeAuthoritative('.')) {
    const statusResult = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
    if (statusResult?.status !== 0) die('runtime status unavailable');
    const state = JSON.parse(statusResult.stdout);
    const parentId = state?.activePath?.phaseId;
    if (!parentId) die('runtime has no active parent phase');
    const childRuntimeId = `${parentId}::${name}`;

    const createResult = spawnExecutable('prometheus', [
      'kbd', '--path', '.', 'phase', 'create',
      '--command-id', `phase-create:${childRuntimeId}`,
      '--id', childRuntimeId, '--slug', name, '--title', name, '--parent', parentId,
    ]);
    if (createResult?.status !== 0) die(`phase create failed: ${createResult?.stderr ?? ''}`);

    const guardEnabled = isBottleneckActive('.');
    if (guardEnabled) {
      const pre = evaluateBottleneck('phase', 'before', childRuntimeId, true, { root: '.' });
      if (pre.status !== 0) die('child phase start precommit evaluation blocked');
    }

    const ancestorArgs = (state.activePath.phasePath ?? []).flatMap((a) => (a ? ['--ancestor', a] : []));
    const activateResult = spawnExecutable('prometheus', [
      'kbd', '--path', '.', 'phase', 'activate',
      '--command-id', `phase-activate:${childRuntimeId}`,
      '--id', childRuntimeId, ...ancestorArgs,
      '--exact-next-work', `/kbd-assess ${childLabel}`,
    ]);
    if (activateResult?.status !== 0) die(`phase activate failed: ${activateResult?.stderr ?? ''}`);
    const transitionResult = spawnExecutable('prometheus', [
      'kbd', '--path', '.', 'phase', 'transition',
      '--command-id', `phase-start:${childRuntimeId}`,
      '--id', childRuntimeId, '--status', 'in-progress',
    ]);
    if (transitionResult?.status !== 0) die(`phase transition failed: ${transitionResult?.stderr ?? ''}`);

    if (guardEnabled) {
      const post = evaluateBottleneck('phase', 'before', childRuntimeId, false, { root: '.' });
      if (post.status !== 0) die('child phase start postcommit evaluation blocked');
      process.stdout.write(`${bottleneckSignalText(post.stdout)}\n`);
    }

    const orchestratorRoot = process.env.KBD_ORCHESTRATOR_ROOT ?? '.';
    try {
      await hooksFire('child', 'before', name, curDepth + 1, maxDepth, {
        orchestratorRoot,
        cwd: '.',
        runCommand: runHookCommand,
        phasePath: childLabel,
        sourceTool: 'kbd-new-child',
      });
    } catch {
      warn('child:before hook fire failed (child still created)');
    }

    process.stdout.write(`\nCompleted kbd-new-child — ${childLabel} ready for /kbd-assess\n`);
    process.stdout.write(`  parent: ${parentLabel}\n`);
    process.stdout.write(`  child:  ${name}  [depth ${curDepth + 1}]\n`);
    process.stdout.write(`  goals:  ${path.join(childDir, 'goals.md')}\n`);
    process.stdout.write(`  scope:  ${path.join(childDir, 'scope.json')}\n`);
    process.stdout.write(`  Next:   /kbd-assess ${childLabel}\n`);
    return;
  }

  const sourceTool = waypoint.sourceTool || 'unknown';
  atomicWrite(
    path.join(childDir, 'progress.json'),
    JSON.stringify(
      {
        schemaVersion: '2',
        phase: name,
        parentPhase: curTokens[curDepth - 1],
        childPhases: [],
        childPointer: null,
        assessment_complete: false,
        plan_complete: false,
        execute_complete: false,
        reflect_complete: false,
        implementation_total: 0,
        implementation_completed: 0,
        changes_total: 0,
        changes_completed: 0,
        completion: {
          primaryCounter: 'implementation',
          implementation: { completed: 0, total: 0, status: 'PENDING' },
          evidence: { status: 'NOT_TRACKED', summary: null, blockers: [] },
          certification: { status: 'NOT_TRACKED', summary: null, blockers: [] },
          publication: { status: 'NOT_TRACKED', summary: null, blockers: [] },
        },
        completed_changes: [],
        active_change: null,
        blocked_changes: [],
        changes: [],
        last_updated: now,
        last_updated_by: 'kbd-new-child',
        sourceTool,
        createdBy: 'kbd-new-child',
        updatedAt: now,
      },
      null,
      2
    )
  );

  let newChildren = [name];
  if (parentProgress) {
    newChildren = [...(parentProgress.childPhases ?? []), name];
    if (new Set(newChildren).size !== newChildren.length) {
      die('internal: would write duplicate childPhases on parent (refusing)');
    }
    atomicWrite(
      parentProgressFile,
      JSON.stringify({ ...parentProgress, childPhases: newChildren, childPointer: name, updatedAt: now }, null, 2)
    );
  }

  const newPath = [...curTokens, name];
  if (curDepth === 1) {
    atomicWrite(
      WP,
      JSON.stringify(
        {
          ...waypoint,
          path: newPath,
          childPhases: newChildren,
          childPointer: name,
          currentTask: `run kbd-assess for ${childLabel}`,
          exactNextCommand: `/kbd-assess ${childLabel}`,
          updatedAt: now,
        },
        null,
        2
      )
    );
  } else {
    atomicWrite(
      WP,
      JSON.stringify(
        {
          ...waypoint,
          path: newPath,
          childPointer: name,
          currentTask: `run kbd-assess for ${childLabel}`,
          exactNextCommand: `/kbd-assess ${childLabel}`,
          updatedAt: now,
        },
        null,
        2
      )
    );
  }

  const index = curDepth + 1;
  const orchestratorRoot = process.env.KBD_ORCHESTRATOR_ROOT ?? '.';
  try {
    await hooksFire('child', 'before', name, index, maxDepth, {
      orchestratorRoot,
      cwd: '.',
      runCommand: runHookCommand,
      phasePath: childLabel,
      sourceTool: 'kbd-new-child',
    });
  } catch {
    warn('child:before hook fire failed (child still created)');
  }

  process.stdout.write(`\nCompleted kbd-new-child — ${childLabel} ready for /kbd-assess\n`);
  process.stdout.write(`  parent: ${parentLabel}\n`);
  process.stdout.write(`  child:  ${name}  [depth ${index}]\n`);
  process.stdout.write(`  goals:  ${path.join(childDir, 'goals.md')}\n`);
  process.stdout.write(`  scope:  ${path.join(childDir, 'scope.json')}\n`);
  process.stdout.write(`  Next:   /kbd-assess ${childLabel}\n`);
}

main(process.argv.slice(2)).catch((error) => die(error?.message ?? String(error)));
