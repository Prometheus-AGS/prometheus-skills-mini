// The installed-rules audit, driven through its real entry point against a temporary Git project.
// Production failures this would catch: a nested rule file or a linked worktree left out of the
// report, a stale installed skill reported as current, and an "audit" that modifies the project.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../../skills/prometheus-context-bootstrap/scripts/audit-rules.mjs', import.meta.url));
const packSkill = fileURLToPath(new URL('../../skills/prometheus-context-bootstrap/SKILL.md', import.meta.url));

function snapshot(directory) {
  const entries = [];
  const walk = (current) => {
    for (const item of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, item.name);
      if (item.isDirectory()) walk(absolute);
      else entries.push([path.relative(directory, absolute), createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')]);
    }
  };
  walk(directory);
  return JSON.stringify(entries);
}

function project(t) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mini-rules-audit-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'project');
  const write = (relative, text) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  write('AGENTS.md', '# Agents\n\nWork toward the user outcome.\n');
  write('CLAUDE.md', '@AGENTS.md\n');
  write('packages/api/CLAUDE.md', '# API\n\nThe work is done when all tests pass.\n');
  write('.claude/rules/style.md', '# Style\n');
  write('.claude/skills/prometheus-context-bootstrap/SKILL.md', "---\nname: prometheus-context-bootstrap\nmetadata:\n  version: '0.0.1'\n---\n");
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  git('init', '--quiet');
  git('add', '--all');
  const identity = ['-c', 'user.name=Synthetic Fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=.disabled-test-hooks'];
  git(...identity, 'commit', '--quiet', '-m', 'fixture');
  const worktree = path.join(base, 'linked');
  git('worktree', 'add', '--quiet', '-b', 'linked', worktree);
  // The audit reports each worktree by its native real path (long names and OS separators on Windows).
  return { base, root, worktree: fs.realpathSync.native(worktree), git };
}

const audit = (args) => spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', windowsHide: true });

test('reports nested files, imports, rule directories, the linked worktree, a conflict and both versions, changing nothing', (t) => {
  const { base, root, worktree, git } = project(t);
  const packVersion = /version:\s*['"]?([^'"\n]+)/.exec(fs.readFileSync(packSkill, 'utf8'))[1].trim();
  const before = snapshot(base);

  const result = audit(['--path', root]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ROOT {3}AGENTS\.md/);
  assert.match(result.stdout, /NESTED packages\/api\/CLAUDE\.md/);
  assert.match(result.stdout, /RULE {3}\.claude\/rules\/style\.md/);
  assert.match(result.stdout, /IMPORT CLAUDE\.md -> AGENTS\.md\n/);
  assert.match(result.stdout, /CONFLICT packages\/api\/CLAUDE\.md:3 — test count treated as completion/);
  assert.ok(result.stdout.includes(`Worktree ${worktree} instruction files:`), result.stdout);
  assert.ok(result.stdout.includes(`VERSION prometheus-context-bootstrap: installed 0.0.1, pack ${packVersion}`), result.stdout);
  assert.match(result.stdout, /Installed skills in \.claude\/skills: unknown \(no receipt\)/);
  assert.match(result.stdout, /Nothing was changed\./);
  assert.equal(snapshot(base), before);
  assert.equal(git('status', '--porcelain'), '');
});

test('a directory that is not a Git working tree is still audited, with worktrees unknown', (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mini-rules-audit-plain-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Agents\n');

  const result = audit(['--path', root]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Linked worktrees: unknown/);
  assert.match(result.stdout, /Installed skills in this project: none found \(version unknown\)/);
  assert.match(result.stdout, /0 outcome-first conflict\(s\) found/);
});

test('a missing --path is a usage error', () => {
  const result = audit([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /USAGE/);
});
