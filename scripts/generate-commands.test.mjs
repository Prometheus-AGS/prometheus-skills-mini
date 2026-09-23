// Drives the real scripts/generate-commands.mjs as a child process against this repo's real
// skills/ tree, writing into a temp --output directory so no test ever touches a real home
// directory's ~/.claude/commands.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tempDir } from '../lib/platform/paths.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'generate-commands.mjs');

const workspace = (run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'generate-commands-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('generates one command file per skill under --output, each pointing at an absolute SKILL.md path', () => {
  workspace((outputDir) => {
    const result = spawnSync(process.execPath, [SCRIPT, '--output', outputDir], { encoding: 'utf8', shell: false });

    assert.equal(result.status, 0, result.stderr);
    const generated = readdirSync(outputDir);
    assert.ok(generated.includes('kbd-analyze.md'));
    const content = readFileSync(path.join(outputDir, 'kbd-analyze.md'), 'utf8');
    assert.match(content, /^---\ndescription: "/);
    assert.ok(content.includes(path.join(REPO_ROOT, 'skills', 'kbd-analyze', 'SKILL.md').replace(/\\/g, '/')));
    assert.match(content, /\$ARGUMENTS\n$/);
  });
});

test('--uninstall removes every command file this repo would generate', () => {
  workspace((outputDir) => {
    spawnSync(process.execPath, [SCRIPT, '--output', outputDir], { encoding: 'utf8', shell: false });
    const before = readdirSync(outputDir).length;
    assert.ok(before > 0);

    const result = spawnSync(process.execPath, [SCRIPT, '--output', outputDir, '--uninstall'], {
      encoding: 'utf8',
      shell: false,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readdirSync(outputDir), []);
  });
});

test('a name outside this repo\'s skill set never appears in the generated output', () => {
  workspace((outputDir) => {
    spawnSync(process.execPath, [SCRIPT, '--output', outputDir], { encoding: 'utf8', shell: false });

    assert.ok(!existsSync(path.join(outputDir, 'no-such-skill-ever.md')));
  });
});
