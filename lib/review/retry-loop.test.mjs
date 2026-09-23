// Port of adversarial-review/scripts/review-retry-loop.sh (prometheus-skill-pack, 129 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMaxRounds, countCritical, evaluateRetryState, renderUnresolvedSection } from './retry-loop.mjs';

test('resolveMaxRounds defaults to 2 when unset', () => {
  assert.equal(resolveMaxRounds({}), 2);
});

test('resolveMaxRounds honours a positive integer override', () => {
  assert.equal(resolveMaxRounds({ PROMETHEUS_ADV_RETRY_ROUNDS: '4' }), 4);
});

test('resolveMaxRounds falls back to 2 on a non-numeric or non-positive value', () => {
  assert.equal(resolveMaxRounds({ PROMETHEUS_ADV_RETRY_ROUNDS: 'abc' }), 2);
  assert.equal(resolveMaxRounds({ PROMETHEUS_ADV_RETRY_ROUNDS: '0' }), 2);
  assert.equal(resolveMaxRounds({ PROMETHEUS_ADV_RETRY_ROUNDS: '-1' }), 2);
});

test('countCritical counts only CRITICAL-severity findings, case-insensitively', () => {
  const findings = {
    findings: [{ severity: 'CRITICAL' }, { severity: 'critical' }, { severity: 'WARNING' }, { severity: 'SUGGESTION' }],
  };
  assert.equal(countCritical(findings), 2);
});

test('countCritical returns -1 for an unreadable or malformed document', () => {
  assert.equal(countCritical(null), -1);
  assert.equal(countCritical({}), -1);
  assert.equal(countCritical({ findings: 'not-an-array' }), -1);
});

test('evaluateRetryState PROCEEDs when there are zero CRITICAL findings', () => {
  const result = evaluateRetryState({ findings: [{ severity: 'WARNING' }] }, 1, { env: {} });
  assert.deepEqual(result, { state: 'PROCEED', criticalCount: 0, maxRounds: 2 });
});

test('evaluateRetryState RETRYs when CRITICAL findings remain and rounds are left', () => {
  const result = evaluateRetryState({ findings: [{ severity: 'CRITICAL' }] }, 1, { env: {} });
  assert.equal(result.state, 'RETRY');
  assert.equal(result.criticalCount, 1);
});

test('evaluateRetryState is CAPPED once the round reaches the max', () => {
  const result = evaluateRetryState({ findings: [{ severity: 'CRITICAL' }] }, 2, { env: {} });
  assert.equal(result.state, 'CAPPED');
});

test('evaluateRetryState is CAPPED (never PROCEED) on an unreadable findings file — a parse failure is not "no criticals"', () => {
  const result = evaluateRetryState(null, 1, { env: {} });
  assert.equal(result.state, 'CAPPED');
  assert.equal(result.criticalCount, -1);
});

test('renderUnresolvedSection lists every CRITICAL finding with location, evidence and fix', () => {
  const findings = {
    findings: [
      { severity: 'CRITICAL', file: 'src/a.rs', line: 12, claim: 'bug', evidence: 'hunk', suggested_fix: 'do X' },
      { severity: 'WARNING', file: 'src/b.rs', claim: 'not critical' },
    ],
  };
  const section = renderUnresolvedSection(findings, 2, 2);
  assert.match(section, /^## Unresolved review findings/);
  assert.match(section, /2-round adversarial retry cap \(stopped after round 2\)/);
  assert.match(section, /1\. \*\*src\/a\.rs:12\*\* — bug/);
  assert.match(section, /Evidence: hunk/);
  assert.match(section, /Suggested fix: do X/);
  assert.doesNotMatch(section, /not critical/);
});

test('renderUnresolvedSection flags a non-verified-distinct cross_model_check', () => {
  const findings = { cross_model_check: 'same-model-collision', findings: [{ severity: 'CRITICAL', claim: 'x', evidence: 'y' }] };
  const section = renderUnresolvedSection(findings, 1, 2);
  assert.match(section, /cross_model_check: same-model-collision/);
});

test('renderUnresolvedSection omits the cross-model note when verified-distinct', () => {
  const findings = { cross_model_check: 'verified-distinct', findings: [{ severity: 'CRITICAL', claim: 'x', evidence: 'y' }] };
  const section = renderUnresolvedSection(findings, 1, 2);
  assert.doesNotMatch(section, /cross_model_check:/);
});
