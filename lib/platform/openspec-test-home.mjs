// A private managed-OpenSpec home for tests that drive the real runner.
//
// The runner serializes every operation on one machine-wide `operation.lock`, so test files that
// node --test runs in parallel — plus any session hook refreshing OpenSpec at the same moment —
// collide on the shared home and exit 75 ("contended"). Each caller gets its own home, seeded with
// this repo's pinned CLI and pinned to that version, so no lock is shared, no registry lookup or
// install happens, and the CLI under test is the one package.json pins rather than whatever the
// machine last selected.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from './paths.mjs';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** The exact OpenSpec version package.json pins. */
export function pinnedOpenSpecVersion(root = REPO_ROOT) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  return manifest.devDependencies['@fission-ai/openspec'];
}

/**
 * Creates a managed home holding the pinned CLI. Returns the environment that points the runner at
 * it and a `dispose()` that removes it. The package's dependencies are copied with it, because the
 * home sits outside this repo and Node cannot reach `node_modules` here from there.
 */
export function isolatedOpenSpecHome(root = REPO_ROOT) {
  const version = pinnedOpenSpecVersion(root);
  const home = mkdtempSync(path.join(tempDir(), 'openspec-home-'));
  const prefix = path.join(home, 'versions', version);
  mkdirSync(prefix, { recursive: true });
  cpSync(path.join(root, 'node_modules'), path.join(prefix, 'node_modules'), {
    recursive: true,
    filter: (source) => path.basename(source) !== '.bin',
  });
  writeFileSync(path.join(prefix, 'installed.json'), `${JSON.stringify({ version, installedAt: new Date().toISOString() })}\n`);
  return {
    home,
    version,
    env: { PROMETHEUS_OPENSPEC_HOME: home, PROMETHEUS_OPENSPEC_VERSION: version },
    dispose: () => rmSync(home, { recursive: true, force: true }),
  };
}
