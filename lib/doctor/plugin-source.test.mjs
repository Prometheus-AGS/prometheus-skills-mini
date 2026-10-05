import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { outcomeConformance } from './contract.mjs';
import { MARKETPLACE, checks, isReleaseLineBranch } from './plugin-source.mjs';

const check = checks.find((c) => c.id === 'mini-plugin-source');
assert.ok(check, 'mini-plugin-source must exist');

const run = async (ctx) => {
  const outcome = await check.run(ctx);
  assert.deepEqual(outcomeConformance(outcome, check.id), [], JSON.stringify(outcome));
  return outcome;
};

const scratch = [];
const make = (label) => {
  const dir = mkdtempSync(path.join(tempDir(), `doctor-pluginsrc-${label}-`));
  scratch.push(dir);
  return dir;
};
process.on('exit', () => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const git = (dir, ...args) => {
  const r = spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
};

const checkout = (label, branch = 'main') => {
  const dir = make(label);
  git(dir, 'init', '-q', '-b', 'main');
  writeFileSync(path.join(dir, 'a.txt'), 'a');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'init');
  if (branch !== 'main') git(dir, 'checkout', '-q', '-b', branch);
  return dir;
};

const homeWith = (registry) => {
  const home = make('home');
  if (registry !== undefined) {
    mkdirSync(path.join(home, '.claude', 'plugins'), { recursive: true });
    writeFileSync(path.join(home, '.claude', 'plugins', 'known_marketplaces.json'), typeof registry === 'string' ? registry : JSON.stringify(registry));
  }
  return home;
};
const directory = (p) => ({ [MARKETPLACE]: { source: { source: 'directory', path: p } } });

test('release-line classification: main, master, release/*, */main and a detached HEAD pass', () => {
  for (const ok of [null, 'main', 'master', 'release/1.2', 'deploy/main']) assert.equal(isReleaseLineBranch(ok), true, String(ok));
  for (const bad of ['feat/x', 'fix/hook-activation-closure', 'mainline', 'remain']) assert.equal(isReleaseLineBranch(bad), false, bad);
});

test('no registry, or no entry for this pack, is a skip', async () => {
  assert.equal((await run({ home: homeWith(undefined) })).status, 'skip');
  assert.equal((await run({ home: homeWith({ other: { source: { source: 'directory', path: '/x' } } }) })).status, 'skip');
  const github = await run({ home: homeWith({ [MARKETPLACE]: { source: { source: 'github', repo: 'a/b' } } }) });
  assert.equal(github.status, 'skip');
  assert.match(github.summary, /not registered from a local directory/);
});

test('an unreadable or malformed registry is a warning, never a pass or a skip', async () => {
  const malformed = await run({ home: homeWith('{ not json') });
  assert.equal(malformed.status, 'warn');
  assert.match(malformed.summary, /malformed JSON/);
});

test('a registration with no usable path is a warning, not a missing source', async () => {
  for (const bad of [{}, 5, null, ['x'], true, '', '   ']) {
    const outcome = await run({ home: homeWith({ [MARKETPLACE]: { source: { source: 'directory', path: bad } } }) });
    assert.equal(outcome.status, 'warn', JSON.stringify(bad));
  }
});

test('a registered source that no longer exists FAILS and names the path and the remedy', async () => {
  const gone = path.join(make('gone-parent'), 'removed-worktree');
  const outcome = await run({ home: homeWith(directory(gone)) });
  assert.equal(outcome.status, 'fail');
  assert.ok(outcome.summary.includes(gone));
  assert.match(outcome.detail, /reload plugins or restart the session/);
});

test('a source that cannot be examined is advisory, never "missing"', { skip: process.getuid?.() === 0 }, async () => {
  const locked = make('locked');
  mkdirSync(path.join(locked, 'src'));
  chmodSync(locked, 0o000);
  try {
    const outcome = await run({ home: homeWith(directory(path.join(locked, 'src'))) });
    assert.equal(outcome.status, 'warn');
  } finally {
    chmodSync(locked, 0o755);
  }
});

test('a release-line checkout passes, including through a symlink alias', async () => {
  const dir = checkout('main');
  assert.equal((await run({ home: homeWith(directory(dir)) })).status, 'pass');
  const alias = path.join(make('alias-parent'), 'alias');
  symlinkSync(dir, alias);
  assert.equal((await run({ home: homeWith(directory(alias)) })).status, 'pass');
  git(dir, 'checkout', '-q', '--detach');
  assert.equal((await run({ home: homeWith(directory(dir)) })).status, 'pass', 'a detached HEAD is a legitimate source');
});

test('a topic-branch checkout warns and says why', async () => {
  const outcome = await run({ home: homeWith(directory(checkout('topic', 'feat/hook-closure'))) });
  assert.equal(outcome.status, 'warn');
  assert.match(outcome.summary, /topic branch 'feat\/hook-closure'/);
  assert.match(outcome.detail, /worktree is removed, every hook of this plugin fails/);
});

test('a directory that is not a git checkout warns', async () => {
  const outcome = await run({ home: homeWith(directory(make('plain'))) });
  assert.equal(outcome.status, 'warn');
  assert.match(outcome.summary, /not a git checkout/);
});

test('git probe failures are never read as clean or release-line', async () => {
  const dir = checkout('probe');
  const home = homeWith(directory(dir));
  const failing = (what) => (name, args) => {
    if (args.includes(what)) return { status: 128, stdout: '', stderr: `fatal: ${what} exploded` };
    return { status: 0, stdout: what === 'symbolic-ref' ? '.git' : 'main', stderr: '' };
  };
  assert.equal((await run({ home, spawn: failing('symbolic-ref') })).status, 'warn', 'branch undetermined');
  assert.equal((await run({ home, spawn: failing('--git-dir') })).status, 'warn', 'first probe failed');
  assert.equal((await run({ home, spawn: () => ({ status: null, stdout: '', stderr: '' }) })).status, 'warn', 'git could not run');
});

test('the doctor never modifies the checkout it inspects', async () => {
  const dir = checkout('readonly');
  const index = path.join(dir, '.git', 'index');
  const before = readFileSync(index);
  await run({ home: homeWith(directory(dir)) });
  assert.deepEqual(readFileSync(index), before, 'the git index must be byte-identical');
});
