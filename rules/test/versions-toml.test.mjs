import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnExecutable } from '../../lib/platform/spawn.mjs';
import { compareToTree, parseVersionsToml } from '../lib/versions-toml.mjs';

// The gate five changes stand behind (openspec-fork-submodule, docs-site,
// docker-services, sycophancy-correction-vendored, compass-vendored): each begins
// by asserting this test PASSES — not `todo`. While the operator has not authored
// versions.toml it reports `todo` with the reason, so an absent version authority
// is visible rather than silently tolerated. CLAUDE.md §0.2 forbids an agent
// writing the file, so no task can make this pass; only the operator can.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const versionsToml = path.join(repoRoot, 'versions.toml');

/** The gitlink commit at `p` in HEAD, or null when there is none. */
const lsTreeFromGit = (p) => {
  const result = spawnExecutable('git', ['ls-tree', 'HEAD', '--', p], { cwd: repoRoot });
  if (result.status !== 0) return null;
  const match = /^160000 commit ([0-9a-f]{40})\t/.exec((result.stdout ?? '').trim());
  return match ? match[1] : null;
};

test(
  'versions.toml agrees with the tree',
  { todo: existsSync(versionsToml) ? false : 'operator has not authored versions.toml' },
  () => {
    const parsed = parseVersionsToml(readFileSync(versionsToml, 'utf8'));
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

    const disagreements = compareToTree(parsed, { lsTree: lsTreeFromGit, packageJson });

    assert.deepEqual(disagreements, [], `versions.toml disagrees with the tree:\n${disagreements.join('\n')}`);
  },
);

// Proves the gitlink reader is not vacuous: the one submodule this repository
// already vendors must be found, and a path that is a directory rather than a
// gitlink must not be mistaken for one.
test('the gitlink reader finds a real submodule and refuses a plain directory', () => {
  assert.match(lsTreeFromGit('tools/prometheus-knowledge') ?? '', /^[0-9a-f]{40}$/);
  assert.equal(lsTreeFromGit('lib/platform'), null);
  assert.equal(lsTreeFromGit('tools/does-not-exist'), null);
});
