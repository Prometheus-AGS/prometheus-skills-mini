import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tempDir } from '../lib/platform/paths.mjs';
import { HOOK_MODULES, SOCKET_IDLE_MS, dispatch } from './hook-entry.mjs';

const entry = fileURLToPath(new URL('./hook-entry.mjs', import.meta.url));
const repoDir = fileURLToPath(new URL('..', import.meta.url));

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

// The self-invocation guard compares import.meta.url against argv[1]. Building that
// URL by concatenation truncates at '#' or '?' (they become a fragment or query) and
// double-encodes '%', so the comparison fails, dispatch never runs — and the process
// still exits 0, so the harness reports success while every hook is a silent no-op.
// That is the exact breakage this change exists to prevent, so it is tested against a
// path that actually contains one of those characters.
test('the entry point still dispatches from a directory whose name contains #', () => {
  const dir = mkdtempSync(path.join(tempDir(), 'hash#dir-'));
  try {
    const project = path.join(dir, 'proj');
    mkdirSync(path.join(project, '.prometheus'), { recursive: true });
    writeFileSync(path.join(project, '.prometheus', 'project.json'), JSON.stringify({ projectId: 'p' }));
    mkdirSync(path.join(project, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(project, '.kbd-orchestrator', 'PAUSE'), 'paused\n');

    // Copy the whole tree so the entry resolves its relative imports from the odd path.
    cpSync(path.join(repoDir, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
    cpSync(path.join(repoDir, 'lib'), path.join(dir, 'lib'), { recursive: true });

    const result = spawnSync(
      process.execPath,
      [path.join(dir, 'scripts', 'hook-entry.mjs'), '--hook', 'sessionstart-kbd-control', '--harness', 'ci'],
      { shell: false, encoding: 'utf8', input: '', cwd: project },
    );

    assert.equal(result.status, 0);
    // The PAUSE advisory proves the payload actually RAN. Exit 0 alone proves nothing:
    // a guard that never dispatches also exits 0.
    assert.match(result.stderr, /KBD REANCHOR/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the entry point runs end to end with shell: false and no stdin', () => {
  const result = runEntry(['--hook', 'sessionstart-kbd-control', '--harness', 'claude-code']);

  assert.equal(result.status, 0);
});

// Claude Code hands command hooks a SOCKET on fd 0, not a pipe (probed on
// Claude Code 2.1.289, macOS: mode 0140444, exec form and shell form alike). A
// guard that read only FIFOs and files therefore gave every hook `{}` under
// Claude Code while still exiting 0. These tests spawn the real entry with a
// socket stdin and prove the payload arrives by its EFFECT: the harness payload
// names a paused project as `cwd`, the process itself runs somewhere else, and
// only a hook that actually received the payload prints the pause advisory.
const withPausedProject = async (fn) => {
  const dir = mkdtempSync(path.join(tempDir(), 'socket-stdin-'));
  try {
    const project = path.join(dir, 'proj');
    const elsewhere = path.join(dir, 'elsewhere');
    mkdirSync(path.join(project, '.prometheus'), { recursive: true });
    writeFileSync(path.join(project, '.prometheus', 'project.json'), JSON.stringify({ projectId: 'p' }));
    mkdirSync(path.join(project, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(project, '.kbd-orchestrator', 'PAUSE'), 'paused\n');
    mkdirSync(elsewhere);
    return await fn({ project, elsewhere });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const hookArgs = ['--hook', 'sessionstart-kbd-control', '--harness', 'claude-code'];

// Spawns the entry with fd 0 as a socket the test controls, and resolves when
// the process exits. `stdio: 'pipe'` is a socket on every platform this runs on;
// the precondition test below checks that rather than assuming it.
const runWithOpenSocket = ({ cwd, write, close }) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [entry, ...hookArgs], {
      shell: false,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.stdout.resume();
    const guard = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('hook-entry hung on an open socket stdin'));
    }, 15000);
    child.on('error', reject);
    child.on('exit', (status) => {
      clearTimeout(guard);
      child.stdin.destroy();
      resolve({ status, stderr, elapsed: Date.now() - started });
    });
    if (write !== undefined) child.stdin.write(write);
    if (close) child.stdin.end();
  });

test('precondition: spawnSync input reaches the child as a socket, as Claude Code delivers it', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "process.stdout.write(String(require('node:fs').fstatSync(0).isSocket()))"],
    { shell: false, encoding: 'utf8', input: '{}' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'true', 'the socket tests below would prove nothing without a socket');
});

test('a payload on a socket stdin that the harness closes reaches the hook', async () => {
  await withPausedProject(({ project, elsewhere }) => {
    const result = spawnSync(process.execPath, [entry, ...hookArgs], {
      shell: false,
      encoding: 'utf8',
      cwd: elsewhere,
      input: JSON.stringify({ session_id: 's', cwd: project }),
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /KBD REANCHOR/, 'the hook ran without the harness payload');
  });
});

test('a payload on a socket stdin that is never closed still reaches the hook, without hanging', async () => {
  await withPausedProject(async ({ project, elsewhere }) => {
    const result = await runWithOpenSocket({
      cwd: elsewhere,
      write: JSON.stringify({ session_id: 's', cwd: project }),
      close: false,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /KBD REANCHOR/);
  });
});

// The case the original guard existed for: `node --test` gives a socket that
// is never written and never closed. It must cost one idle gap, not a hang.
test('a socket stdin that is never written or closed yields empty input and exits promptly', async () => {
  await withPausedProject(async ({ elsewhere }) => {
    const result = await runWithOpenSocket({ cwd: elsewhere, close: false });

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stderr, /KBD REANCHOR/);
    assert.ok(
      result.elapsed < SOCKET_IDLE_MS + 5000,
      `exited after ${result.elapsed} ms; the idle bound is ${SOCKET_IDLE_MS} ms`,
    );
  });
});

test('an in-process dispatch with no stdin option does not hang on the test runner socket', async () => {
  const seen = [];
  const modules = { 'probe-hook': async () => ({ run: async (payload) => seen.push(payload) }) };

  const code = await dispatch(['--hook', 'probe-hook'], { modules });

  assert.equal(code, 0);
  assert.equal(seen.length, 1);
});
