// Tests for lib/kbd/phase-readiness.mjs — the Plan→Execute readiness checker (mini #60,
// port of ebc8f687 shared/scripts/kbd-phase-readiness-check.sh). Fixture-only: canonical
// status comes from a disclosed statusFile fixture; no prometheus CLI, no services.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { phaseReadiness } from './phase-readiness.mjs';
import { contractDigest } from './adopted-contract.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'phase-readiness-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const phaseDirOf = (root, phase) => path.join(root, '.kbd-orchestrator', 'phases', phase);

const makeContract = (overrides = {}) => ({
  contractVersion: '1',
  kind: 'kbd.adopted-contract',
  identity: { projectId: 'p', runId: 'r', phaseId: 'phase-x', planRevision: 1, contractDigest: null },
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
    { id: 'MC-1', name: 'x', ownerTask: 'T1+T2', productionEntry: 'node scripts/x.mjs', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' },
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

const REL = '.kbd-orchestrator/phases/phase-x/adopted-contract.json';

/** Ready-state fixture: contract + adoption decision (matching digest) + tasks coverage. */
const readyFixture = (root, { contract = makeContract(), decisions, status = {}, tasks = ['T1', 'T2'] } = {}) => {
  const phaseDir = phaseDirOf(root, 'phase-x');
  mkdirSync(phaseDir, { recursive: true });
  writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(contract, null, 2));
  const digest = contractDigest(contract);
  const resolvedDecisions = decisions ?? {
    'contract-adoption-phase-x-aaaaaaaa': {
      id: 'contract-adoption-phase-x-aaaaaaaa',
      summary: `ADOPTED-CONTRACT path=${REL} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC-1`,
      planRevision: 1,
    },
  };
  const statusFile = path.join(root, 'status-fixture.json');
  writeFileSync(statusFile, JSON.stringify({ projectId: 'p', runId: 'r', planRevision: 1, decisions: resolvedDecisions, ...status }));
  if (tasks !== null) {
    writeFileSync(path.join(phaseDir, 'tasks.json'), JSON.stringify({ tasks: tasks.map((id) => ({ id })) }));
  }
  return { phaseDir, statusFile, digest };
};

const run = (root, statusFile, extra = {}) =>
  phaseReadiness({ phase: 'phase-x', root, statusFile, ...extra });

test('phaseReadiness READY when contract, adoption, identity and coverage all validate', () => {
  const s = scratch();
  try {
    const { statusFile, digest } = readyFixture(s.root);
    const result = run(s.root, statusFile);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`^READY phase=phase-x .* digest=${digest}`));
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED when the phase dir does not exist', () => {
  const s = scratch();
  try {
    const result = run(s.root, path.join(s.root, 'missing-status.json'));
    assert.equal(result.status, 2);
    assert.match(result.stdout, /BLOCKED missing=phase-dir/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED when adopted-contract.json is absent', () => {
  const s = scratch();
  try {
    mkdirSync(phaseDirOf(s.root, 'phase-x'), { recursive: true });
    const result = run(s.root, path.join(s.root, 'missing-status.json'));
    assert.equal(result.status, 2);
    assert.match(result.stdout, /BLOCKED missing=contract/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness MALFORMED (5) for invalid JSON and for structural validation failure', () => {
  const s = scratch();
  try {
    const phaseDir = phaseDirOf(s.root, 'phase-x');
    mkdirSync(phaseDir, { recursive: true });
    const statusFile = path.join(s.root, 'status-fixture.json');
    writeFileSync(statusFile, JSON.stringify({ projectId: 'p', runId: 'r', planRevision: 1, decisions: {} }));

    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), '{ nope');
    assert.equal(run(s.root, statusFile).status, 5);

    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify({ kind: 'wrong' }));
    const result = run(s.root, statusFile);
    assert.equal(result.status, 5);
    assert.match(result.stderr, /MALFORMED/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness REJECT-IDENTITY (3) when contract identity disagrees with canonical status', () => {
  const s = scratch();
  try {
    const { statusFile } = readyFixture(s.root, { status: { projectId: 'other-project' } });
    const result = run(s.root, statusFile);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /REJECT-IDENTITY/);
    assert.match(result.stdout, /projectId\(contract=p canonical=other-project\)/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness REJECT-IDENTITY (3) when contract phaseId disagrees with the gate phase', () => {
  const s = scratch();
  try {
    // Contract file claims a different phaseId (validation is identity-only here; the
    // writer enforces location, the checker enforces identity equality).
    const { statusFile } = readyFixture(s.root, { contract: makeContract({ identity: { ...makeContract().identity, phaseId: 'phase-y' } }) });
    const result = run(s.root, statusFile);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /phaseId\(contract=phase-y gate=phase-x\)/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED when no adoption decision exists for the contract path', () => {
  const s = scratch();
  try {
    const { statusFile } = readyFixture(s.root, { decisions: {} });
    const result = run(s.root, statusFile);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /BLOCKED missing=adoption/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness REJECT-STALE (4) when the latest adoption digest differs from the contract bytes', () => {
  const s = scratch();
  try {
    const { statusFile, digest } = readyFixture(s.root);
    // Amend the contract on disk without an adoption amendment.
    const phaseDir = phaseDirOf(s.root, 'phase-x');
    writeFileSync(path.join(phaseDir, 'adopted-contract.json'), JSON.stringify(makeContract({ adoptionSource: 'amended' }), null, 2));
    const result = run(s.root, statusFile);
    assert.equal(result.status, 4);
    assert.match(result.stdout, new RegExp(`REJECT-STALE contractDigest\\(decision=${digest}`));
    assert.match(result.stdout, /amend via kbd-contract-adopt\.mjs --supersedes/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED when a superseded-only adoption chain leaves no live adoption', () => {
  const s = scratch();
  try {
    const digest = contractDigest(makeContract());
    const { statusFile } = readyFixture(s.root, {
      decisions: {
        old: { id: 'old', summary: `ADOPTED-CONTRACT path=${REL} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC-1`, planRevision: 1 },
        newer: { id: 'newer', summary: `ADOPTED-CONTRACT path=${REL} sha256=${'9'.repeat(64)} planRevision=1 adoptionSource=t owner=t scenarios=MC-1`, planRevision: 1, supersedes: 'old' },
      },
    });
    // The live adoption ('newer') carries a digest that does not match the contract bytes.
    const result = run(s.root, statusFile);
    assert.equal(result.status, 4);
    assert.match(result.stdout, /REJECT-STALE/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED when scenario owner tasks are missing from tasks.json', () => {
  const s = scratch();
  try {
    const { statusFile } = readyFixture(s.root, { tasks: ['T1'] }); // T2 missing
    const result = run(s.root, statusFile);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /BLOCKED missing=coverage\(MC-1:T2\)/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED when tasks.json is absent', () => {
  const s = scratch();
  try {
    const { statusFile } = readyFixture(s.root, { tasks: null });
    const result = run(s.root, statusFile);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /coverage\(tasks\.json absent\)/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED when canonical status is unavailable', () => {
  const s = scratch();
  try {
    const { statusFile } = readyFixture(s.root);
    writeFileSync(statusFile, '{ unreadable');
    const result = run(s.root, statusFile);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /BLOCKED missing=canonical-status/);
  } finally {
    s.dispose();
  }
});

test('phaseReadiness BLOCKED on ambiguous adoption lineage (two live adoptions)', () => {
  const s = scratch();
  try {
    const digest = contractDigest(makeContract());
    const { statusFile } = readyFixture(s.root, {
      decisions: {
        a: { id: 'a', summary: `ADOPTED-CONTRACT path=${REL} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC-1`, planRevision: 1 },
        b: { id: 'b', summary: `ADOPTED-CONTRACT path=${REL} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC-1`, planRevision: 1 },
      },
    });
    const result = run(s.root, statusFile);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /adoption-unambiguous/);
  } finally {
    s.dispose();
  }
});
