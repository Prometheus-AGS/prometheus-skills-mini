// Integration scenarios for the VLBV session-start hook, driven through the
// production entry point exactly as hooks.json registers it:
//   node scripts/hook-entry.mjs --hook sessionstart-vlbv --harness claude-code
// with a scratch HOME and a scratch project directory.
//
// Production failures caught: the rule printed to stderr, where no harness adds
// it to the session; output starting with `{`, which Codex parses as a
// structured response; the rule printed in every project when the default is
// KBD projects only; a mis-typed setting silently switching the rule off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const entry = path.join(repoRoot, 'scripts', 'hook-entry.mjs');

const withScratch = (work) => {
  const scratch = mkdtempSync(path.join(tempDir(), 'sessionstart-vlbv-'));
  try {
    const home = path.join(scratch, 'home');
    const project = path.join(scratch, 'project');
    mkdirSync(home, { recursive: true });
    mkdirSync(project, { recursive: true });
    return work({ home, project, scratch });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

// The payload arrives on fd 0 as a regular file, as in the other hook tests.
const runHook = ({ home, project, scratch, cwd = project, env: extra = {} }) => {
  const env = { ...process.env, HOME: home, USERPROFILE: home, ...extra };
  for (const key of ['CLAUDE_PROJECT_DIR', 'CLAUDE_PLUGIN_ROOT', 'NODE_TEST_CONTEXT']) delete env[key];
  if (!('PROMETHEUS_VLBV_DEFAULT' in extra)) delete env.PROMETHEUS_VLBV_DEFAULT;
  const payloadFile = path.join(scratch, 'payload.json');
  writeFileSync(payloadFile, JSON.stringify({ hook_event_name: 'SessionStart', session_id: 's1', cwd }));
  const stdin = openSync(payloadFile, 'r');
  try {
    return spawnSync(process.execPath, [entry, '--hook', 'sessionstart-vlbv', '--harness', 'claude-code'], {
      cwd,
      env,
      stdio: [stdin, 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 10000,
    });
  } finally {
    closeSync(stdin);
  }
};

const makeKbd = (project) => mkdirSync(path.join(project, '.kbd-orchestrator'), { recursive: true });
const setting = (file, word) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, word);
};

test('in a KBD-managed project the rule is printed to stdout and does not start with a brace', () => {
  withScratch((world) => {
    makeKbd(world.project);

    const result = runHook(world);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^This is a KBD-managed project, so VLBV/);
    assert.match(result.stdout, /run the boundary packet once/);
    assert.match(result.stdout, /PASS, FAIL, BLOCKED or NOT_EXERCISED/);
    assert.match(result.stdout, /Operator override/);
    assert.ok(!result.stdout.trimStart().startsWith('{'));
    assert.equal(result.stderr, '');
  });
});

test('a directory below the KBD project root still counts as the KBD project', () => {
  withScratch((world) => {
    makeKbd(world.project);
    const nested = path.join(world.project, 'packages', 'api');
    mkdirSync(nested, { recursive: true });

    const result = runHook({ ...world, cwd: nested });

    assert.match(result.stdout, /^This is a KBD-managed project/);
  });
});

test('outside a KBD project the default mode prints nothing', () => {
  withScratch((world) => {
    const result = runHook(world);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });
});

test('mode "always" from the environment prints the rule outside a KBD project', () => {
  withScratch((world) => {
    const result = runHook({ ...world, env: { PROMETHEUS_VLBV_DEFAULT: 'Always' } });

    assert.match(result.stdout, /^VLBV \(Value-Led Behavioral Verification\) is enabled as the verification method for this session by configuration\./);
  });
});

test('mode "off" silences the rule even in a KBD project', () => {
  withScratch((world) => {
    makeKbd(world.project);

    const result = runHook({ ...world, env: { PROMETHEUS_VLBV_DEFAULT: 'off' } });

    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });
});

test('the project file outranks the user file, and the environment outranks both', () => {
  withScratch((world) => {
    setting(path.join(world.home, '.prometheus', 'config', 'vlbv-default'), 'always\n');
    assert.match(runHook(world).stdout, /enabled as the verification method/, 'user file alone');

    setting(path.join(world.project, '.prometheus', 'vlbv-default'), 'off\r\n');
    assert.equal(runHook(world).stdout, '', 'project file over user file');

    assert.match(runHook({ ...world, env: { PROMETHEUS_VLBV_DEFAULT: 'always' } }).stdout, /enabled as the verification method/, 'environment over both');
  });
});

test('an unrecognised setting falls back to the default instead of switching the rule off', () => {
  withScratch((world) => {
    makeKbd(world.project);

    const result = runHook({ ...world, env: { PROMETHEUS_VLBV_DEFAULT: 'sometimes' } });

    assert.match(result.stdout, /^This is a KBD-managed project/);
  });
});
