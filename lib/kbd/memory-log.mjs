// Port of shared/lib/memory-log.sh (prometheus-skill-pack, 83 lines).
//
// Wrapper invoked by the kbd-memory-log hook: mirrors each hook fire into surreal-memory as a
// structured `kbd_lifecycle_event` entity. Memory failures never fail the lifecycle hook — every
// branch below is soft-fail by design, matching memory.mjs's own probe posture and this repo's
// "a hook that touches a service always exits 0" rule.
//
// Judgment call: the source POSTs via `curl --noproxy ... -X POST ...`; this port takes an
// injected `fetchImpl` (defaulting to the global `fetch`, which Node >=22 ships natively),
// matching progress.mjs/memory.mjs's existing convention and this repo's "no curl" constitution.
//
// Judgment call: reuses memory.mjs's `createMemoryProbe` for availability + URL resolution
// rather than re-deriving `KBD_MEMORY_MCP_URL`/`.kbd-orchestrator/memory.config.json` lookup a
// second time, per the task's explicit instruction. A caller supplies the probe (or lets this
// module construct one via `createMemoryProbe({ root, env })`).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createMemoryProbe } from './memory.mjs';

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** `.kbd-orchestrator/project.json`'s project/projectId, falling back to the waypoint's. */
function resolveProject(root) {
  const projectFile = path.join(root, '.kbd-orchestrator', 'project.json');
  if (existsSync(projectFile)) {
    const parsed = readJsonSafe(projectFile);
    if (parsed?.project) return parsed.project;
    if (parsed?.projectId) return parsed.projectId;
  }

  const waypointFile = path.join(root, '.kbd-orchestrator', 'current-waypoint.json');
  if (existsSync(waypointFile)) {
    const parsed = readJsonSafe(waypointFile);
    if (parsed?.project) return parsed.project;
    if (parsed?.projectId) return parsed.projectId;
  }

  return 'unknown';
}

/** Coerce to a non-negative integer, defaulting to 1 for anything that doesn't parse cleanly. */
function coerceCount(value) {
  const asString = String(value ?? '');
  return /^[0-9]+$/.test(asString) ? Number(asString) : 1;
}

/**
 * Mirror one hook-lifecycle event into surreal-memory. `event` carries the same fields the
 * source reads from `KBD_HOOK_*` env vars: `{ kind, edge, name, index, total, phasePath,
 * sourceTool, startedAt }`. `ctx.probe` is an optional pre-built `createMemoryProbe()` result
 * (one is constructed from `ctx.root`/`ctx.env` when absent). Never throws.
 */
export async function mirrorHookEvent(event, ctx = {}) {
  const root = ctx.root ?? '.';
  const fetchImpl = ctx.fetchImpl ?? fetch;
  const probe = ctx.probe ?? createMemoryProbe({ root, env: ctx.env ?? process.env, fetchImpl });

  const available = await probe.available();
  if (!available) return;
  const restBase = probe.url();
  // MCP-only availability has no shell REST origin and requires no mirror attempt.
  if (!restBase) return;

  const project = resolveProject(root);
  const phase = String(event.phasePath ?? '').split(' ')[0] || 'unknown';
  const index = coerceCount(event.index);
  const total = coerceCount(event.total);
  const kind = event.kind ?? '?';
  const edge = event.edge ?? '?';
  const startedAt = event.startedAt ?? '';

  const entityId = `${project}/${phase}/${kind}/${edge}/${index}/${startedAt}`;
  const observation = {
    kind,
    edge,
    name: event.name ?? '',
    index,
    total,
    phase,
    phasePath: event.phasePath ?? '',
    sourceTool: event.sourceTool ?? 'unknown',
    project,
    ts: startedAt,
  };

  const payload = {
    name: entityId,
    entity_type: 'kbd_lifecycle_event',
    observations: [JSON.stringify(observation)],
  };

  try {
    await fetchImpl(`${restBase}/api/v1/entities`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // A non-ok response is logged by the source as a soft warning; this port has no stderr
    // channel of its own to write to reliably from a library function, so it is silently
    // accepted here — the caller (the kbd-memory-log hook entry point) decides whether/how to
    // surface it, matching this repo's "entry points print; lib/ stays pure" split.
  } catch {
    // Soft-fail by design: an unreachable mirror endpoint never fails the lifecycle hook.
  }
}
