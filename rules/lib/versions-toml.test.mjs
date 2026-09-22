import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareToTree, parseVersionsToml } from './versions-toml.mjs';

// The reader implements only the subset docs/versions-toml.md describes: tables,
// string values, inline tables, comments. Anything richer is a parse error rather
// than a silent misread — a version authority that quietly drops a pin is worse
// than one that refuses to load.
const SAMPLE = `
# a comment
[node]
minimum = ">=22"

[submodules]
"tools/prometheus-knowledge" = "abb6745"
"tools/openspec" = "d39ca5a"

[images]
"surrealdb" = { image = "surrealdb/surrealdb:v3.0.5", digest = "sha256:abc" }
"liter-llm" = { built_from_submodule = true, submodule = "tools/openspec" }

[npm]
"@docusaurus/core" = "3.10.2"
`;

test('the parser reads tables, strings, inline tables and comments', () => {
  const parsed = parseVersionsToml(SAMPLE);

  assert.equal(parsed.node.minimum, '>=22');
  assert.deepEqual(parsed.submodules, {
    'tools/prometheus-knowledge': 'abb6745',
    'tools/openspec': 'd39ca5a',
  });
  assert.deepEqual(parsed.images.surrealdb, {
    image: 'surrealdb/surrealdb:v3.0.5',
    digest: 'sha256:abc',
  });
  assert.equal(parsed.images['liter-llm'].built_from_submodule, true);
  assert.equal(parsed.npm['@docusaurus/core'], '3.10.2');
});

test('a construct outside the documented subset is refused, not ignored', () => {
  for (const bad of [
    '[submodules]\n"a" = ["x", "y"]\n',
    '[submodules]\n"a" = """\nmulti\n"""\n',
    '[[submodules]]\npath = "a"\n',
  ]) {
    assert.throws(() => parseVersionsToml(bad), /versions\.toml/);
  }
});

test('a value before any table header is refused', () => {
  assert.throws(() => parseVersionsToml('minimum = ">=22"\n'), /versions\.toml/);
});

const tree = (entries) => (p) => entries[p] ?? null;

test('a submodule pin that disagrees with the gitlink is reported with both commits', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n[submodules]\n"tools/x" = "aaaaaaa"\n');

  const found = compareToTree(parsed, {
    lsTree: tree({ 'tools/x': 'bbbbbbbb1234567890' }),
    packageJson: { engines: { node: '>=22' } },
  });

  assert.equal(found.length, 1);
  assert.match(found[0], /tools\/x/);
  assert.match(found[0], /aaaaaaa/);
  assert.match(found[0], /bbbbbbbb/);
});

test('a short sha matches the tree by prefix', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n[submodules]\n"tools/x" = "abb6745"\n');

  const found = compareToTree(parsed, {
    lsTree: tree({ 'tools/x': 'abb6745e31da7577611d7c32005af26a72254484' }),
    packageJson: { engines: { node: '>=22' } },
  });

  assert.deepEqual(found, []);
});

test('a pinned path that is not a gitlink at all is reported', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n[submodules]\n"tools/absent" = "abb6745"\n');

  const found = compareToTree(parsed, { lsTree: tree({}), packageJson: { engines: { node: '>=22' } } });

  assert.equal(found.length, 1);
  assert.match(found[0], /tools\/absent/);
  assert.match(found[0], /not a gitlink/i);
});

test('the node floor must equal package.json engines.node exactly', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n');

  const found = compareToTree(parsed, { lsTree: tree({}), packageJson: { engines: { node: '>=22.0.0' } } });

  assert.equal(found.length, 1);
  assert.match(found[0], />=22\b/);
  assert.match(found[0], />=22\.0\.0/);
});

test('an image needs a digest or built_from_submodule, and the submodule it names must be pinned', () => {
  const base = '[node]\nminimum = ">=22"\n[submodules]\n"tools/ok" = "aaaaaaa"\n[images]\n';

  const neither = compareToTree(parseVersionsToml(`${base}"x" = { image = "y:1" }\n`), {
    lsTree: tree({ 'tools/ok': 'aaaaaaa0000' }),
    packageJson: { engines: { node: '>=22' } },
  });
  assert.equal(neither.length, 1);
  assert.match(neither[0], /digest|built_from_submodule/);

  const dangling = compareToTree(
    parseVersionsToml(`${base}"x" = { built_from_submodule = true, submodule = "tools/nope" }\n`),
    { lsTree: tree({ 'tools/ok': 'aaaaaaa0000' }), packageJson: { engines: { node: '>=22' } } },
  );
  assert.equal(dangling.length, 1);
  assert.match(dangling[0], /tools\/nope/);

  const fine = compareToTree(
    parseVersionsToml(`${base}"x" = { built_from_submodule = true, submodule = "tools/ok" }\n`),
    { lsTree: tree({ 'tools/ok': 'aaaaaaa0000' }), packageJson: { engines: { node: '>=22' } } },
  );
  assert.deepEqual(fine, []);
});

// The spec says versions.toml names "every submodule under tools/". Checking only
// the pins that ARE listed would let an unlisted submodule pass silently — an
// incomplete version authority that reports itself as agreeing with the tree.
// Caught by the diff-mode review of this change (CRITICAL 1).
test('a submodule under tools/ that versions.toml does not name is reported', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n[submodules]\n"tools/named" = "aaaaaaa"\n');

  const found = compareToTree(parsed, {
    lsTree: tree({ 'tools/named': 'aaaaaaa0000' }),
    listGitlinks: () => ['tools/named', 'tools/unnamed'],
    packageJson: { engines: { node: '>=22' } },
  });

  assert.equal(found.length, 1);
  assert.match(found[0], /tools\/unnamed/);
  assert.match(found[0], /does not name it|not named/i);
});

test('with every gitlink named, the completeness check is silent', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n[submodules]\n"tools/a" = "aaaaaaa"\n');

  const found = compareToTree(parsed, {
    lsTree: tree({ 'tools/a': 'aaaaaaa0000' }),
    listGitlinks: () => ['tools/a'],
    packageJson: { engines: { node: '>=22' } },
  });

  assert.deepEqual(found, []);
});

test('completeness is scoped to tools/: a gitlink elsewhere is not this file’s business', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n[submodules]\n"tools/a" = "aaaaaaa"\n');

  const found = compareToTree(parsed, {
    lsTree: tree({ 'tools/a': 'aaaaaaa0000' }),
    listGitlinks: () => ['tools/a', 'vendor/elsewhere', 'site/theme'],
    packageJson: { engines: { node: '>=22' } },
  });

  assert.deepEqual(found, []);
});

test('a duplicate key is a parse error, not a silent overwrite', () => {
  assert.throws(
    () => parseVersionsToml('[submodules]\n"tools/a" = "aaaaaaa"\n"tools/a" = "bbbbbbb"\n'),
    /duplicate key/,
  );
});

test('every disagreement is reported, not just the first', () => {
  const parsed = parseVersionsToml(
    '[node]\nminimum = ">=20"\n[submodules]\n"tools/a" = "aaaaaaa"\n"tools/b" = "bbbbbbb"\n',
  );

  const found = compareToTree(parsed, {
    lsTree: tree({ 'tools/a': 'zzzzzzz0000', 'tools/b': 'yyyyyyy0000' }),
    packageJson: { engines: { node: '>=22' } },
  });

  assert.equal(found.length, 3);
});
