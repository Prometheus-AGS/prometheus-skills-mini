// Drives the real scripts/generate-skill-system-distribution.mjs as a child process against a
// copied fixture repo (never the real dist/ this repo ships), asserting the --check exit-code
// contract: 0 on a freshly generated tree, non-zero once the tree drifts from the manifest.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tempDir } from '../lib/platform/paths.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_RELATIVE = path.join('scripts', 'generate-skill-system-distribution.mjs');

function buildFixtureRepo(dir) {
  cpSync(path.join(REPO_ROOT, 'lib'), path.join(dir, 'lib'), { recursive: true });
  cpSync(path.join(REPO_ROOT, 'scripts', 'generate-skill-system-distribution.mjs'), path.join(dir, SCRIPT_RELATIVE));
  mkdirSync(path.join(dir, 'skills', 'sample-skill'), { recursive: true });
  writeFileSync(
    path.join(dir, 'skills', 'sample-skill', 'SKILL.md'),
    '---\nname: sample-skill\ndescription: A sample skill.\n---\n\nBody.\n',
    'utf8',
  );
  writeFileSync(
    path.join(dir, 'skill-system.json'),
    JSON.stringify({
      schemaVersion: 'prometheus-mini-skill-system-v1',
      name: 'fixture-pack',
      releaseVersion: '0.1.0',
      minimumActiveVersion: '0.1.0',
      inventory: { roots: [{ id: 'core', path: 'skills', scan: 'children' }] },
      targets: [{ id: 'claude', path: '.claude/skills', mode: 'copy', sourceTreeLifecycle: 'install-only' }],
      outputs: {
        claudeMarketplace: '.claude-plugin/marketplace.json',
        codexMarketplace: '.agents/plugins/marketplace.json',
        claudePackage: 'dist/plugins/claude/fixture-pack',
        codexPackage: 'dist/plugins/codex/fixture-pack',
      },
    }),
    'utf8',
  );
}

const workspace = (run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'generate-distribution-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('running the generator against a clean fixture, then --check, exits 0 with no drift reported', () => {
  workspace((dir) => {
    buildFixtureRepo(dir);
    const generate = spawnSync(process.execPath, [SCRIPT_RELATIVE], { cwd: dir, encoding: 'utf8', shell: false });
    assert.equal(generate.status, 0, generate.stderr);

    const check = spawnSync(process.execPath, [SCRIPT_RELATIVE, '--check'], { cwd: dir, encoding: 'utf8', shell: false });

    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /no drift/);
  });
});

test('--check exits non-zero and names the stale output once a packaged file is tampered with', () => {
  workspace((dir) => {
    buildFixtureRepo(dir);
    spawnSync(process.execPath, [SCRIPT_RELATIVE], { cwd: dir, encoding: 'utf8', shell: false });
    writeFileSync(path.join(dir, 'dist/plugins/claude/fixture-pack/.claude-plugin/plugin.json'), '{}', 'utf8');

    const check = spawnSync(process.execPath, [SCRIPT_RELATIVE, '--check'], { cwd: dir, encoding: 'utf8', shell: false });

    assert.notEqual(check.status, 0);
    assert.match(check.stderr, /stale/);
  });
});
