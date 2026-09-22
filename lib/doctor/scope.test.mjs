import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { outcomeConformance, checkConformance } from './contract.mjs';
import { checks } from './scope.mjs';

const check = checks.find((c) => c.id === 'mini-install-scope');
assert.ok(check, 'mini-install-scope must exist');

const run = async (ctx) => {
  const outcome = await check.run(ctx);
  assert.deepEqual(outcomeConformance(outcome, check.id), [], JSON.stringify(outcome));
  return outcome;
};

const home = (build) => {
  const dir = mkdtempSync(path.join(tempDir(), 'doctor-scope-'));
  build?.(dir);
  return { dir, dispose: () => rmSync(dir, { recursive: true, force: true }) };
};

const withCopy = (dir, root, name = 'refine-ui') => {
  mkdirSync(path.join(dir, root, 'skills', name), { recursive: true });
  writeFileSync(path.join(dir, root, 'skills', name, 'SKILL.md'), 'x');
};

const noFullPack = () => ({ present: false, markers: [] });
const fullPack = () => ({ present: true, markers: ['~/.prometheus/setup-state.json'] });

// openspec/config.yaml, binding: the mini is NEVER installed natively on a machine that
// already has the full pack. This check is the only place that rule is verified at runtime.
test('a mini copy beside a full pack fails, naming both the marker and the copy', async () => {
  const h = home((d) => withCopy(d, '.claude'));
  try {
    const outcome = await run({
      home: h.dir,
      detectFullPack: fullPack,
      listSkillNames: () => ['refine-ui'],
    });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.detail, /setup-state\.json/);
    assert.match(outcome.detail, /refine-ui/);
  } finally {
    h.dispose();
  }
});

test('either skills root is enough to trip it', async () => {
  for (const root of ['.claude', '.agents']) {
    const h = home((d) => withCopy(d, root));
    try {
      const outcome = await run({ home: h.dir, detectFullPack: fullPack, listSkillNames: () => ['refine-ui'] });

      assert.equal(outcome.status, 'fail', root);
      assert.match(outcome.detail, new RegExp(root.replace('.', '\\.')));
    } finally {
      h.dispose();
    }
  }
});

test('a full pack with no mini copies passes, and says why it was checked', async () => {
  const h = home();
  try {
    const outcome = await run({ home: h.dir, detectFullPack: fullPack, listSkillNames: () => ['refine-ui'] });

    assert.equal(outcome.status, 'pass');
    assert.match(outcome.summary + (outcome.detail ?? ''), /full (skill )?pack/i);
  } finally {
    h.dispose();
  }
});

test('no full pack means the rule is silent, even with copies present', async () => {
  const h = home((d) => {
    withCopy(d, '.claude');
    withCopy(d, '.agents');
  });
  try {
    const outcome = await run({ home: h.dir, detectFullPack: noFullPack, listSkillNames: () => ['refine-ui'] });

    assert.equal(outcome.status, 'pass');
  } finally {
    h.dispose();
  }
});

// Round 5 asked for stale copies (from an older mini version) to be caught too. Done by
// NAME via alsoMine — not by enumerating the skills roots, which on this machine hold 612
// directories against the 22 this pack ships. Enumerating would report ~590 third-party
// skills as mini copies: a confident, false failure far worse than the stale copy it finds.
test('a copy from an older version is caught when its name is supplied', async () => {
  const h = home((d) => withCopy(d, '.claude', 'retired-skill'));
  try {
    const outcome = await run({
      home: h.dir,
      detectFullPack: fullPack,
      listSkillNames: () => ['refine-ui'],
      alsoMine: ['retired-skill'],
    });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.detail, /retired-skill/);
  } finally {
    h.dispose();
  }
});

// Round 6: alsoMine had no production source, so the stale-copy path was dead in every
// real run. It now defaults to the install manifest — driven here with no alsoMine.
test('a stale copy is found through the install manifest, with nothing injected', async () => {
  const h = home((d) => {
    withCopy(d, '.claude', 'retired-skill');
    mkdirSync(path.join(d, '.prometheus-mini'), { recursive: true });
    writeFileSync(
      path.join(d, '.prometheus-mini', 'installed-skills.json'),
      JSON.stringify({ skills: ['retired-skill'] }),
    );
  });
  try {
    const outcome = await run({ home: h.dir, detectFullPack: fullPack, listSkillNames: () => ['refine-ui'] });

    assert.equal(outcome.status, 'fail', 'the manifest was not read');
    assert.match(outcome.detail, /retired-skill/);
  } finally {
    h.dispose();
  }
});

test('a malformed manifest yields nothing rather than a guess', async () => {
  const h = home((d) => {
    withCopy(d, '.claude', 'retired-skill');
    mkdirSync(path.join(d, '.prometheus-mini'), { recursive: true });
    writeFileSync(path.join(d, '.prometheus-mini', 'installed-skills.json'), '{ not json');
  });
  try {
    const outcome = await run({ home: h.dir, detectFullPack: fullPack, listSkillNames: () => ['refine-ui'] });

    assert.equal(outcome.status, 'pass');
  } finally {
    h.dispose();
  }
});

// Valid JSON of the wrong SHAPE is the case unparseable JSON does not cover: it reaches
// the type check rather than throwing, so without it a non-array `skills` would be spread
// into the name set and produce nonsense candidates.
test('a manifest whose skills field is not an array of strings yields nothing', async () => {
  for (const body of ['{"skills":"retired-skill"}', '{"skills":{"0":"retired-skill"}}', '{"skills":[1,2]}', '[]']) {
    const h = home((d) => {
      withCopy(d, '.claude', 'retired-skill');
      mkdirSync(path.join(d, '.prometheus-mini'), { recursive: true });
      writeFileSync(path.join(d, '.prometheus-mini', 'installed-skills.json'), body);
    });
    try {
      const outcome = await run({ home: h.dir, detectFullPack: fullPack, listSkillNames: () => ['refine-ui'] });

      assert.equal(outcome.status, 'pass', `${body}: ${outcome.detail}`);
    } finally {
      h.dispose();
    }
  }
});

test('a third-party skill in the home root is not reported as a mini copy', async () => {
  const h = home((d) => withCopy(d, '.claude', 'someone-elses-skill'));
  try {
    const outcome = await run({ home: h.dir, detectFullPack: fullPack, listSkillNames: () => ['refine-ui'] });

    assert.equal(outcome.status, 'pass', outcome.detail);
  } finally {
    h.dispose();
  }
});

// The check must not offer a fix: deleting a user's files is not an idempotent copy, and
// the spec is explicit that there is no safe automatic repair here.
test('the check offers no fix, and names the files to remove instead', async () => {
  const h = home((d) => withCopy(d, '.claude'));
  try {
    const outcome = await run({ home: h.dir, detectFullPack: fullPack, listSkillNames: () => ['refine-ui'] });

    assert.equal(outcome.actions, undefined);
    assert.deepEqual(check.offers, []);
    assert.deepEqual(check.fixes, {});
    assert.match(outcome.detail, /remove|delete/i);
  } finally {
    h.dispose();
  }
});

test('the check satisfies the contract statically', () => {
  for (const c of checks) assert.deepEqual(checkConformance(c), [], c.id);
});
