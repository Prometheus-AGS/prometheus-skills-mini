// Integration test for scripts/assert-independent-dispatch.mjs — drives the real CLI entry
// point as a child process against a real filesystem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./assert-independent-dispatch.mjs', import.meta.url));
const LONG_A = 'this particular substantive line is well over twenty four characters';
const LONG_B = 'a different substantive line that is also well over twenty four chars';
const LONG_C = 'yet another distinct substantive line past the twenty four char mark';

function run(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
}

function writeSession({ topic, sets }) {
  const session = fs.mkdtempSync(path.join(os.tmpdir(), 'assert-independence-cli-'));
  fs.mkdirSync(path.join(session, 'sets'), { recursive: true });
  if (topic !== undefined) fs.writeFileSync(path.join(session, 'topic.txt'), topic);
  for (const [n, { input, output }] of Object.entries(sets)) {
    fs.writeFileSync(path.join(session, 'sets', `set-${n}.input`), input);
    fs.writeFileSync(path.join(session, 'sets', `set-${n}.output`), output);
  }
  return session;
}

test('exits 0 and reports PASS for three independent sets', () => {
  const session = writeSession({
    topic: 'widget pricing tracker',
    sets: {
      1: { input: 'widget pricing tracker\n', output: LONG_A },
      2: { input: 'widget pricing tracker\n', output: LONG_B },
      3: { input: 'widget pricing tracker\n', output: LONG_C },
    },
  });

  const result = run(['--session', session]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /PASS: candidate sets were generated independently/);
});

test('exits 2 and reports REJECTED when independence does not hold', () => {
  const session = writeSession({
    topic: 'widget pricing',
    sets: { 1: { input: 'widget pricing\n', output: LONG_A } },
  });

  const result = run(['--session', session, '--min-sets', '3']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /REJECTED: independence is not established/);
});

test('exits 1 on usage error (missing --session)', () => {
  const result = run([]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--session is required/);
});

test('exits 1 when sets/ does not exist under session', () => {
  const session = fs.mkdtempSync(path.join(os.tmpdir(), 'assert-independence-empty-'));

  const result = run(['--session', session]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /no sets\/ under/);
});
