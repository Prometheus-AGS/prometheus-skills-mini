// Tests for lib/ideation/ui-intent.mjs — port of emit-ui-intent.sh's
// self-contained logic (intent JSON construction, tier resolution, response
// interpretation). See the module header for why this diverges from a literal
// 1:1 port of the tier-1 rendering path.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildIntent, resolveTier, isTimeoutResponse } from './ui-intent.mjs';

test('buildIntent assembles the same shape the source jq pipeline produced', () => {
  const intent = buildIntent({ title: 'Which idea?', body: 'Three survived.', type: 'question', options: ['A', 'B'] });

  assert.deepEqual(intent, {
    intent_type: 'question',
    title: 'Which idea?',
    body: 'Three survived.',
    options: ['A', 'B'],
  });
});

test('buildIntent defaults intent_type to question and body to empty string', () => {
  const intent = buildIntent({ title: 'Pick one' });

  assert.equal(intent.intent_type, 'question');
  assert.equal(intent.body, '');
  assert.deepEqual(intent.options, []);
});

test('buildIntent drops empty option strings, matching the source jq select(length > 0)', () => {
  const intent = buildIntent({ title: 't', options: ['A', '', 'B', '   '] });

  assert.deepEqual(intent.options, ['A', 'B']);
});

test('buildIntent throws when title is missing', () => {
  assert.throws(() => buildIntent({}), /--title/);
});

test('resolveTier prefers an explicit SURFACE_TIER env override', () => {
  const tier = resolveTier({ env: { SURFACE_TIER: 'tier1_structured' } });

  assert.equal(tier, 'tier1_structured');
});

test('resolveTier falls back to tier0_text when nothing resolves a tier', () => {
  const tier = resolveTier({ env: {} });

  assert.equal(tier, 'tier0_text');
});

test('isTimeoutResponse recognizes the {error: "timeout"} shape the source checks with jq', () => {
  assert.equal(isTimeoutResponse({ error: 'timeout' }), true);
  assert.equal(isTimeoutResponse({ error: 'other' }), false);
  assert.equal(isTimeoutResponse({}), false);
  assert.equal(isTimeoutResponse(null), false);
});
