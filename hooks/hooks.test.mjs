import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readText } from '../lib/platform/text.mjs';
import { HOOK_MODULES } from '../scripts/hook-entry.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = path.join(repoRoot, 'hooks', 'hooks.json');

// The list is DERIVED from the manifest, never hand-kept. The source pack shipped
// a payload whose entry file was never packaged; that fails in Node's loader on
// every hook event, before any of our code runs, so no hook can report it. Only a
// check that reads the manifest catches it — and a hand-kept list is exactly what
// let it through.
const manifest = () => JSON.parse(readText(manifestPath));

const hookEntries = () => {
  const events = manifest().hooks ?? manifest();
  const entries = [];
  for (const [event, matchers] of Object.entries(events)) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks ?? []) entries.push({ event, hook });
    }
  }
  return entries;
};

// Element 0 of args is the entry point, after expanding any harness variable.
const entryPointOf = (hook) =>
  path.resolve(repoRoot, (hook.args?.[0] ?? '').replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/?/, ''));

const valueAfter = (args, flag) => {
  const at = (args ?? []).indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
};

test('the manifest is valid JSON with at least one hook entry', () => {
  const entries = hookEntries();

  assert.ok(entries.length > 0, 'hooks.json declares no hooks');
});

test('every file the manifest names resolves on disk', () => {
  const entries = hookEntries();

  const resolved = entries.map((e) => entryPointOf(e.hook)).filter((p) => p && existsSync(p));

  // The anti-vacuity clause: a derivation rule that classifies nothing as a path
  // would otherwise satisfy "every named file exists" trivially.
  assert.ok(resolved.length > 0, 'no entry-point paths were derived from the manifest');
  assert.equal(
    resolved.length,
    entries.length,
    'every hook entry must contribute exactly one resolvable entry-point path',
  );
});

test('every entry point named by the manifest is importable', async () => {
  for (const { hook } of hookEntries()) {
    const file = entryPointOf(hook);

    // pathToFileURL, not the bare path: Node's ESM loader parses an absolute
    // Windows path as a URL, so `D:\a\repo\scripts\hook-entry.mjs` is read as
    // scheme `d:` and rejected. CI caught this on both Windows jobs while all
    // four Unix jobs passed, because a POSIX path happens to parse as a path.
    await assert.doesNotReject(
      () => import(pathToFileURL(file).href),
      `${file} is named by hooks.json but not importable`,
    );
  }
});

test('every dispatched hook id has an entry in the import map', () => {
  for (const { hook } of hookEntries()) {
    const id = valueAfter(hook.args, '--hook');

    assert.ok(id, 'every hook entry must pass --hook <id>');
    assert.ok(HOOK_MODULES[id], `hooks.json dispatches "${id}" but the import map has no entry`);
  }
});

// Derived from the MANIFEST, not from HOOK_MODULES. Iterating the import map
// would pass if a payload were dropped from the manifest and the map together —
// the list has to come from the file the harness actually reads.
test('every payload the manifest dispatches exists on disk', () => {
  const entries = hookEntries();

  const payloads = entries.map(({ hook }) => {
    const id = valueAfter(hook.args, '--hook');
    return { id, file: path.join(repoRoot, 'lib', 'hooks', `${id}.mjs`) };
  });

  assert.equal(payloads.length, entries.length, 'every hook entry must name a payload');
  for (const { id, file } of payloads) {
    assert.ok(existsSync(file), `hooks.json dispatches "${id}" but ${file} does not exist`);
  }
});

test('every import-map entry resolves to a module file that exists', async () => {
  for (const id of Object.keys(HOOK_MODULES)) {
    const file = path.join(repoRoot, 'lib', 'hooks', `${id}.mjs`);

    assert.ok(existsSync(file), `the import map names ${id} but ${file} does not exist`);
  }
});

test('the manifest registers exactly the six ported hook ids', () => {
  const ported = [
    'sessionstart-kbd-control',
    'sessionstart-detect-project-context',
    'posttool-write-position-reminder',
    'subagent-fallback-checkpoint',
    'taskcompleted-kbd-receipt',
    'precompact-kbd-control',
  ];

  const ids = hookEntries().map(({ hook }) => valueAfter(hook.args, '--hook'));

  assert.equal(new Set(ids).size, 6);
  assert.deepEqual([...new Set(ids)].sort(), [...ported].sort());
});

test('every hook is registered in exec form, never a shell string', () => {
  for (const { event, hook } of hookEntries()) {
    assert.equal(hook.command, 'node', `${event}: command must be exactly "node"`);
    assert.ok(Array.isArray(hook.args) && hook.args.length > 0, `${event}: args must be non-empty`);
    // A shell string would be interpreted by sh -c on POSIX and PowerShell on
    // Windows, which C1 and C3 forbid.
    assert.doesNotMatch(hook.command, /[\s&|;><]/, `${event}: command contains shell metacharacters`);
  }
});
