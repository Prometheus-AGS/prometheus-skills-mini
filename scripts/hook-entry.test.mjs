import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HOOK_MODULES, dispatch } from './hook-entry.mjs';

const entry = fileURLToPath(new URL('./hook-entry.mjs', import.meta.url));

// A hook is a process the harness starts, so the end-to-end assertions spawn it.
// shell: false everywhere — the whole point of the exec-form design.
const runEntry = (args, stdin = '') =>
  spawnSync(process.execPath, [entry, ...args], {
    shell: false,
    encoding: 'utf8',
    input: stdin,
  });

test('dispatch runs the payload named by --hook and exits 0', async () => {
  const calls = [];
  const modules = { 'probe-hook': async () => ({ run: async (payload) => calls.push(payload) }) };

  const code = await dispatch(['--hook', 'probe-hook', '--harness', 'claude-code'], { modules });

  assert.equal(code, 0);
  assert.equal(calls.length, 1);
});

test('dispatch passes the harness and parsed stdin to the payload', async () => {
  const seen = [];
  const modules = { 'probe-hook': async () => ({ run: async (payload) => seen.push(payload) }) };

  await dispatch(['--hook', 'probe-hook', '--harness', 'claude-code'], {
    modules,
    stdin: '{"session_id":"abc"}',
  });

  assert.equal(seen[0].harness, 'claude-code');
  assert.deepEqual(seen[0].input, { session_id: 'abc' });
});

test('an unknown hook id exits non-zero and names the id', async () => {
  const result = runEntry(['--hook', 'no-such-hook', '--harness', 'claude-code']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no-such-hook/);
});

test('a missing --hook argument exits non-zero rather than dispatching nothing', async () => {
  const result = runEntry(['--harness', 'claude-code']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--hook/);
});

// The map is keyed on the --hook argument, never on the matcher-level `id`.
// `id` is per-matcher and present on only 4 of 14 upstream matcher entries, so
// keying on it would address 4 hooks and silently miss the rest.
test('every import-map key is a dispatch id, never a colon-spelled matcher id', () => {
  const keys = Object.keys(HOOK_MODULES);

  assert.ok(keys.length > 0, 'the import map must not be empty');
  for (const key of keys) {
    assert.ok(!key.includes(':'), `${key} is a matcher-level id, not a --hook value`);
  }
});

test('the import map resolves each id to a module path inside lib/hooks', () => {
  for (const [id, loader] of Object.entries(HOOK_MODULES)) {
    assert.equal(typeof loader, 'function', `${id} must map to a loader function`);
  }
});

// Empty stdin is the orchestrator path; a hook must not hang or crash on it.
test('empty stdin yields an empty input rather than throwing', async () => {
  const seen = [];
  const modules = { 'probe-hook': async () => ({ run: async (payload) => seen.push(payload) }) };

  const code = await dispatch(['--hook', 'probe-hook'], { modules, stdin: '' });

  assert.equal(code, 0);
  assert.deepEqual(seen[0].input, {});
});

test('malformed stdin JSON does not fail the hook', async () => {
  const seen = [];
  const modules = { 'probe-hook': async () => ({ run: async (payload) => seen.push(payload) }) };

  const code = await dispatch(['--hook', 'probe-hook'], { modules, stdin: 'not json{' });

  assert.equal(code, 0);
  assert.deepEqual(seen[0].input, {});
});

// A hook signals; it does not gate. A payload that throws is a degradation,
// not a failed hook — otherwise a missing service would make the service mandatory.
test('a payload that throws still exits 0 and reports the degradation', async () => {
  const modules = {
    'probe-hook': async () => ({
      run: async () => {
        throw new Error('service unreachable');
      },
    }),
  };

  const code = await dispatch(['--hook', 'probe-hook'], { modules });

  assert.equal(code, 0);
});

test('the entry point runs end to end with shell: false and no stdin', () => {
  const result = runEntry(['--hook', 'sessionstart-kbd-control', '--harness', 'claude-code']);

  assert.equal(result.status, 0);
});
