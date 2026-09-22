import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const doctor = path.join(repoRoot, 'scripts', 'doctor.mjs');

/** Spawns the real entry point — no shell, a temp HOME, as the-boss will run it. */
const runDoctor = (args = [], home = null) =>
  spawnExecutable(process.execPath, [doctor, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...(home ? { HOME: home, USERPROFILE: home, MINI_DOCTOR_HOME: home } : {}),
    },
  });

const lines = (stdout) =>
  String(stdout)
    .split('\n')
    .filter((l) => l.trim() !== '');

const world = () => {
  const root = mkdtempSync(path.join(tempDir(), 'doctor-cli-'));
  const home = path.join(root, 'home');
  mkdirSync(home, { recursive: true });
  return { root, home, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

test('every stdout line is JSON and the last is the summary', () => {
  const w = world();
  try {
    const result = runDoctor([], w.home);
    const out = lines(result.stdout);

    assert.ok(out.length > 1, result.stdout + result.stderr);
    for (const [i, line] of out.entries()) {
      assert.doesNotThrow(() => JSON.parse(line), `line ${i + 1} is not JSON: ${line}`);
    }

    const last = JSON.parse(out.at(-1));
    assert.equal(last.summary, true);
    for (const key of ['pass', 'warn', 'fail', 'skip']) {
      assert.equal(typeof last[key], 'number', `summary.${key}`);
    }
  } finally {
    w.dispose();
  }
});

test('each check line carries the contract fields', () => {
  const w = world();
  try {
    const out = lines(runDoctor([], w.home).stdout).map((l) => JSON.parse(l));
    const checks = out.filter((o) => !o.summary === true || o.id !== undefined).filter((o) => o.id);

    assert.ok(checks.length >= 10, `only ${checks.length} checks reported`);
    for (const check of checks) {
      assert.match(check.id, /^mini-[a-z0-9-]+$/);
      assert.equal(typeof check.title, 'string');
      assert.ok(['pass', 'warn', 'fail', 'skip'].includes(check.status), `${check.id}: ${check.status}`);
      assert.ok(typeof check.summary === 'string' && check.summary.trim() !== '', check.id);
    }
  } finally {
    w.dispose();
  }
});

test('the counts in the summary match the lines above it', () => {
  const w = world();
  try {
    const out = lines(runDoctor([], w.home).stdout).map((l) => JSON.parse(l));
    const summary = out.at(-1);
    const checks = out.slice(0, -1);

    for (const status of ['pass', 'warn', 'fail', 'skip']) {
      assert.equal(
        summary[status],
        checks.filter((c) => c.status === status).length,
        `${status} count disagrees with the lines`,
      );
    }
  } finally {
    w.dispose();
  }
});

// The exit code is the machine-readable verdict: 0 unless something actually failed.
test('exit 0 when nothing failed, 1 when something did', () => {
  const w = world();
  try {
    const result = runDoctor([], w.home);
    const summary = JSON.parse(lines(result.stdout).at(-1));

    assert.equal(result.status, summary.fail > 0 ? 1 : 0, `fail=${summary.fail} status=${result.status}`);
  } finally {
    w.dispose();
  }
});

test('--human renders a table and no JSON', () => {
  const w = world();
  try {
    const result = runDoctor(['--human'], w.home);

    assert.doesNotMatch(result.stdout, /^\{/m, 'human output must not contain JSON lines');
    assert.match(result.stdout, /mini-node-version/);
  } finally {
    w.dispose();
  }
});

test('--fix copy-skills applies the fix and prints one result line', () => {
  const w = world();
  try {
    const result = runDoctor(['--fix', 'copy-skills'], w.home);
    const out = lines(result.stdout).map((l) => JSON.parse(l));

    assert.equal(out.length, 1, JSON.stringify(out));
    assert.equal(out[0].fixId, 'copy-skills');
    assert.ok(['fixed', 'requires_relaunch', 'refused'].includes(out[0].status), out[0].status);
  } finally {
    w.dispose();
  }
});

test('an unknown --fix is refused with a usable message, not a stack trace', () => {
  const w = world();
  try {
    const result = runDoctor(['--fix', 'no-such-fix'], w.home);

    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /at .*\.mjs:\d+/, 'a stack trace leaked');
    assert.match(result.stdout + result.stderr, /no-such-fix/);
  } finally {
    w.dispose();
  }
});

test('an unknown flag is refused without a stack trace', () => {
  const w = world();
  try {
    const result = runDoctor(['--wat'], w.home);

    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /at .*\.mjs:\d+/);
    assert.match(result.stdout + result.stderr, /--wat/);
  } finally {
    w.dispose();
  }
});

// A check that throws must not take the run down: the doctor's job is to report.
test('the run survives a check that throws, reporting it rather than crashing', () => {
  const w = world();
  try {
    // The kbd check reads a waypoint; an unreadable one is a fail, not a crash — and
    // proves the runner keeps going and still prints a summary.
    mkdirSync(path.join(w.home, 'fixture', '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(w.home, 'fixture', '.kbd-orchestrator', 'current-waypoint.json'), '{ not json');

    const result = runDoctor([], w.home);
    const out = lines(result.stdout);

    assert.equal(JSON.parse(out.at(-1)).summary, true, 'the summary line is missing');
    assert.doesNotMatch(result.stderr, /at .*\.mjs:\d+/, 'a stack trace leaked to stderr');
  } finally {
    w.dispose();
  }
});
