// Tests for lib/ideation/dispatch.mjs — port of record-dispatch.sh's recording
// and record-time contamination check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { recordInput, recordOutput, substantiveLines } from './dispatch.mjs';

function tempSession() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ideation-dispatch-'));
}

test('substantiveLines keeps only lines longer than 24 chars, trimmed', () => {
  const text = [
    'short line',
    '                                    ', // long but blank after trim
    'this line is long enough to survive the twenty-four char filter',
    '   this one too, once trimmed of its leading whitespace padding   ',
  ].join('\n');

  const lines = substantiveLines(text);

  assert.deepEqual(lines, [
    'this line is long enough to survive the twenty-four char filter',
    'this one too, once trimmed of its leading whitespace padding',
  ]);
});

test('recordInput writes the topic alone when no --input file is given', () => {
  const session = tempSession();

  recordInput({ session, set: '1', topic: 'track competitor pricing' });

  const written = fs.readFileSync(path.join(session, 'sets', 'set-1.input'), 'utf8');
  assert.equal(written, 'track competitor pricing\n');
  assert.equal(fs.readFileSync(path.join(session, 'topic.txt'), 'utf8'), 'track competitor pricing\n');
});

test('recordInput copies the content of an --input file when given', () => {
  const session = tempSession();
  const inputFile = path.join(session, 'custom-input.txt');
  fs.writeFileSync(inputFile, 'the topic plus extra dispatch-specific framing');

  recordInput({ session, set: '2', topic: 'track competitor pricing', inputFile });

  const written = fs.readFileSync(path.join(session, 'sets', 'set-2.input'), 'utf8');
  assert.equal(written, 'the topic plus extra dispatch-specific framing');
});

test('recordInput throws when the given --input file does not exist', () => {
  const session = tempSession();

  assert.throws(
    () => recordInput({ session, set: '1', topic: 't', inputFile: path.join(session, 'missing.txt') }),
    /--input file not found/,
  );
});

test('recordOutput copies the output file into sets/set-<n>.output', () => {
  const session = tempSession();
  const outputFile = path.join(session, 'result.txt');
  fs.writeFileSync(outputFile, 'Branch 1 — Data Acquisition\n...');

  recordOutput({ session, set: '3', outputFile });

  const written = fs.readFileSync(path.join(session, 'sets', 'set-3.output'), 'utf8');
  assert.equal(written, 'Branch 1 — Data Acquisition\n...');
});

test('recordOutput throws when the given --output file does not exist', () => {
  const session = tempSession();

  assert.throws(
    () => recordOutput({ session, set: '1', outputFile: path.join(session, 'missing.txt') }),
    /--output file not found/,
  );
});

test('recordInput refuses and removes the input when it contains a prior output verbatim', () => {
  const session = tempSession();
  fs.mkdirSync(path.join(session, 'sets'), { recursive: true });
  const priorOutput = 'this particular substantive line is over twenty four characters long';
  fs.writeFileSync(path.join(session, 'sets', 'set-1.output'), priorOutput);

  assert.throws(
    () =>
      recordInput({
        session,
        set: '2',
        topic: 'topic',
        inputText: `some framing\n${priorOutput}\nmore framing`,
      }),
    /REFUSED/,
  );

  assert.equal(fs.existsSync(path.join(session, 'sets', 'set-2.input')), false);
});

test('recordInput allows an input that does not reuse any prior output line', () => {
  const session = tempSession();
  fs.mkdirSync(path.join(session, 'sets'), { recursive: true });
  fs.writeFileSync(
    path.join(session, 'sets', 'set-1.output'),
    'this particular substantive line is over twenty four characters long',
  );

  recordInput({ session, set: '2', topic: 'topic', inputText: 'topic only, nothing shared with set 1' });

  assert.equal(
    fs.readFileSync(path.join(session, 'sets', 'set-2.input'), 'utf8'),
    'topic only, nothing shared with set 1',
  );
});

test('recordInput never compares a set against its own prior output', () => {
  const session = tempSession();
  fs.mkdirSync(path.join(session, 'sets'), { recursive: true });
  const line = 'this particular substantive line is over twenty four characters long';
  fs.writeFileSync(path.join(session, 'sets', 'set-2.output'), line);

  // Re-recording set 2's own input, reusing text from set 2's own prior output, must not
  // self-contaminate — only OTHER sets' outputs count.
  recordInput({ session, set: '2', topic: 'topic', inputText: `topic\n${line}` });

  assert.equal(fs.readFileSync(path.join(session, 'sets', 'set-2.input'), 'utf8'), `topic\n${line}`);
});

test('short/boilerplate overlap does not trigger contamination (24-char threshold)', () => {
  const session = tempSession();
  fs.mkdirSync(path.join(session, 'sets'), { recursive: true });
  fs.writeFileSync(path.join(session, 'sets', 'set-1.output'), 'short line\nok\n');

  recordInput({ session, set: '2', topic: 'topic', inputText: 'short line\nok\nsomething else entirely' });

  assert.equal(fs.existsSync(path.join(session, 'sets', 'set-2.input')), true);
});
