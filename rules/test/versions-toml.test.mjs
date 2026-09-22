import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../../lib/platform/paths.mjs';
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

/**
 * The gitlink commit at `p` in HEAD, or null when there is none.
 * A failed `git ls-tree` raises rather than returning null: null here is safe (it reports a
 * disagreement rather than hiding one) but it would name the wrong cause — "no gitlink there"
 * when the truth is "git could not be read".
 */
const lsTreeFromGit = (p, cwd = repoRoot) => {
  const result = spawnExecutable('git', ['ls-tree', 'HEAD', '--', p], { cwd });
  if (result.status !== 0) {
    throw new Error(
      `git ls-tree HEAD -- ${p} failed (status ${result.status}): ${(result.stderr ?? '').trim()}`,
    );
  }
  const match = /^160000 commit ([0-9a-f]{40})\t/.exec((result.stdout ?? '').trim());
  return match ? match[1] : null;
};

/**
 * Every gitlink path in HEAD — the spec's "every submodule" is checked, not only the listed ones.
 * A failed `git ls-tree` raises: returning `[]` would mean "no gitlinks", which passes the
 * completeness check vacuously. A gate that cannot read the tree has not verified the tree.
 */
const listGitlinksFromGit = (cwd = repoRoot) => {
  const result = spawnExecutable('git', ['ls-tree', '-r', 'HEAD'], { cwd });
  if (result.status !== 0) {
    throw new Error(
      `git ls-tree -r HEAD failed (status ${result.status}); cannot verify submodule completeness: ${(result.stderr ?? '').trim()}`,
    );
  }
  return (result.stdout ?? '')
    .split('\n')
    .map((line) => /^160000 commit [0-9a-f]{40}\t(.+)$/.exec(line))
    .filter(Boolean)
    .map((match) => match[1]);
};

// `todo` does NOT skip a body in node:test — it runs it and demotes the failure. Marking
// the whole test `todo` therefore demoted every exception inside it the moment the file
// was absent (the run printed an ENOENT stack under "failing tests" while exiting 0), and
// would have demoted a real disagreement too had the file existed and the read failed.
// The existence check is hoisted so `todo` marks a deliberate non-run, and every failure
// of an actual comparison stays a failure.
test('versions.toml agrees with the tree', (t) => {
  if (!existsSync(versionsToml)) {
    t.todo('operator has not authored versions.toml');
    return;
  }

  const parsed = parseVersionsToml(readFileSync(versionsToml, 'utf8'));
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  const disagreements = compareToTree(parsed, {
    lsTree: lsTreeFromGit,
    listGitlinks: listGitlinksFromGit,
    packageJson,
  });

  assert.deepEqual(disagreements, [], `versions.toml disagrees with the tree:\n${disagreements.join('\n')}`);
});

// Proves the gitlink reader is not vacuous: the one submodule this repository
// already vendors must be found, and a path that is a directory rather than a
// gitlink must not be mistaken for one.
test('the gitlink readers find a real submodule and refuse a plain directory', () => {
  assert.match(lsTreeFromGit('tools/prometheus-knowledge') ?? '', /^[0-9a-f]{40}$/);
  assert.equal(lsTreeFromGit('lib/platform'), null);
  assert.equal(lsTreeFromGit('tools/does-not-exist'), null);

  const gitlinks = listGitlinksFromGit();
  assert.ok(gitlinks.includes('tools/prometheus-knowledge'), JSON.stringify(gitlinks));
  assert.ok(!gitlinks.includes('lib/platform'));
});

// Both readers used to swallow a git failure — `[]` ("no gitlinks") passed the completeness
// check vacuously, and `null` named the wrong cause. A gate that cannot read the tree has not
// verified the tree. Caught by round 5 of the diff review.
test('a git failure raises rather than reporting an empty or absent tree', () => {
  const notARepo = mkdtempSync(path.join(tempDir(), 'versions-toml-'));
  try {
    assert.throws(() => listGitlinksFromGit(notARepo), /git ls-tree/);
    assert.throws(() => lsTreeFromGit('tools/prometheus-knowledge', notARepo), /git ls-tree/);
  } finally {
    rmSync(notARepo, { recursive: true, force: true });
  }
});
