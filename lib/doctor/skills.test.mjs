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

test('a drifted copy is detected byte for byte and repaired', async () => {
  const w = world();
  try {
    const ctx = { packRoot: w.packRoot, home: w.home, detectFullPack: noFullPack };
    await fix(ctx);

    // One byte different — same length, so a size comparison would miss it.
    writeFileSync(copied(w.home, '.agents', 'refine-ui'), 'ONE');

    const drifted = await run(ctx);
    assert.equal(drifted.status, 'fail');
    assert.match(drifted.detail, /refine-ui/);

    assert.equal((await fix(ctx)).status, 'fixed');
    assert.equal(readFileSync(copied(w.home, '.agents', 'refine-ui'), 'utf8'), 'one');
    assert.equal((await run(ctx)).status, 'pass');
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
