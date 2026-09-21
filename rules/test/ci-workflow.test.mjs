import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// A deliberately small YAML reader: the workflow is ours, its shape is fixed, and a
// parser dependency would breach the project's zero-runtime-dependency rule.
const workflow = () => readFileSync('.github/workflows/ci.yml', 'utf8');
const runSteps = (text) =>
  text.split('\n').filter((line) => /^\s*- run:\s/.test(line)).map((line) => line.replace(/^\s*- run:\s*/, '').trim());

test('the matrix covers three operating systems and both supported LTS runtimes', () => {
  const text = workflow();

  for (const os of ['windows-latest', 'ubuntu-latest', 'macos-latest']) {
    assert.match(text, new RegExp(`\\b${os}\\b`), `${os} missing from the matrix`);
  }
  assert.match(text, /node:\s*\[\s*22\s*,\s*24\s*\]/, 'node versions 22 and 24 missing');
});

test('one failing leg does not cancel the others', () => {
  assert.match(workflow(), /fail-fast:\s*false/);
});

test('every job runs the four verification commands in order', () => {
  const steps = runSteps(workflow());

  const expected = [
    'npm ci',
    'node --test',
    'node rules/build.mjs --check',
    'node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive',
  ];

  assert.deepEqual(steps.filter((step) => expected.includes(step)), expected);
});

test('validation uses the pinned CLI, never a shim or a global install', () => {
  // Executable lines only: a comment may legitimately mention npx to say it is not used.
  const commands = runSteps(workflow());

  assert.deepEqual(commands.filter((command) => /\bnpx\b/.test(command)), []);
  assert.deepEqual(commands.filter((command) => /^openspec\b/.test(command)), []);
  assert.ok(commands.some((command) => command.includes('node_modules/@fission-ai/openspec/bin/openspec.js')));
});

test('windows checks out under the hostile autocrlf default, before checkout', () => {
  const text = workflow();

  const autocrlf = text.indexOf('core.autocrlf true');
  const checkout = text.indexOf('actions/checkout');

  assert.notEqual(autocrlf, -1, 'no core.autocrlf step');
  assert.ok(autocrlf < checkout, 'autocrlf must be set before checkout');
  assert.match(text, /if:\s*runner\.os == 'Windows'/, 'the autocrlf step must be windows-only');
});

test('the workflow requests read-only permissions and uses no secrets', () => {
  const text = workflow();

  assert.match(text, /permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(text, /secrets\./);
});

test('the workflow triggers on push and pull request', () => {
  const text = workflow();

  assert.match(text, /^on:/m);
  assert.match(text, /^\s{2}push:/m);
  assert.match(text, /^\s{2}pull_request:/m);
});
