import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tempDir } from '../../lib/platform/paths.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const run = (cwd) =>
  spawnSync(process.execPath, ['scripts/spec-validate.mjs'], { cwd, encoding: 'utf8', shell: false });

test('validation passes on this repository and reports the totals', () => {
  const result = run(ROOT);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Totals: \d+ passed, 0 failed/);
});

test('a failing validation forwards the CLI exit code instead of masking it', () => {
  const work = mkdtempSync(path.join(tempDir(), 'spec-validate-'));
  try {
    // scripts/ and lib/ must come too, or the run fails with MODULE_NOT_FOUND and the test
    // would "pass" on the wrong non-zero exit — which is exactly what happened first time.
    for (const entry of ['openspec', 'scripts', 'lib', 'package.json', 'package-lock.json', 'node_modules']) {
      cpSync(path.join(ROOT, entry), path.join(work, entry), { recursive: true, verbatimSymlinks: true });
    }
    // A change with a proposal but no deltas and no opt-out is invalid by OpenSpec's own rules.
    const broken = path.join(work, 'openspec/changes/broken');
    cpSync(path.join(ROOT, 'openspec/changes/windows-evidence'), broken, { recursive: true });
    rmSync(path.join(broken, '.openspec.yaml'), { force: true });
    writeFileSync(path.join(broken, 'proposal.md'), '## Why\n\nbroken on purpose\n\n## What Changes\n\n- nothing\n');

    const result = run(work);

    const output = result.stdout + result.stderr;
    assert.notEqual(result.status, 0, 'a failing validation must not exit 0');
    assert.doesNotMatch(output, /Cannot find module/, 'must fail from validation, not a missing file');
    assert.match(output, /broken/, 'the failing change must be named');
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
