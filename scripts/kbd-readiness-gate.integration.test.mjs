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

test('BG-01 valid progression: real adoption, READY gate transition, truthful closure', () => {
  const s = scratch();
  try {
    const contract = makeContract();
    const { result: adopt, statusFile, sink } = adoptViaCli(s.root, contract);
    assert.equal(adopt.status, 0, adopt.stderr);
    assert.match(adopt.stdout, /^ADOPTED /);
    const digest = contractDigest(contract);
    assert.match(readFileSync(sink, 'utf8'), new RegExp(`ADOPTED-CONTRACT path=${REL.replace(/\//g, '\\/')} sha256=${digest}`));

    // Bridge: the canonical writer would now persist the adoption decision.
    const [id, decision] = adoptionDecisionEntry(contract);
    writeStatus(s.root, { [id]: decision });

    // tasks.json coverage for MC-1's ownerTask.
    writeFileSync(
      path.join(s.root, '.kbd-orchestrator', 'phases', PHASE, 'tasks.json'),
      JSON.stringify({ tasks: [{ id: 'T1' }] }),
    );

    const readiness = runScript('kbd-phase-readiness-check.mjs', ['--phase', PHASE, '--status-file', statusFile], s.root);
    assert.equal(readiness.status, 0, readiness.stdout + readiness.stderr);
    assert.match(readiness.stdout, /^READY phase=phase-x /);

    // The REAL Plan→Execute transition: identity-bound plan handoff passes.
    const phaseDir = path.join(s.root, '.kbd-orchestrator', 'phases', PHASE);
    stageHandoffWrite('plan', 'plan ready', { phaseDir, identity: passIdentity(digest) });
    const gate = stageGate('execute', { phaseDir, statusFile, env: {} });
    assert.equal(gate.status, 0, gate.stderr);
  } finally {
    s.dispose();
  }
});

test('BG-02 valid closure: close-eval records PHASE-CLOSED; replay is ALREADY-CLOSED', () => {
  const s = scratch();
  try {
    const f = closeableFixture(s.root);
    const first = closeEval(s.root, f);
    assert.equal(first.status, 0, first.stdout);
    assert.match(first.stdout, /^CLOSED phase=phase-x verdict=PASS/);
    const closureLine = readFileSync(f.sink, 'utf8').trim();
    assert.match(closureLine, /PHASE-CLOSED phase=phase-x verdict=PASS/);

    // Idempotent replay: bridge the closure decision into canonical state, re-run.
    const closureId = `phase-closure-${PHASE}-replay`;
    const status = JSON.parse(readFileSync(f.statusFile, 'utf8'));
    status.decisions[closureId] = { id: closureId, summary: closureLine };
    writeFileSync(f.statusFile, JSON.stringify(status));
    rmSync(f.sink);
    const replay = closeEval(s.root, f);
    assert.equal(replay.status, 0, replay.stdout);
    assert.match(replay.stdout, /ALREADY-CLOSED/);
    assert.equal(existsSync(f.sink), false); // zero new records on replay
  } finally {
    s.dispose();
  }
});

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

test('BG-05 REJECT-STALE: amended contract bytes without an adoption amendment', () => {
  const s = scratch();
  try {
    const { result: adopt, statusFile } = adoptViaCli(s.root, makeContract());
    assert.equal(adopt.status, 0, adopt.stderr);
    const [id, decision] = adoptionDecisionEntry(makeContract());
    writeStatus(s.root, { [id]: decision });
    writeFileSync(
      path.join(s.root, '.kbd-orchestrator', 'phases', PHASE, 'tasks.json'),
      JSON.stringify({ tasks: [{ id: 'T1' }] }),
    );
    // Amend bytes in place (unauthorized): the digest no longer matches the decision.
    writeFileSync(
      path.join(s.root, '.kbd-orchestrator', 'phases', PHASE, 'adopted-contract.json'),
      JSON.stringify(makeContract({ adoptionSource: 'tampered' }), null, 2),
    );
    const result = runScript('kbd-phase-readiness-check.mjs', ['--phase', PHASE, '--status-file', statusFile], s.root);
    assert.equal(result.status, 4);
    assert.match(result.stdout, /REJECT-STALE/);
  } finally {
    s.dispose();
  }
});

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

test('BG-07 wrong-run evidence cannot close (evidence-run-mismatch)', () => {
  const s = scratch();
  try {
    const f = closeableFixture(s.root, { evidence: { runId: 'older-run' } });
    const result = closeEval(s.root, f);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /evidence-run-mismatch/);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Amendment lineage (real CLI)
// ---------------------------------------------------------------------------

test('BG-08 amendment: unauthorized change refused (exit 4); --supersedes records lineage', () => {
  const s = scratch();
  try {
    const original = makeContract();
    const first = adoptViaCli(s.root, original);
    assert.equal(first.result.status, 0, first.result.stderr);
    const [firstId] = adoptionDecisionEntry(original);

    // Amendment without --supersedes: refused, zero NEW writes to the sink.
    const amended = makeContract({ adoptionSource: 'amended source (operator v2)' });
    const sinkBefore = readFileSync(first.sink, 'utf8');
    const unauthorized = adoptViaCli(s.root, amended, { priorDecisions: { [firstId]: adoptionDecisionEntry(original)[1] } });
    assert.equal(unauthorized.result.status, 4);
    assert.match(unauthorized.result.stderr, /no --supersedes given/);
    assert.equal(readFileSync(unauthorized.sink, 'utf8'), sinkBefore);

    // Authorized amendment: supersedes the live decision.
    const authorized = adoptViaCli(s.root, amended, {
      supersedes: firstId,
      priorDecisions: { [firstId]: adoptionDecisionEntry(original)[1] },
    });
    assert.equal(authorized.result.status, 0, authorized.result.stderr);
    assert.match(authorized.result.stdout, new RegExp(`supersedes=${firstId}`));

    // Readiness with the amended chain: the new live adoption governs.
    const [secondId, secondDecision] = adoptionDecisionEntry(amended, firstId);
    const statusFile = writeStatus(s.root, {
      [firstId]: adoptionDecisionEntry(original)[1],
      [secondId]: secondDecision,
    });
    writeFileSync(
      path.join(s.root, '.kbd-orchestrator', 'phases', PHASE, 'tasks.json'),
      JSON.stringify({ tasks: [{ id: 'T1' }] }),
    );
    const readiness = runScript('kbd-phase-readiness-check.mjs', ['--phase', PHASE, '--status-file', statusFile], s.root);
    assert.equal(readiness.status, 0, readiness.stdout + readiness.stderr);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Failed / missing evidence at the terminal evaluator
// ---------------------------------------------------------------------------

test('BG-09 failed oracle: FAIL refusal (exit 3), never closes', () => {
  const s = scratch();
  try {
    const f = closeableFixture(s.root, {
      evidence: { scenarios: [{ id: 'MC-1', status: 'FAIL', attempted: 'ran it', observed: 'oracle unmet', evidence: 'log' }] },
    });
    const result = closeEval(s.root, f);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /product-oracle-unmet\(MC-1\)/);
    const sink = readFileSync(f.sink, 'utf8');
    assert.match(sink, /PHASE-CLOSURE-REFUSED phase=phase-x verdict=FAIL/);
    assert.doesNotMatch(sink, /PHASE-CLOSED/);
  } finally {
    s.dispose();
  }
});

test('BG-10 missing evidence: BLOCKED refusal (exit 2), closure refused and recorded', () => {
  const s = scratch();
  try {
    const f = closeableFixture(s.root);
    rmSync(path.join(f.phaseDir, 'boundary-results.json'));
    const result = closeEval(s.root, f);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /evidence-missing/);
    assert.match(readFileSync(f.sink, 'utf8'), /PHASE-CLOSURE-REFUSED phase=phase-x verdict=BLOCKED/);
  } finally {
    s.dispose();
  }
});

test('BG-11 stale evidence: source digests recomputed at evaluation refuse closure', () => {
  const s = scratch();
  try {
    const f = closeableFixture(s.root);
    writeFileSync(f.sourceFile, '// changed AFTER evidence was produced\n');
    const result = closeEval(s.root, f);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /evidence-stale-sources\(stale\(src\/production\.mjs\)\)/);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Budget accounting
// ---------------------------------------------------------------------------

test('BG-12 missing accounting is BLOCKED, never a qualified PASS', () => {
  const s = scratch();
  try {
    const f = closeableFixture(s.root, { evidence: { budgetConsumption: null } });
    const result = closeEval(s.root, f);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /budget-consumption-missing/);
  } finally {
    s.dispose();
  }
});

test('BG-13 budget boundaries: exceeded refuses; at-ceiling closes with exhaustion note', () => {
  const s = scratch();
  try {
    const exceeded = closeableFixture(s.root, {
      evidence: { budgetConsumption: { source: 'self-reported', values: { toolCalls: { value: 11, class: 'measured' } } } },
    });
    const over = closeEval(s.root, exceeded);
    assert.equal(over.status, 2);
    assert.match(over.stdout, /budget-exceeded\(toolCalls\(11>10,measured\)\)/);

    const atCeiling = closeableFixture(s.root, {
      evidence: { budgetConsumption: { source: 'self-reported', values: { toolCalls: { value: 10, class: 'measured' } } } },
    });
    const at = closeEval(s.root, atCeiling);
    assert.equal(at.status, 0, at.stdout);
    assert.match(readFileSync(atCeiling.sink, 'utf8'), /budget-note=allowance-fully-consumed\(toolCalls\);no-further-work-admitted/);
  } finally {
    s.dispose();
  }
});

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

test('BG-15 closed phase refuses further execute dispatch at the real gate', () => {
  const s = scratch();
  try {
    const phaseDir = path.join(s.root, '.kbd-orchestrator', 'phases', PHASE);
    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(makeContract(), null, 2));
    writeFileSync(path.join(phaseDir, 'tasks.json'), JSON.stringify({ tasks: [{ id: 'T1' }] }));
    const digest = contractDigest(makeContract());
    const [id, decision] = adoptionDecisionEntry(makeContract());
    const statusFile = writeStatus(s.root, {
      [id]: decision,
      'phase-closure-phase-x-12345678': {
        id: 'phase-closure-phase-x-12345678',
        summary: `PHASE-CLOSED phase=phase-x verdict=PASS evidence=sha256:${'b'.repeat(64)} contract=${digest} run=r entries=1`,
      },
    });
    stageHandoffWrite('plan', 'plan ready', { phaseDir, identity: passIdentity(digest) });

    const gate = stageGate('execute', { phaseDir, statusFile, env: {} });
    assert.equal(gate.status, 2);
    assert.match(gate.stderr, /phase phase-x is CLOSED/);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Unresolved critical findings cannot produce a successful closure (mini #59)
// ---------------------------------------------------------------------------

test('BG-16 unresolved critical findings: a FAIL review result is never accepted as closure', () => {
  const s = scratch();
  try {
    // Review loop ended with the adopted-critical finding unresolved: the evidence
    // records FAIL for the scenario it binds. The evaluator refuses closure.
    const f = closeableFixture(s.root, {
      evidence: {
        scenarios: [{ id: 'MC-1', status: 'FAIL', attempted: 'review round 2 (ceiling)', observed: 'CRITICAL finding unresolved', evidence: 'review.md' }],
      },
    });
    const result = closeEval(s.root, f);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /^FAIL phase=phase-x/);
    assert.doesNotMatch(readFileSync(f.sink, 'utf8'), /PHASE-CLOSED/);
  } finally {
    s.dispose();
  }
});

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

test('BG-18 idempotent re-adoption: same digest is ALREADY-ADOPTED, zero new decisions', () => {
  const s = scratch();
  try {
    const contract = makeContract();
    const [id, decision] = adoptionDecisionEntry(contract);
    const phaseDir = path.join(s.root, '.kbd-orchestrator', 'phases', PHASE);
    const contractPath = path.join(phaseDir, 'adopted-contract.json');
    writeFileSync(contractPath, JSON.stringify(contract, null, 2));
    const statusFile = writeStatus(s.root, { [id]: decision });
    const sink = path.join(s.root, 'decisions.log');

    const result = runScript('kbd-contract-adopt.mjs', [contractPath, '--status-file', statusFile, '--decision-sink', sink], s.root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ALREADY-ADOPTED/);
    assert.equal(existsSync(sink), false);
  } finally {
    s.dispose();
  }
});
