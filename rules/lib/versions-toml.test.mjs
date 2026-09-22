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
    listGitlinks: () => [],
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
    listGitlinks: () => [],
    packageJson: { engines: { node: '>=22' } },
  });

  assert.deepEqual(found, []);
});

test('a pinned path that is not a gitlink at all is reported', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n[submodules]\n"tools/absent" = "abb6745"\n');

  const found = compareToTree(parsed, {
    lsTree: tree({}),
    listGitlinks: () => [],
    packageJson: { engines: { node: '>=22' } },
  });

  assert.equal(found.length, 1);
  assert.match(found[0], /tools\/absent/);
  assert.match(found[0], /not a gitlink/i);
});

test('the node floor must equal package.json engines.node exactly', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n');

  const found = compareToTree(parsed, {
    lsTree: tree({}),
    listGitlinks: () => [],
    packageJson: { engines: { node: '>=22.0.0' } },
  });

  assert.equal(found.length, 1);
  assert.match(found[0], />=22\b/);
  assert.match(found[0], />=22\.0\.0/);
});

test('an image needs a digest or built_from_submodule, and the submodule it names must be pinned', () => {
  const base = '[node]\nminimum = ">=22"\n[submodules]\n"tools/ok" = "aaaaaaa"\n[images]\n';

  const neither = compareToTree(parseVersionsToml(`${base}"x" = { image = "y:1" }\n`), {
    lsTree: tree({ 'tools/ok': 'aaaaaaa0000' }),
    listGitlinks: () => [],
    packageJson: { engines: { node: '>=22' } },
  });
  assert.equal(neither.length, 1);
  assert.match(neither[0], /digest|built_from_submodule/);

  const dangling = compareToTree(
    parseVersionsToml(`${base}"x" = { built_from_submodule = true, submodule = "tools/nope" }\n`),
    {
      lsTree: tree({ 'tools/ok': 'aaaaaaa0000' }),
      listGitlinks: () => [],
      packageJson: { engines: { node: '>=22' } },
    },
  );
  assert.equal(dangling.length, 1);
  assert.match(dangling[0], /tools\/nope/);

  const fine = compareToTree(
    parseVersionsToml(`${base}"x" = { built_from_submodule = true, submodule = "tools/ok" }\n`),
    {
      lsTree: tree({ 'tools/ok': 'aaaaaaa0000' }),
      listGitlinks: () => [],
      packageJson: { engines: { node: '>=22' } },
    },
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

// The table-level duplicate check did not extend into inline tables, so
// `{ digest = "a", digest = "b" }` silently kept "b" — the same quiet drop,
// one level down. Caught by round 3 of the diff review.
test('a duplicate key inside an inline table is a parse error too', () => {
  assert.throws(
    () => parseVersionsToml('[images]\n"x" = { digest = "sha256:aaa", digest = "sha256:bbb" }\n'),
    /duplicate key/,
  );
});

// Every unbalanced-brace input already raised, but never because a brace was
// checked: slice(1, -1) ate a real character and the corruption surfaced as a
// misleading message (`{ built_from_submodule = true` reported `got "tru"`).
// The input was refused for the wrong reason, which is luck, not a contract.
test('an inline table without its closing brace is refused, and says so', () => {
  for (const bad of [
    '[images]\n"x" = { digest = "sha256:aaa"\n',
    '[images]\n"x" = { built_from_submodule = true\n',
  ]) {
    assert.throws(() => parseVersionsToml(bad), /missing its closing brace/);
  }
});

// Prefix matching made an empty pin match EVERY commit, so a versions.toml with
// a blank sha reported full agreement with the tree — a vacuous pass reached
// through a different door than the absent-file case. Caught by round 4.
test('a pin that is not a commit sha is reported, never matched by prefix', () => {
  for (const bad of ['', 'abc', 'zzz not a sha', 'ABB6745']) {
    const parsed = parseVersionsToml(
      `[node]\nminimum = ">=22"\n[submodules]\n"tools/x" = ${JSON.stringify(bad)}\n`,
    );

    const found = compareToTree(parsed, {
      lsTree: tree({ 'tools/x': 'deadbeef1234567890abcdef1234567890abcdef' }),
      listGitlinks: () => [],
      packageJson: { engines: { node: '>=22' } },
    });

    assert.equal(found.length, 1, `${JSON.stringify(bad)} should be refused`);
    assert.match(found[0], /not a commit sha/);
  }
});

// The parser was strict about value syntax and wholly permissive about vocabulary.
// compareToTree reads exactly four table names, so `[submodule]` (singular — a
// plausible hand-typed slip in an operator-written file) parsed cleanly, was read by
// nothing, and reported full agreement having compared no pins at all.
test('an unknown table name is refused, not parsed and then ignored', () => {
  for (const bad of ['[submodule]\n"tools/x" = "aaaaaaa"\n', '[image]\n"x" = { digest = "sha256:aa" }\n']) {
    assert.throws(() => parseVersionsToml(bad), /unknown table/);
  }
});

test('a table declared twice is a parse error', () => {
  assert.throws(
    () => parseVersionsToml('[submodules]\n"tools/a" = "aaaaaaa"\n[submodules]\n"tools/b" = "bbbbbbb"\n'),
    /declared twice/,
  );
});

// Both sides optional-chained to undefined, and `undefined !== undefined` is false,
// so a file with no [node] table compared against a package.json with no
// engines.node passed having verified nothing — as did a caller that simply forgot
// to pass packageJson at all.
test('the node floor is not verified by two undefineds agreeing', () => {
  const noTable = compareToTree(parseVersionsToml('[submodules]\n'), {
    lsTree: tree({}),
    listGitlinks: () => [],
    packageJson: {},
  });
  assert.ok(
    noTable.some((f) => /\[node\] minimum is undefined/.test(f)),
    JSON.stringify(noTable),
  );
  assert.ok(
    noTable.some((f) => /engines\.node is undefined/.test(f)),
    JSON.stringify(noTable),
  );

  const noManifest = compareToTree(parseVersionsToml('[node]\nminimum = ">=22"\n'), {
    lsTree: tree({}),
    listGitlinks: () => [],
  });
  assert.equal(noManifest.length, 1);
  assert.match(noManifest[0], /nothing to compare/);
});

// `!entry.digest` was a truthiness test, so `digest = true` — a valid parse —
// satisfied "has a digest" while pinning nothing.
test('a digest must have the documented shape, not merely be truthy', () => {
  const base = '[node]\nminimum = ">=22"\n[images]\n';
  const opts = { lsTree: tree({}), listGitlinks: () => [], packageJson: { engines: { node: '>=22' } } };

  for (const bad of ['true', '"no"', '"sha256:"']) {
    const found = compareToTree(parseVersionsToml(`${base}"x" = { digest = ${bad} }\n`), opts);
    assert.equal(found.length, 1, `${bad}: ${JSON.stringify(found)}`);
    assert.match(found[0], /not an algorithm:hex digest|neither a digest/);
  }

  const good = compareToTree(
    parseVersionsToml(`${base}"x" = { digest = "sha256:${'a'.repeat(64)}" }\n`),
    opts,
  );
  assert.deepEqual(good, []);
});

// `in` tests key presence only, so an image could claim to be built from a submodule
// whose pin had already been rejected as unusable — the image's own assertion was
// vacuous even while the run reported the bad pin.
test('an image built from a submodule whose pin is unusable is reported as such', () => {
  const found = compareToTree(
    parseVersionsToml(
      '[node]\nminimum = ">=22"\n[submodules]\n"tools/bad" = ""\n[images]\n"x" = { built_from_submodule = true, submodule = "tools/bad" }\n',
    ),
    { lsTree: tree({}), listGitlinks: () => [], packageJson: { engines: { node: '>=22' } } },
  );

  assert.equal(found.length, 2, JSON.stringify(found));
  assert.ok(found.some((f) => /\[images\] x is built from tools\/bad/.test(f)), JSON.stringify(found));
});

// An injected verifier that is absent used to read as "nothing to report", so a
// renamed key or a spread that dropped it became silent non-verification.
test('an absent tree reader is a TypeError, never a silent pass', () => {
  const parsed = parseVersionsToml('[node]\nminimum = ">=22"\n');

  // Assert the explicit guard, not merely "it threw": without the guard the call
  // still throws later from `listGitlinks()`, so a bare assert.throws passes with
  // the guard removed. The message and the error type are what pin the contract.
  assert.throws(
    () => compareToTree(parsed, { listGitlinks: () => [], packageJson: {} }),
    { name: 'TypeError', message: /compareToTree requires an lsTree function/ },
  );
  assert.throws(
    () => compareToTree(parsed, { lsTree: tree({}), packageJson: {} }),
    { name: 'TypeError', message: /compareToTree requires a listGitlinks function/ },
  );
});

test('every disagreement is reported, not just the first', () => {
  const parsed = parseVersionsToml(
    '[node]\nminimum = ">=20"\n[submodules]\n"tools/a" = "aaaaaaa"\n"tools/b" = "bbbbbbb"\n',
  );

  const found = compareToTree(parsed, {
    lsTree: tree({ 'tools/a': 'zzzzzzz0000', 'tools/b': 'yyyyyyy0000' }),
    listGitlinks: () => [],
    packageJson: { engines: { node: '>=22' } },
  });

  assert.equal(found.length, 3);
});
