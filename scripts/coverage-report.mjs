// Line coverage for files that tests exercise as CHILD PROCESSES.
//
// `node --test --experimental-test-coverage` instruments only the test process, so
// rules/build.mjs — which its tests run via execFileSync, because that is how the build is
// actually used — never appears in the default report. NODE_V8_COVERAGE does capture children,
// so this merges those profiles.
//
// The merge is a UNION ACROSS PROCESSES: a byte is covered if any run covered it. Within one
// process, ranges are applied widest-first so an inner count:0 range correctly masks its
// enclosing count>0 range. Getting that order wrong understates coverage badly — a first
// attempt reported 70% for a file that is really above 97%.

import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tempDir } from '../lib/platform/paths.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const TARGETS = ['rules/build.mjs'];
const THRESHOLD = 80;

const profileDir = mkdtempSync(path.join(tempDir(), 'v8-coverage-'));
try {
  execFileSync(process.execPath, ['--test'], {
    cwd: ROOT,
    env: { ...process.env, NODE_V8_COVERAGE: profileDir },
    stdio: 'ignore',
  });

  let failed = false;
  for (const target of TARGETS) {
    const source = readFileSync(path.join(ROOT, target), 'utf8');
    const union = new Uint8Array(source.length);

    for (const file of readdirSync(profileDir)) {
      const profile = JSON.parse(readFileSync(path.join(profileDir, file), 'utf8'));
      const matching = profile.result.filter((entry) => entry.url.endsWith(target));
      if (matching.length === 0) continue;

      const perProcess = new Uint8Array(source.length);
      const ranges = matching.flatMap((entry) => entry.functions.flatMap((fn) => fn.ranges));
      ranges.sort((a, b) => b.endOffset - b.startOffset - (a.endOffset - a.startOffset));
      for (const range of ranges) {
        perProcess.fill(range.count > 0 ? 1 : 0, range.startOffset, Math.min(range.endOffset, source.length));
      }
      for (let i = 0; i < source.length; i += 1) if (perProcess[i]) union[i] = 1;
    }

    let line = 1;
    const code = new Set();
    const covered = new Set();
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] === '\n') { line += 1; continue; }
      if (!/\s/.test(source[i])) { code.add(line); if (union[i]) covered.add(line); }
    }

    const percent = (covered.size / code.size) * 100;
    const missed = [...code].filter((l) => !covered.has(l));
    console.log(`${target}: ${covered.size}/${code.size} lines = ${percent.toFixed(2)}%`);
    if (missed.length) console.log(`  uncovered: ${missed.join(',')}`);
    if (percent < THRESHOLD) {
      console.error(`  BELOW THRESHOLD (${THRESHOLD}%)`);
      failed = true;
    }
  }
  process.exitCode = failed ? 1 : 0;
} finally {
  rmSync(profileDir, { recursive: true, force: true });
}
