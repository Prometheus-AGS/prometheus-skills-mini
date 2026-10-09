// Port of kbd-apply.sh (prometheus-skill-pack, 602 lines) — the KBD-owned spec-apply driver.
//
// Wraps a spec backend — all three engines with full parity: openspec (the DEFAULT engine),
// speckit (GitHub Spec Kit, pure filesystem markdown parsing; the `specify` CLI is never
// invoked), and native-kbd (the always-available fallback) — and drives it ONE task at a time so
// KBD stays the source of truth: every task boundary fires the KBD hooks, emits a plain-text
// position signal, and syncs progress.json + the waypoint. Dispatch goes through the
// `specEngines` registry in lib/kbd/spec-backend.mjs (extensible: a new engine is one adapter
// entry plus its detection evidence, not a dispatch rewrite here).
//
// HARD INVARIANT, preserved exactly: this driver never invokes a backend's "implement
// everything" command (bare `/opsx:apply`, `/speckit.implement`). It calls the backend per task.
// Subcommands: detect | list <change> | progress <change> | begin-task ... | end-task ... |
// mark-done <change> <id> | verify <change> | archive <change>.
//
// Judgment call: `list` prints TSV (`id\tdone 0|1\ttitle`) at this CLI boundary, matching the
// source's stdout contract, even though lib/kbd/spec-backend.mjs's `nkList`/`osList` return
// structured objects internally (see that module's header for why objects were chosen there).
//
// Judgment call: same runCommand divergence as kbd-next-child.mjs — see lib/kbd/hook-command.mjs.
// `fire()` below mirrors the source's own posture exactly: never let a hook failure abort the
// driver (`kbd_hooks_fire "$@" || true`).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../lib/platform/spawn.mjs';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';
import { isRuntimeAuthoritative } from '../lib/kbd/runtime-authority.mjs';
import { resolveRuntimeTaskId } from '../lib/kbd/task-identity.mjs';
import { isBottleneckActive, evaluateBottleneck, bottleneckSignalText } from '../lib/kbd/bottleneck-guard.mjs';
import { hooksFire } from '../lib/kbd/hooks.mjs';
import { kbdCurrentNodeDir } from '../lib/kbd/waypoint.mjs';
import { runHookCommand } from '../lib/kbd/hook-command.mjs';
import { detectBackend, specEngines } from '../lib/kbd/spec-backend.mjs';
import { runReconcile } from '../lib/kbd/reconcile.mjs';
import { readReconcileState } from '../lib/kbd/reconcile-state.mjs';
import { repairAdapters } from '../lib/kbd/reconcile-repair.mjs';

const SELF = 'kbd-apply';
function die(message) {
  process.stderr.write(`${SELF}: ${message}\n`);
  process.exit(1);
}
function warn(message) {
  process.stderr.write(`${SELF}: warn: ${message}\n`);
}

const WP = path.join('.kbd-orchestrator', 'current-waypoint.json');
const orchestratorRoot = process.env.KBD_ORCHESTRATOR_ROOT ?? '.';

// ---- backend dispatch -------------------------------------------------------
//
// Every op resolves its backend from the change id it was given (detectBackend), then dispatches
// through the `specEngines` registry — so openspec, speckit and native-kbd all six ops are one
// table lookup, and a future engine needs no edit here. Unknown backend ('') is a hard error:
// speckit verify/archive used to be no-ops in the bash source, but this port implements them for
// real, so there is no silent-pass branch left to fall into.

function engineFor(root, change) {
  const backend = detectBackend({ root, change });
  const engine = specEngines[backend];
  if (!engine) die(`no spec backend detected (cwd=${path.resolve(root)})`);
  return engine;
}

const bList = (root, change) => engineFor(root, change).list(root, change);
const bProgress = (root, change) => engineFor(root, change).progress(root, change);
const bMarkDone = (root, change, id) => engineFor(root, change).markDone(root, change, id);
const bVerify = (root, change) => engineFor(root, change).verify(root, change);
const bArchive = (root, change) => engineFor(root, change).archive(root, change);

function bRemainingTitles(root, change) {
  try {
    return bList(root, change)
      .filter((row) => !row.done)
      .slice(0, 5)
      .map((row) => row.title);
  } catch {
    return [];
  }
}

// ---- progress.json sync -----------------------------------------------------

function phaseDir() {
  if (!existsSync(WP)) return null;
  const dir = kbdCurrentNodeDir(WP, '.');
  if (dir) return dir;
  // Fallback: v2 one-child-level resolution.
  let waypoint;
  try {
    waypoint = JSON.parse(readFileSync(WP, 'utf8'));
  } catch {
    return null;
  }
  const phase = waypoint.phase ?? '';
  if (!phase) return null;
  const child = waypoint.childPointer;
  if (child && child !== null) return path.join('.kbd-orchestrator', 'phases', phase, 'children', child);
  return path.join('.kbd-orchestrator', 'phases', phase);
}

function syncProgress(change, complete, total) {
  if (isRuntimeAuthoritative('.')) return; // KbdStateV2 derives counters from committed events.
  const pdir = phaseDir();
  if (!pdir) return;
  const pj = path.join(pdir, 'progress.json');
  if (!existsSync(pj)) return;
  let progress;
  try {
    progress = JSON.parse(readFileSync(pj, 'utf8'));
  } catch {
    return;
  }
  const changes = (progress.changes ?? []).map((row) =>
    row && typeof row === 'object' && row.id === change
      ? { ...row, tasks_done: complete, tasks_total: total }
      : row
  );
  atomicWrite(pj, JSON.stringify({ ...progress, changes }, null, 2));
}

function runtimeTaskTransition(change, taskId, title, sequence, status) {
  if (!isRuntimeAuthoritative('.')) return true;

  const statusResult = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
  if (statusResult?.status !== 0) return false;
  let state = JSON.parse(statusResult.stdout);
  const phase = state?.activePath?.phaseId;
  if (process.env.KBD_RECONCILE_PHASE && phase !== process.env.KBD_RECONCILE_PHASE) {
    warn('reconcile repair phase is no longer active');
    return false;
  }
  if (!phase) {
    warn('canonical runtime has no active phase');
    return false;
  }

  if (!state?.phases?.[phase]?.changes?.[change]) {
    const registerResult = spawnExecutable('prometheus', [
      'kbd', '--path', '.', 'change', 'register',
      '--command-id', `apply:change-register:${phase}:${change}`,
      '--phase', phase, '--id', change, '--title', change,
    ]);
    if (registerResult?.status !== 0) return false;
    const refreshed = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
    if (refreshed?.status !== 0) return false;
    state = JSON.parse(refreshed.stdout);
  }

  // Reuse a task /kbd-plan already registered for this change instead of registering a duplicate
  // under the backend ordinal.
  try {
    const resolved = resolveRuntimeTaskId(state?.phases?.[phase]?.changes?.[change]?.tasks, taskId, sequence, title);
    if (resolved.mapped) warn(`backend task ${taskId} maps to registered runtime task ${resolved.id}`);
    taskId = resolved.id;
  } catch (error) {
    warn(error.message);
    return false;
  }

  if (!state?.phases?.[phase]?.changes?.[change]?.tasks?.[taskId]) {
    const registerTaskResult = spawnExecutable('prometheus', [
      'kbd', '--path', '.', 'task', 'register',
      '--command-id', `apply:task-register:${phase}:${change}:${taskId}`,
      '--phase', phase, '--change', change, '--id', taskId,
      '--title', title, '--sequence', String(sequence),
    ]);
    if (registerTaskResult?.status !== 0) return false;
  }

  if (status === 'register-only') return true;

  const transitionResult = spawnExecutable('prometheus', [
    'kbd', '--path', '.', 'task', 'transition',
    '--command-id', `apply:task-${status}:${phase}:${change}:${taskId}`,
    '--phase', phase, '--change', change, '--id', taskId,
    '--status', status, '--summary', title,
  ]);
  return transitionResult?.status === 0;
}

function canonicalGuardTaskId(change, backendId, sequence, title) {
  if (!isRuntimeAuthoritative('.')) return backendId;
  const result = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
  if (result?.status !== 0) die('failed to read canonical task identity for boundary guard');
  const state = JSON.parse(result.stdout);
  const phase = state?.activePath?.phaseId;
  if (!phase) die('canonical runtime has no active phase for boundary guard');
  try {
    return resolveRuntimeTaskId(state?.phases?.[phase]?.changes?.[change]?.tasks, backendId, sequence, title).id;
  } catch (error) {
    die(error.message);
  }
}

async function fire(kind, edge, name, index, total) {
  try {
    await hooksFire(kind, edge, name, index, total, {
      orchestratorRoot,
      cwd: '.',
      runCommand: runHookCommand,
      phasePath: name,
      sourceTool: 'kbd-apply',
    });
  } catch {
    // Never let a hook failure abort the driver — matches the source's `|| true`.
  }
}

// ---- subcommands -------------------------------------------------------------

function cmdDetect() {
  process.stdout.write(`${detectBackend({ root: '.' })}\n`);
}

function cmdList(change) {
  if (!change) die('usage: list <change>');
  const rows = bList('.', change);
  process.stdout.write(rows.map((r) => `${r.id}\t${r.done ? '1' : '0'}\t${r.title}`).join('\n'));
  if (rows.length > 0) process.stdout.write('\n');
}

function cmdProgress(change) {
  if (!change) die('usage: progress <change>');
  const { total, complete, remaining } = bProgress('.', change);
  process.stdout.write(`${total} ${complete} ${remaining}\n`);
}

async function cmdBeginTask(args) {
  const [change, id, iRaw, nRaw, ...titleParts] = args;
  const i = Number(iRaw ?? 1);
  const n = Number(nRaw ?? 1);
  const title = titleParts.join(' ');
  if (!change || !id) die('usage: begin-task <change> <id> <i> <n> <title>');

  const before = bProgress('.', change);
  if (!runtimeTaskTransition(change, id, title, i, 'register-only')) {
    die('failed to register canonical task boundary');
  }
  let changeStart = before.complete === 0;

  const guardEnabled = isBottleneckActive('.');
  let changeGuardOutput;
  let taskGuardOutput;
  if (guardEnabled) {
    const changeKey = `change:${change.toLowerCase()}`;
    const statusResult = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
    if (statusResult?.status !== 0) die('failed to read canonical boundary obligations');
    const state = JSON.parse(statusResult.stdout);
    if (state?.boundaryObligations?.[changeKey]) {
      changeStart = false;
    } else {
      changeStart = true;
      const pre = evaluateBottleneck('change', 'before', change, true, { root: '.' });
      if (pre.status !== 0) die('canonical change start precommit evaluation blocked');
    }
    const guardId = canonicalGuardTaskId(change, id, i, title);
    const taskPre = evaluateBottleneck('task', 'before', `${change}/${guardId}`, true, { root: '.' });
    if (taskPre.status !== 0) die('canonical task start precommit evaluation blocked');
  }

  if (!runtimeTaskTransition(change, id, title, i, 'in-progress')) {
    die('failed to commit canonical task start');
  }

  if (guardEnabled) {
    if (changeStart) {
      const post = evaluateBottleneck('change', 'before', change, false, { root: '.' });
      if (post.status !== 0) die('canonical change start postcommit evaluation blocked');
      changeGuardOutput = post.stdout;
    }
    const guardId = canonicalGuardTaskId(change, id, i, title);
    const taskPost = evaluateBottleneck('task', 'before', `${change}/${guardId}`, false, { root: '.' });
    if (taskPost.status !== 0) die('canonical task start postcommit evaluation blocked');
    taskGuardOutput = taskPost.stdout;
  }

  if (changeStart) {
    if (guardEnabled) process.stdout.write(`${bottleneckSignalText(changeGuardOutput)}\n`);
    else process.stdout.write('Starting change 1 out of 1:   ' + `${change}\n`);
    await fire('change', 'before', change, 1, 1);
  }
  await fire('task', 'before', `${change}:${id}`, i, n);
  if (guardEnabled) process.stdout.write(`${bottleneckSignalText(taskGuardOutput)}\n`);
  else process.stdout.write(`Starting task ${i} out of ${n}:   ${title}\n`);
}

async function cmdEndTask(args) {
  const [change, id, iRaw, nRaw, ...titleParts] = args;
  const i = Number(iRaw ?? 1);
  const n = Number(nRaw ?? 1);
  const title = titleParts.join(' ');
  if (!change || !id) die('usage: end-task <change> <id> <i> <n> <title>');

  const before = bProgress('.', change);
  let finalTask = before.remaining === 1;
  const repairPhase = process.env.KBD_RECONCILE_PHASE;
  if (repairPhase) {
    const state = readReconcileState('.').state;
    if (state?.activePath?.phaseId !== repairPhase) die('reconcile repair phase is no longer active');
    const tasks = state.phases?.[repairPhase]?.changes?.[change]?.tasks ?? {};
    finalTask = Object.values(tasks).filter((task) => !['complete', 'completed', 'done', 'cancelled', 'canceled'].includes(task.status)).length === 1;
  }

  const guardEnabled = isBottleneckActive('.');
  if (guardEnabled) {
    const guardId = canonicalGuardTaskId(change, id, i, title);
    const taskPre = evaluateBottleneck('task', 'after', `${change}/${guardId}`, true, { root: '.' });
    if (taskPre.status !== 0) die('canonical task completion precommit evaluation blocked');
    if (finalTask) {
      const changePre = evaluateBottleneck('change', 'after', change, true, { root: '.' });
      if (changePre.status !== 0) die('canonical change completion precommit evaluation blocked');
    }
  }

  if (!repairPhase) bMarkDone('.', change, id);
  if (!runtimeTaskTransition(change, id, title, i, 'complete')) {
    die('failed to commit canonical task completion');
  }

  const after = bProgress('.', change);
  syncProgress(change, after.complete ?? i, after.total ?? n);
  // Position sync (kbd_position_sync in the source): no mini-native writer exists yet for the
  // unified position model, so this step is intentionally a no-op here — best-effort, matching
  // the source's own `|| true` posture, until a lib/kbd position-sync module lands.

  let taskGuardOutput;
  let changeGuardOutput;
  if (guardEnabled) {
    const guardId = canonicalGuardTaskId(change, id, i, title);
    const taskPost = evaluateBottleneck('task', 'after', `${change}/${guardId}`, false, { root: '.' });
    if (taskPost.status !== 0) die('canonical task completion postcommit evaluation blocked');
    taskGuardOutput = taskPost.stdout;
    if (finalTask) {
      const changePost = evaluateBottleneck('change', 'after', change, false, { root: '.' });
      if (changePost.status !== 0) die('canonical change completion postcommit evaluation blocked');
      changeGuardOutput = changePost.stdout;
    }
    process.stdout.write(`${bottleneckSignalText(taskGuardOutput)}\n`);
  } else {
    process.stdout.write(`Completed task ${i} out of ${n}:   ${title}\n`);
  }

  // Completion hooks run only after both the canonical transition and its signed after-boundary
  // receipt succeed — matches the source's ordering exactly.
  await fire('task', 'after', `${change}:${id}`, i, n);
  if (finalTask) {
    if (guardEnabled) process.stdout.write(`${bottleneckSignalText(changeGuardOutput)}\n`);
    else process.stdout.write(`Completed change 1 out of 1:   ${change}\n`);
    await fire('change', 'after', change, 1, 1);
  }

  const remaining = after.remaining ?? 0;
  if (remaining > 0) {
    const pendingTitles = bRemainingTitles('.', change).join(' | ') || 'unknown';
    process.stdout.write(`Remaining tasks after task ${i}: ${remaining} out of ${after.total ?? n} — ${pendingTitles}\n`);
  } else {
    process.stdout.write(`Remaining tasks after task ${i}: 0 out of ${after.total ?? n} — none\n`);
  }
}

function cmdMarkDone(args) {
  const [change, id] = args;
  if (!change || !id) die('usage: mark-done <change> <id>');
  bMarkDone('.', change, id);
}

function cmdVerify(change) {
  if (!change) die('usage: verify <change>');
  if (bVerify('.', change)) {
    process.stdout.write('verify: PASS\n');
  } else {
    process.stdout.write('verify: FAIL\n');
    process.exit(1);
  }
}

function cmdArchive(change) {
  if (!change) die('usage: archive <change>');
  bArchive('.', change);
  process.stdout.write(`archived: ${change}\n`);
}

const USAGE = `Usage: node scripts/kbd-apply.mjs <subcommand> [args]

  detect [<dir>]                 print backend id ("openspec"|"native-kbd"|"speckit"|"")
  list <change>                  print tasks as TSV: <id>\\t<done 0|1>\\t<title>
  progress <change>              print "total complete remaining"
  begin-task <change> <id> <i> <n> <title>
  end-task   <change> <id> <i> <n> <title>
  mark-done  <change> <id>       flip one task to done in the backend (no hooks)
  verify     <change>            backend verify (non-zero = fail)
  archive    <change>            backend archive
  reconcile [<phase>] [--repair] [--json]  inspect task drift; opt in to safe repair`;

async function main(argv) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'detect':
      return cmdDetect();
    case 'list':
      return cmdList(rest[0]);
    case 'progress':
      return cmdProgress(rest[0]);
    case 'begin-task':
      return cmdBeginTask(rest);
    case 'end-task':
      return cmdEndTask(rest);
    case 'mark-done':
      return cmdMarkDone(rest);
    case 'verify':
      return cmdVerify(rest[0]);
    case 'archive':
      return cmdArchive(rest[0]);
    case 'reconcile':
      process.exitCode = await runReconcile(rest, repairAdapters((root) => readReconcileState(root).state));
      return undefined;
    case undefined:
    case '-h':
    case '--help':
      process.stdout.write(`${USAGE}\n`);
      return undefined;
    default:
      die(`unknown subcommand: ${cmd} (try --help)`);
      return undefined;
  }
}

main(process.argv.slice(2)).catch((error) => die(error?.message ?? String(error)));
