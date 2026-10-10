import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const LINE_LIMIT = 256 * 1024;
const GRACE_MS = 10_000;
const FORCED_OBSERVATION_MS = 2_000;

function groupState(pid) {
  try { process.kill(-pid, 0); return 'present'; }
  catch (error) { return error.code === 'ESRCH' ? 'absent' : 'unknown'; }
}

function signalGroup(pid, signal) {
  try { process.kill(-pid, signal); }
  catch { /* Group absence or signal refusal is adjudicated by subsequent observation. */ }
}

async function awaitAbsence(pid, budgetMs) {
  const deadline = performance.now() + budgetMs;
  let state = groupState(pid);
  while (state !== 'absent' && performance.now() < deadline) {
    await delay(Math.min(100, Math.max(1, deadline - performance.now())));
    state = groupState(pid);
  }
  return state;
}

async function stopRemainingGroup(pid) {
  const cleanup = { groupAbsent: false, gracefulStopAttempted: false,
    forcedStopAttempted: false, unknownDescendants: false };
  if (groupState(pid) === 'absent') { cleanup.groupAbsent = true; return cleanup; }
  cleanup.gracefulStopAttempted = true;
  signalGroup(pid, 'SIGTERM');
  let state = await awaitAbsence(pid, GRACE_MS);
  if (state !== 'absent') {
    cleanup.forcedStopAttempted = true;
    signalGroup(pid, 'SIGKILL');
    state = await awaitAbsence(pid, FORCED_OBSERVATION_MS);
  }
  cleanup.groupAbsent = state === 'absent';
  cleanup.unknownDescendants = !cleanup.groupAbsent;
  return cleanup;
}

function lineReader(stream, outputPolicy, fail, counters) {
  let pending = Buffer.alloc(0);
  let failed = false;
  function emit(bytes) {
    if (failed) return;
    try { outputPolicy.observeLine(stream, bytes.toString('utf8').replace(/\r$/, '')); }
    catch { failed = true; fail(); }
  }
  return {
    push(chunk) {
      counters.outputBytes = Math.min(Number.MAX_SAFE_INTEGER, counters.outputBytes + chunk.length);
      if (failed) return;
      let offset = 0;
      while (offset < chunk.length && !failed) {
        const newline = chunk.indexOf(10, offset);
        const end = newline === -1 ? chunk.length : newline;
        const segment = chunk.subarray(offset, end);
        if (pending.length + segment.length > LINE_LIMIT) {
          counters.outputLineOverflows++;
          pending = Buffer.alloc(0);
          failed = true;
          fail();
          return;
        }
        pending = Buffer.concat([pending, segment]);
        if (newline === -1) return;
        emit(pending);
        pending = Buffer.alloc(0);
        offset = newline + 1;
      }
    },
    end() { if (pending.length) emit(pending); pending = Buffer.alloc(0); }
  };
}

/** Runs one explicitly configured POSIX process group; never persists subprocess output. */
export async function runOwned({ program, args, cwd, env, budgetMs, outputPolicy }) {
  const startedAt = new Date().toISOString();
  const counters = { outputBytes: 0, outputLineOverflows: 0 };
  let child;
  let pid = null;
  let exitCode = null;
  let signal = null;
  let category = 'completed';
  let policyFailed = false;
  let childExited = false;
  let childClosed = false;
  let hookCompleted = false;
  let settled = false;
  let finalized = false;
  let finish;
  const stopped = new Promise(resolve => { finish = resolve; });
  const readers = [];
  let timer;
  let cleanup = { groupAbsent: true, gracefulStopAttempted: false,
    forcedStopAttempted: false, unknownDescendants: false };

  function stop(reason) {
    if (settled || finalized) return;
    settled = true;
    category = reason;
    finish();
  }
  function policyFailure() {
    if (finalized) return;
    policyFailed = true;
    stop('output_policy_failed');
  }
  function maybeComplete() { if (childExited && hookCompleted) stop('completed'); }
  const cancel = () => {
    if (settled && category === 'completed') category = 'cancelled';
    else stop('cancelled');
  };

  process.on('SIGINT', cancel);
  process.on('SIGTERM', cancel);
  try {
    // An omitted env would make spawn inherit ambient credentials.
    const validEnvironment = env && typeof env === 'object' && !Array.isArray(env)
      && Object.values(env).every(value => typeof value === 'string');
    if (process.platform === 'win32' || !validEnvironment || !isAbsolute(program) || !isAbsolute(cwd)
      || !Array.isArray(args) || !args.every(value => typeof value === 'string')
      || !Number.isSafeInteger(budgetMs) || budgetMs < 1 || budgetMs > 2_147_483_647) {
      stop('spawn_failed');
    } else if (typeof outputPolicy?.observeLine !== 'function' || typeof outputPolicy?.result !== 'function') {
      policyFailure();
    } else {
      child = spawn(program, args, { cwd, env: { ...env }, shell: false,
        detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
      pid = child.pid ?? null;
      timer = setTimeout(() => stop('timed_out'), budgetMs);
      child.once('error', () => stop('spawn_failed'));
      child.once('exit', (code, exitSignal) => {
        exitCode = code;
        signal = exitSignal;
        childExited = true;
        maybeComplete();
      });
      child.once('close', () => { childClosed = true; });
      for (const name of ['stdout', 'stderr']) {
        const reader = lineReader(name, outputPolicy, policyFailure, counters);
        readers.push(reader);
        child[name].on('data', chunk => reader.push(chunk));
        child[name].once('end', () => reader.end());
        child[name].once('error', policyFailure);
      }
      child.once('spawn', () => {
        Promise.resolve().then(() => outputPolicy.onStarted?.({ pid, startedAt }))
          .then(() => { hookCompleted = true; maybeComplete(); }, policyFailure);
      });
    }
  } catch { stop('spawn_failed'); }

  try {
    await stopped;
    clearTimeout(timer);
    if (pid !== null) cleanup = await stopRemainingGroup(pid);
    if (child && pid !== null) {
      const deadline = performance.now() + FORCED_OBSERVATION_MS;
      while (!childClosed && performance.now() < deadline) await delay(25);
      // An open inherited pipe can outlive the observed process group.
      if (!childClosed) cleanup.unknownDescendants = true;
    }
    for (const reader of readers) reader.end();
  } finally {
    clearTimeout(timer);
    child?.stdout?.destroy();
    child?.stderr?.destroy();
    if (child && !childExited) child.unref();
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }

  let observations = {};
  try {
    const result = outputPolicy.result();
    if (!result || typeof result !== 'object' || Array.isArray(result)
      || !Object.values(result).every(value => typeof value === 'boolean'
        || typeof value === 'number' && Number.isFinite(value))) throw new Error();
    observations = { ...result };
  } catch { policyFailed = true; }
  if (pid !== null && !hookCompleted) policyFailed = true;
  Object.assign(observations, counters, { outputPolicyFailed: policyFailed });
  if (policyFailed) category = 'output_policy_failed';
  if (!cleanup.groupAbsent || cleanup.unknownDescendants) category = 'cleanup_unknown';
  finalized = true;
  return { exitCode, signal, startedAt, endedAt: new Date().toISOString(), pid,
    category, observations, cleanup };
}
