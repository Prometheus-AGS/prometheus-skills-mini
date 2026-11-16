// Evidence gate for harness capability profiles (port of the full pack's
// scripts/check-harness-adapters.js profile section, VLBV CR-23 / FR-H7 and
// vlbv-r4-portability T5).
//
// Unknown is not supported. A profile field may say "supported" only when:
//   1. the profile records an exercised run: verified.exercised === true and
//      verified.evidence names a committed file under the pack root; and
//   2. the field carries its own evidence, either {file} (a committed file) or
//      {report, caseId}: a protocol-eval report of the SAME harness in which that case's
//      verdict is PASS and whose corpus entry declares that capability field.
// Every profile must also declare rulesFiles, skillRoots, invocation, canExecuteBoundary
// and verified.

import fs from 'node:fs';
import path from 'node:path';
import { PACK_ROOT, profileIds } from './profiles.mjs';

export const EVAL_CORPUS = path.join('evals', 'vlbv-protocol', 'cases', 'vlbv-protocol.json');
const REQUIRED_KEYS = ['rulesFiles', 'skillRoots', 'invocation', 'canExecuteBoundary', 'verified'];

/** A path that names a file inside the pack root (no escape through `..`). */
function committedFile(root, relative) {
  if (typeof relative !== 'string' || relative === '') return null;
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) return null;
  return fs.existsSync(full) && fs.statSync(full).isFile() ? full : null;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Why a supported field's evidence does not count, or null when it does. */
export function fieldEvidenceProblem(root, harness, capability, evidence) {
  if (!evidence || typeof evidence !== 'object') return 'supported without field evidence ({file} or {report, caseId})';
  if (typeof evidence.file === 'string') {
    return committedFile(root, evidence.file) ? null : `evidence file ${evidence.file} does not exist`;
  }
  if (typeof evidence.report !== 'string' || typeof evidence.caseId !== 'string') return 'evidence must name {file} or {report, caseId}';
  const reportFile = committedFile(root, evidence.report);
  if (!reportFile) return `evidence report ${evidence.report} does not exist`;
  const report = readJson(reportFile);
  if (!report) return `evidence report ${evidence.report} is not JSON`;
  if (report.harness !== harness) return `evidence report is for harness ${report.harness}, not ${harness}`;
  const reportCase = (report.cases ?? []).find((entry) => entry.id === evidence.caseId);
  if (!reportCase) return `evidence case ${evidence.caseId} is not in ${evidence.report}`;
  if (reportCase.verdict !== 'PASS') return `evidence case ${evidence.caseId} has verdict ${reportCase.verdict}; only PASS counts`;
  const corpusFile = committedFile(root, EVAL_CORPUS);
  if (!corpusFile) return `eval corpus ${EVAL_CORPUS.split(path.sep).join('/')} is missing`;
  const corpusCase = (readJson(corpusFile)?.cases ?? []).find((entry) => entry.id === evidence.caseId);
  const fields = corpusCase?.capabilityFields ?? [];
  return fields.includes(capability) ? null : `evidence case ${evidence.caseId} exercises ${fields.join(',') || 'no capability'}, not ${capability}`;
}

/**
 * @param {{profiles: Record<string, object>}} capabilities
 * @param {string} [root] pack root that evidence paths resolve against
 * @returns {{failures: string[], supported: Array<{harness: string, capability: string}>}}
 */
export function checkProfileEvidence(capabilities, root = PACK_ROOT) {
  const failures = [];
  const supported = [];
  for (const harness of profileIds(capabilities)) {
    const profile = capabilities.profiles[harness];
    const verified = profile.verified ?? {};
    const exercised = verified.exercised === true && committedFile(root, verified.evidence) !== null;
    for (const [capability, value] of Object.entries(profile)) {
      if (!value || typeof value !== 'object' || value.status !== 'supported') continue;
      supported.push({ harness, capability });
      if (!exercised) {
        failures.push(`${harness}: profile claims ${capability} supported without exercised evidence (verified.exercised + committed verified.evidence)`);
      }
      const problem = fieldEvidenceProblem(root, harness, capability, value.evidence);
      if (problem) failures.push(`${harness}: ${capability} ${problem}`);
    }
    for (const key of REQUIRED_KEYS) {
      if (!(key in profile)) failures.push(`${harness}: profile omits ${key}`);
    }
  }
  return { failures, supported };
}
