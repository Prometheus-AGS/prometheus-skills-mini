// Port of adversarial-review/scripts/validate-decision-artifact.sh (prometheus-skill-pack, 98 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDecisionArtifact } from './decision-validate.mjs';

test('accepts a decision findings document with cross_model_check verified-distinct', () => {
  const result = validateDecisionArtifact({ mode: 'decision', cross_model_check: 'verified-distinct' });
  assert.deepEqual(result, { accepted: true, reason: 'verified-distinct' });
});

test('non-decision modes are SKIPPED — no cross-model requirement applies to them', () => {
  const result = validateDecisionArtifact({ mode: 'diff', cross_model_check: 'same-model-collision' });
  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'skip-not-decision');
});

test('rejects when cross_model_check is absent from a decision artifact', () => {
  const result = validateDecisionArtifact({ mode: 'decision' });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'missing');
});

test('rejects same-model-collision — the judge WAS the producer', () => {
  const result = validateDecisionArtifact({ mode: 'decision', cross_model_check: 'same-model-collision' });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'same-model-collision');
});

test('rejects unverified-producer-unknown — the comparison passed trivially', () => {
  const result = validateDecisionArtifact({ mode: 'decision', cross_model_check: 'unverified-producer-unknown' });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'unverified-producer-unknown');
});

test('rejects an unrecognised cross_model_check value rather than guessing', () => {
  const result = validateDecisionArtifact({ mode: 'decision', cross_model_check: 'something-new' });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'unrecognised');
});

test('rejects a non-object document as PARSE_ERROR', () => {
  assert.deepEqual(validateDecisionArtifact(null), { accepted: false, reason: 'parse-error' });
  assert.deepEqual(validateDecisionArtifact('not json'), { accepted: false, reason: 'parse-error' });
});
