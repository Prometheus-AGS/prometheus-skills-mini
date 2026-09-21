// Render every agent-context target from rules/src/. Single source, many harnesses.
//
//   node rules/build.mjs                 write every target
//   node rules/build.mjs --check         verify only; exit 1 on drift or a budget breach (use in CI)
//   node rules/build.mjs --with-cursor   also render .cursor/rules/*.mdc (or set cursor="yes" in build.conf)
//
// Generated targets are replaced wholesale: a merge would keep files deleted from the source.

import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEADER, LIMITS, RulesBuildError, budgetErrors, parseConf, render } from './lib/render.mjs';
import { readText as readPlatformText } from '../lib/platform/text.mjs';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';
import { acquireLock } from '../lib/platform/lock.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'rules', 'src');
const GENERATED_DIRS = [join(ROOT, '.claude', 'rules'), join(ROOT, '.cursor', 'rules')];

// The project's one text reader (lib/platform/text.mjs). This build is its first consumer,
// so the module is exercised by a real call graph rather than by tests alone.
const readText = readPlatformText;
const toPosix = (path) => path.split(sep).join('/');
const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

function readSources() {
  const rules = {};
  for (const folder of ['tech', 'domain', 'project']) {
    const dir = join(SRC, folder);
    if (!isDir(dir)) continue;
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.md') && file !== 'README.md').sort()) {
      rules[`${folder}/${name.slice(0, -'.md'.length)}`] = readText(join(dir, name));
    }
  }
  return { constitution: readText(join(SRC, 'constitution.md')), routing: readText(join(SRC, 'routing.md')), rules };
}

/** Files in the generated rule directories that carry our header but are no longer rendered. */
function staleFiles(files) {
  const expected = new Set(Object.keys(files));
  return GENERATED_DIRS.filter(isDir).flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith('.md') || name.endsWith('.mdc'))
      .map((name) => join(dir, name))
      .filter((path) => !expected.has(toPosix(relative(ROOT, path))) && readText(path).includes(HEADER)),
  );
}

function drift(files) {
  const problems = Object.entries(files).flatMap(([rel, content]) => {
    const path = join(ROOT, rel);
    if (!existsSync(path)) return [`missing: ${rel}`];
    return readText(path) === content ? [] : [`drift: ${rel}`];
  });
  return [...problems, ...staleFiles(files).map((path) => `stale generated file: ${toPosix(relative(ROOT, path))}`)];
}

function writeAll(files) {
  for (const path of staleFiles(files)) {
    unlinkSync(path);
    console.log(`  removed  ${toPosix(relative(ROOT, path))}`);
  }
  for (const [rel, content] of Object.entries(files)) {
    const path = join(ROOT, rel);
    const changed = !existsSync(path) || readText(path) !== content;
    if (changed) atomicWrite(path, content);
    console.log(`  ${changed ? 'wrote  ' : 'current'}  ${rel}`);
  }
}

function main(argv) {
  const check = argv.includes('--check');
  const conf = parseConf(readText(join(ROOT, 'rules', 'build.conf')));
  const existingDirs = (conf.nested ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((entry) => entry.split(':')[0])
    .filter((directory) => isDir(join(ROOT, directory)));
  const { files, mirrors } = render(readSources(), conf, { existingDirs, withCursor: argv.includes('--with-cursor') });

  const problems = [...budgetErrors(files), ...(check ? drift(files) : [])];
  if (problems.length) {
    for (const problem of problems) console.error(`rules/build: ✗ ${problem}`);
    return 1;
  }
  if (!check) {
    // Single writer (A-10): two concurrent write runs would interleave renames over the same
    // generated files. A --check run takes no lock — it writes nothing.
    const release = acquireLock(join(ROOT, 'rules', '.build.lock'));
    try {
      writeAll(files);
    } finally {
      release();
    }
    return 0;
  }
  const layer0 = files['CLAUDE.md'];
  console.log(
    `rules/build: ✓ ${Object.keys(files).length} files current (${mirrors.length} mirror of CLAUDE.md); ` +
      `CLAUDE.md ${layer0.split('\n').length - 1}/${LIMITS.l0Lines} lines, ${layer0.length}/${LIMITS.l0Chars} chars`,
  );
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof RulesBuildError)) throw error;
  console.error(`rules/build: ✗ ${error.message}`);
  process.exitCode = 1;
}
