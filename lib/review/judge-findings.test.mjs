// Port of the normalize/shape-check block inside adversarial-review/scripts/dispatch-judge.sh
// (prometheus-skill-pack, 379 lines) — the Python heredoc starting "extract" / "normalize".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonFromCompletion, normalizeFindings, crossModelCheck } from './judge-findings.mjs';

test('extractJsonFromCompletion parses a raw JSON completion', () => {
  const result = extractJsonFromCompletion('{"findings": []}');
  assert.deepEqual(result, { findings: [] });
});

test('extractJsonFromCompletion extracts JSON from a fenced code block', () => {
  const text = 'Here is my review:\n```json\n{"findings": [{"severity": "WARNING"}]}\n```\nDone.';
  const result = extractJsonFromCompletion(text);
  assert.deepEqual(result, { findings: [{ severity: 'WARNING' }] });
});

test('extractJsonFromCompletion falls back to the first-{-to-last-} span', () => {
  const text = 'Sure! {"findings": []} — hope that helps!';
  const result = extractJsonFromCompletion(text);
  assert.deepEqual(result, { findings: [] });
});

test('extractJsonFromCompletion returns null for unparseable text', () => {
  assert.equal(extractJsonFromCompletion('not json at all'), null);
});

test('normalizeFindings drops findings missing claim or evidence', () => {
  const data = {
    findings: [
      { severity: 'CRITICAL', claim: 'x', evidence: 'y' },
      { severity: 'WARNING', claim: 'missing evidence' },
      { severity: 'SUGGESTION', evidence: 'missing claim' },
    ],
  };
  const result = normalizeFindings(data, { mode: 'diff', judgeModel: 'judge-x', producer: 'prod-y', endpoint: 'http://x/v1' });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].claim, 'x');
});

test('normalizeFindings drops findings with an unrecognised severity', () => {
  const data = { findings: [{ severity: 'INFO', claim: 'x', evidence: 'y' }] };
  const result = normalizeFindings(data, { mode: 'diff', judgeModel: 'j', producer: 'p', endpoint: 'e' });
  assert.equal(result.findings.length, 0);
});

test('normalizeFindings sets verdict BLOCK iff at least one CRITICAL finding exists', () => {
  const withCritical = normalizeFindings(
    { findings: [{ severity: 'CRITICAL', claim: 'x', evidence: 'y' }] },
    { mode: 'diff', judgeModel: 'j', producer: 'p', endpoint: 'e' },
  );
  assert.equal(withCritical.verdict, 'BLOCK');

  const withoutCritical = normalizeFindings(
    { findings: [{ severity: 'WARNING', claim: 'x', evidence: 'y' }] },
    { mode: 'diff', judgeModel: 'j', producer: 'p', endpoint: 'e' },
  );
  assert.equal(withoutCritical.verdict, 'PASS');
});

test('normalizeFindings records isolation_mode as rest-gateway:<endpoint>', () => {
  const result = normalizeFindings({ findings: [] }, { mode: 'diff', judgeModel: 'j', producer: 'p', endpoint: 'http://x/v1' });
  assert.equal(result.isolation_mode, 'rest-gateway:http://x/v1');
});

test('normalizeFindings carries checked_classes through when present on a zero-finding report', () => {
  const result = normalizeFindings(
    { findings: [], checked_classes: ['auth bypass', 'sql injection'] },
    { mode: 'diff', judgeModel: 'j', producer: 'p', endpoint: 'e' },
  );
  assert.deepEqual(result.checked_classes, ['auth bypass', 'sql injection']);
});

test('normalizeFindings throws when the completion is not shape-valid findings JSON', () => {
  assert.throws(() => normalizeFindings({ not: 'findings' }, { mode: 'diff', judgeModel: 'j', producer: 'p', endpoint: 'e' }));
  assert.throws(() => normalizeFindings(null, { mode: 'diff', judgeModel: 'j', producer: 'p', endpoint: 'e' }));
});

test('crossModelCheck is verified-distinct when judge and producer differ', () => {
  assert.equal(crossModelCheck('judge-x', 'prod-y'), 'verified-distinct');
});

test('crossModelCheck is same-model-collision when judge equals producer', () => {
  assert.equal(crossModelCheck('openai/gpt-5.5', 'gpt-5.5'), 'same-model-collision');
});

test('crossModelCheck is unverified-producer-unknown when producer is "unknown"', () => {
  assert.equal(crossModelCheck('judge-x', 'unknown'), 'unverified-producer-unknown');
});
