// Port of shared/lib/stage-gate.sh (prometheus-skill-pack, 243 lines).
//
// Stage precondition gates and handoff artifacts for the KBD lifecycle:
// assess → analyze → spec → plan → execute → reflect. `analyze` and `spec` are optional stages
// — when no handoff exists for them the gate walks back to the nearest earlier stage.
//
// Judgment call: the source resolves the phase dir from `$PWD` by walking up for
// `.kbd-orchestrator/`, and reads `$KBD_PHASE_DIR` from the process environment. This port takes
// both `cwd` and `env` as explicit ctx fields (defaulting to `process.cwd()`/`process.env`),
// matching the repo's injected-ctx convention so phase-dir resolution is testable without
// mutating real process state.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { stageGate, stageHandoffWrite, stageHandoffSkip } from './stage-gate.mjs';
import { contractDigest } from './adopted-contract.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'stage-gate-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
  return file;
};

const phaseDirOf = (root, phase) => path.join(root, '.kbd-orchestrator', 'phases', phase);

// ---------------------------------------------------------------------------
// stageGate — unknown stage / unresolvable phase dir
// ---------------------------------------------------------------------------

test('stageGate returns status 2 for an unknown stage name', () => {
  const s = scratch();
  try {
    const result = stageGate('bogus-stage', { phaseDir: s.root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown stage/);
  } finally {
    s.dispose();
  }
});

test('stageGate returns status 2 when no phase directory is resolvable', () => {
  const s = scratch();
  try {
    const result = stageGate('assess', { cwd: s.root, env: {} });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /no phase directory resolvable/);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// stageGate — index-0 stage (assess) always passes once a phase dir resolves
// ---------------------------------------------------------------------------

test('stageGate passes assess (index 0) once a phase dir resolves, with no handoffs required', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    const result = stageGate('assess', { phaseDir: dir });
    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// stageGate — canonical-phase agreement check
// ---------------------------------------------------------------------------

test('stageGate blocks when canonical activePhaseId disagrees with the phase being worked', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {
      activePhaseId: 'some-other-phase',
    });

    const result = stageGate('assess', { phaseDir: dir });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /canonical state disagrees/);
    assert.match(result.stderr, /some-other-phase/);
  } finally {
    s.dispose();
  }
});

test('stageGate passes when canonical activePhaseId agrees with the phase being worked', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { activePhaseId: 'p0' });

    const result = stageGate('assess', { phaseDir: dir });

    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

test('stageGate passes when there is no waypoint at all (question is unanswerable, not a mismatch)', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    const result = stageGate('assess', { phaseDir: dir });
    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

test('stageGate passes when the waypoint predates activePhaseId (field absent)', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { phase: 'p0' });
    const result = stageGate('assess', { phaseDir: dir });
    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

test('stageGate reads worked phase from progress.json phaseId/phase over the dir basename', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    writeJson(path.join(dir, 'progress.json'), { phaseId: 'actual-phase-id' });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {
      activePhaseId: 'actual-phase-id',
    });

    const result = stageGate('assess', { phaseDir: dir });

    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// stageGate — later-stage handoff chain
// ---------------------------------------------------------------------------

test('stageGate blocks a later stage when the walk-back finds no satisfied required stage', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    // plan's chain walks back through spec (optional) and analyze (optional) to assess
    // (required); with no handoffs at all, assess is the one reported as missing.
    const result = stageGate('plan', { phaseDir: dir });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /assess handoff missing/);
    assert.match(result.stderr, /kbd-assess/);
  } finally {
    s.dispose();
  }
});

test('stageGate blocks execute when the immediately-prior required handoff (plan) is missing', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    const result = stageGate('execute', { phaseDir: dir });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /plan handoff missing/);
    assert.match(result.stderr, /kbd-plan/);
  } finally {
    s.dispose();
  }
});

test('stageGate walks back through optional stages (analyze, spec) to find a satisfied one', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    // Written via the real writer so the handoff satisfies the ebc8f687 semantic
    // schema check (completedAt / skipped / stage), not just JSON parseability.
    stageHandoffWrite('assess', 'assessment complete', { phaseDir: dir });

    // plan's immediate predecessor is "spec", then "analyze" — both optional — then "assess",
    // which has a handoff. The gate should walk back and pass.
    const result = stageGate('plan', { phaseDir: dir });

    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

test('stageGate passes when the immediately-prior stage has a written handoff', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    stageHandoffWrite('execute', 'execution complete', { phaseDir: dir });

    const result = stageGate('reflect', { phaseDir: dir });

    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

test('stageGate treats an unparsable handoff file as missing', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(path.join(dir, 'handoffs'), { recursive: true });
    writeFileSync(path.join(dir, 'handoffs', 'analyze.handoff.json'), '{ not valid json');

    const result = stageGate('plan', { phaseDir: dir });

    assert.equal(result.status, 2);
  } finally {
    s.dispose();
  }
});

test('stageGate creates handoffs/ when absent rather than treating it as legacy-exempt', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    assert.equal(existsSync(path.join(dir, 'handoffs')), false);

    stageGate('plan', { phaseDir: dir });

    assert.equal(existsSync(path.join(dir, 'handoffs')), true);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// phase-dir resolution precedence: explicit > env.KBD_PHASE_DIR > waypoint-derived
// ---------------------------------------------------------------------------

test('stageGate resolves the phase dir from the waypoint when nothing explicit is given', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { phase: 'p0' });

    const result = stageGate('assess', { cwd: s.root, env: {} });

    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

test('stageGate resolves childPointer into phases/<phase>/children/<ptr> when that dir exists', () => {
  const s = scratch();
  try {
    const dir = path.join(phaseDirOf(s.root, 'p0'), 'children', 'c1');
    mkdirSync(dir, { recursive: true });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {
      phase: 'p0',
      childPointer: 'c1',
    });

    const result = stageGate('assess', { cwd: s.root, env: {} });

    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

test('env.KBD_PHASE_DIR is used when no explicit phaseDir is given', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    const result = stageGate('assess', { cwd: s.root, env: { KBD_PHASE_DIR: dir } });

    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// stageHandoffWrite
// ---------------------------------------------------------------------------

test('stageHandoffWrite atomically writes handoffs/<stage>.handoff.json with the next stage named', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    stageHandoffWrite('assess', 'ready for analysis', { phaseDir: dir });

    const written = JSON.parse(readFileSync(path.join(dir, 'handoffs', 'assess.handoff.json'), 'utf8'));
    assert.equal(written.stage, 'assess');
    assert.equal(written.nextStage, 'analyze');
    assert.equal(written.summaryForNext, 'ready for analysis');
    assert.equal(written.skipped, false);
    assert.equal(written.skipReason, null);
    assert.ok(written.completedAt);
  } finally {
    s.dispose();
  }
});

test('stageHandoffWrite records outputs and a null nextStage for the terminal stage', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    stageHandoffWrite('reflect', 'done', ['REFLECTION.md', 'summary.txt'], { phaseDir: dir });

    const written = JSON.parse(readFileSync(path.join(dir, 'handoffs', 'reflect.handoff.json'), 'utf8'));
    assert.equal(written.nextStage, null);
    assert.deepEqual(written.outputs, ['REFLECTION.md', 'summary.txt']);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// stageHandoffSkip
// ---------------------------------------------------------------------------

test('stageHandoffSkip records skipped:true with the given reason', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    stageHandoffSkip('analyze', 'trivial phase, no analysis needed', { phaseDir: dir });

    const written = JSON.parse(readFileSync(path.join(dir, 'handoffs', 'analyze.handoff.json'), 'utf8'));
    assert.equal(written.skipped, true);
    assert.equal(written.skipReason, 'trivial phase, no analysis needed');
    assert.equal(written.summaryForNext, 'skipped: trivial phase, no analysis needed');
  } finally {
    s.dispose();
  }
});

test('stageHandoffSkip defaults the reason to "unspecified"', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    stageHandoffSkip('spec', undefined, { phaseDir: dir });

    const written = JSON.parse(readFileSync(path.join(dir, 'handoffs', 'spec.handoff.json'), 'utf8'));
    assert.equal(written.skipReason, 'unspecified');
  } finally {
    s.dispose();
  }
});

test('a stageHandoffSkip for an optional stage satisfies stageGate for the following stage', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(path.join(dir, 'handoffs'), { recursive: true });
    writeJson(path.join(dir, 'handoffs', 'assess.handoff.json'), { stage: 'assess' });

    stageHandoffSkip('analyze', 'no analysis needed', { phaseDir: dir });

    const result = stageGate('spec', { phaseDir: dir });
    assert.equal(result.status, 0);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Plan→Execute boundary (mini #60, port of ebc8f687): semantic handoff schema,
// required contract-bound identity, CLOSED-phase refusal, full readiness gate
// ---------------------------------------------------------------------------

const VALID_CONTRACT_DIGEST = 'a'.repeat(64);

const boundaryIdentity = (overrides = {}) => ({
  projectId: 'proj',
  runId: 'run',
  phaseId: 'p0',
  planRevision: 1,
  contractDigest: VALID_CONTRACT_DIGEST,
  ...overrides,
});

test('stageGate blocks execute when the plan handoff fails the semantic schema check', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(path.join(dir, 'handoffs'), { recursive: true });
    writeJson(path.join(dir, 'handoffs', 'plan.handoff.json'), { stage: 'plan' }); // no completedAt/skipped

    const result = stageGate('execute', { phaseDir: dir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /fails schema check/);
  } finally {
    s.dispose();
  }
});

test('stageGate blocks execute when the plan handoff carries no identity (pre-#60 handoff)', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    stageHandoffWrite('plan', 'plan ready', { phaseDir: dir }); // writer omits identity when unset

    const result = stageGate('execute', { phaseDir: dir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /plan handoff identity missing/);
    assert.match(result.stderr, /kbd-contract-adopt/);
  } finally {
    s.dispose();
  }
});

test('stageGate blocks execute when plan handoff identity fields are incomplete', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    stageHandoffWrite('plan', 'plan ready', { phaseDir: dir, identity: { projectId: 'proj' } });

    const result = stageGate('execute', { phaseDir: dir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /plan handoff identity missing-runId/);
  } finally {
    s.dispose();
  }
});

test('stageGate blocks execute when handoff identity.phaseId disagrees with the phase', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    stageHandoffWrite('plan', 'plan ready', { phaseDir: dir, identity: boundaryIdentity({ phaseId: 'other-phase' }) });

    const result = stageGate('execute', { phaseDir: dir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /identity\.phaseId=other-phase disagrees/);
  } finally {
    s.dispose();
  }
});

test('stageGate blocks execute when identity is bound but no adopted contract exists (readiness BLOCKED)', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    stageHandoffWrite('plan', 'plan ready', { phaseDir: dir, identity: boundaryIdentity() });

    const result = stageGate('execute', { phaseDir: dir, env: {} });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /readiness validation failed/);
    assert.match(result.stderr, /missing=contract/);
  } finally {
    s.dispose();
  }
});

/** A minimal structurally-valid adopted contract + the status fixture that satisfies readiness. */
const adoptFixture = (dir, root) => {
  const contract = {
    contractVersion: '1',
    kind: 'kbd.adopted-contract',
    identity: { projectId: 'proj', runId: 'run', phaseId: 'p0', planRevision: 1, contractDigest: null },
    digestNormalization: { algorithm: 'sha256', command: 'lib/kbd/adopted-contract.mjs', stalenessRule: 'STALE iff digests differ' },
    adoptionSource: 'operator instruction (test fixture)',
    decisionOwner: 'tester',
    amendmentPolicy: 'amendments via --supersedes only',
    releaseClaim: { userOperation: 'adopt and verify a finite phase contract', supportedEnvironments: ['node>=22'], currentCapabilities: 'test capability statement', explicitUnknowns: [] },
    statusVocabulary: ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXERCISED'],
    scenarioMatrix: [{ id: 'MC-1', name: 'x', ownerTask: 'T1', productionEntry: 'node scripts/x.mjs', oracle: 'o', negativeControl: 'n', fixtures: 'f', evidence: 'e' }],
    functionalScope: ['MC-1'],
    resilienceScope: { policy: 'adopted never defers', deferredOptional: [] },
    exclusions: ['out of scope item'],
    requiredSafetyChecks: ['canonical writer only'],
    budgets: { timeMinutes: 10, toolCalls: 10, repairAttempts: 2, noProgressLimit: 2, tokenBudget: 'UNKNOWN', tokenFallback: 'time+toolCalls bounds', exhaustion: 'checkpoint + BLOCKED' },
    evidenceInvalidation: 'digest-keyed',
    workerRoutes: { agent: 'main', model: 'test-model' },
    boundaryPacket: { postImplementationOnly: true, singleRun: true, commands: ['node --test'], expectedEffects: [], requiredApprovals: 'none', receipts: [], cleanup: [], stopConditions: ['budgets exhausted'] },
    status: { implementationComplete: false },
  };
  const contractPath = path.join(dir, 'adopted-contract.json');
  writeJson(contractPath, contract);
  const digest = contractDigest(contract);
  const rel = `.kbd-orchestrator/phases/p0/adopted-contract.json`;
  const statusFile = writeJson(path.join(root, 'status-fixture.json'), {
    projectId: 'proj',
    runId: 'run',
    planRevision: 1,
    decisions: {
      'contract-adoption-p0-aaaaaaaa': {
        id: 'contract-adoption-p0-aaaaaaaa',
        summary: `ADOPTED-CONTRACT path=${rel} sha256=${digest} planRevision=1 adoptionSource=t owner=t scenarios=MC-1`,
        planRevision: 1,
      },
    },
  });
  writeJson(path.join(dir, 'tasks.json'), { tasks: [{ id: 'T1' }] });
  return { statusFile, digest };
};

test('stageGate passes the Plan→Execute boundary when handoff identity and adopted contract both validate', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    const { statusFile, digest } = adoptFixture(dir, s.root);
    stageHandoffWrite('plan', 'plan ready', { phaseDir: dir, identity: boundaryIdentity({ contractDigest: digest }) });

    const result = stageGate('execute', { phaseDir: dir, statusFile, env: {} });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    s.dispose();
  }
});

test('stageGate refuses execute dispatch for a CLOSED phase (PHASE-CLOSED verdict=PASS in canonical decisions)', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });
    const { statusFile, digest } = adoptFixture(dir, s.root);
    // Add a bound closure decision to the fixture.
    const status = JSON.parse(readFileSync(statusFile, 'utf8'));
    status.decisions['phase-closure-p0-12345678'] = {
      id: 'phase-closure-p0-12345678',
      summary: `PHASE-CLOSED phase=p0 verdict=PASS evidence=sha256:${'b'.repeat(64)} contract=${digest} run=run entries=1`,
    };
    writeFileSync(statusFile, JSON.stringify(status));
    stageHandoffWrite('plan', 'plan ready', { phaseDir: dir, identity: boundaryIdentity({ contractDigest: digest }) });

    const result = stageGate('execute', { phaseDir: dir, statusFile, env: {} });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /phase p0 is CLOSED/);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// Handoff identity binding (writer side of mini #60)
// ---------------------------------------------------------------------------

test('stageHandoffWrite binds ctx.identity into the handoff payload', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    stageHandoffWrite('plan', 'plan ready', { phaseDir: dir, identity: boundaryIdentity() });

    const written = JSON.parse(readFileSync(path.join(dir, 'handoffs', 'plan.handoff.json'), 'utf8'));
    assert.deepEqual(written.identity, boundaryIdentity());
  } finally {
    s.dispose();
  }
});

test('stageHandoffWrite resolves identity from ctx.env.KBD_HANDOFF_IDENTITY_JSON', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    stageHandoffWrite('plan', 'plan ready', {
      phaseDir: dir,
      env: { KBD_HANDOFF_IDENTITY_JSON: JSON.stringify(boundaryIdentity()) },
    });

    const written = JSON.parse(readFileSync(path.join(dir, 'handoffs', 'plan.handoff.json'), 'utf8'));
    assert.equal(written.identity.runId, 'run');
  } finally {
    s.dispose();
  }
});

test('stageHandoffWrite throws on invalid KBD_HANDOFF_IDENTITY_JSON', () => {
  const s = scratch();
  try {
    const dir = phaseDirOf(s.root, 'p0');
    mkdirSync(dir, { recursive: true });

    assert.throws(
      () => stageHandoffWrite('plan', 'plan ready', { phaseDir: dir, env: { KBD_HANDOFF_IDENTITY_JSON: '{ nope' } }),
      /not valid JSON/,
    );
  } finally {
    s.dispose();
  }
});
