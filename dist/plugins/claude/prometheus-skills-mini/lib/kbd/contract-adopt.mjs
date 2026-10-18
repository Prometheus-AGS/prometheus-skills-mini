// Adoption writer for the mini KBD completion contract (mini #60). Port of
// prometheus-skill-pack ebc8f687 shared/scripts/kbd-contract-adopt.sh.
//
// Canonical writer only: state mutations go through `prometheus kbd decision record`
// (spawned, no shell) — never hand-written journals, waypoints, or signatures. For scratch
// fixtures and tests, `statusFile`/`decisionSink` are the disclosed isolation seams (the
// source's --status-file / KBD_READINESS_STATUS_FILE equivalents).
//
// Exit statuses: 0 adopted/already-adopted; 1 usage/io; 2 invalid contract;
// 3 identity mismatch; 4 amendment without --supersedes (or ambiguous lineage).

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../platform/spawn.mjs';
import { atomicWrite } from '../platform/atomic-write.mjs';
import {
  contractDigest,
  latestAdoption,
  repoRelative,
  validateAdoptedContract,
} from './adopted-contract.mjs';

/** Walk up from `cwd` looking for `.kbd-orchestrator`. Returns null when none found. */
export function findKbdRoot(cwd) {
  let dir = path.resolve(cwd);
  for (;;) {
    if (existsSync(path.join(dir, '.kbd-orchestrator'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Canonical status for `root`: fixture file when given, else the prometheus CLI.
 * Returns { status: 0, json } or { status: 2, stderr } (BLOCKED-class: unavailable writer).
 */
export function readCanonicalStatus({ root, statusFile, spawn = spawnExecutable } = {}) {
  if (statusFile) {
    try {
      return { status: 0, json: JSON.parse(readFileSync(statusFile, 'utf8')) };
    } catch (error) {
      return { status: 2, stderr: `canonical status fixture unreadable: ${error.message}` };
    }
  }
  const result = spawn('prometheus', ['kbd', '--path', root, 'status', '--json']);
  if (result?.status !== 0 || result?.error) {
    return {
      status: 2,
      stderr: 'canonical status unavailable (prometheus kbd status failed — is the canonical writer installed?)',
    };
  }
  try {
    return { status: 0, json: JSON.parse(result.stdout) };
  } catch {
    return { status: 2, stderr: 'canonical status unreadable (prometheus kbd status --json returned non-JSON)' };
  }
}

/** Append a decision through the canonical writer, or to the disclosed sink fixture. */
export function recordDecision({ root, id, commandId, summary, supersedes, decisionSink, spawn = spawnExecutable }) {
  if (decisionSink) {
    // Disclosed fixture seam (scratch isolation): plain append, never canonical state.
    appendFileSync(decisionSink, `${summary}\n`, 'utf8');
    return { status: 0 };
  }
  const args = ['kbd', '--path', root, 'decision', 'record', '--command-id', commandId, '--id', id, '--summary', summary];
  if (supersedes) args.push('--supersedes', supersedes);
  const result = spawn('prometheus', args);
  if (result?.status !== 0 || result?.error) {
    return { status: 1, stderr: `canonical decision record failed: ${result?.stderr ?? result?.error?.message ?? 'unknown'}` };
  }
  return { status: 0 };
}

/**
 * Adopt `contractPath` as the phase's completion contract. Pure orchestration over the
 * helpers above; never throws — returns { status, stdout, stderr }.
 */
export function adoptContract(contractPath, ctx = {}) {
  const fail = (stderr, status = 1) => ({ status, stdout: '', stderr: `kbd-contract-adopt: ${stderr}\n` });
  const cwd = ctx.cwd ?? process.cwd();

  if (!existsSync(contractPath)) return fail(`contract not found: ${contractPath}`);
  const root = findKbdRoot(cwd) ?? (ctx.root ?? null);
  if (!root) return fail(`no .kbd-orchestrator found above ${cwd}`);
  const absolute = path.isAbsolute(contractPath) ? contractPath : path.join(cwd, contractPath);
  const rel = repoRelative(root, absolute);
  if (rel === absolute && !absolute.startsWith(root)) return fail(`contract must live inside the repo (${root})`);

  let contract;
  try {
    contract = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch {
    return fail(`contract is not valid JSON: ${absolute}`, 2);
  }

  const errors = validateAdoptedContract(contract);
  if (errors.length > 0) {
    return fail(`contract fails structural validation:\n${errors.join('\n')}`, 2);
  }

  const phaseId = contract.identity.phaseId;
  const expectedDir = path.join(root, '.kbd-orchestrator', 'phases', phaseId);
  if (path.dirname(absolute) !== expectedDir) {
    return fail(`identity.phaseId=${phaseId} but contract is not at ${expectedDir}`, 3);
  }

  const statusResult = readCanonicalStatus({ root, statusFile: ctx.statusFile, spawn: ctx.spawn });
  if (statusResult.status !== 0) return fail(statusResult.stderr, 1);
  const statusJson = statusResult.json;

  const canonicalProject = statusJson?.projectId ?? '';
  const canonicalRun = statusJson?.runId ?? '';
  const canonicalPlanRevision = statusJson?.planRevision ?? null;
  if (contract.identity.projectId !== canonicalProject) {
    return fail(`identity.projectId mismatch: contract=${contract.identity.projectId} canonical=${canonicalProject}`, 3);
  }
  if (contract.identity.runId !== canonicalRun) {
    return fail(
      `identity.runId mismatch: contract=${contract.identity.runId} canonical=${canonicalRun} (stale run — amend the contract for the active run)`,
      3,
    );
  }

  const digest = contractDigest(contract);

  const latest = latestAdoption(statusJson, rel);
  if (latest === 'ambiguous') {
    return fail(
      `multiple non-superseded adoption decisions for ${rel} — canonical state needs operator adjudication (prometheus kbd conflicts)`,
      4,
    );
  }
  const supersedes = ctx.supersedes ?? null;
  if (latest) {
    if (latest.digest === digest) {
      return {
        status: 0,
        stdout: `ALREADY-ADOPTED path=${rel} sha256=${digest} decision=${latest.id} (idempotent no-op)\n`,
        stderr: '',
      };
    }
    if (!supersedes) {
      return fail(
        `contract changed (digest ${latest.digest} -> ${digest}) but no --supersedes given.\n` +
          `Amendments require explicit operator version-adoption: re-run with --supersedes ${latest.id}`,
        4,
      );
    }
    if (supersedes !== latest.id) {
      return fail(`--supersedes ${supersedes} does not match latest adoption decision ${latest.id}`, 4);
    }
  }

  // Stamp identity.planRevision + identity.contractDigest. Stamping is digest-neutral by
  // construction (both fields are excluded from the digest payload); assert it anyway.
  const stamped = {
    ...contract,
    identity: { ...contract.identity, planRevision: canonicalPlanRevision, contractDigest: digest },
  };
  if (contractDigest(stamped) !== digest) return fail('internal error: stamping changed the digest', 1);
  atomicWrite(absolute, `${JSON.stringify(stamped, null, 2)}\n`);

  const decisionId = `contract-adoption-${phaseId}-${digest.slice(0, 8)}`;
  const commandId = ctx.commandId ?? `contract-adopt-${phaseId}-${digest.slice(0, 8)}`;
  const summary =
    `ADOPTED-CONTRACT path=${rel} sha256=${digest} planRevision=${canonicalPlanRevision} ` +
    `adoptionSource=${contract.adoptionSource} owner=${contract.decisionOwner} ` +
    `scenarios=${contract.scenarioMatrix.map((s) => s.id).join(',')}`;
  const recorded = recordDecision({
    root,
    id: decisionId,
    commandId,
    summary,
    supersedes,
    decisionSink: ctx.decisionSink,
    spawn: ctx.spawn,
  });
  if (recorded.status !== 0) return fail(recorded.stderr, 1);

  return {
    status: 0,
    stdout: `ADOPTED path=${rel} sha256=${digest} planRevision=${canonicalPlanRevision} decision=${decisionId}${supersedes ? ` supersedes=${supersedes}` : ''}\n`,
    stderr: '',
  };
}
