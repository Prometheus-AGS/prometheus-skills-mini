import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

// Task 6.4. The review of change 2's spec established that model-routing.mjs has
// two live importers and that resolvePhase never throws — it returns a decision
// carrying healthy:false and a reason. The behaviour exists upstream; this test
// is what keeps it, because the probe was just rewritten underneath it.
test('an unreachable probe degrades for both importers rather than throwing', async () => {
  const routing = path.join(repoRoot, 'scripts', 'lib', 'model-routing.mjs');
  if (!existsSync(routing)) return;

  const { resolvePhase, resolveAllPhases, clearHealthCache } = await import(
    new URL('./lib/model-routing.mjs', import.meta.url).href
  );
  clearHealthCache();

  // resolvePhase is what scripts/lib/openai-client.mjs imports; resolveAllPhases
  // is what scripts/model-routing-probe.mjs imports.
  await assert.doesNotReject(async () => resolvePhase('specify'));
  await assert.doesNotReject(async () => resolveAllPhases());
});

test('a decision always carries a reason, so a caller can report the degradation', async () => {
  const routing = path.join(repoRoot, 'scripts', 'lib', 'model-routing.mjs');
  if (!existsSync(routing)) return;

  const { resolvePhase } = await import(new URL('./lib/model-routing.mjs', import.meta.url).href);
  const decision = resolvePhase('specify');

  assert.equal(typeof decision.phase, 'string');
  assert.ok('healthy' in decision || decision.endpoint === 'host_harness');
});

test('the live importer of resolvePhase still loads after the probe rewrite', async () => {
  const file = path.join(repoRoot, 'scripts', 'lib', 'openai-client.mjs');
  if (!existsSync(file)) return;

  await assert.doesNotReject(() => import(new URL('./lib/openai-client.mjs', import.meta.url).href));
});

// model-routing-probe.mjs is deliberately NOT imported here. It is a CLI whose
// module body runs on import and ends in process.exit(0) with no
// import.meta.url === argv[1] guard, so importing it terminates the test
// process — which it did, silently reducing this file to one test before the
// cause was found. It is spawned instead, which is how it is actually used.
test('the model-routing CLI runs as a process without a shell', () => {
  const file = path.join(repoRoot, 'scripts', 'model-routing-probe.mjs');
  if (!existsSync(file)) return;

  const result = spawnSync(process.execPath, [file], { shell: false, encoding: 'utf8', timeout: 20000 });

  assert.equal(result.status, 0);
  // With no policy configured every phase falls back, and the CLI reports that
  // rather than failing — the degradation both importers rely on.
  assert.match(result.stdout, /host_harness/);
});
