import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { outcomeConformance, fixOutcomeConformance } from './contract.mjs';
import { checks } from './skills.mjs';

const check = checks.find((c) => c.id === 'mini-skill-copies');
assert.ok(check, 'mini-skill-copies must exist');

const run = async (ctx) => {
  const outcome = await check.run(ctx);
  assert.deepEqual(outcomeConformance(outcome, check.id), [], JSON.stringify(outcome));
  return outcome;
};

const fix = async (ctx) => {
  const outcome = await check.fixes['copy-skills'](ctx);
  assert.deepEqual(fixOutcomeConformance(outcome, 'copy-skills'), [], JSON.stringify(outcome));
  return outcome;
};

/** A pack with `skills/<name>/SKILL.md`, and an empty home. */
const world = (skills = { 'refine-ui': 'one' }) => {
  const root = mkdtempSync(path.join(tempDir(), 'doctor-skills-'));
  const packRoot = path.join(root, 'pack');
  const home = path.join(root, 'home');
  mkdirSync(home, { recursive: true });
  for (const [name, body] of Object.entries(skills)) {
    mkdirSync(path.join(packRoot, 'skills', name), { recursive: true });
    writeFileSync(path.join(packRoot, 'skills', name, 'SKILL.md'), body);
  }
  return { root, packRoot, home, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const noFullPack = () => ({ present: false, markers: [] });
const fullPack = () => ({ present: true, markers: ['~/.prometheus/setup-state.json'] });

const copied = (home, root, name) => path.join(home, root, 'skills', name, 'SKILL.md');

test('a home missing every copy fails, naming the skill and both locations', async () => {
  const w = world();
  try {
    const outcome = await run({ packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.detail, /refine-ui/);
    assert.match(outcome.detail, /\.agents/);
    assert.match(outcome.detail, /\.claude/);
    assert.deepEqual(outcome.actions, [{ kind: 'fix', fixId: 'copy-skills' }]);
  } finally {
    w.dispose();
  }
});

test('the fix copies to both roots, and a second run passes', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };

    const applied = await fix(ctx);
    assert.equal(applied.status, 'fixed');

    assert.equal(readFileSync(copied(w.home, '.agents', 'refine-ui'), 'utf8'), 'one');
    assert.equal(readFileSync(copied(w.home, '.claude', 'refine-ui'), 'utf8'), 'one');

    assert.equal((await run(ctx)).status, 'pass');
  } finally {
    w.dispose();
  }
});

test('a user-edited copy is detected byte for byte and preserved during repair', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };
    await fix(ctx);

    // One byte different — same length, so a size comparison would miss it.
    writeFileSync(copied(w.home, '.agents', 'refine-ui'), 'ONE');

    const drifted = await run(ctx);
    assert.equal(drifted.status, 'fail');
    assert.match(drifted.detail, /refine-ui/);

    const applied = await fix(ctx);
    assert.equal(applied.status, 'fixed');
    assert.match(applied.summary, /preserved 1 user-owned or edited file/);
    assert.equal(readFileSync(copied(w.home, '.agents', 'refine-ui'), 'utf8'), 'ONE');
    assert.equal((await run(ctx)).status, 'fail');
  } finally {
    w.dispose();
  }
});

test('the fix is idempotent: re-applying writes nothing', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };
    await fix(ctx);

    const again = await fix(ctx);
    assert.equal(again.status, 'fixed');
    assert.match(again.summary, /0|no|already|nothing/i);
  } finally {
    w.dispose();
  }
});

// A-3. The fix writes under the user's home: the one real trust boundary in this change.
test('a name that escapes the skills directory is refused, and nothing is written', async () => {
  for (const hostile of ['../evil', 'a/../../evil', 'nested/deep', '..', '/absolute', 'C:\\windows']) {
    const w = world({ 'refine-ui': 'one' });
    try {
      const ctx = {
        packRoot: w.packRoot,
        home: w.home,
        detectFullPack: noFullPack,
        // The hostile name arrives as if the pack listing produced it.
        listSkillNames: () => [hostile],
      };

      const outcome = await fix(ctx);
      assert.equal(outcome.status, 'refused', `${hostile} must be refused`);
      assert.match(outcome.summary, /refus/i);

      // Nothing at all may have been created under the home.
      assert.deepEqual(readdirSync(w.home), [], `${hostile} wrote into the home`);
    } finally {
      w.dispose();
    }
  }
});

// Round 4 of the diff review: drift() walked only the SOURCE, so an unexpected file in a
// home skill directory left the check reporting "match". These directories are what other
// tools read, so a stray file there is an integrity gap, not cosmetic.
test('an unexpected file in a home copy is reported, not called a match', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };
    await fix(ctx);
    assert.equal((await run(ctx)).status, 'pass');

    writeFileSync(path.join(w.home, '.agents', 'skills', 'refine-ui', 'EXTRA.md'), 'injected');

    const outcome = await run(ctx);
    assert.equal(outcome.status, 'fail');
    assert.match(outcome.detail, /EXTRA\.md/);
    // Nothing is missing or different, so there is nothing for copy-skills to do.
    assert.equal(outcome.actions, undefined, JSON.stringify(outcome.actions));
  } finally {
    w.dispose();
  }
});

test('the fix does not remove an unexpected file, and still reports fixed', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };
    await fix(ctx);
    const stray = path.join(w.home, '.claude', 'skills', 'refine-ui', 'EXTRA.md');
    writeFileSync(stray, 'injected');

    const applied = await fix(ctx);

    assert.equal(applied.status, 'fixed');
    assert.equal(readFileSync(stray, 'utf8'), 'injected', 'the fix deleted a file it must not touch');
    // The fix must not even COUNT an extra as work: an extra has no source to copy, so
    // including it would either write nothing (luck) or write from an undefined path.
    assert.match(applied.summary, /0|no|already|nothing/i, applied.summary);
  } finally {
    w.dispose();
  }
});

// Round 7, a REAL security hole: a safe NAME is not a safe PATH. With
// <home>/.agents/skills/refine-ui a symlink to somewhere else, the fix wrote the payload
// OUTSIDE the home skills root entirely — verified before the fix. Every destination is
// now resolved through symlinks and must still be inside its root.
test('a symlinked skill directory is refused, and nothing is written outside', async () => {
  const w = world();
  const outside = path.join(w.root, 'OUTSIDE');
  try {
    const { symlinkSync } = await import('node:fs');
    mkdirSync(outside, { recursive: true });
    mkdirSync(path.join(w.home, '.agents', 'skills'), { recursive: true });
    mkdirSync(path.join(w.home, '.claude', 'skills'), { recursive: true });
    symlinkSync(outside, path.join(w.home, '.agents', 'skills', 'refine-ui'));

    const outcome = await fix({ packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack });

    assert.equal(outcome.status, 'refused');
    assert.deepEqual(readdirSync(outside), [], 'the fix wrote outside the home skills root');
  } finally {
    w.dispose();
  }
});

// A sibling whose name merely STARTS with the root's is outside it: `.../skills-evil` is
// not inside `.../skills`. Without the separator in the prefix test it would be accepted.
// Sweep B-1: round 5 fixed the leaf file but every path still ran through `destination`,
// so a symlinked skill DIRECTORY resolved to real files with identical bytes and reported
// "match" — while the fix refused the same state. Two contradictory verdicts.
test('a symlinked skill DIRECTORY is drift, and run agrees with the fix', async () => {
  const w = world();
  try {
    const { symlinkSync } = await import('node:fs');
    for (const root of ['.agents', '.claude']) {
      mkdirSync(path.join(w.home, root, 'skills'), { recursive: true });
      symlinkSync(path.join(w.packRoot, 'skills', 'refine-ui'), path.join(w.home, root, 'skills', 'refine-ui'));
    }
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };

    const outcome = await run(ctx);
    assert.equal(outcome.status, 'fail', 'a symlinked directory was accepted as a copy');

    // run and fix must not contradict each other about one state.
    assert.equal((await fix(ctx)).status, 'refused');
  } finally {
    w.dispose();
  }
});

test('a sibling directory sharing the root name prefix is refused', async () => {
  const w = world();
  const sibling = path.join(w.home, '.agents', 'skills-evil');
  try {
    const { symlinkSync } = await import('node:fs');
    mkdirSync(sibling, { recursive: true });
    mkdirSync(path.join(w.home, '.agents', 'skills'), { recursive: true });
    mkdirSync(path.join(w.home, '.claude', 'skills'), { recursive: true });
    symlinkSync(sibling, path.join(w.home, '.agents', 'skills', 'refine-ui'));

    const outcome = await fix({ packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack });

    assert.equal(outcome.status, 'refused');
    assert.deepEqual(readdirSync(sibling), [], 'the fix wrote into a sibling of the skills root');
  } finally {
    w.dispose();
  }
});

// The ordinary first install: neither the skills root nor the skill directory exists yet.
// The containment check must not refuse that — an earlier version resolved only the
// target, so realpath(root) threw and every legitimate write was refused.
test('a clean home with no skills root at all is still writable', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };

    assert.equal((await fix(ctx)).status, 'fixed');
    assert.equal((await run(ctx)).status, 'pass');
  } finally {
    w.dispose();
  }
});

test('the fix never deletes a file the pack does not have', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };
    mkdirSync(path.join(w.home, '.claude', 'skills', 'someone-elses'), { recursive: true });
    writeFileSync(path.join(w.home, '.claude', 'skills', 'someone-elses', 'SKILL.md'), 'theirs');

    await fix(ctx);

    assert.equal(readFileSync(path.join(w.home, '.claude', 'skills', 'someone-elses', 'SKILL.md'), 'utf8'), 'theirs');
  } finally {
    w.dispose();
  }
});

// openspec/config.yaml, binding: never install natively beside the full pack.
test('on a full-pack machine the check skips and the fix refuses, writing nothing', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: fullPack };

    const outcome = await run(ctx);
    assert.equal(outcome.status, 'skip');
    assert.match(outcome.summary + outcome.detail, /full (skill )?pack/i);
    assert.equal(outcome.actions, undefined, 'a skipped check must not offer its fix');

    const refused = await fix(ctx);
    assert.equal(refused.status, 'refused');
    assert.match(refused.summary, /full (skill )?pack/i);
    assert.deepEqual(readdirSync(w.home), [], 'the fix wrote into the home beside a full pack');
  } finally {
    w.dispose();
  }
});

// Round 5: differs() used statSync, which FOLLOWS symlinks, so a symlink pointing at
// identical bytes read as a match. The requirement is "copy — never symlink": a symlinked
// skill breaks when its target moves, which is the whole reason the copies exist.
test('a symlink with identical bytes is drift, not a match', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };
    await fix(ctx);
    assert.equal((await run(ctx)).status, 'pass');

    const { symlinkSync, unlinkSync } = await import('node:fs');
    const target = copied(w.home, '.agents', 'refine-ui');
    unlinkSync(target);
    symlinkSync(path.join(w.packRoot, 'skills', 'refine-ui', 'SKILL.md'), target);

    const outcome = await run(ctx);
    assert.equal(outcome.status, 'fail', 'a symlink to identical bytes was accepted');

    assert.equal((await fix(ctx)).status, 'fixed');
    const { lstatSync } = await import('node:fs');
    assert.equal(lstatSync(target).isSymbolicLink(), false, 'the fix left a symlink in place');
  } finally {
    w.dispose();
  }
});

test('copies are files, never symlinks', async () => {
  const w = world();
  try {
    await fix({ packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack });

    const { lstatSync } = await import('node:fs');
    assert.equal(lstatSync(copied(w.home, '.agents', 'refine-ui')).isSymbolicLink(), false);
    assert.equal(lstatSync(copied(w.home, '.claude', 'refine-ui')).isSymbolicLink(), false);
  } finally {
    w.dispose();
  }
});

test('the check satisfies the contract statically and offers exactly its one fix', async () => {
  const { checkConformance } = await import('./contract.mjs');

  assert.deepEqual(checkConformance(check), []);
  assert.deepEqual(check.offers, ['copy-skills']);
});
