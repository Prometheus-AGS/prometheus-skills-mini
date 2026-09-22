import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Not a test of lib/karpathy's own behaviour — a standing guard that the
// recorder is never wired into a sub-second harness hook. pk ingest makes a
// network call and can legitimately take seconds; the source pack's own
// boundary hooks run it with a 15 s timeout (kbd-process-orchestrator/hooks.json),
// never the harness's 1 s budget. This is why the recorder is a CLI a KBD
// skill invokes, not a seventh entry in hooks.json.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'hooks', 'hooks.json'), 'utf8'));

const dispatchedEntries = () => {
  const entries = [];
  for (const matchers of Object.values(manifest.hooks)) {
    for (const group of matchers) {
      for (const hook of group.hooks) {
        entries.push({ timeout: hook.timeout, id: hook.args?.[2] ?? null, command: hook.command, args: hook.args });
      }
    }
  }
  return entries;
};

test('hooks.json still declares exactly six hook ids', () => {
  const ids = dispatchedEntries().map((entry) => entry.id);
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6);
});

test('every hook still dispatches through the exec-form node entry point, never a shell', () => {
  for (const entry of dispatchedEntries()) {
    assert.equal(entry.command, 'node');
    assert.ok(Array.isArray(entry.args));
  }
});

test('no hook with a timeout <= 1000ms dispatches to a payload module that imports lib/karpathy', () => {
  const payloadsDir = path.join(repoRoot, 'lib', 'hooks');
  const payloadFiles = new Map(
    readdirSync(payloadsDir)
      .filter((name) => name.endsWith('.mjs') && !name.endsWith('.test.mjs'))
      .map((name) => [name.replace(/\.mjs$/, ''), path.join(payloadsDir, name)]),
  );

  const offenders = [];
  for (const entry of dispatchedEntries()) {
    if (entry.timeout > 1000) continue;
    // The id-to-payload-file mapping mirrors scripts/hook-entry.mjs's
    // HOOK_MODULES: the --hook id IS the payload file's basename.
    const file = payloadFiles.get(entry.id);
    if (!file) continue; // a missing payload is a different test's concern
    const source = readFileSync(file, 'utf8');
    if (/from ['"](\.\.\/)*lib\/karpathy\//.test(source) || /from ['"]\.\.\/karpathy\//.test(source)) {
      offenders.push(entry.id);
    }
  }

  assert.deepEqual(offenders, [], `these <=1s hooks import lib/karpathy: ${offenders.join(', ')}`);
});

// Proves the scenario above is not vacuous: a fixture payload that DOES
// import lib/karpathy under a 1000ms budget must be caught.
test('the budget scan actually detects a lib/karpathy import when one exists', () => {
  const fixtureSource = "import { readCanonicalState } from '../karpathy/canonical-state.mjs';\n";
  const detected = /from ['"](\.\.\/)*lib\/karpathy\//.test(fixtureSource) || /from ['"]\.\.\/karpathy\//.test(fixtureSource);
  assert.equal(detected, true);
});

test('scripts/record-progress.mjs is not named in hooks.json at all', () => {
  const ids = dispatchedEntries().map((entry) => entry.id);
  assert.ok(!ids.some((id) => id.includes('record-progress') || id.includes('karpathy')));
});
