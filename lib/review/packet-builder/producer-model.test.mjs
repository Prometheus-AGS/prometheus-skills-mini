// Port of the producer-model resolution block inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProducerModel } from './producer-model.mjs';

test('resolveProducerModel prefers progress.json producer_model over everything', () => {
  const result = resolveProducerModel({
    progressJson: { producer_model: 'from-progress' },
    env: { KBD_PRODUCER_MODEL: 'from-env' },
  });
  assert.equal(result.producer, 'from-progress');
  assert.equal(result.warning, null);
});

test('resolveProducerModel falls back to KBD_PRODUCER_MODEL, then ANTHROPIC_MODEL', () => {
  assert.equal(resolveProducerModel({ env: { KBD_PRODUCER_MODEL: 'x' } }).producer, 'x');
  assert.equal(resolveProducerModel({ env: { ANTHROPIC_MODEL: 'y' } }).producer, 'y');
});

test('resolveProducerModel falls back to harness-provided identifiers as a last resort', () => {
  assert.equal(resolveProducerModel({ env: { CLAUDE_MODEL: 'a' } }).producer, 'a');
  assert.equal(resolveProducerModel({ env: { CLAUDE_CODE_MODEL: 'b' } }).producer, 'b');
  assert.equal(resolveProducerModel({ env: { CLAUDECODE_MODEL: 'c' } }).producer, 'c');
});

test('resolveProducerModel records "unknown" with a warning when nothing resolves', () => {
  const result = resolveProducerModel({ env: {} });
  assert.equal(result.producer, 'unknown');
  assert.match(result.warning, /PRODUCER_UNKNOWN/);
});
