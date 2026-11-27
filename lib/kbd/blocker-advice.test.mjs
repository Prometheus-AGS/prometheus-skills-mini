// Advisory blocker disposition. Each scenario names the production failure it would catch: an
// approval wait or a quiet running job miscounted as a failed attempt, a stale count surviving
// new evidence, and a repeated blocker that gets no recommendation or more than one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adviseBlockers } from './blocker-advice.mjs';

const attempt = (overrides) => ({ blocker: 'release-signing', completed: true, waitingOnApproval: false, evidence: 'log-1', kind: 'setup', ...overrides });
const only = (attempts) => adviseBlockers(attempts).advice[0];

test('an attempt waiting on an approval is not counted and yields no recommendation', () => {
  const advice = only([attempt({}), attempt({}), attempt({ completed: false, waitingOnApproval: true })]);

  assert.equal(advice.recommendation, null);
  assert.match(advice.reason, /approval/);
  assert.match(advice.guidance, /Keep waiting\. Advise no escalation/);
});

test('a running or unknown job is not a completed attempt', () => {
  const advice = only([attempt({}), attempt({ completed: false }), attempt({ completed: undefined })]);

  assert.equal(advice.counted, 1);
  assert.equal(advice.recommendation, null);
  assert.match(only([attempt({ completed: false })]).guidance, /Leave it running/);
});

test('new evidence resets the count', () => {
  const advice = only([attempt({}), attempt({}), attempt({ evidence: 'log-2' })]);

  assert.equal(advice.counted, 1);
  assert.equal(advice.recommendation, null);
});

test('two completed attempts at the same blocker with no new evidence yield exactly one disposition', () => {
  const expected = {
    setup: 'bounded-setup-repair',
    measurement: 'measurement-repair',
    authority: 'authority-handoff',
    architecture: 'scoped-architecture-child',
  };
  for (const [kind, disposition] of Object.entries(expected)) {
    const advice = only([attempt({ kind }), attempt({ kind })]);
    assert.equal(advice.recommendation.disposition, disposition);
    assert.equal(typeof advice.recommendation.action, 'string');
    assert.match(advice.reason, /no new evidence/);
  }
});

test('an unstated blocker kind recommends one authority handoff', () => {
  const advice = only([attempt({ kind: undefined }), attempt({ kind: undefined })]);

  assert.equal(advice.recommendation.disposition, 'authority-handoff');
});

test('blockers are advised independently and the result is marked advisory', () => {
  const result = adviseBlockers([
    attempt({}),
    attempt({ blocker: 'flaky-fixture', kind: 'measurement' }),
    attempt({}),
  ]);

  assert.equal(result.advisory, true);
  assert.deepEqual(result.advice.map((entry) => entry.blocker), ['release-signing', 'flaky-fixture']);
  assert.equal(result.advice[0].recommendation.disposition, 'bounded-setup-repair');
  assert.equal(result.advice[1].recommendation, null);
});

test('no records gives no advice, and a malformed record is refused', () => {
  assert.deepEqual(adviseBlockers([]), { advisory: true, advice: [] });
  assert.throws(() => adviseBlockers([{ completed: true }]), /blocker/);
});
