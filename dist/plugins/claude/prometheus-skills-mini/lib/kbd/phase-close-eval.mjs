// Terminal evaluator at the phase close/continue boundary (mini #59/#60/#66; port of
// prometheus-skill-pack shared/scripts/kbd-phase-close-eval.sh, canonical authority per #192).
//
// Consumes the phase's adopted scenario RESULTS evidence (boundary-results.json) — never task
// counters, implementationComplete, or READY — and records ONE canonical disposition through
// the typed runtime writer `prometheus kbd phase close`:
//
//   PASS    every bound scenario has valid PASS evidence with bound identity => the runtime
//           closes the phase (status complete) atomically; re-evaluating identical evidence is
//           ALREADY-CLOSED; a closed phase refuses dispatch and a successor needs a signed
//           authorization.
//   FAIL    a product oracle was unmet after valid execution => REFUSED_FAIL.
//   BLOCKED evidence missing/stale/invalid, validator/env unavailable, budget accounting
//           missing/unmeasured/exceeded => REFUSED_BLOCKED.
//
// The required scenario set and ceilings come from the BOUND snapshot
// (.kbd-orchestrator/phases/<id>/adopted/<digest>.json, verified by sha256), never from the
// mutable working contract. Evidence entries outside the bound contract are reported and
// ignored. Decision-summary text is never read as closure.
//
// Statuses: 0 closed/already-closed; 1 usage/io; 2 BLOCKED; 3 FAIL; 5 canonical writer failed
// (nothing claimed); 6 already closed under a different evidence identity.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { budgetPredicate, contractDigest, sha256Of } from './adopted-contract.mjs';
import { findKbdRoot, readCanonicalStatus } from './contract-adopt.mjs';
import { readDisposition, runPhaseCommand } from './phase-disposition.mjs';

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const EXIT_WRITER_FAILED = 5;
const EXIT_DIFFERENT_IDENTITY = 6;
const CLI_ALREADY_CLOSED = 6;
const CLI_REFUSED = 7;

const reasonCode = (reason) => reason.split('(')[0];

/**
 * Terminal evaluation for `phase`. `ctx`: { cwd, root, evidenceFile, statusFile,
 * dispositionFile, decisionSink, spawn }. Never throws — returns { status, stdout, stderr }.
 */
export function phaseCloseEval(phase, ctx = {}) {
  if (!phase) return { status: 1, stdout: '', stderr: 'usage: kbd-phase-close-eval.mjs --phase <id>\n' };
  const cwd = ctx.cwd ?? process.cwd();
  const root = ctx.root ?? findKbdRoot(cwd);
  if (!root || !existsSync(path.join(root, '.kbd-orchestrator'))) {
    return { status: 1, stdout: '', stderr: `no .kbd-orchestrator above ${cwd}\n` };
  }
  const phaseDir = ctx.phaseDir ?? path.join(root, '.kbd-orchestrator', 'phases', phase);
  if (!existsSync(phaseDir)) return out(2, `BLOCKED missing=phase-dir(${phaseDir})`);
  const evidencePath = ctx.evidenceFile ?? path.join(phaseDir, 'boundary-results.json');

  const statusResult = readCanonicalStatus({ root, statusFile: ctx.statusFile, spawn: ctx.spawn });
  if (statusResult.status !== 0) return out(2, 'BLOCKED missing=canonical-status(prometheus kbd status failed)');
  const disposition = readDisposition({ root, phase, dispositionFile: ctx.dispositionFile, spawn: ctx.spawn });
  if (disposition.status !== 0) {
    return out(2, `BLOCKED missing=canonical-disposition(prometheus kbd phase disposition failed for ${phase})`);
  }
  const canonicalRun = statusResult.json?.runId ?? '';
  const canonicalProject = statusResult.json?.projectId ?? '';
  const view = disposition.json;
  let evidenceTrusted = false;

  /** Record through the typed writer (or the disclosed sink); returns the writer status. */
  function record(dispositionName, reason) {
    const args = ['close', '--id', phase, '--disposition', dispositionName];
    if (reason) args.push('--reason-code', reason);
    if (evidenceTrusted) args.push('--evidence-file', evidencePath);
    if (ctx.decisionSink) {
      const evidence = evidenceTrusted ? `sha256:${sha256Of(readFileSync(evidencePath))}` : 'none';
      appendFileSync(ctx.decisionSink,
        `PHASE-CLOSE phase=${phase} disposition=${dispositionName} reason=${reason || 'none'} evidence=${evidence}\n`, 'utf8');
      return { status: 0, stdout: '', stderr: '' };
    }
    return runPhaseCommand({ root, args, spawn: ctx.spawn });
  }

  function refuse(verdict, status, reason) {
    const written = record(verdict.toLowerCase(), reasonCode(reason));
    if (written.status !== 0) {
      return out(EXIT_WRITER_FAILED,
        `WRITER-FAILED phase=${phase} verdict=${verdict} reason=${reason} writer-exit=${written.status} (nothing recorded)`);
    }
    return out(status, `${verdict} phase=${phase} reason=${reason}`);
  }
  const blocked = (reason) => refuse('BLOCKED', 2, reason);
  const failed = (reason) => refuse('FAIL', 3, reason);

  if (view.disposition === 'UNBOUND') {
    return out(2, `BLOCKED phase=${phase} reason=contract-unbound(adopt the phase contract with kbd-contract-adopt.mjs first)`);
  }
  const boundDigest = view.binding.contractDigest;
  let evidenceBytes = null;
  let evidence = null;
  if (existsSync(evidencePath)) {
    evidenceBytes = readFileSync(evidencePath);
    try { evidence = JSON.parse(evidenceBytes.toString('utf8')); } catch { evidence = null; }
  }
  const evidenceDigest = evidence ? sha256Of(evidenceBytes) : null;

  // --- a closed phase is immutable: identical evidence is a no-op, anything else is refused ---
  if (view.disposition === 'CLOSED') {
    if (evidenceDigest && view.closure.evidenceDigest === evidenceDigest && view.closure.runId === canonicalRun) {
      return out(0, `ALREADY-CLOSED phase=${phase} run=${canonicalRun} contract=${boundDigest} evidence=sha256:${evidenceDigest} (identical closure already recorded; no-op)`);
    }
    return out(EXIT_DIFFERENT_IDENTITY,
      `CLOSED-DIFFERENT-IDENTITY phase=${phase} closedEvidence=sha256:${view.closure.evidenceDigest} offered=sha256:${evidenceDigest ?? 'none'} (a closed phase is immutable)`);
  }

  // --- the bound snapshot defines blocking scope ---
  const snapshotPath = path.join(phaseDir, 'adopted', `${boundDigest}.json`);
  if (!existsSync(snapshotPath) || sha256Of(readFileSync(snapshotPath)) !== boundDigest) {
    return blocked(`snapshot-invalid(${snapshotPath} does not hash to the bound digest ${boundDigest})`);
  }
  const contract = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  let driftNote = '';
  const workingPath = path.join(phaseDir, 'adopted-contract.json');
  if (existsSync(workingPath)) {
    try {
      const working = contractDigest(JSON.parse(readFileSync(workingPath, 'utf8')));
      if (working !== boundDigest) driftNote = ` contract-drift-ignored(working=${working} bound=${boundDigest})`;
    } catch {
      driftNote = ` contract-drift-ignored(working=unreadable bound=${boundDigest})`;
    }
  }

  if (!evidenceBytes) return blocked(`evidence-missing(${evidencePath})`);
  if (!evidence) return blocked(`evidence-invalid-json(${evidencePath})`);

  // --- identity binding: phase, project, run, bound contract digest ---
  if ((evidence.phase ?? '') !== phase) return blocked(`evidence-phase-mismatch(evidence=${evidence.phase ?? ''} gate=${phase})`);
  if (isNonEmptyString(evidence.projectId) && evidence.projectId !== canonicalProject) {
    return blocked(`evidence-project-mismatch(evidence=${evidence.projectId} canonical=${canonicalProject})`);
  }
  if (!isNonEmptyString(evidence.runId) || evidence.runId !== canonicalRun) {
    return blocked(`evidence-run-mismatch(evidence=${evidence.runId ?? ''} canonical=${canonicalRun})`);
  }
  if ((evidence.contractDigest ?? '') !== boundDigest) {
    return blocked(`evidence-contract-digest-mismatch(evidence=${evidence.contractDigest ?? ''} bound=${boundDigest})`);
  }
  evidenceTrusted = true;

  // --- freshness: recompute digests of the production sources under evidence ---
  const sources = Object.entries(evidence.sourceDigests ?? {});
  if (sources.length === 0) return blocked('evidence-source-digests-missing');
  const stale = [];
  for (const [relPath, digest] of sources) {
    const file = path.join(root, relPath);
    if (!existsSync(file)) { stale.push(`missing(${relPath})`); continue; }
    if (sha256Of(readFileSync(file)) !== digest) stale.push(`stale(${relPath})`);
  }
  if (stale.length > 0) return blocked(`evidence-stale-sources(${stale.join(',')})`);

  // --- entry-level oracle over BOUND scenarios only (entry id == S or S-<sub>) ---
  const required = (contract.scenarioMatrix ?? []).map((s) => s.id);
  const owned = (entry) => required.some((id) => entry?.id === id || String(entry?.id ?? '').startsWith(`${id}-`));
  const all = Array.isArray(evidence.scenarios) ? evidence.scenarios : [];
  const entries = all.filter(owned);
  const ignored = all.filter((e) => !owned(e)).map((e) => e?.id ?? 'unknown');
  const scopeNote = ignored.length > 0 ? ` ignored-unadopted(${ignored.join(',')})` : '';
  const missing = required.filter((id) => !entries.some((e) => e.id === id || String(e.id).startsWith(`${id}-`)));
  const empty = entries.filter((e) => !isNonEmptyString(e.attempted) || !isNonEmptyString(e.observed) || !isNonEmptyString(e.evidence));
  const failedEntries = entries.filter((e) => e.status === 'FAIL');
  const notPass = entries.filter((e) => e.status !== 'PASS' && e.status !== 'FAIL');
  if (failedEntries.length > 0) return failed(`product-oracle-unmet(${failedEntries.map((e) => e.id).join(',')}${scopeNote})`);
  const blockedParts = [...missing.map((id) => `missing-scenario:${id}`), ...empty.map((e) => `empty-evidence:${e.id}`)];
  if (blockedParts.length > 0) return blocked(`${blockedParts.join(',')}${scopeNote}`);
  if (notPass.length > 0) return blocked(`${notPass.map((e) => `not-pass:${e.id}(${e.status ?? 'null'})`).join(',')}${scopeNote}`);

  // --- budget predicate (bound ceilings vs self-reported cumulative consumption) ---
  const budget = budgetPredicate(contract, evidence.budgetConsumption);
  if (budget.outcome === 'missing') {
    return blocked('budget-consumption-missing(contract requires budget evaluation: evidence needs budgetConsumption with source and measured/estimate/unknown classes)');
  }
  if (budget.outcome === 'source-missing') return blocked('evidence-budget-source-missing');
  if (budget.outcome === 'unmeasured') return blocked(`budget-unmeasured(${budget.hits.join(',')}) source=${budget.source}`);
  if (budget.outcome === 'exceeded') {
    return blocked(`budget-exceeded(${budget.hits.join(',')}) ceilings=${JSON.stringify(budget.ceilings)} source=${budget.source}`);
  }
  const passReason = budget.outcome === 'at-ceiling' ? 'budget-exhausted' : '';

  // --- close the phase (typed canonical writer; append-only; no tasks, no successor) ---
  const written = record('pass', passReason);
  if (written.status === CLI_ALREADY_CLOSED) {
    return out(EXIT_DIFFERENT_IDENTITY, `CLOSED-DIFFERENT-IDENTITY phase=${phase} (closed concurrently under another evidence identity)`);
  }
  if (written.status === CLI_REFUSED) {
    return out(2, `BLOCKED phase=${phase} reason=runtime-refused-pass(${`${written.stdout}${written.stderr}`.replace(/\s+/g, ' ').trim()})`);
  }
  if (written.status !== 0) {
    return out(EXIT_WRITER_FAILED, `WRITER-FAILED phase=${phase} verdict=PASS writer-exit=${written.status} (phase NOT closed)`);
  }
  return out(0,
    `CLOSED phase=${phase} verdict=PASS evidence=sha256:${evidenceDigest} contract=${boundDigest} run=${canonicalRun} ` +
    `entries=${all.length}${passReason ? ` budget-note=${passReason}` : ''}${scopeNote}${driftNote} (dispatch for this phase now refused)`);
}

function out(status, line) {
  return { status, stdout: `${line}\n`, stderr: '' };
}
