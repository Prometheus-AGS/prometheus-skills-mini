// Derived closure view for a KBD value phase (VLBV CR-21). Port of the full pack's
// shared/scripts/kbd-closure-packet.mjs (1.15.0).
//
// Written by lib/kbd/phase-close-eval.mjs for every outcome (CLOSED or refused): closure.json and
// closure-packet.md beside the evidence, generated from the bound contract snapshot and
// boundary-results.json. It is a readable *view*; the canonical disposition recorded through
// `prometheus kbd phase close` remains the authority, and writing it never changes a verdict.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../../platform/atomic-write.mjs';
import { sha256Of } from '../adopted-contract.mjs';
import { renderClosurePacket } from './render.mjs';
import { preAuthorizationScan } from './scan.mjs';

function readJson(file) {
  try {
    return file ? JSON.parse(readFileSync(file, 'utf8')) : null;
  } catch {
    return null;
  }
}

function verdictOf(entries, id) {
  const own = entries.filter((e) => e?.id === id || String(e?.id).startsWith(`${id}-`));
  if (own.length === 0) return 'NOT_EXERCISED';
  if (own.some((e) => e.status === 'FAIL')) return 'FAIL';
  if (own.every((e) => e.status === 'PASS')) return 'PASS';
  return own.some((e) => e.status === 'BLOCKED') ? 'BLOCKED' : 'NOT_EXERCISED';
}

function scenarioRows(contract, evidence) {
  const entries = Array.isArray(evidence.scenarios) ? evidence.scenarios : [];
  return (contract.scenarioMatrix ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    actor: s.actor ?? null,
    usefulOutcome: s.usefulOutcome ?? null,
    mandatory: s.mandatory ?? true,
    verdict: verdictOf(entries, s.id),
    limitations: s.limitations ?? [],
    substitutedBoundaries: s.substitutedBoundaries ?? [],
    realCollaborators: s.realCollaborators ?? [],
  }));
}

function methodOf(methodContext, contract) {
  if (!methodContext) return { name: contract.method?.name ?? 'VLBV', source: 'contract', deviation: null };
  return { name: methodContext.selectedMethod, source: methodContext.methodSource ?? null, deviation: methodContext.deviation ?? null };
}

/**
 * Build the closure object (no I/O beyond reading the phase's own derived files and the scan).
 * `input`: { contract, evidence, evidencePath, phaseDir, projectRoot, disposition, reason, now }.
 */
export function buildClosure({ contract = {}, evidence = {}, evidencePath, phaseDir, projectRoot, disposition = 'UNKNOWN', reason = '', now = new Date() }) {
  const rows = scenarioRows(contract, evidence);
  const mandatory = rows.filter((r) => r.mandatory !== false);
  const behaviorAccepted = disposition === 'CLOSED' && mandatory.every((r) => r.verdict === 'PASS');
  const implementationComplete = contract.closure?.implementationComplete ?? contract.status?.implementationComplete ?? false;
  return {
    schemaVersion: 1,
    kind: 'kbd.closure-view',
    generatedAt: now.toISOString(),
    authority: 'derived view; the canonical disposition recorded by prometheus kbd phase close is authoritative',
    phaseId: contract.identity?.phaseId ?? evidence.phase ?? null,
    contractVersion: contract.contractVersion ?? null,
    contractDigest: evidence.contractDigest ?? null,
    evidenceDigest: evidencePath && existsSync(evidencePath) ? sha256Of(readFileSync(evidencePath)) : null,
    disposition,
    reason,
    states: {
      implementationComplete: Boolean(implementationComplete),
      behaviorAccepted,
      releaseEligible: behaviorAccepted && rows.every((r) => r.verdict === 'PASS'),
      releaseAuthorized: Boolean(contract.closure?.releaseAuthorized) && behaviorAccepted,
    },
    method: methodOf(readJson(path.join(phaseDir, 'method-context.json')), contract),
    executedBy: evidence.executedBy ?? null,
    preAuthorizationArtifacts: preAuthorizationScan({ contract, phaseDir, projectRoot }),
    scenarios: rows,
  };
}

/**
 * Write closure.json and closure-packet.md into `phaseDir`. `snapshotPath` is the verified bound
 * contract snapshot. Returns { closure } — callers treat a throw as a visible warning only.
 */
export function writeClosurePacket({ snapshotPath, evidencePath, phaseDir, projectRoot, disposition, reason, now, operatorExit }) {
  const contract = readJson(snapshotPath) ?? {};
  const evidence = readJson(evidencePath) ?? {};
  const closure = buildClosure({ contract, evidence, evidencePath, phaseDir, projectRoot, disposition, reason, now });
  if (operatorExit) {
    closure.operatorExit = operatorExit;
    closure.contractDigest = operatorExit.boundContractDigest;
    for (const row of closure.scenarios) {
      row.verdict = operatorExit.exercised.find((item) => item.id === row.id)?.verdict ?? 'WITHDRAWN';
    }
  }
  mkdirSync(phaseDir, { recursive: true });
  atomicWrite(path.join(phaseDir, 'closure.json'), `${JSON.stringify(closure, null, 2)}\n`);
  atomicWrite(path.join(phaseDir, 'closure-packet.md'), renderClosurePacket(closure, contract.releaseClaim ?? {}));
  return { closure };
}
