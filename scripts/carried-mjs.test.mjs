import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const allMjs = () => {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith('.mjs')) out.push(full);
    }
  };
  walk(path.join(repoRoot, 'scripts'));
  // This file states the patterns it forbids, so it necessarily contains them.
  // A scanner that matches its own regex literals reports itself — the same
  // self-reference that makes a naive prose grep flag its own documentation.
  return out.map((f) => path.relative(repoRoot, f)).filter((f) => f !== 'scripts/carried-mjs.test.mjs');
};

// Comments describe; code executes. A scan that cannot tell them apart either
// fires on its own documentation or gets narrowed until it matches nothing.
const codeLines = (text) =>
  text
    .split('\n')
    .map((line, i) => ({ n: i + 1, line }))
    .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line));

test('no .mjs resolves or executes a shell script', () => {
  const offenders = [];

  for (const file of allMjs()) {
    for (const { n, line } of codeLines(readFileSync(path.join(repoRoot, file), 'utf8'))) {
      if (/['"`][^'"`]*\.sh['"`]/.test(line) || /\bbash\s/.test(line)) {
        offenders.push(`${file}:${n}: ${line.trim().slice(0, 70)}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test('no .mjs spawns with shell: true', () => {
  const offenders = [];

  for (const file of allMjs()) {
    for (const { n, line } of codeLines(readFileSync(path.join(repoRoot, file), 'utf8'))) {
      if (/shell:\s*true/.test(line)) offenders.push(`${file}:${n}`);
    }
  }

  assert.deepEqual(offenders, []);
});

test('no .mjs hardcodes a POSIX-only location', () => {
  const offenders = [];

  for (const file of allMjs()) {
    for (const { n, line } of codeLines(readFileSync(path.join(repoRoot, file), 'utf8'))) {
      if (/['"`]\/tmp\//.test(line) || /process\.env\.(HOME|USERPROFILE)/.test(line)) {
        offenders.push(`${file}:${n}: ${line.trim().slice(0, 70)}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

// A script that shells out to a binary this project does not ship cannot run
// here. That is not a Windows problem — it fails everywhere — but it must be
// declared rather than discovered mid-task, exactly like an unavailable skill.
test('a script invoking an absent binary says so at the top of the file', () => {
  const needsForge = allMjs().filter((file) => {
    const text = readFileSync(path.join(repoRoot, file), 'utf8');
    return /FORGE_BIN|rsvg-convert/.test(text) && !file.endsWith('.test.mjs');
  });

  assert.ok(needsForge.length > 0, 'expected to find scripts depending on template-forge');

  for (const file of needsForge) {
    const header = readFileSync(path.join(repoRoot, file), 'utf8').slice(0, 1200);
    assert.match(
      header,
      /UNAVAILABLE IN THIS PROJECT/,
      `${file} invokes a binary this project does not ship and must declare it`,
    );
  }
});

test('the health probe is a Node fetch, not a shell script', () => {
  const routing = path.join(repoRoot, 'scripts', 'lib', 'model-routing.mjs');
  if (!existsSync(routing)) return;

  const text = readFileSync(routing, 'utf8');

  assert.doesNotMatch(text, /HEALTH_PROBE_SCRIPT/, 'the .sh probe constant must be gone');
  assert.match(text, /fetch\(/, 'health must be probed in Node');
});

test('an unhealthy probe yields a decision rather than throwing', async () => {
  const routing = path.join(repoRoot, 'scripts', 'lib', 'model-routing.mjs');
  if (!existsSync(routing)) return;

  const { resolvePhase } = await import(`${new URL('./lib/model-routing.mjs', import.meta.url).href}`);

  // No policy configured here, so this exercises the degraded path its two
  // importers -- openai-client.mjs and model-routing-probe.mjs -- depend on.
  await assert.doesNotReject(async () => resolvePhase('specify'));
});
