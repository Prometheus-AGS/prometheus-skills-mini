// Port of adversarial-review/scripts/check-findings-sycophancy.sh (prometheus-skill-pack, 277 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRejectCap,
  hasEmptyFindingsTrail,
  renderReportText,
  extractScore,
  extractCritical,
  dropS03WhenFindingsPresent,
  shouldReject,
} from './sycophancy-gate.mjs';

test('resolveRejectCap defaults to 2 when unset', () => {
  const result = resolveRejectCap({});
  assert.deepEqual(result, { cap: 2, overridden: false });
});

test('resolveRejectCap honours an override within the 1-5 range', () => {
  const result = resolveRejectCap({ PROMETHEUS_ADV_REJECT_CAP: '4' });
  assert.deepEqual(result, { cap: 4, overridden: true });
});

test('resolveRejectCap refuses a value above the ceiling of 5', () => {
  assert.throws(() => resolveRejectCap({ PROMETHEUS_ADV_REJECT_CAP: '6' }), /ceiling/);
});

test('resolveRejectCap refuses zero or negative', () => {
  assert.throws(() => resolveRejectCap({ PROMETHEUS_ADV_REJECT_CAP: '0' }), /at least 1/);
});

test('resolveRejectCap refuses a non-numeric value', () => {
  assert.throws(() => resolveRejectCap({ PROMETHEUS_ADV_REJECT_CAP: 'abc' }), /positive integer/);
});

test('hasEmptyFindingsTrail is true for zero findings with no checked_classes', () => {
  assert.equal(hasEmptyFindingsTrail({ findings: [] }), true);
  assert.equal(hasEmptyFindingsTrail({ findings: [], checked_classes: [] }), true);
});

test('hasEmptyFindingsTrail is false when checked_classes is non-empty', () => {
  assert.equal(hasEmptyFindingsTrail({ findings: [], checked_classes: ['auth'] }), false);
});

test('hasEmptyFindingsTrail is false when findings is non-empty', () => {
  assert.equal(hasEmptyFindingsTrail({ findings: [{ severity: 'WARNING' }] }), false);
});

test('renderReportText summarises findings for pattern analysis', () => {
  const text = renderReportText({
    mode: 'diff',
    verdict: 'BLOCK',
    findings: [{ severity: 'CRITICAL', file: 'a.rs', line: 10, claim: 'bug', evidence: 'hunk' }],
  });
  assert.match(text, /mode=diff, verdict=BLOCK/);
  assert.match(text, /Finding count: 1/);
  assert.match(text, /CRITICAL a\.rs:10 — bug\. Evidence: hunk/);
});

test('renderReportText reports checked_classes when there are no findings', () => {
  const text = renderReportText({ mode: 'diff', verdict: 'PASS', findings: [], checked_classes: ['sql injection'] });
  assert.match(text, /No findings were reported\. Checked classes: sql injection/);
});

test('extractScore reads sycophancy_score from an MCP JSON-RPC response', () => {
  const response = JSON.stringify({
    result: { content: [{ text: JSON.stringify({ sycophancy_score: 0.42 }) }] },
  });
  assert.equal(extractScore(response), 0.42);
});

test('extractScore returns null when nothing parses', () => {
  assert.equal(extractScore('not json\nat all'), null);
});

test('extractCritical returns "id:severity" tokens for high/critical classifications', () => {
  const response = JSON.stringify({
    result: {
      content: [
        {
          text: JSON.stringify({
            classifications: [
              { pattern_id: 'S-03', severity: 'high' },
              { pattern_id: 'S-08', severity: 'critical' },
              { pattern_id: 'S-01', severity: 'low' },
            ],
          }),
        },
      ],
    },
  });
  assert.deepEqual(extractCritical(response), ['S-03:high', 'S-08:critical']);
});

test('dropS03WhenFindingsPresent removes S-03 tokens only when findings exist', () => {
  assert.deepEqual(dropS03WhenFindingsPresent(['S-03:high', 'S-08:critical'], 1), ['S-08:critical']);
  assert.deepEqual(dropS03WhenFindingsPresent(['S-03:high', 'S-08:critical'], 0), ['S-03:high', 'S-08:critical']);
});

test('shouldReject rejects when the score meets the threshold', () => {
  const result = shouldReject({ score: 0.5, critical: [], nFindings: 1 });
  assert.equal(result.reject, true);
  assert.match(result.reason, /sycophancy_score=0\.5/);
});

test('shouldReject accepts a low score with no critical patterns', () => {
  const result = shouldReject({ score: 0.1, critical: [], nFindings: 1 });
  assert.equal(result.reject, false);
});

test('shouldReject rejects on an always-reject pattern (S-08) regardless of score', () => {
  const result = shouldReject({ score: 0.05, critical: ['S-08:critical'], nFindings: 1 });
  assert.equal(result.reject, true);
  assert.match(result.reason, /always-reject/);
});

test('shouldReject: a lone high/critical below the floor does not reject on its own (findings present)', () => {
  const result = shouldReject({ score: 0.1, critical: ['S-01:high'], nFindings: 1 });
  assert.equal(result.reject, false);
});

test('shouldReject: high/critical above the floor rejects', () => {
  const result = shouldReject({ score: 0.32, critical: ['S-01:high'], nFindings: 1 });
  assert.equal(result.reject, true);
});

test('shouldReject: zero-finding reports use any-critical mode (legacy strict path)', () => {
  const result = shouldReject({ score: 0.05, critical: ['S-01:high'], nFindings: 0 });
  assert.equal(result.reject, true);
  assert.match(result.reason, /any-critical mode/);
});
