// Shared core for the mini KBD adopted completion contract (mini #60, port of
// prometheus-skill-pack ebc8f687: shared/scripts/kbd-contract-adopt.sh validation/digest
// helpers, kbd-phase-readiness-check.sh adoption/quality gates, and the budget predicate
// from kbd-phase-close-eval.sh — as pure functions, no shell, no jq).
//
// The digest normalization is the Node equivalent of the source's frozen command
// `jq -S -c 'del(.identity.contractDigest) | del(.identity.planRevision)' | shasum -a 256`:
// recursively key-sorted compact JSON (codepoint order for ASCII keys, identical to jq -S)
// with the two stamped identity fields removed, hashed with node:crypto sha256. Writer and
// checker in this repo share THIS function, which is what the staleness rule requires.

import { createHash } from 'node:crypto';

/** Recursively key-sorted compact JSON — the jq -S -c equivalent. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/** The digest input: contract with the stamped identity fields removed (digest-neutral). */
export function digestPayload(contract) {
  const { identity, ...rest } = contract ?? {};
  const { contractDigest: _digest, planRevision: _rev, ...identityRest } = identity ?? {};
  return { ...rest, identity: identityRest };
}

/** sha256 hex of the normalized contract. */
export function contractDigest(contract) {
  return createHash('sha256').update(stableStringify(digestPayload(contract)), 'utf8').digest('hex');
}

/** sha256 hex of a UTF-8 string or Buffer (file freshness checks). */
export function sha256Of(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const SCENARIO_ID = /^[A-Z]+-[0-9]+$/;
const DIGEST_RE = /^[0-9a-f]{64}$/;

/**
 * Structural + contract-quality validation, shared by the adoption writer (exit 2 on failure)
 * and the readiness checker (MALFORMED, exit 5). Returns an array of error codes; empty means
 * structurally adoptable. Codes intentionally match the source pack's jq-emitted names so
 * receipts read the same on both packs.
 */
export function validateAdoptedContract(contract) {
  const c = contract ?? {};
  const errors = [];
  const need = (ok, code) => { if (!ok) errors.push(code); };

  need(isNonEmptyString(c.contractVersion), 'missing:contractVersion');
  need(c.kind === 'kbd.adopted-contract', 'kind');
  need(isNonEmptyString(c.identity?.projectId), 'identity.projectId');
  need(isNonEmptyString(c.identity?.runId), 'identity.runId');
  need(isNonEmptyString(c.identity?.phaseId), 'identity.phaseId');
  need(c.identity?.contractDigest == null || DIGEST_RE.test(c.identity.contractDigest), 'bad-contractDigest-format');
  need(c.digestNormalization?.algorithm === 'sha256', 'digestNormalization.algorithm');
  need(isNonEmptyString(c.digestNormalization?.command), 'digestNormalization.command');
  need(isNonEmptyString(c.digestNormalization?.stalenessRule), 'digestNormalization.stalenessRule');
  need(isNonEmptyString(c.adoptionSource), 'missing:adoptionSource');
  need(isNonEmptyString(c.decisionOwner), 'missing:decisionOwner');
  need(isNonEmptyString(c.amendmentPolicy), 'missing:amendmentPolicy');
  need(isNonEmptyString(c.releaseClaim?.userOperation) && c.releaseClaim.userOperation.length >= 10, 'releaseClaim.userOperation');
  need(Array.isArray(c.releaseClaim?.supportedEnvironments) && c.releaseClaim.supportedEnvironments.length > 0, 'missing:releaseClaim.supportedEnvironments');
  need(isNonEmptyString(c.releaseClaim?.currentCapabilities), 'missing:releaseClaim.currentCapabilities');
  need(Array.isArray(c.statusVocabulary) && c.statusVocabulary.length >= 4, 'statusVocabulary-too-short');

  const scenarios = Array.isArray(c.scenarioMatrix) ? c.scenarioMatrix : [];
  need(scenarios.length > 0, 'scenarioMatrix');
  const ids = scenarios.map((s) => s?.id);
  need(new Set(ids).size === ids.length, 'scenarioMatrix-duplicate-ids');
  need(ids.every((id) => typeof id === 'string' && SCENARIO_ID.test(id)), 'scenario-id-pattern');
  need(
    scenarios.every((s) =>
      isNonEmptyString(s?.productionEntry) && isNonEmptyString(s?.oracle) &&
      isNonEmptyString(s?.negativeControl) && isNonEmptyString(s?.ownerTask) &&
      isNonEmptyString(s?.evidence) && isNonEmptyString(s?.fixtures)),
    'scenarioMatrix-quality(productionEntry/oracle/negativeControl/ownerTask/evidence/fixtures)',
  );

  need(Array.isArray(c.functionalScope) && c.functionalScope.length > 0, 'functionalScope-empty');
  need(Array.isArray(c.exclusions) && c.exclusions.length > 0, 'exclusions');
  need(Array.isArray(c.requiredSafetyChecks) && c.requiredSafetyChecks.length > 0, 'requiredSafetyChecks');

  const b = c.budgets ?? {};
  need(
    Number.isInteger(b.timeMinutes) && b.timeMinutes >= 1 &&
    Number.isInteger(b.toolCalls) && b.toolCalls >= 1 &&
    Number.isInteger(b.repairAttempts) && b.repairAttempts >= 0 &&
    Number.isInteger(b.noProgressLimit) && b.noProgressLimit >= 1,
    'budgets',
  );
  need(isNonEmptyString(b.tokenBudget), 'missing:budgets.tokenBudget');
  need(b.tokenBudget !== 'UNKNOWN' || isNonEmptyString(b.tokenFallback), 'budgets.tokenFallback');
  need(isNonEmptyString(b.exhaustion), 'missing:budgets.exhaustion');

  need(isNonEmptyString(c.evidenceInvalidation), 'missing:evidenceInvalidation');
  need(isNonEmptyString(c.workerRoutes?.agent), 'missing:workerRoutes.agent');
  need(isNonEmptyString(c.workerRoutes?.model), 'missing:workerRoutes.model');

  const p = c.boundaryPacket ?? {};
  need(p.postImplementationOnly === true, 'boundaryPacket.postImplementationOnly-must-be-true');
  need(p.singleRun === true, 'boundaryPacket.singleRun-must-be-true');
  need(Array.isArray(p.commands) && p.commands.length > 0, 'boundaryPacket.commands-empty');
  need(Array.isArray(p.stopConditions) && p.stopConditions.length > 0, 'boundaryPacket.stopConditions-empty');
  need(typeof c.status?.implementationComplete === 'boolean', 'missing:status.implementationComplete');

  return errors;
}

/**
 * The latest non-superseded adoption decision for `relPath` inside a canonical status JSON.
 * Returns null when absent, the string 'ambiguous' when more than one non-superseded adoption
 * exists (operator adjudication required), otherwise { id, digest, planRevision }.
 */
export function latestAdoption(statusJson, relPath) {
  const decisions = Object.values(statusJson?.decisions ?? {});
  const marker = `ADOPTED-CONTRACT path=${relPath} `;
  const adoptions = decisions.filter((d) => typeof d?.summary === 'string' && d.summary.includes(marker));
  const supersededIds = new Set(adoptions.map((d) => d?.supersedes).filter(Boolean));
  const live = adoptions.filter((d) => !supersededIds.has(d?.id));
  if (live.length === 0) return null;
  if (live.length > 1) return 'ambiguous';
  const match = /sha256=([0-9a-f]{64})/.exec(live[0].summary);
  return { id: live[0].id, digest: match ? match[1] : 'NODIGEST', planRevision: live[0].planRevision ?? null };
}

const BUDGET_KEYS = ['timeMinutes', 'toolCalls', 'repairAttempts', 'noProgressLimit'];

/**
 * Effective ceilings from an adopted contract's budgets block. Base budgets plus extensions,
 * in order. An extension field may be: a number (additive allowance), or an object with
 * operation 'add' | 'replace' | 'unchanged' (a replacement ceiling or an explicitly unchanged
 * setting — an additive time/tool extension must never silently double a no-progress
 * threshold). The latest extension carrying explicit `resultingCeilings` replaces the running
 * totals; extensions after it still apply. Consumption history is never part of this input —
 * ceilings come from the contract, consumption from evidence.
 */
export function computeCeilings(budgets = {}) {
  const extensions = Array.isArray(budgets.extensions) ? budgets.extensions : [];
  const lastSnapshot = extensions.reduce(
    (found, ext, index) => (ext?.resultingCeilings ? index : found),
    -1,
  );
  const ceilings = {
    timeMinutes: budgets.timeMinutes ?? 0,
    toolCalls: budgets.toolCalls ?? 0,
    repairAttempts: budgets.repairAttempts ?? 0,
    noProgressLimit: budgets.noProgressLimit ?? 0,
  };
  if (lastSnapshot !== -1) {
    const snap = extensions[lastSnapshot].resultingCeilings;
    for (const key of BUDGET_KEYS) if (Number.isInteger(snap?.[key])) ceilings[key] = snap[key];
  }
  for (const ext of extensions.slice(lastSnapshot + 1)) {
    for (const key of BUDGET_KEYS) {
      const v = ext?.[key];
      if (Number.isInteger(v)) ceilings[key] += v;
      else if (v?.operation === 'add') ceilings[key] += v.value ?? v.absolute ?? 0;
      else if (v?.operation === 'replace') ceilings[key] = v.absolute ?? v.value ?? ceilings[key];
      // operation 'unchanged' (and absent fields) preserve the running ceiling.
    }
  }
  return ceilings;
}

const CONSUMPTION_TO_CEILING = {
  timeMinutes: 'timeMinutes',
  toolCalls: 'toolCalls',
  repairAttempts: 'repairAttempts',
  noProgress: 'noProgressLimit',
};

/**
 * The terminal budget predicate. `consumption` is the evidence's budgetConsumption header —
 * self-reported accounting (its `source` must say so), NOT independent telemetry. Values
 * classed 'unknown' (or null) are not enforced; the declared time/tool fallback governs them.
 * Outcomes:
 *   { outcome: 'missing' }         no budgetConsumption header at all — caller refuses BLOCKED
 *   { outcome: 'source-missing' }  header without a named source — caller refuses BLOCKED
 *   { outcome: 'exceeded', hits }  consumption ABOVE a ceiling — closure refused
 *   { outcome: 'at-ceiling', hits } consumption AT a ceiling — closure of completed in-budget
 *                                   work allowed; no further work admitted
 *   { outcome: 'ok' }              within ceilings
 */
export function budgetPredicate(contract, consumption) {
  if (consumption == null) return { outcome: 'missing' };
  if (!isNonEmptyString(consumption.source)) return { outcome: 'source-missing' };
  const ceilings = computeCeilings(contract?.budgets);
  const values = consumption.values ?? {};
  const exceeded = [];
  const atCeiling = [];
  for (const [consumptionKey, ceilingKey] of Object.entries(CONSUMPTION_TO_CEILING)) {
    const entry = values[consumptionKey];
    if (entry == null || entry.value == null || (entry.class ?? 'unknown') === 'unknown') continue;
    const ceiling = ceilings[ceilingKey] ?? 0;
    if (entry.value > ceiling) exceeded.push(`${consumptionKey}(${entry.value}>${ceiling},${entry.class})`);
    else if (entry.value === ceiling) atCeiling.push(consumptionKey);
  }
  if (exceeded.length > 0) return { outcome: 'exceeded', hits: exceeded, ceilings, source: consumption.source };
  if (atCeiling.length > 0) return { outcome: 'at-ceiling', hits: atCeiling, ceilings, source: consumption.source };
  return { outcome: 'ok', ceilings, source: consumption.source };
}

/** POSIX-style repo-relative path (adoption decisions are platform-stable across Windows). */
export function repoRelative(root, absolutePath) {
  const rel = absolutePath.startsWith(root) ? absolutePath.slice(root.length) : absolutePath;
  return rel.replace(/^[/\\]+/, '').split('\\').join('/');
}
