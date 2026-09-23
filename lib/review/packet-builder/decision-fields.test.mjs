// Port of the decision-mode field parser inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecisionFields } from './decision-fields.mjs';

test('parseDecisionFields extracts Decision, Assumptions (as bullet items) and Falsifier', () => {
  const text = `# Title\n\n## Decision\n\nUse Postgres.\n\n## Assumptions\n\n- it scales\n- ops already knows it\n\n## Falsifier\n\nLatency exceeds 200ms under load.\n`;
  const result = parseDecisionFields(text);
  assert.equal(result.decision, 'Use Postgres.');
  assert.deepEqual(result.assumptions, ['it scales', 'ops already knows it']);
  assert.equal(result.falsifier, 'Latency exceeds 200ms under load.');
  assert.deepEqual(result.missing_fields, []);
});

test('parseDecisionFields records missing_fields for absent sections — never fabricates', () => {
  const text = `# Title\n\n## Decision\n\nDo the thing.\n`;
  const result = parseDecisionFields(text);
  assert.equal(result.decision, 'Do the thing.');
  assert.equal(result.assumptions.length, 0);
  assert.equal(result.falsifier, null);
  assert.deepEqual(result.missing_fields.sort(), ['assumptions', 'falsifier']);
});

test('parseDecisionFields accepts alternate section headers (what this rests on / what would falsify this)', () => {
  const text = `## Decision\n\nX\n\n## What this rests on\n\n- a thing\n\n## What would falsify this\n\nY happens.\n`;
  const result = parseDecisionFields(text);
  assert.deepEqual(result.assumptions, ['a thing']);
  assert.equal(result.falsifier, 'Y happens.');
});

test('parseDecisionFields treats a non-bulleted Assumptions body as a single-item array', () => {
  const text = `## Decision\n\nX\n\n## Assumptions\n\nJust prose, no bullets.\n`;
  const result = parseDecisionFields(text);
  assert.deepEqual(result.assumptions, ['Just prose, no bullets.']);
});
