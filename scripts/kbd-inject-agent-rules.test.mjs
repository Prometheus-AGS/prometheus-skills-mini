// Smoke coverage for scripts/kbd-inject-agent-rules.mjs, spawned as the real entry point (no
// shell), in an isolated scratch project dir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-inject-agent-rules.mjs');
const run = (args) => spawnExecutable(process.execPath, [script, ...args], { cwd: repoRoot });

function world() {
  const root = mkdtempSync(path.join(tempDir(), 'kbd-inject-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

test('--target must be CLAUDE.md, AGENTS.md, or both', () => {
  const w = world();
  try {
    const result = run(['--target', 'nope', '--path', w.root]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--target must be/);
  } finally {
    w.dispose();
  }
});

test('--path must name an existing directory', () => {
  const result = run(['--path', '/no/such/dir/at/all']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a directory/);
});

test('creates CLAUDE.md with the fenced block on first run, and is idempotent on a second run', () => {
  const w = world();
  try {
    const claudeMd = path.join(w.root, 'CLAUDE.md');
    const first = run(['--target', 'CLAUDE.md', '--path', w.root]);
    assert.equal(first.status, 0, first.stderr);
    assert.ok(existsSync(claudeMd));
    assert.match(first.stdout, /updated/);
    const firstContent = readFileSync(claudeMd, 'utf8');
    assert.match(firstContent, /agent-rules:start v1/);
    assert.match(firstContent, /agent-rules:end/);

    const second = run(['--target', 'CLAUDE.md', '--path', w.root]);
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /unchanged/);
    assert.equal(readFileSync(claudeMd, 'utf8'), firstContent);
  } finally {
    w.dispose();
  }
});

test('replaces only the marked region, byte-preserving surrounding content', () => {
  const w = world();
  try {
    const claudeMd = path.join(w.root, 'CLAUDE.md');
    writeFileSync(claudeMd, '# My project\n\nSome custom notes.\n');
    const result = run(['--target', 'CLAUDE.md', '--path', w.root]);
    assert.equal(result.status, 0, result.stderr);
    const content = readFileSync(claudeMd, 'utf8');
    assert.match(content, /# My project/);
    assert.match(content, /Some custom notes\./);
    assert.match(content, /agent-rules:start v1/);
  } finally {
    w.dispose();
  }
});

test('--dry-run previews without writing the target file', () => {
  const w = world();
  try {
    const claudeMd = path.join(w.root, 'CLAUDE.md');
    const result = run(['--target', 'CLAUDE.md', '--path', w.root, '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(claudeMd), false);
  } finally {
    w.dispose();
  }
});

test('--pack uiux-routing injects the UI/UX routing block instead', () => {
  const w = world();
  try {
    const claudeMd = path.join(w.root, 'CLAUDE.md');
    const result = run(['--target', 'CLAUDE.md', '--path', w.root, '--pack', 'uiux-routing']);
    assert.equal(result.status, 0, result.stderr);
    const content = readFileSync(claudeMd, 'utf8');
    assert.match(content, /uiux-routing:start v1/);
  } finally {
    w.dispose();
  }
});
