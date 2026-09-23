// Test-first for hook-command.mjs — the `runCommand` implementation every ported KBD entry
// point passes to lib/kbd/hooks.mjs's `hooksFire`. See hook-command.mjs's header comment for why
// this exists as its own tiny module instead of being duplicated per script.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHookCommand } from './hook-command.mjs';

test('a {program, args} JSON command is spawned via the injected spawn, no shell', async () => {
  const calls = [];
  const spawn = (name, args, options) => {
    calls.push({ name, args, options });
    return { status: 0, stdout: 'ok', stderr: '' };
  };
  const command = JSON.stringify({ program: 'echo', args: ['hi'] });
  const result = await runHookCommand(command, { FOO: 'bar' }, { spawn });

  assert.equal(result.status, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'echo');
  assert.deepEqual(calls[0].args, ['hi']);
  assert.equal(calls[0].options.env.FOO, 'bar');
});

test('a plain shell-string command is skipped, not executed, and reports a non-fatal status', async () => {
  const spawn = () => {
    throw new Error('must never be called for a shell-string command');
  };
  const result = await runHookCommand('echo hi && echo bye', {}, { spawn });

  assert.equal(result.status, 0);
  assert.match(result.stderr, /shell semantics/);
});

test('a spawn failure is reported as a non-zero status, never thrown', async () => {
  const spawn = () => ({ status: 1, stdout: '', stderr: 'boom' });
  const command = JSON.stringify({ program: 'false', args: [] });
  const result = await runHookCommand(command, {}, { spawn });

  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'boom');
});
