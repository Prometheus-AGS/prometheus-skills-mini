// Port of shared/lib/stage-gate.sh (prometheus-skill-pack, 243 lines).
//
// Stage precondition gates and handoff artifacts for the KBD lifecycle:
//
//   assess → analyze → spec → plan → execute → reflect
//
// `analyze` and `spec` are OPTIONAL stages: when no handoff exists for them the gate walks back
// to the nearest earlier stage instead of failing. This keeps pre-analyze projects working while
// reserving the slots.
//
// Judgment call: the source returns a bash exit code (0 or 2) plus stderr text. This port
// returns `{ status, stdout, stderr }` — the same shape `spawnExecutable` results use elsewhere
// in this repo — rather than throwing, so callers can inspect the exact remediation text without
// a try/catch, matching evaluateBottleneck's "never throws" convention for a lifecycle gate.
//
// Judgment call: the source resolves the phase dir from `$PWD` (walking up for
// `.kbd-orchestrator/`) and `$KBD_PHASE_DIR`. This port takes `cwd`/`env` as explicit ctx fields
// (defaulting to `process.cwd()`/`process.env`) instead of reading process state directly, so
// phase-dir resolution is testable without a real working directory or environment mutation.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';

const STAGE_ORDER = ['assess', 'analyze', 'spec', 'plan', 'execute', 'reflect'];
const OPTIONAL_STAGES = new Set(['analyze', 'spec']);

function ok(stdout = '') {
  return { status: 0, stdout, stderr: '' };
}

function fail(stderr) {
  return { status: 2, stdout: '', stderr };
}

/** Walk up from `cwd` looking for a `.kbd-orchestrator` directory. Returns null if none found. */
function findRoot(cwd) {
  let dir = cwd;
  while (dir && dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, '.kbd-orchestrator'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Resolve the phase dir: explicit wins; else env.KBD_PHASE_DIR; else derived from the waypoint. */
function resolvePhaseDir({ phaseDir, cwd = process.cwd(), env = process.env } = {}) {
  if (phaseDir) return phaseDir;
  if (env.KBD_PHASE_DIR) return env.KBD_PHASE_DIR;

  const root = findRoot(cwd);
  if (!root) return null;
  const waypointFile = path.join(root, '.kbd-orchestrator', 'current-waypoint.json');
  if (!existsSync(waypointFile)) return null;
  const waypoint = readJsonSafe(waypointFile);
  const phase = waypoint?.phase;
  if (!phase) return null;

  let dir = path.join(root, '.kbd-orchestrator', 'phases', phase);
  const pointer = waypoint?.childPointer;
  if (pointer && existsSync(path.join(dir, 'children', pointer))) {
    dir = path.join(dir, 'children', pointer);
  }
  return dir;
}

/** Derive the orchestrator root FROM the phase dir, not from cwd — see the source's comment. */
function rootFromPhaseDir(phaseDir, cwd) {
  const marker = `${path.sep}.kbd-orchestrator${path.sep}phases${path.sep}`;
  const index = phaseDir.indexOf(marker);
  if (index !== -1) return phaseDir.slice(0, index);
  return findRoot(cwd);
}

/**
 * Refuse when the phase being worked is not the phase canonical state considers active. Returns
 * ok() when they agree OR when the question is unanswerable (no waypoint at all), fail() on a
 * real mismatch.
 */
function assertCanonicalPhase(stage, phaseDir, cwd) {
  const root = rootFromPhaseDir(phaseDir, cwd);
  if (!root) return ok();

  const waypointFile = path.join(root, '.kbd-orchestrator', 'current-waypoint.json');
  if (!existsSync(waypointFile)) return ok();

  const waypoint = readJsonSafe(waypointFile);
  const active = waypoint?.activePhaseId;
  if (!active) return ok(); // projection predates activePhaseId

  let worked = '';
  const progressFile = path.join(phaseDir, 'progress.json');
  if (existsSync(progressFile)) {
    const progress = readJsonSafe(progressFile);
    if (progress === null) {
      return fail(`kbd_stage_gate: ${stage} blocked — ${phaseDir}/progress.json is unreadable.\n`);
    }
    worked = progress.phaseId ?? progress.phase ?? '';
  }
  if (!worked) worked = path.basename(phaseDir);
  if (worked === active) return ok();

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return fail(
    `kbd_stage_gate: ${stage} blocked — canonical state disagrees.\n` +
      `  working phase : ${worked}\n  canonical     : ${active}\n` +
      'Artifacts written now would belong to a phase the runtime does not consider active.\n' +
      `Remediation:\n  prometheus kbd --path . phase activate --command-id "activate-${worked}:${today}" --id ${worked}\n`
  );
}

/** Verify the previous stage completed (handoff exists, possibly skipped:true). */
export function stageGate(stage, ctx = {}) {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) {
    return fail(`kbd_stage_gate: unknown stage ${JSON.stringify(stage)} (order: ${STAGE_ORDER.join(' ')})\n`);
  }

  const cwd = ctx.cwd ?? process.cwd();
  const phaseDir = resolvePhaseDir({ ...ctx, cwd });
  if (!phaseDir) {
    return fail(
      `kbd_stage_gate: ${stage} blocked — no phase directory resolvable.\n` +
        'Remediation: activate a phase first:\n' +
        '  prometheus kbd --path . phase activate --command-id "activate-PHASE-UNIQUE-ID" --id PHASE\n'
    );
  }

  const canonical = assertCanonicalPhase(stage, phaseDir, cwd);
  if (canonical.status !== 0) return canonical;

  if (idx === 0) return ok();

  const handoffsDir = path.join(phaseDir, 'handoffs');
  if (!existsSync(handoffsDir)) {
    try {
      mkdirSync(handoffsDir, { recursive: true });
    } catch {
      return fail(`kbd_stage_gate: ${stage} blocked — cannot create ${phaseDir}/handoffs\n`);
    }
  }

  for (let i = idx - 1; i >= 0; i -= 1) {
    const prev = STAGE_ORDER[i];
    const handoffFile = path.join(handoffsDir, `${prev}.handoff.json`);
    if (existsSync(handoffFile) && readJsonSafe(handoffFile) !== null) {
      return ok();
    }
    if (OPTIONAL_STAGES.has(prev)) continue;
    return fail(
      `kbd_stage_gate: ${stage} blocked — ${prev} handoff missing.\n` +
        `Remediation: run /kbd-${prev} first. If project policy permits a deliberate skip, use stageHandoffSkip('${prev}', '<reason>', { cwd }) from lib/kbd/stage-gate.mjs.\n`
    );
  }
  return ok();
}

function handoffEmit(stage, summary, skipped, skipReason, phaseDir, outputs = []) {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) throw new Error(`stage-gate: unknown stage ${JSON.stringify(stage)}`);
  const next = idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;

  const handoffsDir = path.join(phaseDir, 'handoffs');
  mkdirSync(handoffsDir, { recursive: true });

  const payload = {
    stage,
    completedAt: new Date().toISOString(),
    outputs: outputs.filter((o) => typeof o === 'string' && o.length > 0),
    nextStage: next,
    summaryForNext: summary,
    skipped,
    skipReason: skipReason || null,
  };

  atomicWrite(path.join(handoffsDir, `${stage}.handoff.json`), JSON.stringify(payload, null, 2));
}

/** Atomically write handoffs/<stage>.handoff.json for the active phase. */
export function stageHandoffWrite(stage, summary, outputsOrCtx, maybeCtx) {
  let outputs = [];
  let ctx = {};
  if (Array.isArray(outputsOrCtx)) {
    outputs = outputsOrCtx;
    ctx = maybeCtx ?? {};
  } else {
    ctx = outputsOrCtx ?? {};
  }

  const phaseDir = resolvePhaseDir(ctx);
  if (!phaseDir) throw new Error('kbd_stage_handoff_write: no phase dir resolvable');
  handoffEmit(stage, summary, false, '', phaseDir, outputs);
}

/** Record an explicit skip (skipped:true) so the gate passes deliberately rather than by drift. */
export function stageHandoffSkip(stage, reason = 'unspecified', ctx = {}) {
  const phaseDir = resolvePhaseDir(ctx);
  if (!phaseDir) throw new Error('kbd_stage_handoff_skip: no phase dir resolvable');
  handoffEmit(stage, `skipped: ${reason}`, true, reason, phaseDir);
}
