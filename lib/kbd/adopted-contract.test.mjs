// Tests for lib/kbd/adopted-contract.mjs — the shared core of the mini KBD completion
// contract (mini #60/#59): digest normalization, structural validation, adoption lineage,
// budget ceiling computation (additive / replacement / unchanged), and the terminal
// budget predicate. Fixture-only; no canonical state, no services.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  budgetPredicate,
  computeCeilings,
  contractDigest,
  latestAdoption,
  stableStringify,
  validateAdoptedContract,
} from './adopted-contract.mjs';

export function makeContract(overrides = {}) {
  return {
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
  };
}

// --- digest normalization ------------------------------------------------

test('stableStringify sorts keys recursively and compactly', () => {
  assert.equal(stableStringify({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: 3 } }), '{"a":{"c":3,"d":[2,{"y":2,"z":1}]},"b":1}');
});

test('contractDigest is stable across key order and excludes stamped identity fields', () => {
  const a = makeContract();
  const shuffled = { ...a, identity: { contractDigest: null, planRevision: null, phaseId: 'phase-x', runId: 'r', projectId: 'p' } };
  assert.equal(contractDigest(a), contractDigest(shuffled));
  const stamped = makeContract({ identity: { ...a.identity, planRevision: 7, contractDigest: 'f'.repeat(64) } });
  assert.equal(contractDigest(a), contractDigest(stamped));
  const changed = makeContract({ adoptionSource: 'different source' });
  assert.notEqual(contractDigest(a), contractDigest(changed));
});

// --- structural / quality validation -------------------------------------

test('validateAdoptedContract accepts the valid fixture', () => {
  assert.deepEqual(validateAdoptedContract(makeContract()), []);
});

test('validateAdoptedContract reports the source-compatible error codes', () => {
  const cases = [
    [{ kind: 'nope' }, 'kind'],
    [{ scenarioMatrix: [] }, 'scenarioMatrix'],
    [{ releaseClaim: { ...makeContract().releaseClaim, userOperation: 'short' } }, 'releaseClaim.userOperation'],
    [{ boundaryPacket: { ...makeContract().boundaryPacket, postImplementationOnly: false } }, 'boundaryPacket.postImplementationOnly-must-be-true'],
    [{ budgets: { ...makeContract().budgets, tokenFallback: '' } }, 'budgets.tokenFallback'],
    [{ exclusions: [] }, 'exclusions'],
  ];
  for (const [patch, code] of cases) {
    assert.ok(validateAdoptedContract(makeContract(patch)).includes(code), `expected ${code}`);
  }
});

test('validateAdoptedContract rejects duplicate and malformed scenario ids and oracle-less scenarios', () => {
  const dup = makeContract({
    scenarioMatrix: [
      { id: 'MC-1', name: 'a', ownerTask: 'T1', productionEntry: 'x', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' },
      { id: 'MC-1', name: 'b', ownerTask: 'T1', productionEntry: 'x', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' },
    ],
  });
  assert.ok(validateAdoptedContract(dup).includes('scenarioMatrix-duplicate-ids'));
  const badId = makeContract({
    scenarioMatrix: [{ id: 'mc-1', name: 'a', ownerTask: 'T1', productionEntry: 'x', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' }],
  });
  assert.ok(validateAdoptedContract(badId).includes('scenario-id-pattern'));
  const noOracle = makeContract({
    scenarioMatrix: [{ id: 'MC-1', name: 'a', ownerTask: 'T1', productionEntry: 'x', oracle: '', negativeControl: 'n', fixtures: 'f', evidence: 'e' }],
  });
  assert.ok(validateAdoptedContract(noOracle).some((e) => e.startsWith('scenarioMatrix-quality')));
});

// --- adoption lineage ------------------------------------------------------

const adoption = (id, path, digest, supersedes = null) => ({
  id,
  summary: `ADOPTED-CONTRACT path=${path} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC`,
  planRevision: 1,
  supersedes,
});

test('latestAdoption: absent, single, superseded chain, ambiguous', () => {
  assert.equal(latestAdoption({ decisions: {} }, 'p'), null);
  const single = latestAdoption({ decisions: { a: adoption('a', 'p', 'd'.repeat(64)) } }, 'p');
  assert.equal(single.id, 'a');
  assert.equal(single.digest, 'd'.repeat(64));
  const chain = latestAdoption(
    { decisions: { a: adoption('a', 'p', '1'.repeat(64)), b: adoption('b', 'p', '2'.repeat(64), 'a') } },
    'p',
  );
  assert.equal(chain.id, 'b');
  assert.equal(chain.digest, '2'.repeat(64));
  const ambiguous = latestAdoption(
    { decisions: { a: adoption('a', 'p', '1'.repeat(64)), b: adoption('b', 'p', '2'.repeat(64)) } },
    'p',
  );
  assert.equal(ambiguous, 'ambiguous');
});

// --- budget ceilings (mini #59 addendum: add / replace / unchanged) --------

test('computeCeilings: base budgets without extensions', () => {
  assert.deepEqual(computeCeilings(makeContract().budgets), {
    timeMinutes: 10, toolCalls: 10, repairAttempts: 2, noProgressLimit: 2,
  });
});

test('computeCeilings: additive extension fields sum; unchanged stays put', () => {
  const budgets = {
    ...makeContract().budgets,
    extensions: [
      { operation: 'add', timeMinutes: 90, toolCalls: 90, repairAttempts: 2, noProgressLimit: { operation: 'unchanged', absolute: 2 } },
    ],
  };
  assert.deepEqual(computeCeilings(budgets), {
    timeMinutes: 100, toolCalls: 100, repairAttempts: 4, noProgressLimit: 2,
  });
});

test('computeCeilings: latest resultingCeilings snapshot wins; later extensions still apply', () => {
  const budgets = {
    ...makeContract().budgets,
    extensions: [
      { timeMinutes: 90, toolCalls: 90 },
      { resultingCeilings: { timeMinutes: 220, toolCalls: 290, repairAttempts: 6, noProgressLimit: 2 } },
      { operation: 'add', timeMinutes: 40, toolCalls: 20 },
    ],
  };
  assert.deepEqual(computeCeilings(budgets), {
    timeMinutes: 260, toolCalls: 310, repairAttempts: 6, noProgressLimit: 2,
  });
});

test('computeCeilings: replacement ceiling replaces rather than adds', () => {
  const budgets = {
    ...makeContract().budgets,
    extensions: [{ timeMinutes: { operation: 'replace', absolute: 60 } }],
  };
  assert.equal(computeCeilings(budgets).timeMinutes, 60);
});

// --- terminal budget predicate ---------------------------------------------

const METERED = {
  timeMinutes: { value: 1, class: 'estimate' },
  toolCalls: { value: 1, class: 'measured' },
  repairAttempts: { value: 0, class: 'measured' },
};
const consumption = (values, source = 'self-reported test accounting (not independent telemetry)') => ({
  source,
  values: { ...METERED, ...values },
});

test('budgetPredicate: missing accounting and missing source are distinct refusals', () => {
  const c = makeContract();
  assert.equal(budgetPredicate(c, null).outcome, 'missing');
  assert.equal(budgetPredicate(c, { values: {} }).outcome, 'source-missing');
});

test('budgetPredicate: exceeded refuses, at-ceiling closes with note, within is ok', () => {
  const c = makeContract();
  const over = budgetPredicate(c, consumption({ repairAttempts: { value: 3, class: 'measured' } }));
  assert.equal(over.outcome, 'exceeded');
  assert.match(over.hits[0], /repairAttempts\(3>2,measured\)/);
  const at = budgetPredicate(c, consumption({ repairAttempts: { value: 2, class: 'measured' } }));
  assert.equal(at.outcome, 'at-ceiling');
  const under = budgetPredicate(c, consumption({ repairAttempts: { value: 1, class: 'measured' } }));
  assert.equal(under.outcome, 'ok');
});

test('budgetPredicate: unknown tokens follow the fallback; an unmetered enforceable dimension is unmeasured', () => {
  const c = makeContract();
  assert.equal(budgetPredicate(c, consumption({ tokens: { value: null, class: 'unknown' } })).outcome, 'ok');
  const result = budgetPredicate(c, consumption({ timeMinutes: { value: 999, class: 'unknown' } }));
  assert.equal(result.outcome, 'unmeasured');
  assert.deepEqual(result.hits, ['timeMinutes']);
});

test('budgetPredicate: amended ceilings come from the contract, consumption from evidence (restart never resets)', () => {
  const amended = makeContract({
    budgets: {
      ...makeContract().budgets,
      extensions: [{ resultingCeilings: { timeMinutes: 220, toolCalls: 290, repairAttempts: 6, noProgressLimit: 2 } }],
    },
  });
  // 240 total ceiling example from the M4 envelope: 270 consumed refuses; 240 at ceiling closes.
  const over = budgetPredicate(amended, consumption({ toolCalls: { value: 300, class: 'measured' } }));
  assert.equal(over.outcome, 'exceeded');
  const at = budgetPredicate(amended, consumption({ toolCalls: { value: 290, class: 'measured' } }));
  assert.equal(at.outcome, 'at-ceiling');
});
