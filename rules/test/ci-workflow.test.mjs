import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// A deliberately small YAML reader: the workflow is ours, its shape is fixed, and a
// parser dependency would breach the project's zero-runtime-dependency rule.
const workflow = () => readFileSync('.github/workflows/ci.yml', 'utf8');
const runSteps = (text) =>
  text.split('\n').filter((line) => /^\s*- run:\s/.test(line)).map((line) => line.replace(/^\s*- run:\s*/, '').trim());
// Split the `jobs:` section into { id: text } by its two-space-indented job keys.
const jobs = (text) => {
  const body = text.slice(text.indexOf('\njobs:') + 1).split('\n').slice(1);
  const out = {};
  let current = null;
  for (const line of body) {
    const key = line.match(/^ {2}([a-z][a-z0-9-]*):\s*$/);
    if (key) {
      current = key[1];
      out[current] = '';
    } else if (current) {
      out[current] += `${line}\n`;
    }
  }
  return out;
};

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

test('the matrix job runs the four verification commands in order', () => {
  const steps = runSteps(jobs(workflow()).verify);

  const expected = [
    'npm ci',
    'node --test',
    'node rules/build.mjs --check',
    'node scripts/spec-validate.mjs',
  ];

  assert.deepEqual(steps.filter((step) => expected.includes(step)), expected);
});

test('the kbd-runtime job builds the real prometheus CLI and requires it (never a skip)', () => {
  const job = jobs(workflow())['kbd-runtime'];
  assert.ok(job, 'kbd-runtime job missing');
  assert.match(job, /repository:\s*Prometheus-AGS\/prometheus-skill-system/);
  assert.match(job, /PROMETHEUS_CLI_REF:\s*[0-9a-f]{40}\b/, 'the full-pack source must be pinned to a commit');
  assert.match(job, /cargo build --locked [^\n]*--bin prometheus/);
  assert.match(job, /PROMETHEUS_CLI_REQUIRED:\s*'1'/, 'a missing CLI must fail this job, not skip');
  assert.match(job, /run: node --test scripts\/kbd-new-phase\.integration\.test\.mjs/);
});

test('validation uses the pinned CLI, never a shim or a global install', () => {
  // Executable lines only: a comment may legitimately mention npx to say it is not used.
  const commands = runSteps(workflow());

  assert.deepEqual(commands.filter((command) => /\bnpx\b/.test(command)), []);
  // npm itself is the runner's package manager, started by GitHub's shell — not a child
  // process of ours — so it is deliberately not covered by the no-shim rule.
  assert.deepEqual(commands.filter((command) => /^(openspec|tsx|prettier|eslint)\b/.test(command)), []);
  assert.deepEqual(commands.filter((command) => /^openspec\b/.test(command)), []);
  // platform-spawn replaced the raw node_modules path with the entry point, so no step may
  // name node_modules directly any more.
  assert.deepEqual(commands.filter((command) => command.includes('node_modules/')), []);
  assert.ok(commands.includes('node scripts/spec-validate.mjs'));
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
