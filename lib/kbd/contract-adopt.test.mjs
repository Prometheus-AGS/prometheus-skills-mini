// Tests for lib/kbd/contract-adopt.mjs — the canonical adoption writer (mini #60, port of
// ebc8f687 shared/scripts/kbd-contract-adopt.sh). Fixture-only: canonical status comes from
// a disclosed statusFile fixture and decisions append to a disclosed decisionSink file —
// no prometheus CLI, no canonical state, no services.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { adoptContract } from './contract-adopt.mjs';
import { contractDigest } from './adopted-contract.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'contract-adopt-'));
  mkdirSync(path.join(root, '.kbd-orchestrator', 'phases', 'phase-x'), { recursive: true });
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const makeContract = (overrides = {}) => ({
  contractVersion: '1',
  kind: 'kbd.adopted-contract',
  identity: { projectId: 'p', runId: 'r', phaseId: 'phase-x', planRevision: null, contractDigest: null },
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
  status: { implementationComplete: false },
  ...overrides,
});

/** Scaffold: contract file + status fixture + decision sink. Returns handles. */
const fixture = (root, { contract = makeContract(), decisions = {}, identity = {} } = {}) => {
  const contractPath = path.join(root, '.kbd-orchestrator', 'phases', 'phase-x', 'adopted-contract.json');
  writeFileSync(contractPath, JSON.stringify(contract, null, 2));
  const statusFile = path.join(root, 'status-fixture.json');
  writeFileSync(statusFile, JSON.stringify({
    projectId: 'p', runId: 'r', planRevision: 1, decisions, ...identity,
  }));
  const decisionSink = path.join(root, 'decisions.log');
  return { contractPath, statusFile, decisionSink };
};

const adoptionDecision = (id, digest, supersedes = null) => ({
  id,
  summary:
    `ADOPTED-CONTRACT path=.kbd-orchestrator/phases/phase-x/adopted-contract.json sha256=${digest} ` +
    'planRevision=1 adoptionSource=t owner=t scenarios=MC-1',
  planRevision: 1,
  supersedes,
});

test('adoptContract adopts a valid contract: stamps identity fields and records the decision', () => {
  const s = scratch();
  try {
    const contract = makeContract();
    const { contractPath, statusFile, decisionSink } = fixture(s.root, { contract });

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^ADOPTED path=\.kbd-orchestrator\/phases\/phase-x\/adopted-contract\.json/);
    assert.match(result.stdout, /planRevision=1/);

    const digest = contractDigest(contract);
    const stamped = JSON.parse(readFileSync(contractPath, 'utf8'));
    assert.equal(stamped.identity.planRevision, 1);
    assert.equal(stamped.identity.contractDigest, digest);
    // Stamping is digest-neutral.
    assert.equal(contractDigest(stamped), digest);

    const sink = readFileSync(decisionSink, 'utf8');
    assert.match(sink, new RegExp(`ADOPTED-CONTRACT path=\\.kbd-orchestrator/phases/phase-x/adopted-contract\\.json sha256=${digest}`));
    assert.match(sink, /scenarios=MC-1/);
  } finally {
    s.dispose();
  }
});

test('adoptContract re-adoption of the same digest is an idempotent ALREADY-ADOPTED no-op', () => {
  const s = scratch();
  try {
    const contract = makeContract();
    const digest = contractDigest(contract);
    const { contractPath, statusFile, decisionSink } = fixture(s.root, {
      contract,
      decisions: { 'contract-adoption-phase-x-aaaaaaaa': adoptionDecision('contract-adoption-phase-x-aaaaaaaa', digest) },
    });

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ALREADY-ADOPTED/);
    assert.match(result.stdout, /idempotent no-op/);
    // No new decision appended (sink was never created).
    assert.equal(existsSync(decisionSink), false);
  } finally {
    s.dispose();
  }
});

test('adoptContract refuses an amendment without --supersedes (exit 4, zero writes)', () => {
  const s = scratch();
  try {
    const original = makeContract();
    const originalDigest = contractDigest(original);
    const { contractPath, statusFile, decisionSink } = fixture(s.root, {
      contract: original,
      decisions: { 'contract-adoption-phase-x-aaaaaaaa': adoptionDecision('contract-adoption-phase-x-aaaaaaaa', originalDigest) },
    });

    // Amend the contract bytes (digest changes), then attempt adoption without lineage.
    writeFileSync(contractPath, JSON.stringify(makeContract({ adoptionSource: 'amended source' }), null, 2));

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink });

    assert.equal(result.status, 4);
    assert.match(result.stderr, /no --supersedes given/);
    assert.equal(existsSync(decisionSink), false);
  } finally {
    s.dispose();
  }
});

test('adoptContract refuses --supersedes that does not match the latest adoption decision', () => {
  const s = scratch();
  try {
    const original = makeContract();
    const { contractPath, statusFile, decisionSink } = fixture(s.root, {
      contract: original,
      decisions: { 'contract-adoption-phase-x-aaaaaaaa': adoptionDecision('contract-adoption-phase-x-aaaaaaaa', contractDigest(original)) },
    });
    writeFileSync(contractPath, JSON.stringify(makeContract({ adoptionSource: 'amended source' }), null, 2));

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink, supersedes: 'contract-adoption-phase-x-zzzzzzzz' });

    assert.equal(result.status, 4);
    assert.match(result.stderr, /does not match latest adoption decision/);
    assert.equal(existsSync(decisionSink), false);
  } finally {
    s.dispose();
  }
});

test('adoptContract amendment with correct --supersedes records lineage', () => {
  const s = scratch();
  try {
    const original = makeContract();
    const { contractPath, statusFile, decisionSink } = fixture(s.root, {
      contract: original,
      decisions: { 'contract-adoption-phase-x-aaaaaaaa': adoptionDecision('contract-adoption-phase-x-aaaaaaaa', contractDigest(original)) },
    });
    const amended = makeContract({ adoptionSource: 'amended source' });
    writeFileSync(contractPath, JSON.stringify(amended, null, 2));

    const result = adoptContract(contractPath, {
      cwd: s.root, statusFile, decisionSink, supersedes: 'contract-adoption-phase-x-aaaaaaaa',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /supersedes=contract-adoption-phase-x-aaaaaaaa/);
    const sink = readFileSync(decisionSink, 'utf8');
    assert.match(sink, new RegExp(`sha256=${contractDigest(amended)}`));
  } finally {
    s.dispose();
  }
});

test('adoptContract refuses when canonical projectId disagrees (exit 3)', () => {
  const s = scratch();
  try {
    const { contractPath, statusFile, decisionSink } = fixture(s.root, { identity: { projectId: 'other-project' } });

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink });

    assert.equal(result.status, 3);
    assert.match(result.stderr, /identity\.projectId mismatch/);
  } finally {
    s.dispose();
  }
});

test('adoptContract refuses when canonical runId disagrees (stale run, exit 3)', () => {
  const s = scratch();
  try {
    const { contractPath, statusFile, decisionSink } = fixture(s.root, { identity: { runId: 'older-run' } });

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink });

    assert.equal(result.status, 3);
    assert.match(result.stderr, /identity\.runId mismatch/);
    assert.match(result.stderr, /stale run/);
  } finally {
    s.dispose();
  }
});

test('adoptContract refuses a contract not located at the canonical phase dir (exit 3)', () => {
  const s = scratch();
  try {
    const wrongDir = path.join(s.root, '.kbd-orchestrator', 'phases', 'other-phase');
    mkdirSync(wrongDir, { recursive: true });
    const contractPath = path.join(wrongDir, 'adopted-contract.json');
    writeFileSync(contractPath, JSON.stringify(makeContract()));
    const statusFile = path.join(s.root, 'status-fixture.json');
    writeFileSync(statusFile, JSON.stringify({ projectId: 'p', runId: 'r', planRevision: 1, decisions: {} }));

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink: path.join(s.root, 'decisions.log') });

    assert.equal(result.status, 3);
    assert.match(result.stderr, /not at .*phases.*phase-x/);
  } finally {
    s.dispose();
  }
});

test('adoptContract refuses non-JSON and structurally invalid contracts (exit 2)', () => {
  const s = scratch();
  try {
    const statusFile = path.join(s.root, 'status-fixture.json');
    writeFileSync(statusFile, JSON.stringify({ projectId: 'p', runId: 'r', planRevision: 1, decisions: {} }));
    const contractPath = path.join(s.root, '.kbd-orchestrator', 'phases', 'phase-x', 'adopted-contract.json');

    writeFileSync(contractPath, '{ not json');
    assert.equal(adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink: path.join(s.root, 'd.log') }).status, 2);

    writeFileSync(contractPath, JSON.stringify({ kind: 'wrong' }));
    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink: path.join(s.root, 'd.log') });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /structural validation/);
  } finally {
    s.dispose();
  }
});

test('adoptContract refuses ambiguous adoption lineage (exit 4)', () => {
  const s = scratch();
  try {
    const contract = makeContract();
    const { contractPath, statusFile, decisionSink } = fixture(s.root, {
      contract,
      decisions: {
        a: adoptionDecision('a', '1'.repeat(64)),
        b: adoptionDecision('b', '2'.repeat(64)),
      },
    });

    const result = adoptContract(contractPath, { cwd: s.root, statusFile, decisionSink });

    assert.equal(result.status, 4);
    assert.match(result.stderr, /operator adjudication/);
  } finally {
    s.dispose();
  }
});
