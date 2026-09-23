// Tests for lib/ideation/independence.mjs — port of assert-independent-dispatch.sh's
// four checks (enough sets, no cross-contamination, topic anchoring, distinct outputs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { assertIndependentDispatch, readSets } from './independence.mjs';

const LONG_A = 'this particular substantive line is well over twenty four characters';
const LONG_B = 'a different substantive line that is also well over twenty four chars';
const LONG_C = 'yet another distinct substantive line past the twenty four char mark';

function writeSession({ topic, sets }) {
  const session = fs.mkdtempSync(path.join(os.tmpdir(), 'ideation-independence-'));
  fs.mkdirSync(path.join(session, 'sets'), { recursive: true });
  if (topic !== undefined) fs.writeFileSync(path.join(session, 'topic.txt'), topic);
  for (const [n, { input, output }] of Object.entries(sets)) {
    if (input !== undefined) fs.writeFileSync(path.join(session, 'sets', `set-${n}.input`), input);
    if (output !== undefined) fs.writeFileSync(path.join(session, 'sets', `set-${n}.output`), output);
  }
  return session;
}

test('readSets loads every set-<n>.input/.output pair present', () => {
  const session = writeSession({
    topic: 'widget pricing',
    sets: {
      1: { input: 'widget pricing\n', output: LONG_A },
      2: { input: 'widget pricing\n', output: LONG_B },
    },
  });

  const sets = readSets(session);

  assert.deepEqual(Object.keys(sets).sort(), ['1', '2']);
  assert.equal(sets['1'].output, LONG_A);
});

test('passes with three independent, on-topic, distinct sets', () => {
  const session = writeSession({
    topic: 'widget pricing tracker',
    sets: {
      1: { input: 'widget pricing tracker\n', output: LONG_A },
      2: { input: 'widget pricing tracker\n', output: LONG_B },
      3: { input: 'widget pricing tracker\n', output: LONG_C },
    },
  });

  const result = assertIndependentDispatch({ session, minSets: 3 });

  assert.equal(result.pass, true);
  assert.deepEqual(result.problems, []);
});

test('fails when fewer than minSets sets are recorded', () => {
  const session = writeSession({
    topic: 'widget pricing',
    sets: { 1: { input: 'widget pricing\n', output: LONG_A } },
  });

  const result = assertIndependentDispatch({ session, minSets: 3 });

  assert.equal(result.pass, false);
  assert.match(result.problems.join('\n'), /only 1 recorded set/);
});

test('fails when one set input contains another set output verbatim', () => {
  const session = writeSession({
    topic: 'widget pricing',
    sets: {
      1: { input: 'widget pricing\n', output: LONG_A },
      2: { input: `widget pricing\n${LONG_A}`, output: LONG_B },
      3: { input: 'widget pricing\n', output: LONG_C },
    },
  });

  const result = assertIndependentDispatch({ session, minSets: 3 });

  assert.equal(result.pass, false);
  assert.ok(result.problems.some((p) => p.includes('set 2 input contains set 1 output')));
});

test('fails when an input does not reference the topic', () => {
  const session = writeSession({
    topic: 'widget pricing tracker',
    sets: {
      1: { input: 'widget pricing tracker\n', output: LONG_A },
      2: { input: 'completely unrelated text about something else\n', output: LONG_B },
      3: { input: 'widget pricing tracker\n', output: LONG_C },
    },
  });

  const result = assertIndependentDispatch({ session, minSets: 3 });

  assert.equal(result.pass, false);
  assert.ok(result.problems.some((p) => p.includes('set 2 input does not reference the topic')));
});

test('fails when two outputs are byte-identical', () => {
  const session = writeSession({
    topic: 'widget pricing tracker',
    sets: {
      1: { input: 'widget pricing tracker\n', output: LONG_A },
      2: { input: 'widget pricing tracker\n', output: LONG_A },
      3: { input: 'widget pricing tracker\n', output: LONG_C },
    },
  });

  const result = assertIndependentDispatch({ session, minSets: 3 });

  assert.equal(result.pass, false);
  assert.ok(result.problems.some((p) => p.includes('set 2 output is byte-identical to set 1')));
});

test('passes with exactly minSets and no topic.txt recorded (topic check is skipped, not failed)', () => {
  const session = writeSession({
    sets: {
      1: { input: 'anything\n', output: LONG_A },
      2: { input: 'anything else\n', output: LONG_B },
      3: { input: 'and a third\n', output: LONG_C },
    },
  });

  const result = assertIndependentDispatch({ session, minSets: 3 });

  assert.equal(result.pass, true);
});

test('throws when session/sets does not exist', () => {
  const session = fs.mkdtempSync(path.join(os.tmpdir(), 'ideation-independence-empty-'));

  assert.throws(() => assertIndependentDispatch({ session, minSets: 3 }), /no sets\/ under/);
});
