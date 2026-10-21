// Deterministic Plan→Execute readiness gate (mini #60). Port of prometheus-skill-pack
// ebc8f687 shared/scripts/kbd-phase-readiness-check.sh.
//
// Read-only against canonical state; never writes success evidence, never fabricates PASS.
// Emits exactly READY or a rejection with the minimal missing/failed list.
//
// Checks (in order; recoverable failures collected):
//   contract   adopted-contract.json exists + passes structural/quality validation
//   identity   contract projectId/runId/phaseId agree with canonical status
//   adoption   latest non-superseded adoption decision for the contract path carries the same
//              digest — mismatch or superseded => REJECT-STALE; absent => BLOCKED (adoption)
//   coverage   every scenarioMatrix ownerTask exists in the phase tasks.json
//
// Statuses: 0 READY; 1 usage/io; 2 BLOCKED (minimal missing list on stdout);
// 3 REJECT-IDENTITY; 4 REJECT-STALE; 5 contract malformed.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  contractDigest,
  latestAdoption,
  legacyContractDigest,
  repoRelative,
  validateAdoptedContract,
} from './adopted-contract.mjs';
import { readDisposition } from './phase-disposition.mjs';
import { findKbdRoot, readCanonicalStatus } from './contract-adopt.mjs';

/**
 * Readiness evaluation. `ctx`: { cwd, phaseDir, contractPath, statusFile, spawn, root }.
 * Never throws — returns { status, stdout, stderr }.
 */
export function phaseReadiness(ctx = {}) {
  const cwd = ctx.cwd ?? process.cwd();
  const root = ctx.root ?? findKbdRoot(cwd);

  let phaseDir = ctx.phaseDir;
  let phase = ctx.phase;
  if (!phaseDir) {
    if (!phase) return { status: 1, stdout: '', stderr: 'usage: --phase <id> or --phase-dir <dir>\n' };
    if (!root) return { status: 1, stdout: '', stderr: `no .kbd-orchestrator above ${cwd}\n` };
    phaseDir = path.join(root, '.kbd-orchestrator', 'phases', phase);
  }
  if (!existsSync(phaseDir)) {
    return { status: 2, stdout: `BLOCKED missing=phase-dir(${phaseDir})\n`, stderr: '' };
  }
  if (!phase) phase = path.basename(phaseDir);
  const contractPath = ctx.contractPath ?? path.join(phaseDir, 'adopted-contract.json');
  const absoluteContract = path.isAbsolute(contractPath) ? contractPath : path.join(cwd, contractPath);

  if (!existsSync(absoluteContract)) {
    return { status: 2, stdout: `BLOCKED missing=contract(${absoluteContract})\n`, stderr: '' };
  }
  let contract;
  try {
    contract = JSON.parse(readFileSync(absoluteContract, 'utf8'));
  } catch {
    return { status: 5, stdout: '', stderr: `MALFORMED contract(${absoluteContract}): not valid JSON\n` };
  }
  const errors = validateAdoptedContract(contract);
  if (errors.length > 0) {
    return { status: 5, stdout: '', stderr: `MALFORMED contract(${absoluteContract}): ${errors.join(',')}\n` };
  }

  const statusResult = readCanonicalStatus({ root: root ?? cwd, statusFile: ctx.statusFile, spawn: ctx.spawn });
  if (statusResult.status !== 0) {
    return { status: 2, stdout: 'BLOCKED missing=canonical-status(prometheus kbd status failed)\n', stderr: '' };
  }
  const statusJson = statusResult.json;

  // --- identity ---
  const identityFail = [];
  if (contract.identity.projectId !== (statusJson?.projectId ?? '')) {
    identityFail.push(`projectId(contract=${contract.identity.projectId} canonical=${statusJson?.projectId ?? ''})`);
  }
  if (contract.identity.runId !== (statusJson?.runId ?? '')) {
    identityFail.push(`runId(contract=${contract.identity.runId} canonical=${statusJson?.runId ?? ''})`);
  }
  if (contract.identity.phaseId !== phase) {
    identityFail.push(`phaseId(contract=${contract.identity.phaseId} gate=${phase})`);
  }
  if (identityFail.length > 0) {
    return { status: 3, stdout: `REJECT-IDENTITY ${identityFail.join(',')}\n`, stderr: '' };
  }

  // --- adoption + staleness (a canonically bound phase is checked against its binding;
  // --- decision text is consulted only for unbound legacy phases) ---
  const rel = root ? repoRelative(root, absoluteContract) : absoluteContract;
  const missing = [];
  let currentDigest = contractDigest(contract);
  const disposition = ctx.dispositionFile || !ctx.statusFile
    ? readDisposition({ root: root ?? cwd, phase, dispositionFile: ctx.dispositionFile, spawn: ctx.spawn })
    : { status: 1 };
  const boundDigest = disposition.status === 0 ? disposition.json.binding?.contractDigest ?? null : null;
  if (boundDigest && boundDigest !== currentDigest) {
    return {
      status: 4,
      stdout:
        `REJECT-STALE contractDigest(bound=${boundDigest} contract=${currentDigest}) — a bound contract changes only ` +
        'through a signed amendment (kbd-contract-adopt.mjs --supersedes --amendment --signature)\n',
      stderr: '',
    };
  }
  const latest = boundDigest ? { digest: currentDigest } : latestAdoption(statusJson, rel);
  if (latest === 'ambiguous') {
    return {
      status: 2,
      stdout: `BLOCKED missing=adoption-unambiguous(multiple non-superseded adoption decisions for ${rel})\n`,
      stderr: '',
    };
  }
  if (latest === null) {
    missing.push(`adoption(no canonical adoption decision for ${rel})`);
  } else if (!boundDigest && latest.digest !== legacyContractDigest(contract)) {
    if (latest.digest !== currentDigest) {
      return {
        status: 4,
        stdout:
          `REJECT-STALE contractDigest(decision=${latest.digest} contract=${currentDigest}) ` +
          `planRevision(decision=${latest.planRevision}) — amend via kbd-contract-adopt.mjs --supersedes\n`,
        stderr: '',
      };
    }
  }

  // --- scenario coverage vs tasks.json ---
  const tasksFile = path.join(phaseDir, 'tasks.json');
  if (existsSync(tasksFile)) {
    let have = [];
    try {
      have = (JSON.parse(readFileSync(tasksFile, 'utf8'))?.tasks ?? []).map((t) => t?.id);
    } catch {
      have = [];
    }
    const uncovered = [];
    for (const scenario of contract.scenarioMatrix) {
      for (const owner of String(scenario.ownerTask).split('+')) {
        if (!have.includes(owner)) uncovered.push(`${scenario.id}:${owner}`);
      }
    }
    if (uncovered.length > 0) missing.push(`coverage(${uncovered.join(',')})`);
  } else {
    missing.push('coverage(tasks.json absent)');
  }

  if (missing.length > 0) {
    return { status: 2, stdout: `BLOCKED missing=${missing.join(',')}\n`, stderr: '' };
  }
  return {
    status: 0,
    stdout: `READY phase=${phase} contract=${rel} digest=${currentDigest ?? 'unknown'} planRevision=${statusJson?.planRevision ?? '?'}\n`,
    stderr: '',
  };
}
