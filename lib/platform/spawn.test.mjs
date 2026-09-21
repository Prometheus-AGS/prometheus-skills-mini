import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnNodeCli, spawnExecutable, resolveNodeCli } from './spawn.mjs';

test('an npm CLI resolves to its JavaScript entry, not a shim', () => {
  const entry = resolveNodeCli('@fission-ai/openspec', 'openspec');

  assert.ok(entry.endsWith(path.join('bin', 'openspec.js')), entry);
  assert.doesNotMatch(entry, /\.(cmd|bat|ps1)$/);
});

test('resolution works even when the package blocks package.json in its exports field', () => {
  // @fission-ai/openspec exports only '.', so require.resolve('<pkg>/package.json') throws
  // ERR_PACKAGE_PATH_NOT_EXPORTED. Resolution must fall back to walking up from the main entry.
  const entry = resolveNodeCli('@fission-ai/openspec', 'openspec');

  assert.ok(entry.includes(path.join('node_modules', '@fission-ai', 'openspec')), entry);
});

test('an unknown bin name is rejected and the error lists what is available', () => {
  assert.throws(
    () => resolveNodeCli('@fission-ai/openspec', 'nosuchbin'),
    (error) => /@fission-ai\/openspec/.test(error.message) && /openspec/.test(error.message),
  );
});

test('the CLI runs through the current node executable with no shell', () => {
  const result = spawnNodeCli('@fission-ai/openspec', 'openspec', ['--version']);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '1.10.0');
});

test('the CLI runs with an emptied PATH, proving no global install is used', () => {
  const result = spawnNodeCli('@fission-ai/openspec', 'openspec', ['--version'], { env: { ...process.env, PATH: '' } });

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '1.10.0');
});

test('a real executable runs by name', () => {
  const result = spawnExecutable('git', ['--version']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^git version /);
});

test('a .cmd or .bat tool is refused before anything is spawned', () => {
  for (const name of ['tool.cmd', 'tool.bat', 'TOOL.CMD']) {
    assert.throws(
      () => spawnExecutable(name, []),
      (error) => /cannot run .* without a shell/i.test(error.message) && /spawnNodeCli/.test(error.message),
      `${name} should have been refused`,
    );
  }
});

test('arguments containing shell metacharacters reach the child unchanged', () => {
  const hostile = ['a b', 'quote"inside', "single'inside", 'amp & pipe | semi ;', '$(whoami)', '%PATH%'];

  const result = spawnExecutable(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', ...hostile]);

  assert.deepEqual(JSON.parse(result.stdout), hostile);
});

test('a command string instead of an argument array is refused', () => {
  assert.throws(() => spawnExecutable('git --version', []), /args array/i);
});
