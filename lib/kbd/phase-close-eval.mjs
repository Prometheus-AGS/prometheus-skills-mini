// Terminal evaluator at the phase close/continue boundary (mini #59/#60; port of
// prometheus-skill-pack ebc8f687 shared/scripts/kbd-phase-close-eval.sh, amendment v4).
//
// Consumes the phase's adopted scenario RESULTS evidence (boundary-results.json) — never task
// counters, implementationComplete, or READY — and records a truthful canonical disposition:
//
//   PASS    every adopted scenario has valid PASS evidence with bound identity
//           => close the phase via the canonical writer (PHASE-CLOSED); re-evaluation is
//              ALREADY-CLOSED only when a closure bound to THIS phase + THIS run + THIS
//              adopted contract digest exists (validated first); a closed phase refuses
//              further execute dispatch (enforced in lib/kbd/stage-gate.mjs).
//   FAIL    a product oracle was unmet after valid execution
//           => PHASE-CLOSURE-REFUSED verdict=FAIL, stop auto-continue.
//   BLOCKED evidence missing/stale/invalid, validator/env unavailable, budget accounting
//           missing or exceeded => PHASE-CLOSURE-REFUSED verdict=BLOCKED, stop auto-continue.
//
// NOT_EXERCISED never counts as PASS. Refusals never mark success and never close. The
// evaluator creates no tasks and no successor phases.
//
// Statuses: 0 closed/already-closed; 1 usage/io; 2 BLOCKED refusal; 3 FAIL refusal.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { budgetPredicate, contractDigest, latestAdoption, repoRelative, sha256Of } from './adopted-contract.mjs';
import { findKbdRoot, readCanonicalStatus, recordDecision } from './contract-adopt.mjs';

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

/**
 * Terminal evaluation for `phase`. `ctx`: { cwd, root, evidenceFile, statusFile,
 * decisionSink, spawn, now }. Never throws — returns { status, stdout, stderr }.
 */
export function phaseCloseEval(phase, ctx = {}) {
  if (!phase) return { status: 1, stdout: '', stderr: 'usage: kbd-phase-close-eval.mjs --phase <id>\n' };
  const cwd = ctx.cwd ?? process.cwd();
  const root = ctx.root ?? findKbdRoot(cwd);
  if (!root || !existsSync(path.join(root, '.kbd-orchestrator'))) {
    return { status: 1, stdout: '', stderr: `no .kbd-orchestrator above ${cwd}\n` };
  }
  const phaseDir = ctx.phaseDir ?? path.join(root, '.kbd-orchestrator', 'phases', phase);
  const blocked = (reason) => refuse('BLOCKED', 2, reason);
  const failed = (reason) => refuse('FAIL', 3, reason);

  const record = (id, commandId, summary) =>
    recordDecision({ root, id, commandId, summary, decisionSink: ctx.decisionSink, spawn: ctx.spawn });

  function refuse(verdict, status, reason) {
    const ts = (ctx.now ?? new Date()).toISOString().replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '');
    // PHASE-CLOSURE-REFUSED is recorded best-effort: the refusal itself is the output.
    record(`phase-closure-refused-${phase}-${ts}`, `phase-close-refused-${phase}-${ts}`,
      `PHASE-CLOSURE-REFUSED phase=${phase} verdict=${verdict} reason=${reason}`);
    return { status, stdout: `${verdict} phase=${phase} reason=${reason}\n`, stderr: '' };
  }

  if (!existsSync(phaseDir)) return blocked(`missing=phase-dir(${phaseDir})`);
  const contractPath = path.join(phaseDir, 'adopted-contract.json');
  if (!existsSync(contractPath)) return blocked(`missing=contract(${contractPath})`);
  const evidencePath = ctx.evidenceFile ?? path.join(phaseDir, 'boundary-results.json');

  const statusResult = readCanonicalStatus({ root, statusFile: ctx.statusFile, spawn: ctx.spawn });
  if (statusResult.status !== 0) return blocked('missing=canonical-status(prometheus kbd status failed)');
  const statusJson = statusResult.json;

  // --- evidence presence + JSON validity ---
  if (!existsSync(evidencePath)) return blocked(`evidence-missing(${evidencePath})`);
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  } catch {
    return blocked(`evidence-invalid-json(${evidencePath})`);
  }

  // --- identity binding: phase, run, adopted contract digest ---
  if ((evidence?.phase ?? '') !== phase) {
    return blocked(`evidence-phase-mismatch(evidence=${evidence?.phase ?? ''} gate=${phase})`);
  }
  const canonicalRun = statusJson?.runId ?? '';
  if (!isNonEmptyString(evidence?.runId) || evidence.runId !== canonicalRun) {
    return blocked(`evidence-run-mismatch(evidence=${evidence?.runId ?? ''} canonical=${canonicalRun})`);
  }
  let contract;
  try {
    contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  } catch {
    return blocked(`contract-invalid-json(${contractPath})`);
  }
  const rel = repoRelative(root, contractPath);
  const latest = latestAdoption(statusJson, rel);
  if (latest === 'ambiguous' || latest === null) return blocked(`adoption-missing(${rel})`);
  const currentDigest = contractDigest(contract);
  if (latest.digest !== currentDigest) {
    return blocked(`adoption-stale(decision=${latest.digest} contract=${currentDigest})`);
  }
  if ((evidence?.contractDigest ?? '') !== currentDigest) {
    return blocked(`evidence-contract-digest-mismatch(evidence=${evidence?.contractDigest ?? ''} adopted=${currentDigest})`);
  }

  // --- freshness: recompute digests of the production sources under evidence ---
  const sourceDigests = evidence?.sourceDigests ?? {};
  const entries = Object.entries(sourceDigests);
  if (entries.length === 0) return blocked('evidence-source-digests-missing');
  const stale = [];
  for (const [relPath, digest] of entries) {
    const file = path.join(root, relPath);
    if (!existsSync(file)) { stale.push(`missing(${relPath})`); continue; }
    if (sha256Of(readFileSync(file)) !== digest) stale.push(`stale(${relPath})`);
  }
  if (stale.length > 0) return blocked(`evidence-stale-sources(${stale.join(',')})`);

  // --- entry-level oracle: every adopted scenario present, every entry valid PASS ---
  const required = (contract.scenarioMatrix ?? []).map((s) => s.id);
  const scenarioEntries = Array.isArray(evidence?.scenarios) ? evidence.scenarios : [];
  const missingScenarios = required.filter(
    (id) => !scenarioEntries.some((e) => e?.id === id || String(e?.id ?? '').startsWith(`${id}-`)),
  );
  const emptyEvidence = scenarioEntries.filter(
    (e) => !isNonEmptyString(e?.attempted) || !isNonEmptyString(e?.observed) || !isNonEmptyString(e?.evidence),
  );
  const failedEntries = scenarioEntries.filter((e) => e?.status === 'FAIL');
  const notPass = scenarioEntries.filter((e) => e?.status !== 'PASS' && e?.status !== 'FAIL');

  if (failedEntries.length > 0) {
    return failed(`product-oracle-unmet(${failedEntries.map((e) => e.id).join(',')})`);
  }
  const blockedParts = [
    ...missingScenarios.map((id) => `missing-scenario:${id}`),
    ...emptyEvidence.map((e) => `empty-evidence:${e?.id ?? 'unknown'}`),
  ];
  if (blockedParts.length > 0) return blocked(blockedParts.join(','));
  if (notPass.length > 0) {
    return blocked(notPass.map((e) => `not-pass:${e?.id ?? 'unknown'}(${e?.status ?? 'null'})`).join(','));
  }

  // --- idempotence (only AFTER full validation above): a historical closure authorizes
  // --- ALREADY-CLOSED solely when bound to THIS phase + THIS run + THIS adopted contract
  // --- digest. A different run or a superseded contract cannot inherit a same-phase
  // --- historical PASS; stale/tampered evidence is refused earlier and never reaches here.
  const decisions = Object.values(statusJson?.decisions ?? {});
  const boundClosure = decisions.some((d) =>
    typeof d?.summary === 'string' &&
    d.summary.includes(`PHASE-CLOSED phase=${phase} verdict=PASS`) &&
    d.summary.includes(`run=${canonicalRun}`) &&
    d.summary.includes(`contract=${currentDigest}`));
  if (boundClosure) {
    return {
      status: 0,
      stdout: `ALREADY-CLOSED phase=${phase} run=${canonicalRun} contract=${currentDigest.slice(0, 12)} (bound idempotent no-op; zero new tasks, zero new dispatch)\n`,
      stderr: '',
    };
  }

  // --- budget predicate (declared ceilings vs self-reported consumption). This contract
  // --- declares budgets (checker-enforced), so budget evaluation is required: missing
  // --- accounting is a BLOCKED refusal, never a qualified PASS.
  const budget = budgetPredicate(contract, evidence?.budgetConsumption);
  let budgetNote = '';
  if (budget.outcome === 'missing') {
    return blocked(
      'budget-consumption-missing(contract requires budget evaluation: evidence needs budgetConsumption with source and measured/estimate/unknown classes)',
    );
  }
  if (budget.outcome === 'source-missing') return blocked('evidence-budget-source-missing');
  if (budget.outcome === 'exceeded') {
    return blocked(`budget-exceeded(${budget.hits.join(',')}) ceilings=${JSON.stringify(budget.ceilings)} source=${budget.source}`);
  }
  if (budget.outcome === 'at-ceiling') {
    budgetNote = ` budget-note=allowance-fully-consumed(${budget.hits.join(',')});no-further-work-admitted`;
  }

  // --- close the phase (canonical writer; append-only; no tasks, no successor) ---
  const evidenceDigest = sha256Of(readFileSync(evidencePath));
  const nEntries = scenarioEntries.length;
  const closureSummary =
    `PHASE-CLOSED phase=${phase} verdict=PASS evidence=sha256:${evidenceDigest} ` +
    `contract=${currentDigest} run=${canonicalRun} entries=${nEntries}${budgetNote}`;
  record(`phase-closure-${phase}-${evidenceDigest.slice(0, 8)}`, `phase-close-${phase}-${evidenceDigest.slice(0, 8)}`, closureSummary);
  return {
    status: 0,
    stdout: `CLOSED phase=${phase} verdict=PASS evidence=sha256:${evidenceDigest} entries=${nEntries} (dispatch for this phase now refused)\n`,
    stderr: '',
  };
}
