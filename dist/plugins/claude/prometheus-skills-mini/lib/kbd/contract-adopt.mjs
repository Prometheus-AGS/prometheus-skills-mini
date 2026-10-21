// Adoption writer for the mini KBD completion contract (mini #60). Port of
// prometheus-skill-pack ebc8f687 shared/scripts/kbd-contract-adopt.sh.
//
// Canonical writer only: state mutations go through `prometheus kbd decision record`
// (spawned, no shell) — never hand-written journals, waypoints, or signatures. For scratch
// fixtures and tests, `statusFile`/`decisionSink` are the disclosed isolation seams (the
// source's --status-file / KBD_READINESS_STATUS_FILE equivalents).
//
// Exit statuses: 0 adopted/already-adopted; 1 usage/io; 2 invalid contract;
// 3 identity mismatch; 4 amendment without --supersedes or verified signed authority (or
// ambiguous lineage); 5 canonical writer failure.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../platform/spawn.mjs';
import { atomicWrite } from '../platform/atomic-write.mjs';
import {
  contractDigest,
  contractSnapshotBytes,
  latestAdoption,
  legacyContractDigest,
  repoRelative,
  scenarioDigests,
  sha256Of,
  validateAdoptedContract,
} from './adopted-contract.mjs';
import { readDisposition, runPhaseCommand } from './phase-disposition.mjs';

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
 *
 * Mini #66 / full #192: adoption binds the phase in canonical state
 * (`prometheus kbd phase bind-contract`) and writes the byte-exact snapshot
 * `phases/<id>/adopted/<digest>.json`. Once bound, a changed digest is a material amendment
 * that needs `supersedes` plus a signed amend-contract manifest (`amendment` + `signature`),
 * which the runtime verifies. `owner`/`adoptionSource` stay descriptive text, never authority.
 * Exit 4 also covers refused authority; exit 5 is a canonical writer failure.
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
  const legacyDigest = legacyContractDigest(contract);
  const decisionId = `contract-adoption-${phaseId}-${digest.slice(0, 8)}`;
  const disposition = readDisposition({ root, phase: phaseId, dispositionFile: ctx.dispositionFile, spawn: ctx.spawn });
  if (disposition.status !== 0) return fail(disposition.stderr, 1);
  const binding = disposition.json.binding ?? null;
  const snapshot = path.join(expectedDir, 'adopted', `${digest}.json`);
  const writeSnapshot = () => {
    const bytes = contractSnapshotBytes(contract);
    if (sha256Of(bytes) !== digest) throw new Error('internal error: snapshot digest mismatch');
    mkdirSync(path.dirname(snapshot), { recursive: true });
    atomicWrite(snapshot, bytes);
  };

  if (binding?.contractDigest === digest) {
    if (!existsSync(snapshot)) writeSnapshot();
    return {
      status: 0,
      stdout: `ALREADY-ADOPTED path=${rel} sha256=${digest} decision=${binding.adoptionDecisionId} bound=revision-${binding.bindingRevision} (idempotent no-op)\n`,
      stderr: '',
    };
  }
  const supersedes = ctx.supersedes ?? null;
  if (binding && (!supersedes || !ctx.amendment || !ctx.signature)) {
    return fail(
      `bound contract changed (digest ${binding.contractDigest} -> ${digest}).\n` +
        'A material amendment requires --supersedes <decision> --amendment <manifest> --signature <sig>.\n' +
        `Generate the manifest with: node scripts/kbd-scope-authority-template.mjs amend-contract --phase ${phaseId} --contract ${rel}`,
      4,
    );
  }

  const latest = latestAdoption(statusJson, rel);
  if (latest === 'ambiguous') {
    return fail(
      `multiple non-superseded adoption decisions for ${rel} — canonical state needs operator adjudication (prometheus kbd conflicts)`,
      4,
    );
  }
  let legacyMatch = false;
  if (latest) {
    if (latest.digest === digest || latest.digest === legacyDigest) {
      legacyMatch = true;
    } else if (!binding) {
      return fail(
        `contract differs from its unbound text adoption (${latest.digest} -> ${digest}).\n` +
          'Restore the adopted content and re-run to bind it, then amend with a signed manifest.',
        4,
      );
    } else if (!supersedes) {
      return fail(
        `contract changed (digest ${latest.digest} -> ${digest}) but no --supersedes given.\n` +
          `Amendments require explicit operator version-adoption: re-run with --supersedes ${latest.id}`,
        4,
      );
    } else if (supersedes !== latest.id) {
      return fail(`--supersedes ${supersedes} does not match latest adoption decision ${latest.id}`, 4);
    }
  }

  // Canonical binding first (authoritative), then the compatibility decision, then the
  // digest-neutral stamp of the working file — never the file before canonical success.
  writeSnapshot();
  const bindArgs = ['bind-contract', '--id', phaseId, '--contract-path', rel, '--contract-digest', digest,
    '--plan-revision', String(canonicalPlanRevision ?? 0), '--adoption-decision', decisionId,
    ...Object.entries(scenarioDigests(contract)).flatMap(([id, d]) => ['--scenario-digest', `${id}=${d}`])];
  if (binding) bindArgs.push('--amendment', ctx.amendment, '--signature', ctx.signature);
  // The disclosed decision-sink seam records the bind it would perform; it never writes
  // canonical state (fixture isolation only).
  const bound = ctx.decisionSink
    ? (appendFileSync(ctx.decisionSink, `PHASE-BIND ${bindArgs.join(' ')}\n`, 'utf8'), { status: 0, stdout: '', stderr: '' })
    : runPhaseCommand({ root, args: bindArgs, spawn: ctx.spawn });
  if (bound.status !== 0) {
    return fail(`canonical binding refused (exit ${bound.status}): ${bound.stdout}${bound.stderr}`.trim(), bound.status === 7 ? 4 : 5);
  }
  if (legacyMatch) {
    return {
      status: 0,
      stdout: `ALREADY-ADOPTED path=${rel} sha256=${digest} decision=${latest.id} bound=revision-1 (text adoption upgraded to canonical binding)\n`,
      stderr: '',
    };
  }

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
  if (recorded.status !== 0) return fail(`${recorded.stderr} (binding is authoritative and was recorded)`, 5);

  // Stamp identity.planRevision + identity.contractDigest. Stamping is digest-neutral by
  // construction (both fields are excluded from the digest payload); assert it anyway.
  const stamped = {
    ...contract,
    identity: { ...contract.identity, planRevision: canonicalPlanRevision, contractDigest: digest },
  };
  if (contractDigest(stamped) !== digest) return fail('internal error: stamping changed the digest', 1);
  atomicWrite(absolute, `${JSON.stringify(stamped, null, 2)}\n`);

  const after = readDisposition({ root, phase: phaseId, dispositionFile: ctx.dispositionFile, spawn: ctx.spawn });
  const revision = after.status === 0 ? after.json.binding?.bindingRevision ?? '?' : '?';
  return {
    status: 0,
    stdout: `ADOPTED path=${rel} sha256=${digest} planRevision=${canonicalPlanRevision} decision=${decisionId} bound=revision-${revision}${supersedes ? ` supersedes=${supersedes}` : ''}\n`,
    stderr: '',
  };
}
