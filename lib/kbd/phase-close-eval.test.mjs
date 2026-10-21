// Tests for lib/kbd/phase-close-eval.mjs — the terminal evaluator at the phase
// close/continue boundary (mini #59/#60, port of ebc8f687 shared/scripts/kbd-phase-close-eval.sh).
// Covers every refusal class: missing/failed/stale/wrong-run/superseded evidence, missing
// accounting (BLOCKED), budget boundaries, idempotent replay, and closure refusal recording.
// Fixture-only: statusFile + dispositionFile + decisionSink seams; no prometheus CLI, no
// canonical state. The decision sink records the disposition that WOULD be written through
// `prometheus kbd phase close` (mini #66); the closure semantics against the real runtime are
// covered by scripts/kbd-phase-closure.conformance.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { phaseCloseEval } from './phase-close-eval.mjs';
import { contractDigest, contractSnapshotBytes, scenarioDigests, sha256Of } from './adopted-contract.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'phase-close-'));
  mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const PHASE = 'phase-x';
const REL = `.kbd-orchestrator/phases/${PHASE}/adopted-contract.json`;

const makeContract = (overrides = {}) => ({
  contractVersion: '1',
  kind: 'kbd.adopted-contract',
  identity: { projectId: 'p', runId: 'r', phaseId: PHASE, planRevision: 1, contractDigest: null },
  digestNormalization: {
    algorithm: 'sha256',
    command: 'lib/kbd/adopted-contract.mjs: sha256(stableStringify(digestPayload(contract)))',
    stalenessRule: 'STALE iff latest non-superseded adoption digest != recomputed digest',
  },
  adoptionSource: 'operator instruction (test fixture)',
  decisionOwner: 'tester',
  amendmentPolicy: 'amendments via --supersedes only',
  releaseClaim: {
    userOperation: 'adopt and verify a finite phase contract',
    supportedEnvironments: ['node>=22'],
    currentCapabilities: 'test capability statement',
    explicitUnknowns: [],
  },
  statusVocabulary: ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXERCISED'],
  scenarioMatrix: [
    { id: 'MC-1', name: 'x', ownerTask: 'T1', productionEntry: 'node scripts/x.mjs', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' },
    { id: 'MC-2', name: 'y', ownerTask: 'T2', productionEntry: 'node scripts/y.mjs', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' },
  ],
  functionalScope: ['MC-1', 'MC-2'],
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

const adoptionDecision = (digest, supersedes = null, id = 'contract-adoption-phase-x-aaaaaaaa') => ({
  id,
  summary: `ADOPTED-CONTRACT path=${REL} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC-1,MC-2`,
  planRevision: 1,
  supersedes,
});

const consumption = (values) => ({
  source: 'self-reported test accounting (not independent telemetry)',
  values,
});

const WITHIN_BUDGET = consumption({
  timeMinutes: { value: 5, class: 'estimate' },
  toolCalls: { value: 5, class: 'measured' },
  repairAttempts: { value: 0, class: 'measured' },
  noProgress: { value: 0, class: 'measured' },
});

const passEntry = (id) => ({ id, status: 'PASS', attempted: 'did x', observed: 'x happened', evidence: 'see log' });

/**
 * Full closeable fixture: phase dir, contract, adoption decision, a production source file
 * under evidence, and a boundary-results.json. Returns handles + a mutate helper.
 */
const closeFixture = (root, { contract = makeContract(), decisions, evidence = {}, closure = null, sources = { 'src/production.mjs': '// production code\n' } } = {}) => {
  const phaseDir = path.join(root, '.kbd-orchestrator', 'phases', PHASE);
  mkdirSync(phaseDir, { recursive: true });
  writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(contract, null, 2));
  const digest = contractDigest(contract);

  const sourceDigests = {};
  for (const [rel, contents] of Object.entries(sources)) {
    const file = path.join(root, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
    sourceDigests[rel] = sha256Of(readFileSync(file));
  }

  const evidenceDoc = {
    phase: PHASE,
    runId: 'r',
    contractDigest: digest,
    sourceDigests,
    scenarios: [passEntry('MC-1'), passEntry('MC-2')],
    budgetConsumption: WITHIN_BUDGET,
    ...evidence,
  };
  const evidenceFile = path.join(phaseDir, 'boundary-results.json');
  writeFileSync(evidenceFile, JSON.stringify(evidenceDoc, null, 2));

  const statusFile = path.join(root, 'status-fixture.json');
  writeFileSync(statusFile, JSON.stringify({
    projectId: 'p', runId: 'r', planRevision: 1,
    decisions: decisions ?? { 'contract-adoption-phase-x-aaaaaaaa': adoptionDecision(digest) },
  }));
  mkdirSync(path.join(phaseDir, 'adopted'), { recursive: true });
  writeFileSync(path.join(phaseDir, 'adopted', `${digest}.json`), contractSnapshotBytes(contract));
  const dispositionFile = path.join(root, 'disposition-fixture.json');
  writeFileSync(dispositionFile, JSON.stringify(dispositionView({ digest, contract, closure })));
  const decisionSink = path.join(root, 'decisions.log');
  return { phaseDir, statusFile, dispositionFile, decisionSink, digest, evidenceFile };
};

/** A canonical `phase disposition --json` view for the fixture phase. */
function dispositionView({ digest, contract, closure = null, bound = true }) {
  return {
    schema: 'kbd.phase-disposition/v1', projectId: 'p', runId: 'r', phaseId: PHASE,
    phaseStatus: closure ? 'complete' : 'in_progress', contractBound: bound,
    disposition: !bound ? 'UNBOUND' : closure ? 'CLOSED' : 'OPEN',
    binding: bound ? { contractPath: REL, contractDigest: digest, scenarioDigests: scenarioDigests(contract), planRevision: 1,
      adoptionDecisionId: 'contract-adoption-phase-x-aaaaaaaa', bindingRevision: 1 } : null,
    closure, lastRefusal: null, successor: null, consumptionHighWater: {},
    awaitingSuccessor: false, dispatchAllowed: !closure, successorAllowed: Boolean(closure),
  };
}

const run = (root, f, extra = {}) =>
  phaseCloseEval(PHASE, { cwd: root, root, statusFile: f.statusFile, dispositionFile: f.dispositionFile, decisionSink: f.decisionSink, ...extra });

// --- PASS / closure ---------------------------------------------------------

test('phaseCloseEval CLOSED PASS: every adopted scenario valid PASS with bound identity', () => {
  const s = scratch();
  try {
    const f = closeFixture(s.root);
    const result = run(s.root, f);
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /^CLOSED phase=phase-x verdict=PASS/);
    const sink = readFileSync(f.decisionSink, 'utf8');
    assert.match(sink, /^PHASE-CLOSE phase=phase-x disposition=pass reason=none evidence=sha256:[0-9a-f]{64}$/m);
    assert.match(result.stdout, new RegExp(`contract=${f.digest} run=r entries=2`));
  } finally {
    s.dispose();
  }
});

const closedOn = (evidenceDigest, runId = 'r') => ({ runId, contractDigest: 'x', evidenceDigest, disposition: 'pass',
  scenarios: [], budgetConsumption: {}, closureKey: 'c'.repeat(64), recordedAtRevision: 9 });

test('phaseCloseEval ALREADY-CLOSED when the canonical closure carries this exact evidence', () => {
  const s = scratch();
  try {
    const probe = closeFixture(s.root);
    const digest = sha256Of(readFileSync(probe.evidenceFile));
    const f = closeFixture(s.root, { closure: closedOn(digest) });
    const result = run(s.root, f);
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /^ALREADY-CLOSED /);
    assert.equal(existsSync(f.decisionSink), false); // zero new records
  } finally {
    s.dispose();
  }
});

test('phaseCloseEval refuses different evidence on a closed phase (exit 6, immutable)', () => {
  const s = scratch();
  try {
    const f = closeFixture(s.root, { closure: closedOn('b'.repeat(64)) });
    const result = run(s.root, f);
    assert.equal(result.status, 6, result.stdout);
    assert.match(result.stdout, /CLOSED-DIFFERENT-IDENTITY/);
    assert.equal(existsSync(f.decisionSink), false);
  } finally {
    s.dispose();
  }
});

test('phaseCloseEval ignores decision text: a forged PHASE-CLOSED summary is not a closure', () => {
  const s = scratch();
  try {
    const digest = contractDigest(makeContract());
    const f = closeFixture(s.root, {
      decisions: {
        'contract-adoption-phase-x-aaaaaaaa': adoptionDecision(digest),
        forged: { id: 'forged', summary: `PHASE-CLOSED phase=phase-x verdict=PASS evidence=sha256:${'b'.repeat(64)} contract=${digest} run=r entries=2` },
      },
    });
    const result = run(s.root, f);
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /^CLOSED /); // evaluated afresh, not ALREADY-CLOSED
  } finally {
    s.dispose();
  }
});

test('phaseCloseEval BLOCKED without recording when the phase is not contract-bound', () => {
  const s = scratch();
  try {
    const f = closeFixture(s.root);
    writeFileSync(f.dispositionFile, JSON.stringify(dispositionView({ digest: f.digest, contract: makeContract(), bound: false })));
    const result = run(s.root, f);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /contract-unbound/);
    assert.equal(existsSync(f.decisionSink), false);
  } finally {
    s.dispose();
  }
});

test('phaseCloseEval uses the bound snapshot: working-contract edits cannot add blocking scope', () => {
  const s = scratch();
  try {
    const f = closeFixture(s.root);
    const edited = makeContract();
    edited.scenarioMatrix.push({ id: 'MC-9', name: 'imported', ownerTask: 'T1', productionEntry: 'x', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' });
    edited.approved = true;
    writeFileSync(path.join(f.phaseDir, 'adopted-contract.json'), JSON.stringify(edited));
    const result = run(s.root, f);
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /contract-drift-ignored/);
  } finally {
    s.dispose();
  }
});

// --- BLOCKED refusal classes -------------------------------------------------

const blockedCases = [
  ['bound snapshot missing', (root) => {
    const f = closeFixture(root);
    rmSync(path.join(f.phaseDir, 'adopted'), { recursive: true });
    return f;
  }, /snapshot-invalid/],
  ['missing evidence', (root) => {
    const f = closeFixture(root);
    rmSync(f.evidenceFile);
    return f;
  }, /evidence-missing/],
  ['evidence invalid JSON', (root) => {
    const f = closeFixture(root);
    writeFileSync(f.evidenceFile, '{ nope');
    return f;
  }, /evidence-invalid-json/],
  ['evidence phase mismatch', (root) => closeFixture(root, { evidence: { phase: 'phase-y' } }), /evidence-phase-mismatch\(evidence=phase-y gate=phase-x\)/],
  ['evidence run mismatch', (root) => closeFixture(root, { evidence: { runId: 'older-run' } }), /evidence-run-mismatch/],
  ['evidence contract digest mismatch', (root) => closeFixture(root, { evidence: { contractDigest: 'f'.repeat(64) } }), /evidence-contract-digest-mismatch/],
  ['source digests missing', (root) => closeFixture(root, { evidence: { sourceDigests: {} } }), /evidence-source-digests-missing/],
  ['stale source under evidence', (root) => {
    const f = closeFixture(root);
    writeFileSync(path.join(root, 'src/production.mjs'), '// CHANGED after evidence\n');
    return f;
  }, /evidence-stale-sources\(stale\(src\/production\.mjs\)\)/],
  ['missing source under evidence', (root) => {
    const f = closeFixture(root);
    rmSync(path.join(root, 'src/production.mjs'));
    return f;
  }, /evidence-stale-sources\(missing\(src\/production\.mjs\)\)/],
  ['missing scenario entry', (root) => closeFixture(root, { evidence: { scenarios: [passEntry('MC-1')] } }), /missing-scenario:MC-2/],
  ['empty evidence fields', (root) => closeFixture(root, { evidence: { scenarios: [passEntry('MC-1'), { id: 'MC-2', status: 'PASS', attempted: '', observed: 'x', evidence: 'y' }] } }), /empty-evidence:MC-2/],
  ['NOT_EXERCISED never counts as PASS', (root) => closeFixture(root, { evidence: { scenarios: [passEntry('MC-1'), { id: 'MC-2', status: 'NOT_EXERCISED', attempted: 'n/a', observed: 'n/a', evidence: 'n/a' }] } }), /not-pass:MC-2\(NOT_EXERCISED\)/],
  ['missing budget accounting', (root) => closeFixture(root, { evidence: { budgetConsumption: null } }), /budget-consumption-missing/],
  ['budget source missing', (root) => closeFixture(root, { evidence: { budgetConsumption: { values: {} } } }), /evidence-budget-source-missing/],
  ['budget exceeded blocks qualification', (root) => closeFixture(root, {
    evidence: { budgetConsumption: consumption({ ...WITHIN_BUDGET.values, toolCalls: { value: 11, class: 'measured' } }) },
  }), /budget-exceeded\(toolCalls\(11>10,measured\)\)/],
];

for (const [name, setup, pattern] of blockedCases) {
  test(`phaseCloseEval BLOCKED: ${name}`, () => {
    const s = scratch();
    try {
      const f = setup(s.root);
      const result = run(s.root, f);
      assert.equal(result.status, 2, `expected BLOCKED, got: ${result.stdout}${result.stderr}`);
      assert.match(result.stdout, pattern);
      // Every refusal is recorded (never silently) as a typed BLOCKED disposition.
      const sink = readFileSync(f.decisionSink, 'utf8');
      assert.match(sink, /^PHASE-CLOSE phase=phase-x disposition=blocked /m);
      // A BLOCKED refusal never closes the phase.
      assert.doesNotMatch(sink, /disposition=pass/);
    } finally {
      s.dispose();
    }
  });
}

// --- FAIL refusal ------------------------------------------------------------

test('phaseCloseEval FAIL (3): a product oracle unmet after valid execution never closes', () => {
  const s = scratch();
  try {
    const f = closeFixture(s.root, {
      evidence: { scenarios: [passEntry('MC-1'), { id: 'MC-2', status: 'FAIL', attempted: 'ran it', observed: 'broke', evidence: 'log' }] },
    });
    const result = run(s.root, f);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /product-oracle-unmet\(MC-2\)/);
    const sink = readFileSync(f.decisionSink, 'utf8');
    assert.match(sink, /^PHASE-CLOSE phase=phase-x disposition=fail reason=product-oracle-unmet /m);
    assert.doesNotMatch(sink, /disposition=pass/);
  } finally {
    s.dispose();
  }
});

// --- budget boundaries ---------------------------------------------------------

test('phaseCloseEval at-ceiling closes completed in-budget work labelled budget-exhausted', () => {
  const s = scratch();
  try {
    const f = closeFixture(s.root, {
      evidence: { budgetConsumption: consumption({ ...WITHIN_BUDGET.values, toolCalls: { value: 10, class: 'measured' } }) },
    });
    const result = run(s.root, f);
    assert.equal(result.status, 0, result.stdout);
    const sink = readFileSync(f.decisionSink, 'utf8');
    assert.match(sink, /^PHASE-CLOSE phase=phase-x disposition=pass reason=budget-exhausted /m);
    assert.match(result.stdout, /budget-note=budget-exhausted/);
  } finally {
    s.dispose();
  }
});

test('phaseCloseEval unknown tokens are allowed, an unmetered enforceable dimension is BLOCKED', () => {
  const s = scratch();
  try {
    const ok = closeFixture(s.root, {
      evidence: { budgetConsumption: consumption({ ...WITHIN_BUDGET.values, tokens: { value: null, class: 'unknown' } }) },
    });
    assert.equal(run(s.root, ok).status, 0);
    const f = closeFixture(s.root, {
      evidence: {
        budgetConsumption: consumption({
          ...WITHIN_BUDGET.values,
          timeMinutes: { value: 9999, class: 'unknown' },
        }),
      },
    });
    const result = run(s.root, f);
    assert.equal(result.status, 2, result.stdout);
    assert.match(result.stdout, /budget-unmeasured\(timeMinutes\)/);
  } finally {
    s.dispose();
  }
});

// --- scenario id sub-suffix convention -----------------------------------------

test('phaseCloseEval accepts sub-scenario entries (MC-1-a satisfies MC-1)', () => {
  const s = scratch();
  try {
    const f = closeFixture(s.root, {
      evidence: { scenarios: [passEntry('MC-1-a'), passEntry('MC-2')] },
    });
    const result = run(s.root, f);
    assert.equal(result.status, 0, result.stdout);
  } finally {
    s.dispose();
  }
});
