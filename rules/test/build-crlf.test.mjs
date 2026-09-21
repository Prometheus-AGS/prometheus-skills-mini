import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tempDir } from '../../lib/platform/paths.mjs';

// What this file does and does NOT prove.
//
// `rules/build.mjs` reads every file through `readText`, which folds CRLF to LF before any
// parser or comparison sees it. So an all-CRLF working tree is invisible to the build by
// construction, and this test CANNOT fail when a parser's CRLF tolerance regresses — it was
// written that way first, and reverting the splitFrontmatter fix left it passing.
//
// The discriminating test for parser tolerance is the unit one in render.test.mjs, which does
// fail on that revert. What remains worth asserting here is the integration-level guarantee a
// Windows contributor depends on: a checkout under core.autocrlf=true is reported as CURRENT,
// not as spurious drift that would have them rewriting generated files on every pull.

const ROOT = path.resolve(import.meta.dirname, '../..');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

test('a CRLF checkout is reported as current, not as drift', () => {
  const work = mkdtempSync(path.join(tempDir(), 'crlf-build-'));
  try {
    for (const entry of ['rules', 'CLAUDE.md', 'AGENTS.md', '.claude', '.cursor', 'docs', 'lib']) {
      cpSync(path.join(ROOT, entry), path.join(work, entry), { recursive: true });
    }
    let converted = 0;
    for (const file of walk(work).filter((name) => /\.(md|mdc|mjs|conf|txt)$/.test(name))) {
      const content = readFileSync(file, 'utf8');
      writeFileSync(file, content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));
      converted += 1;
    }
    assert.ok(converted > 20, `expected a substantial CRLF tree, converted ${converted}`);

    const output = execFileSync(process.execPath, ['rules/build.mjs', '--check'], { cwd: work, encoding: 'utf8' });

    assert.match(output, /files current/);
    assert.doesNotMatch(output, /drift:/);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test('the build still detects real content drift inside a CRLF checkout', () => {
  const work = mkdtempSync(path.join(tempDir(), 'crlf-drift-'));
  try {
    for (const entry of ['rules', 'CLAUDE.md', 'AGENTS.md', '.claude', '.cursor', 'docs', 'lib']) {
      cpSync(path.join(ROOT, entry), path.join(work, entry), { recursive: true });
    }
    for (const file of walk(work).filter((name) => /\.(md|mdc|conf)$/.test(name))) {
      const content = readFileSync(file, 'utf8');
      writeFileSync(file, content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));
    }
    // A real edit to a generated file, on top of the CRLF tree.
    const target = path.join(work, '.claude/rules/rust.md');
    writeFileSync(target, `${readFileSync(target, 'utf8')}\r\nhand edit\r\n`);

    assert.throws(
      () => execFileSync(process.execPath, ['rules/build.mjs', '--check'], { cwd: work, encoding: 'utf8', stdio: 'pipe' }),
      (error) => /drift: \.claude\/rules\/rust\.md/.test(error.stderr),
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
