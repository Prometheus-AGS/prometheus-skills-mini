// Integration test for scripts/emit-ui-intent.mjs — drives the real CLI entry point as a
// child process. ui-surface is not ported in this repo (see lib/ideation/ui-intent.mjs's
// header), so this always resolves to Tier 0 text unless SURFACE_TIER is overridden, and
// Tier 0 always "succeeds" by printing the question and exiting 0 — there is no harness to
// time out waiting on.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./emit-ui-intent.mjs', import.meta.url));

function run(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('prints the intent as Tier 0 text and exits 0', () => {
  const result = run(['--title', 'Which idea?', '--body', 'Three survived.', '--option', 'A', '--option', 'B']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Which idea\?/);
  assert.match(result.stdout, /Three survived\./);
  assert.match(result.stdout, /A/);
  assert.match(result.stdout, /B/);
});

test('accepts --intent-json in place of --title/--body/--option', () => {
  const json = JSON.stringify({ intent_type: 'question', title: 'From JSON', body: '', options: ['X'] });

  const result = run(['--intent-json', json]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /From JSON/);
});

test('exits 1 on usage error when neither --title nor --intent-json is given', () => {
  const result = run(['--body', 'no title here']);

  assert.equal(result.status, 1);
});

test('reports the resolved tier on stderr', () => {
  const result = run(['--title', 't']);

  assert.match(result.stderr, /tier=tier0_text/);
});

test('honors a SURFACE_TIER override on stderr even though only tier0 rendering is implemented', () => {
  const result = run(['--title', 't'], { SURFACE_TIER: 'tier1_structured' });

  assert.match(result.stderr, /tier=tier1_structured/);
});
