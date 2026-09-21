import { test } from 'node:test';
import assert from 'node:assert/strict';
// node:os is imported here, and ONLY here among consumers, for a specific reason: these two
// tests assert that the DEFAULT helpers delegate to the real OS. Asserting that through the
// helper itself would be a tautology. Every other test and module uses the helper.
import os from 'node:os';
import path from 'node:path';
import { createPaths, homeDir, tempDir, stateDir, join } from './paths.mjs';

test('homeDir returns the real home directory when no root is injected', () => {
  const actual = homeDir();

  assert.equal(actual, os.homedir());
});

test('tempDir returns the real temp directory when no root is injected', () => {
  const actual = tempDir();

  assert.equal(actual, os.tmpdir());
});

test('injected roots replace the real ones so tests never touch a real home', () => {
  const paths = createPaths({ home: '/injected/home', temp: '/injected/temp' });

  assert.equal(paths.homeDir(), '/injected/home');
  assert.equal(paths.tempDir(), '/injected/temp');
});

test('stateDir roots at .prometheus under the home directory', () => {
  const paths = createPaths({ home: path.join('/injected', 'home') });

  const actual = paths.stateDir('phases', 'one');

  assert.equal(actual, path.join('/injected', 'home', '.prometheus', 'phases', 'one'));
});

test('stateDir with no parts is the state root itself', () => {
  const paths = createPaths({ home: '/injected/home' });

  assert.equal(paths.stateDir(), path.join('/injected/home', '.prometheus'));
});

test('join uses the platform separator and never a hardcoded slash', () => {
  const actual = join('a', 'b', 'c');

  assert.equal(actual, ['a', 'b', 'c'].join(path.sep));
});
