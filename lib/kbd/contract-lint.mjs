// Adoption-time lint for KBD adopted contracts (VLBV CR-19, CR-30). Port of the full pack's
// shared/scripts/kbd-contract-lint.mjs (1.15.0) as a pure function plus a file-reading wrapper.
//
// Document checks only: it reads the contract (and, when supplied, the canonical status JSON and
// the phase's review findings) and never executes generated code, so it is legal before the
// value-phase boundary. lib/kbd/contract-adopt.mjs runs it after structural validation and
// before any canonical write; `--lint-only` runs it alone.
//
// A bound v1 contract keeps the rules it was adopted under until its phase closes: only the
// scenario-ID check applies to it. Every other check is new in version 2.

import { existsSync, readFileSync } from 'node:fs';
import { SCENARIO_ID } from './adopted-contract.mjs';

const VERDICTS = ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXERCISED'];
const COMMAND_KINDS = ['build', 'run', 'scenario', 'negativeControl'];
const CLOSURE_STATES = ['implementationComplete', 'behaviorAccepted', 'releaseEligible', 'releaseAuthorized'];
const PLACEHOLDER = /<[a-z][a-z0-9 _./-]*>|\bTODO\b|\bTBD\b|\bFIXME\b/;
const ACCEPTANCE_CONTENT = /scenarioMatrix|boundaryPacket|oracle|negativeControl|scenario/i;
const SOURCE_REQUIREMENT = /^(openspec:|speckit:|native:|assumption: ).+/;
const EXIT_STATUS_ONLY = /^\s*(process\s+)?exit(\s*(code|status))?\s*(==|=|is)?\s*0?\s*$/i;
const SUT_TRUTH = /system under test|the sut\b|same (binary|service|process)/;

/** Template text left in any string of the contract (identity is stamped by the writer). */
function placeholderDefects(contract) {
  const defects = [];
  const walk = (value, where) => {
    if (typeof value === 'string') {
      if (PLACEHOLDER.test(value)) defects.push(`placeholder: ${where} still contains template text: ${value.slice(0, 80)}`);
      return;
    }
    if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${where}[${i}]`));
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (where === 'contract' && key === 'identity') continue;
        walk(child, `${where}.${key}`);
      }
    }
  };
  walk(contract, 'contract');
  return defects;
}

/** ownerTask must exist in the canonical task surface once tasks are registered. */
function ownerTaskDefects(contract, scenarios, status) {
  if (!status) return [];
  const phase = status.phases?.[contract.identity?.phaseId];
  const tasks = new Set();
  for (const [changeId, change] of Object.entries(phase?.changes ?? {})) {
    const list = Array.isArray(change?.tasks) ? change.tasks : Object.values(change?.tasks ?? {});
    for (const task of list) {
      if (!task?.id) continue;
      tasks.add(task.id);
      tasks.add(`${changeId}/${task.id}`);
    }
  }
  if (tasks.size === 0) return [];
  return scenarios.flatMap((s) => String(s.ownerTask ?? '').split('+').map((t) => t.trim()).filter(Boolean)
    .filter((task) => !tasks.has(task))
    .map((task) => `owner-task: ${s.id}: ownerTask ${task} is not a registered task of phase ${contract.identity?.phaseId}`));
}

/** Unresolved CRITICAL review findings on acceptance content block adoption (CR-30). */
function reviewDefects({ review, reviewPath, reviewUnreadable, ownerDecision, status }) {
  if (reviewUnreadable) {
    return [`review-unreadable: ${reviewPath} exists but is not valid findings JSON (findings[]); fix it before adoption`];
  }
  if (!review) return [];
  const critical = (review.findings ?? []).filter((f) => f?.severity === 'CRITICAL'
    && ACCEPTANCE_CONTENT.test(`${f.file ?? ''} ${f.claim ?? ''} ${f.evidence ?? ''}`));
  if (critical.length === 0) return [];
  if (!ownerDecision) {
    return [`review-critical: ${critical.length} unresolved CRITICAL review finding(s) on acceptance content; adoption waits for an owner decision (--owner-decision <decision-id>)`];
  }
  // The override must name a canonical decision that actually exists.
  const decisions = status?.decisions ?? null;
  const known = Boolean(decisions)
    && (Object.values(decisions).some((d) => d?.id === ownerDecision) || ownerDecision in decisions);
  return known ? [] : [`review-critical: --owner-decision ${ownerDecision} is not a recorded canonical decision; record it with prometheus kbd decision record first`];
}

function packetDefects(commands) {
  return commands.flatMap((c) => {
    if (!c || typeof c !== 'object' || !Array.isArray(c.argv) || c.argv.length === 0) {
      return [`packet-command: boundaryPacket.commands entries must be typed objects with argv (got ${JSON.stringify(c)?.slice(0, 60)})`];
    }
    return COMMAND_KINDS.includes(c.kind) ? [] : [`packet-command: ${c.id}: kind must be build, run, scenario or negativeControl`];
  });
}

function scopeDefects(contract, scenarios) {
  const covered = new Set(scenarios.flatMap((s) => (Array.isArray(s.scopeRefs) ? s.scopeRefs : [])));
  return (contract.functionalScope ?? []).flatMap((item) => {
    if (typeof item === 'object' && item?.nonObservable === true) return [];
    const text = typeof item === 'string' ? item : item?.item;
    return covered.has(text) ? []
      : [`scope-unmapped: functionalScope item maps to no scenario (scopeRefs) and is not marked nonObservable: ${String(text).slice(0, 80)}`];
  });
}

function scenarioDefects(s, commands, byId) {
  const defects = [];
  if (!commands.some((c) => c?.kind === 'scenario' && (c.scenarioIds ?? []).includes(s.id))) {
    defects.push(`scenario-command: ${s.id}: no boundaryPacket command of kind scenario lists it`);
  }
  const ref = s.negativeControl?.commandRef;
  const negative = ref ? byId.get(ref) : null;
  if (!ref) defects.push(`negative-control-command: ${s.id}: negativeControl.commandRef is missing`);
  else if (!negative || negative.kind !== 'negativeControl') {
    defects.push(`negative-control-command: ${s.id}: negativeControl.commandRef ${ref} is not a negativeControl command of the packet`);
  }
  const comparator = String(s.oracle?.comparator ?? '');
  if (EXIT_STATUS_ONLY.test(comparator) || /^exit[-_ ]code$/i.test(comparator)) {
    defects.push(`weak-oracle: ${s.id}: comparator is only a process exit status`);
  }
  const truth = String(s.oracle?.expectedTruthSource ?? '').trim().toLowerCase();
  if (!truth || SUT_TRUTH.test(truth) || (s.productionEntry && truth === String(s.productionEntry).trim().toLowerCase())) {
    defects.push(`weak-oracle: ${s.id}: expectedTruthSource must be independent of the system under test`);
  }
  const st = s.stochastic;
  if (s.nondeterministic === true && !(st && Number.isInteger(st.samples) && st.grader && st.stoppingRule)) {
    defects.push(`stochastic-missing: ${s.id}: marked nondeterministic without a stochastic block (samples, grader, stoppingRule)`);
  }
  if (!SOURCE_REQUIREMENT.test(String(s.sourceRequirement ?? ''))) {
    defects.push(`source-requirement: ${s.id}: sourceRequirement must be an openspec:/speckit:/native: reference or 'assumption: <text>'`);
  }
  return defects;
}

function safetyDefects(contract, ids) {
  return (contract.requiredSafetyChecks ?? []).flatMap((check) => {
    if (typeof check !== 'object' || !Array.isArray(check?.scenarioIds) || check.scenarioIds.length === 0) {
      return [`safety-unmapped: requiredSafetyChecks entry maps to no scenario: ${JSON.stringify(check).slice(0, 80)}`];
    }
    return check.scenarioIds.filter((id) => !ids.has(id)).map((id) => `safety-unmapped: ${check.id}: scenario ${id} does not exist`);
  });
}

function versionTwoDefects(contract, scenarios, context) {
  const commands = Array.isArray(contract.boundaryPacket?.commands) ? contract.boundaryPacket.commands : [];
  const byId = new Map(commands.map((c) => [c?.id, c]));
  const defects = [
    ...placeholderDefects(contract),
    ...ownerTaskDefects(contract, scenarios, context.status),
    ...reviewDefects(context),
  ];
  if (JSON.stringify(contract.statusVocabulary) !== JSON.stringify(VERDICTS)) {
    defects.push(`status-vocabulary: must be exactly ${JSON.stringify(VERDICTS)}`);
  }
  defects.push(...packetDefects(commands), ...scopeDefects(contract, scenarios));
  for (const s of scenarios) defects.push(...scenarioDefects(s, commands, byId));
  defects.push(...safetyDefects(contract, new Set(scenarios.map((s) => s.id))));
  for (const key of CLOSURE_STATES) {
    if (typeof contract.closure?.[key] !== 'boolean') defects.push(`closure: closure.${key} must be a boolean`);
  }
  if (contract.method?.name !== 'VLBV') {
    defects.push('method: method.name must be "VLBV" (deviations are signed KBD-METHOD decisions, not contract text)');
  }
  if (!/^[0-9a-f]{64}$/.test(contract.calibration?.sha256 ?? '')) {
    defects.push('calibration: calibration.sha256 must be the SHA-256 of the owner-reviewed examples');
  }
  return defects;
}

/**
 * Lint one contract. `context`: { status, review, reviewPath, reviewUnreadable, ownerDecision }.
 * Returns { defects: string[] ("<code>: <message>"), summary }.
 */
export function lintContract(contract, context = {}) {
  const scenarios = Array.isArray(contract?.scenarioMatrix) ? contract.scenarioMatrix : [];
  const defects = scenarios.filter((s) => !SCENARIO_ID.test(s?.id ?? ''))
    .map((s) => `scenario-id: ${s?.id ?? '<missing>'} does not match ${SCENARIO_ID}`);
  if (contract?.contractVersion === '2') defects.push(...versionTwoDefects(contract, scenarios, context));
  return {
    defects,
    summary: `kbd-contract-lint: ${scenarios.length} scenario(s) clean (contract v${contract?.contractVersion})`,
  };
}

/**
 * Read the optional review findings file. An existing file that cannot be read must not
 * silently disable the CRITICAL-finding gate, so it is reported as unreadable.
 */
export function readReviewFindings(reviewPath) {
  if (!reviewPath || !existsSync(reviewPath)) return { review: null, reviewUnreadable: false };
  try {
    const review = JSON.parse(readFileSync(reviewPath, 'utf8'));
    return { review, reviewUnreadable: !review || !Array.isArray(review.findings) };
  } catch {
    return { review: null, reviewUnreadable: true };
  }
}
