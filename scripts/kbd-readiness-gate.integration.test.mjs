// Boundary integration test for the mini KBD phase completion contract (mini #60/#59).
// Port of prometheus-skill-pack ebc8f687 shared/scripts/tests/test-kbd-readiness-gate.sh,
// adapted to mini's Node entry points.
//
// Real entry points under test:
//   scripts/kbd-contract-adopt.mjs          (canonical adoption writer — spawned)
//   scripts/kbd-phase-readiness-check.mjs   (READY/BLOCKED checker — spawned)
//   scripts/kbd-phase-close-eval.mjs        (terminal evaluator — spawned)
//   lib/kbd/stage-gate.mjs stageGate        (the real Plan→Execute transition the
//                                            kbd-execute/kbd-plan skills call — imported)
//   scripts/kbd-next-phase.mjs              (successor-phase driver — spawned)
//
// Isolation (disclosed fixture overrides): every run targets a scratch root under the
// platform temp dir; canonical status comes from a --status-file fixture and decisions
// append to a --decision-sink file. The fixture bridge replicates exactly what the
// canonical writer persists (decision id + summary + supersedes), nothing more. No
// prometheus CLI, no canonical state, no services are touched.

// Mini #66 / full #192: closure is now a typed canonical disposition, not decision text. The
// cases that asserted closure, idempotent replay, refusal recording, budget boundaries,
// amendments and closed-phase dispatch through this file's decision-text fixture bridge
// (BG-01, -02, -05, -07..-13, -15, -16, -18) are covered against the real runtime by
// scripts/kbd-phase-closure.conformance.test.mjs (shared corpus, cases 01-17). The remaining
// cases here exercise readiness and continuation paths that do not depend on closure text.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';
import { stageGate, stageHandoffWrite } from '../lib/kbd/stage-gate.mjs';
import { contractDigest, sha256Of } from '../lib/kbd/adopted-contract.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const PHASE = 'phase-x';
const REL = `.kbd-orchestrator/phases/${PHASE}/adopted-contract.json`;

const script = (name) => path.join(repoRoot, 'scripts', name);
const runScript = (name, args, cwd) =>
  spawnExecutable(process.execPath, [script(name), ...args], { cwd, env: { ...process.env } });

const scratch = () => {
  // realpathSync: spawned children resolve the macOS /var -> /private/var symlink; the
  // adoption writer's phase-dir location check compares absolute paths, so the scratch
  // root must be canonicalized before any path is handed to a spawned CLI.
  const root = realpathSync(mkdtempSync(path.join(tempDir(), 'kbd-boundary-')));
  mkdirSync(path.join(root, '.kbd-orchestrator', 'phases', PHASE), { recursive: true });
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const makeContract = (overrides = {}) => ({
  contractVersion: '1',
  kind: 'kbd.adopted-contract',
  identity: { projectId: 'p', runId: 'r', phaseId: PHASE, planRevision: null, contractDigest: null },
  digestNormalization: {
    algorithm: 'sha256',
    command: 'lib/kbd/adopted-contract.mjs: sha256(stableStringify(digestPayload(contract)))',
    stalenessRule: 'STALE iff latest non-superseded adoption digest != recomputed digest',
  },
  adoptionSource: 'operator instruction (integration fixture)',
  decisionOwner: 'tester',
  amendmentPolicy: 'amendments via --supersedes only',
  releaseClaim: {
    userOperation: 'adopt and verify a finite phase contract',
    supportedEnvironments: ['node>=22'],
    currentCapabilities: 'integration capability statement',
    explicitUnknowns: [],
  },
  statusVocabulary: ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXERCISED'],
  scenarioMatrix: [
    { id: 'MC-1', name: 'x', ownerTask: 'T1', productionEntry: 'node scripts/x.mjs', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' },
  ],
  functionalScope: ['MC-1'],
  resilienceScope: { policy: 'adopted never defers', deferredOptional: [] },
  exclusions: ['out of scope item'],
  requiredSafetyChecks: ['canonical writer only'],
  budgets: {
    timeMinutes: 10, toolCalls: 10, repairAttempts: 2, noProgressLimit: 2,
    tokenBudget: 'UNKNOWN', tokenFallback: 'time+toolCalls bounds', exhaustion: 'checkpoint + BLOCKED',
  },
  evidenceInvalidation: 'digest-keyed',
  workerRoutes: { agent: 'main', model: 'test-model' },
  boundaryPacket: {
    postImplementationOnly: true, singleRun: true, commands: ['node --test'],
    expectedEffects: [], requiredApprovals: 'none', receipts: [], cleanup: [],
    stopConditions: ['budgets exhausted'],
  },
  status: { implementationComplete: true },
  ...overrides,
});

/** Canonical-status fixture bridge: mirrors what the canonical writer persists. */
const writeStatus = (root, decisions = {}, extra = {}) => {
  const statusFile = path.join(root, 'status-fixture.json');
  writeFileSync(statusFile, JSON.stringify({ projectId: 'p', runId: 'r', planRevision: 1, decisions, ...extra }));
  return statusFile;
};

/** Adopt via the real CLI; returns { digest, decisionId, statusFile(with adoption), sink }. */
const adoptViaCli = (root, contract, { supersedes = null, priorDecisions = {} } = {}) => {
  const phaseDir = path.join(root, '.kbd-orchestrator', 'phases', PHASE);
  const contractPath = path.join(phaseDir, 'adopted-contract.json');
  writeFileSync(contractPath, JSON.stringify(contract, null, 2));
  const statusFile = writeStatus(root, priorDecisions);
  const sink = path.join(root, 'decisions.log');
  const args = [contractPath, '--status-file', statusFile, '--decision-sink', sink];
  if (supersedes) args.push('--supersedes', supersedes);
  const result = runScript('kbd-contract-adopt.mjs', args, root);
  return { result, contractPath, statusFile, sink };
};

const adoptionDecisionEntry = (contract, supersedes = null) => {
  const digest = contractDigest(contract);
  const id = `contract-adoption-${PHASE}-${digest.slice(0, 8)}`;
  return [id, {
    id,
    summary: `ADOPTED-CONTRACT path=${REL} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC-1`,
    planRevision: 1,
    supersedes,
  }];
};

/** Closeable fixture: adopted contract (in status fixture) + production source + evidence. */
const closeableFixture = (root, { contract = makeContract(), evidence = {}, sourceContents = '// production code\n' } = {}) => {
  const phaseDir = path.join(root, '.kbd-orchestrator', 'phases', PHASE);
  writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(contract, null, 2));
  const digest = contractDigest(contract);
  const sourceFile = path.join(root, 'src/production.mjs');
  mkdirSync(path.dirname(sourceFile), { recursive: true });
  writeFileSync(sourceFile, sourceContents);
  const evidenceDoc = {
    phase: PHASE,
    runId: 'r',
    contractDigest: digest,
    sourceDigests: { 'src/production.mjs': sha256Of(readFileSync(sourceFile)) },
    scenarios: [{ id: 'MC-1', status: 'PASS', attempted: 'ran the entry point', observed: 'oracle met', evidence: 'log line' }],
    budgetConsumption: {
      source: 'self-reported integration accounting (not independent telemetry)',
      values: {
        timeMinutes: { value: 5, class: 'estimate' },
        toolCalls: { value: 5, class: 'measured' },
        repairAttempts: { value: 0, class: 'measured' },
        noProgress: { value: 0, class: 'measured' },
      },
    },
    ...evidence,
  };
  writeFileSync(path.join(phaseDir, 'boundary-results.json'), JSON.stringify(evidenceDoc, null, 2));
  const [id, decision] = adoptionDecisionEntry(contract);
  const statusFile = writeStatus(root, { [id]: decision });
  const sink = path.join(root, 'decisions.log');
  return { phaseDir, statusFile, sink, digest, sourceFile };
};

const closeEval = (root, f, extra = []) =>
  runScript('kbd-phase-close-eval.mjs', ['--phase', PHASE, '--status-file', f.statusFile, '--decision-sink', f.sink, ...extra], root);

const passIdentity = (digest) => ({
  projectId: 'p', runId: 'r', phaseId: PHASE, planRevision: 1, contractDigest: digest,
});

// ---------------------------------------------------------------------------
// Valid progression: adopt (real CLI) -> READY (real CLI) -> gate passes -> CLOSED
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Missing mandatory criteria
// ---------------------------------------------------------------------------

test('BG-03 missing adoption: readiness BLOCKED with the minimal missing list', () => {
  const s = scratch();
  try {
    const phaseDir = path.join(s.root, '.kbd-orchestrator', 'phases', PHASE);
    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(makeContract(), null, 2));
    writeFileSync(path.join(phaseDir, 'tasks.json'), JSON.stringify({ tasks: [{ id: 'T1' }] }));
    const statusFile = writeStatus(s.root, {});

    const result = runScript('kbd-phase-readiness-check.mjs', ['--phase', PHASE, '--status-file', statusFile], s.root);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /BLOCKED missing=adoption/);

    // Negative control: same fixture WITH the adoption decision is not BLOCKED.
    const [id, decision] = adoptionDecisionEntry(makeContract());
    writeStatus(s.root, { [id]: decision });
    const control = runScript('kbd-phase-readiness-check.mjs', ['--phase', PHASE, '--status-file', statusFile], s.root);
    assert.equal(control.status, 0, control.stdout + control.stderr);
  } finally {
    s.dispose();
  }
});

test('BG-04 missing coverage: scenario ownerTask absent from tasks.json blocks readiness', () => {
  const s = scratch();
  try {
    const phaseDir = path.join(s.root, '.kbd-orchestrator', 'phases', PHASE);
    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(makeContract(), null, 2));
    writeFileSync(path.join(phaseDir, 'tasks.json'), JSON.stringify({ tasks: [{ id: 'OTHER' }] }));
    const [id, decision] = adoptionDecisionEntry(makeContract());
    const statusFile = writeStatus(s.root, { [id]: decision });

    const result = runScript('kbd-phase-readiness-check.mjs', ['--phase', PHASE, '--status-file', statusFile], s.root);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /BLOCKED missing=coverage\(MC-1:T1\)/);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Stale / wrong identity
// ---------------------------------------------------------------------------

test('BG-06 REJECT-IDENTITY: contract identity disagrees with canonical status', () => {
  const s = scratch();
  try {
    const phaseDir = path.join(s.root, '.kbd-orchestrator', 'phases', PHASE);
    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(makeContract(), null, 2));
    const statusFile = writeStatus(s.root, {}, { projectId: 'different-project' });
    const result = runScript('kbd-phase-readiness-check.mjs', ['--phase', PHASE, '--status-file', statusFile], s.root);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /REJECT-IDENTITY projectId/);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Amendment lineage (real CLI)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Failed / missing evidence at the terminal evaluator
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Budget accounting
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Guard status 2 at the REAL Plan→Execute transition (guard failure != success)
// ---------------------------------------------------------------------------

test('BG-14 guard status 2: execute blocked when readiness is BLOCKED (adoption missing)', () => {
  const s = scratch();
  try {
    const phaseDir = path.join(s.root, '.kbd-orchestrator', 'phases', PHASE);
    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(makeContract(), null, 2));
    writeFileSync(path.join(phaseDir, 'tasks.json'), JSON.stringify({ tasks: [{ id: 'T1' }] }));
    const statusFile = writeStatus(s.root, {}); // no adoption
    stageHandoffWrite('plan', 'plan ready', { phaseDir, identity: passIdentity(contractDigest(makeContract())) });

    const gate = stageGate('execute', { phaseDir, statusFile, env: {} });
    assert.equal(gate.status, 2);
    assert.match(gate.stderr, /readiness validation failed/);
    // A blocked gate produces no handoff, no dispatch artifact.
    assert.equal(existsSync(path.join(phaseDir, 'handoffs', 'execute.handoff.json')), false);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Unresolved critical findings cannot produce a successful closure (mini #59)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// No unauthorized successor phase (mini #59)
// ---------------------------------------------------------------------------

test('BG-17 next-phase refuses an unauthorized successor (no completed reflection)', () => {
  const s = scratch();
  try {
    writeFileSync(
      path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'),
      JSON.stringify({ phase: PHASE, stage: 'executing' }),
    );
    const result = runScript('kbd-next-phase.mjs', ['phase-successor'], s.root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not a recognized reflection-complete state/);
    assert.equal(existsSync(path.join(s.root, '.kbd-orchestrator', 'phases', 'phase-successor')), false);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Idempotent re-adoption (real CLI)
// ---------------------------------------------------------------------------

