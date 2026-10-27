// Read-only discovery of the selected KBD method and the authority a session needs to recover.
// Port of the full pack's shared/method-context.mjs (kbd-195). The output is a derived index:
// canonical signed decisions, the phase binding, the adopted contract and governing host
// policy remain the authority. Nothing here runs generated-code verification, selects a method,
// edits the contract, retries an effect or changes canonical state.
//
// Unlike the full pack, canonical status is optional: with no `prometheus` CLI the index is
// still produced from project files, but every canonical fact is reported unresolved (BLOCKED),
// never guessed from memory, a stored command or an old receipt.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { computeCeilings, contractDigest } from '../adopted-contract.mjs';
import {
  fileReference, ownedPath, phaseDirectory, posix, projectionPhaseDirectory, safeMethodName, safeReferencePath,
} from './paths.mjs';

const METHOD_PREFIX = 'KBD-METHOD ';
const GOVERNING_FILES = ['AGENTS.md', 'CLAUDE.md', '.kbd-orchestrator/constraints.md', '.claude/rules/rust.md', '.claude/rules/typescript.md'];
const COMPILER_EXCEPTION = /compiler.{0,100}(exception|unblock)|(?:narrow|targeted|intermediate|package-scoped).{0,60}compiler check/is;
const MANAGED_REGION = /<!-- prometheus-mini-context:start v1 -->[\s\S]*?<!-- prometheus-mini-context:end -->/g;
const isComplete = (status) => ['complete', 'completed', 'done', 'cancelled', 'skipped'].includes(String(status).toLowerCase());

const PRESERVE = [
  'latest non-superseded method decision and retiredMethods; old commands/memory are context only',
  'original contract snapshots, evidence and source/build/configuration/fixture/assertion identity',
  'all budget consumption/high-water marks, including UNKNOWN prior usage; never reset on recovery',
  'unresolved effects and cleanup/receipt obligations; reconcile uncertain effects before retry',
];

function readContract(root, contractPath, blockers) {
  const reference = fileReference(root, contractPath);
  if (reference.observation !== 'observed') {
    blockers.push('adopted contract unavailable');
    return { reference, contract: null, digest: null };
  }
  try {
    const contract = JSON.parse(readFileSync(ownedPath(root, contractPath), 'utf8'));
    return { reference, contract, digest: contractDigest(contract) };
  } catch {
    blockers.push('adopted contract unreadable');
    return { reference, contract: null, digest: null };
  }
}

function checkBinding({ contract, digest, state, phaseId, binding }, blockers) {
  if (!contract) return;
  if (!state) {
    blockers.push('canonical status unavailable: contract identity and phase binding unverified');
    return;
  }
  const identity = contract.identity ?? {};
  if (identity.projectId !== state.projectId || identity.runId !== state.runId || identity.phaseId !== phaseId) {
    blockers.push('contract identity differs from canonical phase');
  }
  if (!binding || binding.contractDigest !== digest) blockers.push('contract missing canonical binding or changed since adoption');
}

// KBD-METHOD is a compact payload in the existing signed decision surface, not a new ledger.
function currentSelection({ state, phaseId, digest }, blockers) {
  if (!state) {
    blockers.push('canonical status unavailable: selected method and latest supersession unresolved');
    return null;
  }
  const decisions = Object.values(state.decisions ?? {});
  const retired = new Set(decisions.map((item) => item.supersedes).filter(Boolean));
  const matches = [];
  for (const decision of decisions) {
    if (retired.has(decision.id) || typeof decision.summary !== 'string' || !decision.summary.startsWith(METHOD_PREFIX)) continue;
    let selection;
    try { selection = JSON.parse(decision.summary.slice(METHOD_PREFIX.length)); } catch { continue; }
    if (selection && typeof selection === 'object' && selection.phaseId === phaseId && selection.contractDigest === digest) {
      matches.push({ decision, selection });
    }
  }
  if (matches.length !== 1) {
    blockers.push(matches.length ? 'multiple current selected-method decisions' : 'no current contract-bound selected-method decision');
    return null;
  }
  return matches[0];
}

function methodReferences(root, selected, blockers) {
  const raw = selected?.selection.references ?? [];
  if (!Array.isArray(raw)) {
    blockers.push('selected method references are not a list');
    return [];
  }
  return raw.flatMap((expected) => {
    if (!expected || !safeReferencePath(expected.path) || !/^[a-f0-9]{64}$/.test(expected.sha256 ?? '')) {
      blockers.push('selected method reference is not a safe project-relative path with SHA-256');
      return [];
    }
    const actual = fileReference(root, expected.path);
    const matches = actual.sha256 === expected.sha256;
    if (!matches) blockers.push(`selected method reference changed or missing: ${expected.path}`);
    return [{ ...actual, expectedSha256: expected.sha256, matches }];
  });
}

// The pack's own managed block already carries the VLBV carve-out, so only operator prose is scanned.
function policyConflicts(root, method, governing) {
  if (method !== 'VLBV') return [];
  return governing.filter((item) => item.observation === 'observed').flatMap((item) => {
    const prose = readFileSync(ownedPath(root, item.path), 'utf8').replace(MANAGED_REGION, '');
    return COMPILER_EXCEPTION.test(prose)
      ? [{ path: item.path, issue: 'Host compiler exception may conflict with selected VLBV; do not infer permission to run generated-code checks during generation.' }]
      : [];
  });
}

function resolveTarget(root, { state, phase, fallbackPhasePath }) {
  if (state) {
    const phaseId = phase ?? state.activePath?.phaseId;
    if (!phaseId || !state.phases?.[phaseId]) throw new Error('method context needs a resolvable canonical phase');
    return { phaseId, directory: phaseDirectory(root, state, phaseId) };
  }
  const segments = phase ? phase.split('::') : fallbackPhasePath ?? [];
  if (!segments.length) throw new Error('method context needs a resolvable phase');
  return { phaseId: segments.join('::'), directory: projectionPhaseDirectory(root, segments) };
}

/**
 * Discover the recovery index for one phase. `status` and `disposition` are canonical reads the
 * caller already made (null when the runtime is unavailable); `fallbackPhasePath` names the
 * phase from the waypoint projection in that case.
 */
export function discoverMethodContext({ project = process.cwd(), phase, status = null, disposition = null, fallbackPhasePath, now = new Date() } = {}) {
  const root = realpathSync(project);
  if (!existsSync(path.join(root, '.kbd-orchestrator'))) throw new Error('project has no existing KBD context; discovery does not initialize one');
  const state = status;
  const { phaseId, directory } = resolveTarget(root, { state, phase, fallbackPhasePath });
  const relativeDirectory = posix(path.relative(root, directory));
  const blockers = [];
  const { reference, contract, digest } = readContract(root, `${relativeDirectory}/adopted-contract.json`, blockers);
  const binding = disposition?.binding ?? null;
  checkBinding({ contract, digest, state, phaseId, binding }, blockers);

  const selected = currentSelection({ state, phaseId, digest }, blockers);
  const rawMethod = selected?.selection.method ?? 'UNKNOWN';
  const method = selected && !safeMethodName(rawMethod) ? 'UNKNOWN' : rawMethod;
  if (selected && method === 'UNKNOWN') blockers.push('selected method name is not a short plain label');
  const references = methodReferences(root, selected, blockers);

  const governing = GOVERNING_FILES.map((file) => fileReference(root, file));
  const changes = Object.values(state?.phases?.[phaseId]?.changes ?? {});
  const implementationComplete = changes.length > 0 && changes.every((change) => isComplete(change.implementationStatus ?? change.status));
  const stage = state?.activePath?.phaseId === phaseId ? state.activePath.stageId ?? null : null;
  const consumption = state?.phaseClosure?.phases?.[phaseId]?.consumptionHighWater
    ?? 'UNKNOWN; recover original canonical/evidence receipts before execution';

  return {
    schemaVersion: 1, kind: 'kbd.derived-method-context', generatedAt: now.toISOString(),
    authority: 'derived-read-only-index; canonical signed decisions, phase binding, contract and governing host policy remain authority',
    projectId: state?.projectId ?? null, runId: state?.runId ?? null, phaseId, sourceRevision: state?.revision ?? null,
    canonicalSource: state ? 'prometheus kbd status --json' : 'unavailable',
    phaseDirectory: relativeDirectory,
    contract: { ...reference, contractDigest: digest, binding, identity: contract?.identity ?? null, planRevision: contract?.identity?.planRevision ?? null },
    selectedMethod: method, methodDecision: selected?.decision ?? null,
    supersession: { currentDecisionId: selected?.decision.id ?? null, supersedes: selected?.decision.supersedes ?? null, retiredMethods: selected?.selection.retiredMethods ?? [] },
    retiredMethods: selected?.selection.retiredMethods ?? [], references,
    includedValue: contract?.functionalScope ?? [], exclusions: contract?.exclusions ?? [],
    stage,
    stageAuthority: {
      operations: stage === 'execute' ? ['author agreed production without generated-code verification'] : ['discover/define/plan within governing policy'],
      implementationComplete,
      verificationAuthority: 'separately authorized whole-value-phase boundary required; this index grants none',
      executableTestAuthoring: 'governed by host policy; where that policy is production-first, defer until the complete agreed production work',
    },
    governingInstructions: governing, policyConflicts: policyConflicts(root, method, governing),
    candidateAndEvidence: { freshness: contract?.evidenceInvalidation ?? 'UNKNOWN', paths: contract?.boundaryPacket?.receipts ?? [] },
    budgets: { adopted: contract?.budgets ?? null, ceilings: contract ? computeCeilings(contract.budgets) : null, consumption },
    unresolved: {
      boundaryObligations: state?.boundaryObligations ?? {},
      blockers: Object.values(state?.blockers ?? {}).filter((item) => !item.resolved),
      instruction: 'Unknown side effects require reconciliation before retry, not a fresh attempt assumption.',
    },
    preserve: PRESERVE,
    hostCapabilities: {
      platform: process.platform, nodeVersion: process.version,
      observedInterfaces: state ? ['canonical status', 'typed phase disposition', 'project-owned file identity'] : ['project-owned file identity'],
      executionInterception: 'not provided by this helper', commandInventoryIsPermission: false,
    },
    control: {
      mode: 'instruction-only', observed: ['canonical references and file identities'],
      enforced: ['only named existing signed runtime mutations; no generic shell/tool interception claimed'],
      unsupported: ['universal model obedience or arbitrary tool interception'],
    },
    status: blockers.length ? 'BLOCKED' : 'RESOLVED_REFERENCES', blockers,
  };
}
