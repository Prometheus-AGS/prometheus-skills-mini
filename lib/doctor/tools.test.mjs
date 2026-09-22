import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { outcomeConformance, checkConformance } from './contract.mjs';
import { checks } from './tools.mjs';

const byId = (id) => {
  const check = checks.find((c) => c.id === id);
  assert.ok(check, `no check ${id}`);
  return check;
};

const run = async (id, ctx) => {
  const outcome = await byId(id).run(ctx);
  assert.deepEqual(outcomeConformance(outcome, id), [], JSON.stringify(outcome));
  return outcome;
};

const found = (stdout) => () => ({ status: 0, stdout, stderr: '' });
const missing = () => () => ({ status: 1, stdout: '', stderr: 'command not found' });

test('mini-pk passes and names the version', async () => {
  const outcome = await run('mini-pk', { spawn: found('pk 1.9.0\n') });

  assert.equal(outcome.status, 'pass');
  assert.match(outcome.summary, /1\.9\.0/);
});

// pk is optional: the Karpathy flow degrades without it. Absent is a warning.
test('mini-pk warns when the binary is absent', async () => {
  const outcome = await run('mini-pk', { spawn: missing() });

  assert.equal(outcome.status, 'warn');
  assert.match(outcome.summary + outcome.detail, /pk/);
});

// Present but broken is a real fault: the binary exists and cannot answer.
test('mini-pk fails when the binary is present but errors', async () => {
  const outcome = await run('mini-pk', {
    spawn: () => ({ status: 101, stdout: '', stderr: 'illegal instruction' }),
    // A resolver that says the binary IS there distinguishes broken from absent.
    resolve: () => '/usr/local/bin/pk',
  });

  assert.equal(outcome.status, 'fail');
  assert.match(outcome.summary + outcome.detail, /101|illegal/i);
});

// Round 1 of the diff review: the default resolver was only consulted when a resolver was
// injected, so by DEFAULT a present-but-crashing pk reported "pk is not installed" — the
// wrong status and a false statement. The fixture no longer injects `resolve`.
test('mini-pk fails when present and broken even with no injected resolver', async () => {
  const outcome = await run('mini-pk', {
    spawn: (file, args) =>
      args[0] === '--version'
        ? { status: 101, stdout: '', stderr: 'illegal instruction' }
        : { status: 0, stdout: '/usr/local/bin/pk\n', stderr: '' },
  });

  assert.equal(outcome.status, 'fail');
  assert.doesNotMatch(outcome.summary, /not installed/i);
});

test('the pk probe never runs through a shell', async () => {
  const calls = [];
  await run('mini-pk', {
    spawn: (file, args) => {
      calls.push([file, ...args]);
      return { status: 0, stdout: 'pk 1.9.0\n', stderr: '' };
    },
  });

  assert.equal(calls.length, 1);
  assert.ok(!calls[0].some((a) => typeof a === 'string' && /[;&|]/.test(a)), JSON.stringify(calls));
});

test('mini-sycophancy-correction warns when the binary cannot be resolved', async () => {
  const outcome = await run('mini-sycophancy-correction', { resolve: () => null });

  assert.equal(outcome.status, 'warn');
  assert.match(outcome.summary + outcome.detail, /sycophancy/i);
});

// Round 2 of the diff review: any non-empty SYCOPHANCY_BIN was reported as an installed
// binary, so a stale or mistyped path produced "sycophancy-correction at <path>" for a
// file that does not exist — an assertion about something never looked at.
test('mini-sycophancy-correction fails when its configured path holds nothing', async () => {
  const outcome = await run('mini-sycophancy-correction', {
    resolve: () => '/nonexistent/path/sycophancy',
    exists: () => false,
  });

  assert.equal(outcome.status, 'fail');
  assert.match(outcome.summary, /nothing is there|not.*exist/i);
});

test('mini-sycophancy-correction passes when resolved with the expected gateway', async () => {
  const dir = mkdtempSync(path.join(tempDir(), 'doctor-syco-'));
  try {
    mkdirSync(path.join(dir, 'cfg'), { recursive: true });
    const skillToml = path.join(dir, 'cfg', 'skill.toml');
    writeFileSync(skillToml, 'gateway = "http://localhost:4000/v1"\n');

    const outcome = await run('mini-sycophancy-correction', {
      resolve: () => path.join(dir, 'sycophancy'),
      exists: () => true,
      skillToml: () => skillToml,
    });

    assert.equal(outcome.status, 'pass');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The gateway is fixed at :4000/v1 by project rule. A skill.toml naming another one
// would silently send review traffic somewhere else, so it is a failure, not a warning.
test('mini-sycophancy-correction fails when skill.toml names another gateway', async () => {
  const dir = mkdtempSync(path.join(tempDir(), 'doctor-syco-'));
  try {
    const skillToml = path.join(dir, 'skill.toml');
    writeFileSync(skillToml, 'gateway = "https://api.example.com/v1"\n');

    const outcome = await run('mini-sycophancy-correction', {
      resolve: () => path.join(dir, 'sycophancy'),
      exists: () => true,
      skillToml: () => skillToml,
    });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.summary + outcome.detail, /api\.example\.com/);
    assert.match(outcome.summary + outcome.detail, /4000/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Round 6: the gateway check only read a skill.toml the CALLER injected, and nothing
// outside the tests ever did — so on every real machine it passed vacuously. These drive
// the DEFAULT resolver, with no skillToml supplied.
test('the gateway is checked with no injected skill.toml: beside the binary', async () => {
  const dir = mkdtempSync(path.join(tempDir(), 'doctor-syco-'));
  try {
    const binary = path.join(dir, 'sycophancy');
    writeFileSync(binary, '');
    writeFileSync(path.join(dir, 'skill.toml'), 'gateway = "https://elsewhere.example/v1"\n');

    const outcome = await run('mini-sycophancy-correction', { resolve: () => binary });

    assert.equal(outcome.status, 'fail', 'the default resolver did not find skill.toml');
    assert.match(outcome.summary, /elsewhere\.example/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the default resolver accepts the correct gateway beside the binary', async () => {
  const dir = mkdtempSync(path.join(tempDir(), 'doctor-syco-'));
  try {
    const binary = path.join(dir, 'sycophancy');
    writeFileSync(binary, '');
    writeFileSync(path.join(dir, 'skill.toml'), 'gateway = "http://localhost:4000/v1"\n');

    assert.equal((await run('mini-sycophancy-correction', { resolve: () => binary })).status, 'pass');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every check in this group satisfies the contract statically', () => {
  for (const check of checks) assert.deepEqual(checkConformance(check), [], check.id);
});
