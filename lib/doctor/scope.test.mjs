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
