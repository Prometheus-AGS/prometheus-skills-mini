// Port of shared/lib/stage-gate.sh (prometheus-skill-pack, 243 lines), extended with the
// ebc8f687 Plan→Execute boundary (mini #60): semantic handoff validation, required
// contract-bound handoff identity, closed-phase dispatch refusal, and full readiness
// enforcement via lib/kbd/phase-readiness.mjs.
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
import { phaseReadiness } from './phase-readiness.mjs';
import { readDisposition } from './phase-disposition.mjs';
import { isRuntimeAuthoritative } from './runtime-authority.mjs';

const STAGE_ORDER = ['assess', 'analyze', 'spec', 'plan', 'execute', 'reflect'];
const OPTIONAL_STAGES = new Set(['analyze', 'spec']);
const DIGEST_RE = /^[0-9a-f]{64}$/;

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

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

/**
 * Semantic handoff validation (port of _sg_validate_handoff from the source's stage-gate.sh,
 * ebc8f687): valid JSON, required schema fields, stage-name match, identity.phaseId agreement
 * when identity is present. At the Plan→Execute boundary the plan handoff MUST carry full
 * identity (projectId, runId, phaseId, planRevision, contractDigest) bound to the adopted
 * contract, the phase must not be CLOSED, and full readiness validation must pass — an
 * identity-less, stale, or unready plan handoff is rejected, never dispatched (mini #60).
 */
function validateHandoff(handoffFile, prev, phaseDir, forStage, ctx) {
  const handoff = readJsonSafe(handoffFile);
  if (handoff === null) {
    return fail(
      `kbd_stage_gate: ${forStage} blocked — ${prev} handoff is not valid JSON: ${handoffFile}\n` +
        `Remediation: rewrite the handoff via stageHandoffWrite('${prev}', ...) (never hand-edit).\n`,
    );
  }
  const problems = [];
  if (handoff.stage !== prev) problems.push('stage-mismatch');
  if (!isNonEmptyString(handoff.completedAt)) problems.push('ts-missing');
  if (typeof handoff.skipped !== 'boolean') problems.push('skip-bad');
  if (problems.length > 0) {
    return fail(
      `kbd_stage_gate: ${forStage} blocked — ${prev} handoff fails schema check (${problems.join(' ')}): ${handoffFile}\n` +
        `Remediation: rewrite the handoff via stageHandoffWrite('${prev}', ...) (never hand-edit).\n`,
    );
  }

  let worked = '';
  const progressFile = path.join(phaseDir, 'progress.json');
  if (existsSync(progressFile)) {
    const progress = readJsonSafe(progressFile);
    if (progress) worked = progress.phaseId ?? progress.phase ?? '';
  }
  if (!worked) worked = path.basename(phaseDir);

  const idPhase = handoff.identity?.phaseId;
  if (isNonEmptyString(idPhase) && idPhase !== worked) {
    return fail(
      `kbd_stage_gate: ${forStage} blocked — ${prev} handoff identity.phaseId=${idPhase} disagrees with phase ${worked}.\n`,
    );
  }

  if (forStage === 'execute' && prev === 'plan') {
    const identity = handoff.identity;
    let identityProblem = 'ok';
    if (identity == null) identityProblem = 'missing';
    else if (!isNonEmptyString(identity.projectId)) identityProblem = 'missing-projectId';
    else if (!isNonEmptyString(identity.runId)) identityProblem = 'missing-runId';
    else if (!isNonEmptyString(identity.phaseId)) identityProblem = 'missing-phaseId';
    else if (typeof identity.planRevision !== 'number') identityProblem = 'missing-planRevision';
    else if (!DIGEST_RE.test(identity.contractDigest ?? '')) identityProblem = 'missing-contractDigest';
    if (identityProblem !== 'ok') {
      return fail(
        `kbd_stage_gate: execute blocked — plan handoff identity ${identityProblem}.\n` +
          'The Plan→Execute boundary requires an adopted-contract-bound handoff (mini #60).\n' +
          'Remediation: adopt the phase contract using the package-root command in the adopted-contract template, then rewrite the plan handoff with ctx.identity or KBD_HANDOFF_IDENTITY_JSON set.\n',
      );
    }

    const workedPhase = isNonEmptyString(identity.phaseId) ? identity.phaseId : worked;
    const gateRoot = rootFromPhaseDir(phaseDir, ctx.cwd ?? process.cwd());

    // B2 (mini #66 / full #192): a phase CLOSED in canonical state refuses further execute
    // dispatch. The disposition comes from the typed runtime authority, never from decision
    // text, so a recorded string cannot fake or hide a closure. REFUSED_* phases still admit
    // repair dispatch. Under canonical runtime authority an unreadable disposition blocks.
    const dispositionFile = ctx.dispositionFile ?? ctx.env?.KBD_PHASE_DISPOSITION_FILE ?? null;
    const disposition = readDisposition({ root: gateRoot, phase: workedPhase, dispositionFile, spawn: ctx.spawn });
    if (disposition.status === 0 && disposition.json.disposition === 'CLOSED') {
      return fail(
        `kbd_stage_gate: execute blocked — phase ${workedPhase} is CLOSED in canonical state (typed phase disposition).\n` +
          'A closed phase receives no further dispatch. A successor starts only with a signed start-successor authorization (kbd-next-phase --authorize-successor).\n',
      );
    }
    if (disposition.status !== 0 && (dispositionFile || (gateRoot && isRuntimeAuthoritative(gateRoot)))) {
      return fail(
        `kbd_stage_gate: execute blocked — canonical phase disposition for ${workedPhase} is unreadable.\n` +
          'Remediation: install a prometheus CLI with typed phase closure (prometheus kbd phase disposition), then retry.\n',
      );
    }

    // B1: full canonical readiness validation at the real Plan→Execute transition. Handoff
    // identity alone is not sufficient: the adopted contract, its digest, scenario coverage
    // and contract-quality gates must all validate, or the boundary does not complete and
    // nothing dispatches.
    const readiness = phaseReadiness({
      phase: workedPhase,
      phaseDir,
      statusFile: ctx.statusFile ?? ctx.env?.KBD_READINESS_STATUS_FILE ?? null,
      dispositionFile,
      spawn: ctx.spawn,
      root: gateRoot,
    });
    if (readiness.status !== 0) {
      return fail(
        `kbd_stage_gate: execute blocked — phase readiness validation failed (exit ${readiness.status}).\n` +
          `${readiness.stdout}${readiness.stderr}` +
          'Remediation: satisfy the package readiness command documented in kbd-execute (adopted contract, identity, digest, coverage, quality gates) before dispatch.\n',
      );
    }
  }
  return ok();
}

/** Verify the previous stage completed (handoff exists and validates, possibly skipped:true). */
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
    if (existsSync(handoffFile)) {
      return validateHandoff(handoffFile, prev, phaseDir, stage, { ...ctx, cwd });
    }
    if (OPTIONAL_STAGES.has(prev)) continue;
    return fail(
      `kbd_stage_gate: ${stage} blocked — ${prev} handoff missing.\n` +
        `Remediation: run /kbd-${prev} first. If project policy permits a deliberate skip, use stageHandoffSkip('${prev}', '<reason>', { cwd }) from lib/kbd/stage-gate.mjs.\n`
    );
  }
  return ok();
}

function handoffEmit(stage, summary, skipped, skipReason, phaseDir, outputs = [], identity = null) {
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
  // Identity binds the handoff to canonical state + the adopted contract. Optional for
  // assess/analyze/spec handoffs; REQUIRED by the Plan→Execute boundary (mini #60).
  if (identity) payload.identity = identity;

  atomicWrite(path.join(handoffsDir, `${stage}.handoff.json`), JSON.stringify(payload, null, 2));
}

/**
 * Resolve the handoff identity binding from ctx.identity (object) or
 * ctx.env.KBD_HANDOFF_IDENTITY_JSON (JSON string) — the port of the source's
 * KBD_HANDOFF_IDENTITY_JSON merge. Returns null when unset; throws on invalid JSON.
 */
function resolveIdentity(ctx = {}) {
  if (ctx.identity != null && typeof ctx.identity === 'object') return ctx.identity;
  const raw = (ctx.env ?? process.env).KBD_HANDOFF_IDENTITY_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('stage-gate: KBD_HANDOFF_IDENTITY_JSON is not valid JSON');
  }
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
  handoffEmit(stage, summary, false, '', phaseDir, outputs, resolveIdentity(ctx));
}

/** Record an explicit skip (skipped:true) so the gate passes deliberately rather than by drift. */
export function stageHandoffSkip(stage, reason = 'unspecified', ctx = {}) {
  const phaseDir = resolvePhaseDir(ctx);
  if (!phaseDir) throw new Error('kbd_stage_handoff_skip: no phase dir resolvable');
  handoffEmit(stage, `skipped: ${reason}`, true, reason, phaseDir);
}
