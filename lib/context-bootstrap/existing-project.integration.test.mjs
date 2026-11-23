import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const checkout = fileURLToPath(new URL('../../scripts/prometheus-context-bootstrap.mjs', import.meta.url));
const installed = fileURLToPath(new URL('../../skills/prometheus-context-bootstrap/scripts/maintain-project.mjs', import.meta.url));
const axiom = 'Always think in terms of user goals and value—not in tests or assumptions.';

function fixture(t, documents, { ignored = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-context-maintenance-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  git('init', '--quiet');
  for (const [file, text] of Object.entries({ 'unrelated.txt': 'existing\n', ...documents })) {
    fs.writeFileSync(path.join(root, file), text);
  }
  if (ignored) fs.writeFileSync(path.join(root, '.gitignore'), 'AGENTS.md\n');
  git('add', '--all');
  git('-c', 'user.name=Synthetic Fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgsign=false',
    '-c', 'core.hooksPath=.disabled-test-hooks', 'commit', '--quiet', '-m', 'fixture');
  return { root, git, read: (file) => fs.readFileSync(path.join(root, file), 'utf8'),
    write: (file, bytes) => fs.writeFileSync(path.join(root, file), bytes) };
}

function invoke(root, args, cli = checkout) {
  const r = spawnSync(process.execPath, [cli, '--path', root, ...args], { encoding: 'utf8', windowsHide: true });
  assert.ifError(r.error);
  return { result: r.status, out: r.stdout, err: r.stderr };
}

function preview(root, cli = checkout) {
  const observed = invoke(root, ['--preview'], cli);
  assert.equal(observed.result, 0, observed.err);
  const digest = /^PLAN_SHA256=([a-f0-9]{64})$/m.exec(observed.out)?.[1];
  assert.ok(digest);
  return { digest, text: observed.out };
}

test('operator previews dirty instruction updates; applies exact bytes only and sees no-op', (t) => {
  const { root, git, read, write } = fixture(t, { 'AGENTS.md': '# Codex\r\nPlatform scope', 'CLAUDE.md': '# Claude\n' });
  write('AGENTS.md', '# Codex\r\nPlatform scope\r\nDirty instructions');
  write('unrelated.txt', 'dirty unrelated\n');
  git('add', '--', 'unrelated.txt');
  const dirty = read('AGENTS.md');
  const index = git('ls-files', '--stage');
  const before = fs.readdirSync(root);
  const audit = invoke(root, ['--audit']);
  assert.equal(audit.result, 0, audit.err);
  assert.match(audit.out, /CHANGE AGENTS\.md/);
  assert.doesNotMatch(audit.out, /Dirty instructions|PLAN_SHA256/);
  const proposed = preview(root);
  assert.match(proposed.text, /Goals-first development/);
  assert.equal(read('AGENTS.md'), dirty);
  assert.equal(read('CLAUDE.md'), '# Claude\n');
  assert.deepEqual(fs.readdirSync(root), before);
  const applied = invoke(root, ['--apply', proposed.digest]);
  assert.equal(applied.result, 0, applied.err);
  assert.ok(read('AGENTS.md').startsWith(dirty + '\r\n\r\n'));
  for (const file of ['AGENTS.md', 'CLAUDE.md']) assert.ok(read(file).includes(axiom));
  assert.equal(read('unrelated.txt'), 'dirty unrelated\n');
  assert.equal(git('ls-files', '--stage'), index);
  assert.deepEqual(fs.readdirSync(root), before);
  assert.equal(invoke(root, ['--apply', proposed.digest]).result, 2);
  const current = preview(root);
  assert.doesNotMatch(current.text, /^--- /m);
  assert.match(invoke(root, ['--apply', current.digest]).out, /Applied 0 named instruction change/);
});

test('operator preserves forward/reverse managed targets and documented routing', (t) => {
  for (const [canonical, link] of [['AGENTS.md', 'CLAUDE.md'], ['CLAUDE.md', 'AGENTS.md']]) {
    const managed = '# Local\n<!-- prometheus-base:start v1 -->\nExisting protected text\n<!-- prometheus-base:end -->\n';
    const { root, read } = fixture(t, { [canonical]: managed });
    if (process.platform === 'win32') {
      // The portable text import is separately exercised below. No native symlink claim here.
      t.diagnostic('native link fixtures require a POSIX host; not exercised on this host');
      break;
    }
    fs.symlinkSync(canonical, path.join(root, link));
    const { digest } = preview(root, installed);
    const applied = invoke(root, ['--apply', digest], installed);
    assert.equal(applied.result, 0, applied.err);
    assert.equal(fs.readlinkSync(path.join(root, link)), canonical);
    assert.ok(read(canonical).startsWith(managed));
    assert.ok(read(canonical).includes(axiom));
  }
  const routes = [
    ['AGENTS.md', '**Canonical instructions live in [' + String.fromCharCode(96) + 'CLAUDE.md' + String.fromCharCode(96) + '](./CLAUDE.md).** Read it in full.\n'],
    ['AGENTS.md', 'The full project instructions live in **[CLAUDE.md](CLAUDE.md)**.\n'],
    ['CLAUDE.md', '@./AGENTS.md\n'],
  ];
  for (const [route, text] of routes) {
    const target = route === 'AGENTS.md' ? 'CLAUDE.md' : 'AGENTS.md';
    const { root, read } = fixture(t, { [route]: text, [target]: '# Canonical\n' });
    const offered = preview(root, installed);
    if (route === 'AGENTS.md') assert.match(offered.text, /automatic harness import is not established/);
    const applied = invoke(root, ['--apply', offered.digest], installed);
    assert.equal(applied.result, 0, applied.err);
    assert.equal(read(route), text);
    assert.ok(read(target).includes(axiom));
  }
  const fake = ['~~~md', '@CLAUDE.md', '## Goals-first development', axiom,
    'Accepted spec and VLBV preserve existing verification gates.', '~~~', ''].join('\n');
  const comment = ['<!--', '@./AGENTS.md', '## Goals-first development', axiom,
    'Accepted spec and VLBV preserve existing verification gates.', '-->', ''].join('\n');
  const { root, read } = fixture(t, { 'AGENTS.md': fake, 'CLAUDE.md': comment });
  const offered = preview(root, installed);
  assert.match(offered.text, /CHANGE AGENTS\.md/);
  assert.match(offered.text, /CHANGE CLAUDE\.md/);
  assert.equal(read('AGENTS.md'), fake);
  assert.equal(read('CLAUDE.md'), comment);
  const applied = invoke(root, ['--apply', offered.digest], installed);
  assert.equal(applied.result, 0, applied.err);
  for (const [name, original] of Object.entries({ 'AGENTS.md': fake, 'CLAUDE.md': comment })) {
    assert.ok(read(name).startsWith(original));
    assert.ok(read(name).slice(original.length).includes(axiom));
  }
  assert.doesNotMatch(preview(root, installed).text, /^--- /m);
});

test('unsafe or ambiguous instruction changes are blocked instead of guessed', (t) => {
  const fixtures = [
    [{ 'AGENTS.md': '# Local\n', 'CLAUDE.md': '@AGENTS.md\n' }, { ignored: true }, /ignored local instruction/],
    [{ 'AGENTS.md': '@CLAUDE.md\n', 'CLAUDE.md': '@AGENTS.md\n' }, {}, /circular/],
    [{ 'AGENTS.md': '<!-- prometheus-base:start v1 -->\n', 'CLAUDE.md': '# Claude\n' }, {}, /malformed/],
    [{ 'AGENTS.md': 'Tests must define user goals.\n', 'CLAUDE.md': '# Claude\n' }, {}, /explicit conflicting/],
    [{ 'AGENTS.md': '## Goals-first development\n', 'CLAUDE.md': '# Claude\n' }, {}, /partial or conflicting/],
    [{ 'AGENTS.md': '~~~md\n@CLAUDE.md\n', 'CLAUDE.md': '# Claude\n' }, {}, /unterminated Markdown/],
    [{}, {}, /both root instruction files are missing/],
  ];
  for (const [files, options, reason] of fixtures) {
    const { root, read } = fixture(t, files, options);
    const blocked = invoke(root, ['--preview']);
    assert.equal(blocked.result, 2);
    assert.match(blocked.err, reason);
    assert.doesNotMatch(blocked.out, /PLAN_SHA256/);
    for (const [name, content] of Object.entries(files)) assert.equal(read(name), content);
  }
  for (const staged of [false, true]) {
    const { root, git, read } = fixture(t, { 'AGENTS.md': '# Codex\n', 'CLAUDE.md': '# Claude\n' });
    const absent = path.join(root, 'AGENTS.md');
    const before = preview(root).digest;
    if (staged) git('rm', '--quiet', '--', 'AGENTS.md');
    else fs.unlinkSync(absent);
    const index = git('ls-files', '--stage');
    for (const args of [['--audit'], ['--preview'], ['--apply', before]]) {
      const hold = invoke(root, args);
      assert.equal(hold.result, 2);
      assert.match(hold.err, /tracked instruction is absent/);
      assert.doesNotMatch(hold.out, /PLAN_SHA256/);
    }
    assert.equal(fs.existsSync(absent), false);
    assert.equal(read('CLAUDE.md'), '# Claude\n');
    assert.equal(git('ls-files', '--stage'), index);
  }
});

test('stale bytes, changed Git HEAD, another root, and an incompatible mode never write', (t) => {
  const files = { 'AGENTS.md': '# Agents\n', 'CLAUDE.md': '# Claude\n' };
  const { root, git, read, write } = fixture(t, files);
  const first = preview(root).digest;
  assert.equal(invoke(fixture(t, files).root, ['--apply', first]).result, 2);
  write('CLAUDE.md', '# Claude dirty\n');
  assert.equal(invoke(root, ['--apply', first]).result, 2);
  const second = preview(root).digest;
  git('-c', 'user.name=Synthetic Fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgsign=false',
    '-c', 'core.hooksPath=.disabled-test-hooks', 'commit', '--quiet', '--allow-empty', '-m', 'move HEAD');
  assert.equal(invoke(root, ['--apply', second]).result, 2);
  assert.equal(invoke(root, ['--audit', '--dry-run']).result, 1);
  assert.equal(read('AGENTS.md'), files['AGENTS.md']);
  assert.equal(read('CLAUDE.md'), '# Claude dirty\n');
});
