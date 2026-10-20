// Activation closure for the distributed plugin payloads.
//
// The distribution test proves the generated files match the manifest, and
// `cadenceRuntimeFiles` computes the payload's module closure by scanning for relative
// imports. Neither proves the payload ACTIVATES. This test copies each built payload to a
// temp directory (as a plugin cache would hold it), points HOME at an empty directory, and
// executes every hook its shipped hooks.json declares, the way the harness does: Claude
// Code in exec form (command + args), Codex as one shell command string.
//
// hook-entry.mjs deliberately exits 0 when a hook module fails to load ("a hook signals, it
// does not gate"), so exit status proves nothing here: a payload that omitted a module would
// still exit 0 with every hook a silent no-op. The assertions therefore read stderr for the
// failure markers, and the mutation case proves the detector detects.
//
// Local only. Needs node, like the hooks themselves.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { HOOK_MODULES } from './hook-entry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = 'prometheus-skills-mini';
const CLIENTS = ['claude', 'codex'];
const PER_HOOK_TIMEOUT_MS = Number(process.env.PAYLOAD_ACTIVATION_HOOK_TIMEOUT_MS ?? 60_000);
const FAILURE_MARKERS = [
  /ERR_MODULE_NOT_FOUND/,
  /Cannot find module/,
  /Cannot find package/,
  /PAYLOAD_INCOMPLETE/,
  /\bdegraded:/,
  /HOOK_RUNTIME_ERROR/,
];

const payloadSource = (client) => path.join(ROOT, 'dist', 'plugins', client, PACKAGE);

function makeSandbox(client) {
  const base = mkdtempSync(path.join(tempDir(), `mini-activation-${client}-`));
  const payload = path.join(base, 'cache', PACKAGE);
  const home = path.join(base, 'home');
  const project = path.join(base, 'project');
  mkdirSync(path.dirname(payload), { recursive: true });
  mkdirSync(home, { recursive: true });
  mkdirSync(project, { recursive: true });
  cpSync(payloadSource(client), payload, { recursive: true, verbatimSymlinks: true });
  return { base, payload, home, project };
}

// Catch runtime cache writes and accidental installation from a hook: the full
// pack's observed failure mutated a signed package and began activation during
// dispatch. Mini must keep its copied package immutable and need no full store.
function packageSnapshot(root, relative = '') {
  return readdirSync(path.join(root, relative), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const name = path.join(relative, entry.name);
      const filename = path.join(root, name);
      if (entry.isDirectory()) return [[name, 'directory'], ...packageSnapshot(root, name)];
      if (entry.isSymbolicLink()) return [[name, 'link', readlinkSync(filename)]];
      return [[name, 'file', createHash('sha256').update(readFileSync(filename)).digest('hex')]];
    });
}

function sandboxEnvironment(sandbox) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(PROMETHEUS_|KBD_)/.test(key)) delete env[key];
  }
  return {
    ...env,
    HOME: sandbox.home,
    USERPROFILE: sandbox.home,
    CODEX_HOME: path.join(sandbox.home, '.codex'),
    CLAUDE_CONFIG_DIR: path.join(sandbox.home, '.claude'),
    XDG_CONFIG_HOME: path.join(sandbox.home, '.config'),
    XDG_DATA_HOME: path.join(sandbox.home, '.local', 'share'),
    XDG_CACHE_HOME: path.join(sandbox.home, '.cache'),
    XDG_STATE_HOME: path.join(sandbox.home, '.local', 'state'),
    APPDATA: path.join(sandbox.home, 'AppData', 'Roaming'),
    LOCALAPPDATA: path.join(sandbox.home, 'AppData', 'Local'),
    CLAUDE_PLUGIN_ROOT: sandbox.payload,
    PLUGIN_ROOT: sandbox.payload,
  };
}

/** Every command hook the payload declares, in the shape its harness would run it. */
function declaredHooks(payload) {
  const manifest = JSON.parse(readFileSync(path.join(payload, 'hooks', 'hooks.json'), 'utf8'));
  const substitute = (text) => text.replaceAll('${CLAUDE_PLUGIN_ROOT}', payload);
  const hooks = [];
  for (const [event, entries] of Object.entries(manifest.hooks)) {
    for (const entry of entries) {
      for (const hook of entry.hooks ?? []) {
        if (hook.type !== 'command') continue;
        const shellForm = !Array.isArray(hook.args);
        const args = (hook.args ?? []).map(substitute);
        const command = shellForm ? substitute(hook.command) : hook.command;
        const words = shellForm ? command.split(/\s+/) : args;
        const name = words.includes('--hook') ? words[words.indexOf('--hook') + 1] : hook.command;
        hooks.push({ event, name, command, args, shellForm });
      }
    }
  }
  return hooks;
}

function activate(sandbox) {
  return declaredHooks(sandbox.payload).map((hook) => {
    const input = JSON.stringify({
      session_id: 'payload-activation',
      cwd: sandbox.project,
      hook_event_name: hook.event,
      source: 'startup',
      prompt: 'hello',
      tool_name: 'Write',
      tool_input: { file_path: path.join(sandbox.project, 'a.txt') },
    });
    const run = spawnSync(hook.command, hook.shellForm ? [] : hook.args, {
      shell: hook.shellForm,
      cwd: sandbox.project,
      input,
      encoding: 'utf8',
      timeout: PER_HOOK_TIMEOUT_MS,
      env: sandboxEnvironment(sandbox),
    });
    const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
    return {
      event: hook.event,
      name: hook.name,
      status: run.status,
      timedOut: run.error?.code === 'ETIMEDOUT',
      marker: FAILURE_MARKERS.find((marker) => marker.test(output))?.source ?? null,
      output,
    };
  });
}

const failures = (results) => results.filter((r) => r.timedOut || r.status !== 0 || r.marker);

for (const client of CLIENTS) {
  test(`the shipped ${client} payload activates from a clean HOME and runs every hook it declares`, () => {
    const sandbox = makeSandbox(client);
    try {
      const before = packageSnapshot(sandbox.payload);
      const results = activate(sandbox);
      assert.deepEqual(packageSnapshot(sandbox.payload), before, 'hook execution must not write into its package');
      assert.equal(
        existsSync(path.join(sandbox.home, '.prometheus', 'plugins', 'prometheus-skill-pack')),
        false,
        'mini hooks must not create or activate a full-pack generation store',
      );
      const names = results.map((r) => r.name);
      // Every declared hook must be one the entry can dispatch, and Claude Code ships them all.
      // (Codex deliberately omits the Claude-only SubagentStart file-tier hook.)
      assert.deepEqual(names.filter((name) => !(name in HOOK_MODULES)), [], 'a declared hook the entry cannot dispatch');
      if (client === 'claude') assert.deepEqual([...names].sort(), Object.keys(HOOK_MODULES).sort());
      assert.ok(names.length >= 5, `expected the full hook set, ran ${names.length}`);
      const bad = failures(results);
      assert.deepEqual(
        bad.map((r) => `${r.event}/${r.name}: ${r.timedOut ? 'timed out' : `exit ${r.status}`} ${r.marker ?? ''}`),
        [],
        `hooks failed to activate from the shipped ${client} payload:\n${bad.map((r) => r.output.slice(0, 400)).join('\n---\n')}`,
      );
    } finally {
      rmSync(sandbox.base, { recursive: true, force: true });
    }
  });
}

test('the detector detects: a payload missing a module a hook imports is reported', () => {
  const sandbox = makeSandbox('claude');
  try {
    rmSync(path.join(sandbox.payload, 'lib', 'hooks', 'sessionstart-kbd-control.mjs'));
    const results = activate(sandbox);
    const broken = results.find((r) => r.name === 'sessionstart-kbd-control');
    assert.ok(broken, 'the hook under test must be declared');
    assert.ok(broken.marker, `the failure must be recognisable, got: ${broken.output.slice(0, 300)}`);
  } finally {
    rmSync(sandbox.base, { recursive: true, force: true });
  }
});
