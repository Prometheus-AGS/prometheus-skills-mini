// The doctor's contract, in code. `contract.md` is the same contract in prose, plus the
// divergence table against the-boss's shape and the adapter mapping.
//
// This is the MINI's contract, not a mirror of the-boss's: its DoctorCheckRegistry is
// exhaustive over a closed DoctorCheckId union, so a mini check cannot be registered
// there and the mini cannot emit its outcome type. The-boss spawns scripts/doctor.mjs
// and maps these JSON lines instead.
//
// Every function returns an ARRAY OF HUMAN-READABLE FAILURES, empty when conformant —
// never a boolean. A gate that answers only yes/no cannot say what is wrong, and a
// caller cannot tell "conformant" from "did not look".

const ID = /^mini-[a-z0-9-]+$/;
const STATUSES = ['pass', 'warn', 'fail', 'skip'];
const FIX_STATUSES = ['fixed', 'requires_relaunch', 'refused'];

const isText = (v) => typeof v === 'string' && v.trim() !== '';

/** Failures in one outcome from a check's `run`. */
export function outcomeConformance(outcome, where = 'outcome') {
  const found = [];
  if (typeof outcome !== 'object' || outcome === null) return [`${where}: not an object`];

  if (!STATUSES.includes(outcome.status)) {
    found.push(`${where}: status ${JSON.stringify(outcome.status)} is not one of ${STATUSES.join(', ')}`);
  }
  if (!isText(outcome.summary)) {
    found.push(`${where}: summary ${JSON.stringify(outcome.summary)} must be a non-empty string`);
  }
  if (outcome.detail !== undefined && typeof outcome.detail !== 'string') {
    found.push(`${where}: detail must be a string when present`);
  }
  if (outcome.actions !== undefined) {
    if (!Array.isArray(outcome.actions)) {
      found.push(`${where}: actions must be an array when present`);
    } else {
      for (const [i, action] of outcome.actions.entries()) {
        if (action?.kind !== 'fix' || !isText(action.fixId)) {
          found.push(`${where}: actions[${i}] must be { kind: 'fix', fixId: <non-empty string> }`);
        }
      }
    }
  }
  return found;
}

/** Failures in one fix result. */
export function fixOutcomeConformance(outcome, where = 'fix outcome') {
  const found = [];
  if (typeof outcome !== 'object' || outcome === null) return [`${where}: not an object`];

  if (!FIX_STATUSES.includes(outcome.status)) {
    // 'failed' is deliberately absent: it is the-boss's status, which its adapter
    // produces from our 'refused'. Accepting it here would blur the two contracts.
    found.push(`${where}: status ${JSON.stringify(outcome.status)} is not one of ${FIX_STATUSES.join(', ')}`);
  }
  if (!isText(outcome.summary)) {
    found.push(`${where}: summary ${JSON.stringify(outcome.summary)} must be a non-empty string`);
  }
  return found;
}

/**
 * Failures in one check's static shape. `offers` lists the fix ids the check may put in an
 * outcome's `actions`; static validation cannot see inside `run`, so the check declares them
 * and this pairs the declaration against `fixes`.
 */
export function checkConformance(check, where = null) {
  const found = [];
  if (typeof check !== 'object' || check === null) return ['check: not an object'];

  const label = where ?? (isText(check.id) ? check.id : '(unnamed check)');

  if (typeof check.id !== 'string' || !ID.test(check.id)) {
    found.push(`${label}: id ${JSON.stringify(check.id)} must match ${ID}`);
  }
  if (!isText(check.title)) {
    found.push(`${label}: title ${JSON.stringify(check.title)} must be a non-empty string`);
  }
  if (typeof check.run !== 'function') {
    found.push(`${label}: run must be a function`);
  }

  const offers = check.offers ?? [];
  const fixes = check.fixes ?? {};
  if (!Array.isArray(offers)) {
    found.push(`${label}: offers must be an array when present`);
    return found;
  }
  if (typeof fixes !== 'object' || fixes === null) {
    found.push(`${label}: fixes must be an object when present`);
    return found;
  }

  for (const fixId of offers) {
    if (typeof fixes[fixId] !== 'function') {
      found.push(`${label}: offers ${JSON.stringify(fixId)} but fixes does not implement it`);
    }
  }
  for (const fixId of Object.keys(fixes)) {
    if (!offers.includes(fixId)) {
      found.push(`${label}: implements fix ${JSON.stringify(fixId)} that no outcome can offer`);
    }
  }
  return found;
}

/** Failures across the whole registered set, including duplicate ids. */
export function registryConformance(checks) {
  if (!Array.isArray(checks)) return ['registry: not an array'];
  // An empty registry would satisfy every per-check rule vacuously, so a conformance
  // report over it would say "all checks conform" having examined none. The doctor's
  // whole job is to not do that.
  if (checks.length === 0) return ['registry: empty — no checks are registered'];

  const found = [];
  const seen = new Set();
  for (const [i, check] of checks.entries()) {
    found.push(...checkConformance(check, isText(check?.id) ? check.id : `check[${i}]`));

    if (isText(check?.id)) {
      if (seen.has(check.id)) found.push(`${check.id}: duplicate id`);
      seen.add(check.id);
    }
  }
  return found;
}
