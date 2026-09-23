// Port of kbd-apply.sh (prometheus-skill-pack, 602 lines) — the KBD-owned spec-apply driver.
//
// Wraps a spec backend (openspec today; native-kbd as the always-available fallback; speckit
// detection only — see lib/kbd/spec-backend.mjs's header for why the speckit adapter itself is
// out of scope) and drives it ONE task at a time so KBD stays the source of truth: every task
// boundary fires the KBD hooks, emits a plain-text position signal, and syncs progress.json +
// the waypoint.
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
import { isBottleneckActive, evaluateBottleneck, bottleneckSignalText } from '../lib/kbd/bottleneck-guard.mjs';
import { hooksFire } from '../lib/kbd/hooks.mjs';
import { kbdCurrentNodeDir } from '../lib/kbd/waypoint.mjs';
import { runHookCommand } from '../lib/kbd/hook-command.mjs';
import {
  detectBackend,
  nkList, nkProgress, nkMarkDone, nkVerify, nkArchive,
  osList, osProgress, osMarkDone, osVerify, osArchive,
} from '../lib/kbd/spec-backend.mjs';

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

function bList(root, change) {
  const backend = detectBackend({ root, change });
  if (backend === 'openspec') return osList(root, change);
  if (backend === 'native-kbd') return nkList(root, change);
  if (backend === 'speckit') die('speckit adapter is not implemented in this port (detection only)');
  die(`no spec backend detected (cwd=${path.resolve(root)})`);
  return [];
}

function bProgress(root, change) {
  const backend = detectBackend({ root, change });
  if (backend === 'openspec') return osProgress(root, change);
  if (backend === 'native-kbd') return nkProgress(root, change);
  if (backend === 'speckit') die('speckit adapter is not implemented in this port (detection only)');
  die('no spec backend detected');
  return { total: 0, complete: 0, remaining: 0 };
}

function bMarkDone(root, change, id) {
  const backend = detectBackend({ root, change });
  if (backend === 'openspec') return osMarkDone(root, change, id);
  if (backend === 'native-kbd') return nkMarkDone(root, change, id);
  if (backend === 'speckit') die('speckit adapter is not implemented in this port (detection only)');
  die('no spec backend detected');
  return undefined;
}

/** speckit's `/speckit.analyze` is model-driven with no CLI gate — matches the source's b_verify. */
function bVerify(root, change) {
  const backend = detectBackend({ root, change });
  if (backend === 'openspec') return osVerify(root, change);
  if (backend === 'native-kbd') return nkVerify(root, change);
  return true;
}

/** speckit has no archive step — matches the source's b_archive. */
function bArchive(root, change) {
  const backend = detectBackend({ root, change });
  if (backend === 'openspec') return osArchive(root, change);
  if (backend === 'native-kbd') return nkArchive(root, change);
  return undefined;
}

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

  if (!runtimeTaskTransition(change, id, title, i, 'register-only')) {
    die('failed to register canonical task boundary');
  }

  let before = { total: n, complete: 0, remaining: n };
  try {
    before = bProgress('.', change);
  } catch {
    // Keep the fallback.
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
    const taskPre = evaluateBottleneck('task', 'before', `${change}/${id}`, true, { root: '.' });
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
    const taskPost = evaluateBottleneck('task', 'before', `${change}/${id}`, false, { root: '.' });
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

  let before = { total: n, complete: i - 1, remaining: 1 };
  try {
    before = bProgress('.', change);
  } catch {
    // Keep the fallback.
  }
  const finalTask = before.remaining === 1;

  const guardEnabled = isBottleneckActive('.');
  if (guardEnabled) {
    const taskPre = evaluateBottleneck('task', 'after', `${change}/${id}`, true, { root: '.' });
    if (taskPre.status !== 0) die('canonical task completion precommit evaluation blocked');
    if (finalTask) {
      const changePre = evaluateBottleneck('change', 'after', change, true, { root: '.' });
      if (changePre.status !== 0) die('canonical change completion precommit evaluation blocked');
    }
  }

  bMarkDone('.', change, id);
  if (!runtimeTaskTransition(change, id, title, i, 'complete')) {
    die('failed to commit canonical task completion');
  }

  let after = { total: n, complete: i, remaining: 0 };
  try {
    after = bProgress('.', change);
  } catch {
    // Keep the fallback.
  }
  syncProgress(change, after.complete ?? i, after.total ?? n);
  // Position sync (kbd_position_sync in the source): no mini-native writer exists yet for the
  // unified position model, so this step is intentionally a no-op here — best-effort, matching
  // the source's own `|| true` posture, until a lib/kbd position-sync module lands.

  let taskGuardOutput;
  let changeGuardOutput;
  if (guardEnabled) {
    const taskPost = evaluateBottleneck('task', 'after', `${change}/${id}`, false, { root: '.' });
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
  archive    <change>            backend archive`;

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
