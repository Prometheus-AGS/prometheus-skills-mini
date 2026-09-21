import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { resolveProvider } from './provider.mjs';

// Every tier is exercised against injected roots. The home directory comes from
// lib/platform/paths.mjs, never os.homedir(), so a test can supply one without
// touching the real home — which is the whole reason paths.mjs takes injection.
const withRoots = (run) => {
  const base = mkdtempSync(path.join(tempDir(), 'provider-'));
  try {
    const project = path.join(base, 'project');
    const home = path.join(base, 'home');
    mkdirSync(project, { recursive: true });
    mkdirSync(home, { recursive: true });
    return run({ project, home, base });
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};

test('with nothing configured it falls back to the filesystem provider', () => {
  const provider = withRoots(({ project, home }) => resolveProvider({ cwd: project, home }));

  assert.equal(provider.provider_type, 'filesystem');
  assert.equal(provider.config.state_directory, '.refiner');
  assert.equal(provider.config.scope, 'project');
});

test('a project-local .refiner-provider.json beats the filesystem default', () => {
  const provider = withRoots(({ project, home }) => {
    writeJson(path.join(project, '.refiner-provider.json'), { provider_type: 'project-local' });
    return resolveProvider({ cwd: project, home });
  });

  assert.equal(provider.provider_type, 'project-local');
});

test('the global config is used when no project-local config exists', () => {
  const provider = withRoots(({ project, home }) => {
    writeJson(path.join(home, '.refiner', 'provider.json'), { provider_type: 'global' });
    return resolveProvider({ cwd: project, home });
  });

  assert.equal(provider.provider_type, 'global');
});

test('a project-local config beats the global one', () => {
  const provider = withRoots(({ project, home }) => {
    writeJson(path.join(project, '.refiner-provider.json'), { provider_type: 'project-local' });
    writeJson(path.join(home, '.refiner', 'provider.json'), { provider_type: 'global' });
    return resolveProvider({ cwd: project, home });
  });

  assert.equal(provider.provider_type, 'project-local');
});

test('the environment variable beats every file', () => {
  const provider = withRoots(({ project, home, base }) => {
    const injected = path.join(base, 'injected.json');
    writeJson(injected, { provider_type: 'from-env' });
    writeJson(path.join(project, '.refiner-provider.json'), { provider_type: 'project-local' });
    writeJson(path.join(home, '.refiner', 'provider.json'), { provider_type: 'global' });
    return resolveProvider({ cwd: project, home, env: { REFINER_PROVIDER_CONFIG: injected } });
  });

  assert.equal(provider.provider_type, 'from-env');
});

test('an environment variable naming a missing file falls through, it does not throw', () => {
  const provider = withRoots(({ project, home, base }) =>
    resolveProvider({
      cwd: project,
      home,
      env: { REFINER_PROVIDER_CONFIG: path.join(base, 'does-not-exist.json') },
    }),
  );

  assert.equal(provider.provider_type, 'filesystem');
});

test('a corrupt config falls through to the next tier rather than throwing', () => {
  const provider = withRoots(({ project, home }) => {
    mkdirSync(path.dirname(path.join(project, '.refiner-provider.json')), { recursive: true });
    writeFileSync(path.join(project, '.refiner-provider.json'), '{ not json');
    writeJson(path.join(home, '.refiner', 'provider.json'), { provider_type: 'global' });
    return resolveProvider({ cwd: project, home });
  });

  assert.equal(provider.provider_type, 'global');
});

test('a CRLF config file parses identically to an LF one', () => {
  const provider = withRoots(({ project, home }) => {
    mkdirSync(project, { recursive: true });
    writeFileSync(
      path.join(project, '.refiner-provider.json'),
      '{\r\n  "provider_type": "crlf-written"\r\n}\r\n',
    );
    return resolveProvider({ cwd: project, home });
  });

  assert.equal(provider.provider_type, 'crlf-written');
});

test('provider.mjs never reads the home directory itself', () => {
  // paths.mjs is the only module allowed to ask the OS where things live, and the
  // upstream script read "$HOME/.refiner/provider.json" directly.
  const source = readFileSync(new URL('./provider.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /os\.homedir\(\)|process\.env\.HOME|process\.env\.USERPROFILE/);
});

test('resolution shells out to nothing', () => {
  const source = readFileSync(new URL('./provider.mjs', import.meta.url), 'utf8');

  // Upstream used `command -v mcp | grep -q`; grep is absent on stock Windows and
  // this project forbids it outright.
  assert.doesNotMatch(source, /child_process|execSync|spawnSync/);
});
