// Integration test for scripts/record-dispatch.mjs — drives the real CLI entry point as a
// child process (spawnSync) against a real filesystem, matching this repo's rule that
// completion evidence exercises the actual boundary rather than only the lib functions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./record-dispatch.mjs', import.meta.url));

function run(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
}

function tempSession() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'record-dispatch-cli-'));
}

test('records an input via the CLI and exits 0', () => {
  const session = tempSession();

  const result = run(['--session', session, '--set', '1', '--topic', 'widget pricing']);

  assert.equal(result.status, 0);
  assert.equal(fs.readFileSync(path.join(session, 'sets', 'set-1.input'), 'utf8'), 'widget pricing\n');
});

test('records an output via the CLI and exits 0', () => {
  const session = tempSession();
  const outFile = path.join(session, 'out.txt');
  fs.writeFileSync(outFile, 'Branch 1 — X');

  const result = run(['--session', session, '--set', '1', '--topic', 'widget pricing', '--output', outFile]);

  assert.equal(result.status, 0);
  assert.equal(fs.readFileSync(path.join(session, 'sets', 'set-1.output'), 'utf8'), 'Branch 1 — X');
});

test('exits 1 on usage error (missing --session)', () => {
  const result = run(['--set', '1', '--topic', 't']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--session is required/);
});

test('exits 2 when the recorded input would break independence', () => {
  const session = tempSession();
  const longLine = 'this particular substantive line is well over twenty four characters';
  const outFile = path.join(session, 'out.txt');
  fs.writeFileSync(outFile, longLine);
  run(['--session', session, '--set', '1', '--topic', 't', '--output', outFile]);

  const inputFile = path.join(session, 'contaminated-input.txt');
  fs.writeFileSync(inputFile, `t\n${longLine}`);
  const result = run(['--session', session, '--set', '2', '--topic', 't', '--input', inputFile]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /REFUSED/);
});
