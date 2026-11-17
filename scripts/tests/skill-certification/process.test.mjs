// Scenarios for the child-process helper the certifier and the eval runner use.
// It starts real processes: this Node binary by absolute path and by name.
//
// Production failures caught: a missing optional tool (uvx, claude) crashing a
// certification run instead of being recorded as not exercised; a Windows
// `.cmd` shim started without a shell, which fails with EINVAL on current Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveOnPath, runExecutable, runNode } from '../../../skills/skill-certification/scripts/process.mjs';

test('runNode starts a script with this Node binary and returns its output', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'process-'));
  try {
    const script = path.join(scratch, 'hello.mjs');
    fs.writeFileSync(script, 'console.log(process.argv.slice(2).join(","));\n');

    const result = runNode(script, ['a b', 'c']);

    assert.equal(result.available, true);
    assert.equal(result.status, 0);
    // An argument with a space arrives whole: no shell split it.
    assert.equal(result.stdout.trim(), 'a b,c');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('a command that is not on PATH is reported as unavailable with a reason, not thrown', () => {
  const result = runExecutable('prometheus-no-such-tool-7f3a', ['--version']);

  assert.equal(result.available, false);
  assert.match(result.reason, /prometheus-no-such-tool-7f3a/);
});

test('a real executable on PATH is found and run by name', () => {
  const name = path.basename(process.execPath, path.extname(process.execPath));
  const env = { ...process.env, PATH: path.dirname(process.execPath), Path: path.dirname(process.execPath) };

  assert.ok(resolveOnPath(name, env));
  const result = runExecutable(name, ['--version'], { env });

  assert.equal(result.available, true);
  assert.equal(result.stdout.trim(), process.version);
});

test('on Windows a name that resolves only to a .cmd shim is refused rather than run through a shell', { skip: process.platform !== 'win32' }, () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'process-'));
  try {
    fs.writeFileSync(path.join(scratch, 'shimmed.cmd'), '@echo off\r\necho hi\r\n');
    const env = { ...process.env, PATH: scratch, Path: scratch, PATHEXT: '.EXE;.CMD' };

    const result = runExecutable('shimmed', [], { env });

    assert.equal(result.available, false);
    assert.match(result.reason, /\.cmd/i);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
