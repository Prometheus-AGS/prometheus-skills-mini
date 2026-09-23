// Port of shared/lib/hooks.sh (prometheus-skill-pack, 419 lines).
//
// The KBD hooks dispatcher. `hooksFire(kind, edge, name, index, total, ctx)` fires `<kind>:<edge>`
// lifecycle events, loading matching entries from three layers (last-wins within a layer;
// project > user > builtin on an override conflict), running each matched command, and recording
// a JSONL log plus a rolling hooks-status.json summary.
//
// Layers (loaded in order, last wins on override):
//   builtin  — <orchestratorRoot>/hooks/hooks.json
//   user     — <orchestratorRoot>/hooks/user.json (optional)
//   project  — <cwd>/.kbd-orchestrator/hooks-config.json (optional)
//
// Judgment call: the source runs each hook's `command` through `bash -c "$command"` (with a
// `timeout(1)` wrapper, degrading gracefully where `timeout(1)` is absent). This repo forbids
// shell-string execution (`node-scripts.md`: "spawn/spawnSync with shell:false and an args
// array. Never build a command string"), so this port never invokes a shell — `ctx.runCommand`
// is an injected `async (command, env) => { status, stdout, stderr }` the caller supplies to
// actually execute a hook's configured command string. Named here as a real behavioural
// divergence per the task's instruction: a hook `command` that relies on shell features (`&&`,
// pipes, globbing) needs its config rewritten to something `runCommand` can execute directly
// (e.g. a program + argv array via `spawnExecutable`) — this module owns dispatch, resolution,
// logging and status bookkeeping only.
//
// Judgment call: does NOT import waypoint.mjs. The source sources waypoint.sh for
// `chain_separator`/`waypoint_chain` to build the `phase_path` context string but degrades
// gracefully when those functions are unavailable (`command -v ... || phase_path=""`). This port
// takes the already-resolved `ctx.phasePath`/`ctx.childPath` directly rather than hard-importing
// waypoint.mjs, keeping capability modules decoupled — the same posture progress.mjs takes with
// its optional `ctx.hooksFire` callback instead of importing hooks.mjs.

import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';

/** Map a legacy event name to canonical `<kind>:<edge>`. Unmapped input passes through. */
export function normalizeEvent(event) {
  switch (event) {
    case 'on_phase_complete':
      return 'phase:after';
    case 'on_plan_complete':
      return 'plan:after';
    case 'on_reflection_complete':
      return 'reflect:after';
    case 'on_assessment_complete':
      return 'assess:after';
    case 'on_change_complete':
      return 'on_change_complete'; // sentinel — runtime check in hooksFire
    case 'on_blocker_detected':
    case 'on_cross_tool_handoff':
      return event;
    default:
      if (event.endsWith(':begin')) return `${event.slice(0, -':begin'.length)}:before`;
      if (event.endsWith(':end')) return `${event.slice(0, -':end'.length)}:after`;
      return event;
  }
}

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** One hooks-config file → its `hooks[]`, shaped and tagged with `layer`. */
function collectOne(file, layer) {
  if (!existsSync(file)) return [];
  const parsed = readJsonSafe(file);
  if (parsed === null) return [];
  const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];
  return hooks.map((h, index) => ({
    id: h.id ?? `${layer}/${h.event ?? 'unknown'}/${index}`,
    event: h.event ?? '',
    mode: h.mode ?? 'augment',
    command: h.action?.command ?? h.action?.target ?? '',
    timeout: h.action?.timeout ?? 15,
    on_failure: h.action?.on_failure ?? 'warn',
    enabled: h.enabled ?? true,
    layer,
  }));
}

function layerFiles(orchestratorRoot, cwd) {
  return {
    builtin: path.join(orchestratorRoot, 'hooks', 'hooks.json'),
    user: path.join(orchestratorRoot, 'hooks', 'user.json'),
    project: path.join(cwd, '.kbd-orchestrator', 'hooks-config.json'),
  };
}

/** Collect matching entries across all three layers, normalising events and filtering by target. */
function collectMatching(kind, edge, orchestratorRoot, cwd) {
  const target = `${kind}:${edge}`;
  const files = layerFiles(orchestratorRoot, cwd);
  const entries = [
    ...collectOne(files.builtin, 'builtin'),
    ...collectOne(files.user, 'user'),
    ...collectOne(files.project, 'project'),
  ];

  return entries
    .filter((entry) => entry.event)
    .map((entry) => ({ ...entry, normEvent: normalizeEvent(entry.event) }))
    .filter((entry) => {
      const { normEvent } = entry;
      return normEvent === target || normEvent === `${kind}:*` || normEvent === `*:${edge}` || normEvent === '*:*';
    })
    .filter((entry) => entry.enabled !== false);
}

/**
 * Partition matched entries into override winner(s) + augments. project > user > builtin on an
 * override conflict; within a layer, last wins. When an override resolves, the builtin default
 * reporter augment (`builtin/report-progress` or `report-progress`) is suppressed; every other
 * augment still fires.
 */
function resolveOverrides(entries) {
  const overrides = entries.filter((e) => e.mode === 'override');
  let augments = entries.filter((e) => e.mode !== 'override');

  let winner = null;
  if (overrides.length > 0) {
    const byLayer = (layer) => overrides.filter((e) => e.layer === layer);
    const project = byLayer('project');
    const user = byLayer('user');
    const builtin = byLayer('builtin');
    if (project.length > 0) winner = project.at(-1);
    else if (user.length > 0) winner = user.at(-1);
    else if (builtin.length > 0) winner = builtin.at(-1);
  }

  const resolved = [];
  if (winner) {
    augments = augments.filter((e) => e.id !== 'builtin/report-progress' && e.id !== 'report-progress');
    resolved.push(winner);
  }
  resolved.push(...augments);
  return resolved;
}

function activePhaseDir(orchestratorRoot, cwd) {
  const waypointFile = path.join(cwd, '.kbd-orchestrator', 'current-waypoint.json');
  if (!existsSync(waypointFile)) return null;
  const waypoint = readJsonSafe(waypointFile);
  const phase = waypoint?.phase;
  if (!phase) return null;
  const dir = path.join(cwd, '.kbd-orchestrator', 'phases', phase);
  return existsSync(dir) ? dir : null;
}

function logPath(orchestratorRoot, cwd) {
  const phaseDir = activePhaseDir(orchestratorRoot, cwd);
  if (phaseDir) return path.join(phaseDir, 'hooks.log.jsonl');
  mkdirSync(path.join(cwd, '.kbd-orchestrator'), { recursive: true });
  return path.join(cwd, '.kbd-orchestrator', 'hooks.log.jsonl');
}

function statusPath(orchestratorRoot, cwd) {
  const phaseDir = activePhaseDir(orchestratorRoot, cwd);
  if (phaseDir) return path.join(phaseDir, 'hooks-status.json');
  mkdirSync(path.join(cwd, '.kbd-orchestrator'), { recursive: true });
  return path.join(cwd, '.kbd-orchestrator', 'hooks-status.json');
}

function appendLog(file, entry) {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(entry)}\n`);
}

function updateStatus(file, entry) {
  mkdirSync(path.dirname(file), { recursive: true });
  const current = existsSync(file)
    ? (readJsonSafe(file) ?? { totalRuns: 0, failedRuns: 0, lastRun: null, lastFailure: null })
    : { totalRuns: 0, failedRuns: 0, lastRun: null, lastFailure: null };

  const next = {
    ...current,
    totalRuns: (current.totalRuns ?? 0) + 1,
    lastRun: {
      ts: entry.ts,
      kind: entry.kind,
      edge: entry.edge,
      name: entry.name,
      hookId: entry.hookId,
      layer: entry.layer,
      mode: entry.mode,
      status: entry.status,
    },
  };
  if ((entry.status ?? 0) !== 0) {
    next.failedRuns = (current.failedRuns ?? 0) + 1;
    next.lastFailure = {
      ts: entry.ts,
      kind: entry.kind,
      edge: entry.edge,
      name: entry.name,
      hookId: entry.hookId,
      layer: entry.layer,
      mode: entry.mode,
      status: entry.status,
      stderrSnippet: entry.stderrSnippet ?? '',
      logPath: entry.logPath ?? '',
    };
  }

  atomicWrite(file, JSON.stringify(next, null, 2));
}

/** Run one resolved entry via `ctx.runCommand`, logging and updating status as it goes. */
async function runEntry(entry, kind, edge, name, index, total, ctx) {
  const { orchestratorRoot, cwd, runCommand, phasePath = '', childPath = '', sourceTool = 'unknown' } = ctx;
  if (!entry.command) return;

  const startedAt = new Date().toISOString();
  const env = {
    KBD_HOOK_KIND: kind,
    KBD_HOOK_EDGE: edge,
    KBD_HOOK_NAME: name,
    KBD_HOOK_INDEX: String(index),
    KBD_HOOK_TOTAL: String(total),
    KBD_HOOK_PHASE_PATH: phasePath,
    KBD_HOOK_CHILD_PATH: childPath,
    KBD_HOOK_SOURCE_TOOL: sourceTool,
    KBD_HOOK_STARTED_AT: startedAt,
    PHASE: phasePath,
    STEP: kind,
    EVENT: edge,
    TIMESTAMP: startedAt,
  };

  const result = await runCommand(entry.command, env, { timeout: entry.timeout });
  const status = result?.status ?? 0;
  const stderrSnippet = String(result?.stderr ?? '').slice(0, 200).replace(/\n/g, ' ');
  const log = logPath(orchestratorRoot, cwd);

  const logEntry = {
    ts: startedAt,
    kind,
    edge,
    name,
    index,
    total,
    phasePath,
    sourceTool,
    hookId: entry.id,
    layer: entry.layer,
    mode: entry.mode,
    status,
    logPath: log,
    ...(status !== 0 ? { stderrSnippet } : {}),
  };

  appendLog(log, logEntry);
  updateStatus(statusPath(orchestratorRoot, cwd), logEntry);

  if (status !== 0) {
    const statusFile = statusPath(orchestratorRoot, cwd);
    if (entry.on_failure === 'error') {
      throw new Error(`hook ${entry.id} failed (exit ${status}); on_failure=error; log=${log}; status=${statusFile}`);
    }
    if (entry.on_failure !== 'ignore') {
      // Default (warn): the source writes to stderr and continues. This port has no implicit
      // stderr channel from a library function, so the caller can observe this via the JSONL
      // log / hooks-status.json this call already wrote.
    }
  }
}

/**
 * Fire one lifecycle boundary. `ctx.orchestratorRoot` is required (the source requires
 * `KBD_ORCHESTRATOR_ROOT` to be set); `ctx.cwd` defaults to `process.cwd()`; `ctx.runCommand` is
 * required — an `async (command, env, { timeout }) => { status, stdout, stderr }` that actually
 * executes a hook's configured command (never a shell string, per this repo's constitution).
 */
export async function hooksFire(kind, edge, name, index = 1, total = 1, ctx = {}) {
  const { orchestratorRoot, runCommand } = ctx;
  if (!orchestratorRoot) throw new Error('hooksFire: ctx.orchestratorRoot must be set');
  if (typeof runCommand !== 'function') throw new Error('hooksFire: ctx.runCommand must be a function');
  const cwd = ctx.cwd ?? process.cwd();

  const matched = collectMatching(kind, edge, orchestratorRoot, cwd);
  const resolved = resolveOverrides(matched);

  for (const entry of resolved) {
    await runEntry(entry, kind, edge, name, index, total, { ...ctx, cwd });
  }

  // on_change_complete alias — D5 runtime conditional: fires only when a task:after boundary
  // completes the last item (index === total).
  if (kind === 'task' && edge === 'after' && index === total) {
    const files = layerFiles(orchestratorRoot, cwd);
    const ocMatches = [
      ...collectOne(files.builtin, 'builtin'),
      ...collectOne(files.user, 'user'),
      ...collectOne(files.project, 'project'),
    ].filter((entry) => entry.event === 'on_change_complete' && entry.enabled !== false);

    for (const entry of ocMatches) {
      await runEntry(entry, kind, edge, name, index, total, { ...ctx, cwd });
    }
  }
}
