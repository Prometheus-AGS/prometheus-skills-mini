import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('package.json declares the supported runtime', () => {
  const manifest = readJson('package.json');

  assert.equal(manifest.type, 'module');
  assert.equal(manifest.private, true);
  assert.equal(manifest.engines.node, '>=22');
});

test('package.json defines test, check and coverage scripts', () => {
  const { scripts } = readJson('package.json');

  assert.equal(scripts.test, 'node --test');
  assert.equal(scripts.check, 'node rules/build.mjs --check');
  // coverage runs BOTH reports from one command: the in-process one, and the child-process
  // one for rules/build.mjs that the default reporter cannot see. No && — PowerShell 5.1.
  assert.equal(scripts.coverage, 'node scripts/coverage-report.mjs');
});

test('no script chains commands, because PowerShell 5.1 rejects &&', () => {
  const { scripts } = readJson('package.json');

  const chained = Object.entries(scripts).filter(([, value]) => /&&|\|\||;/.test(value));

  assert.deepEqual(chained, []);
});

test('the OpenSpec CLI is pinned to an exact version and is the only dependency', () => {
  const manifest = readJson('package.json');

  const devDeps = manifest.devDependencies;

  assert.equal(devDeps['@fission-ai/openspec'], '1.10.0');
  assert.deepEqual(Object.keys(devDeps), ['@fission-ai/openspec']);
  assert.deepEqual(manifest.dependencies ?? {}, {});
});

test('the pinned OpenSpec CLI runs from its JavaScript entry without a global install', () => {
  const entry = 'node_modules/@fission-ai/openspec/bin/openspec.js';
  assert.ok(existsSync(entry), `${entry} is missing — run npm ci`);

  const version = execFileSync(process.execPath, [entry, '--version'], { encoding: 'utf8' });

  assert.equal(version.trim(), '1.10.0');
});

test('package.json lists no test runner or assertion library', () => {
  const { devDependencies } = readJson('package.json');

  const frameworks = Object.keys(devDependencies).filter((name) =>
    /^(jest|mocha|vitest|ava|tape|chai|expect|sinon|jasmine)$/.test(name),
  );

  assert.deepEqual(frameworks, []);
});

test('.gitattributes normalises text to LF and marks images binary', () => {
  const attributes = readFileSync('.gitattributes', 'utf8');

  assert.match(attributes, /^\* text=auto eol=lf$/m);
  for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'ico', 'webp']) {
    assert.match(attributes, new RegExp(`^\\*\\.${ext} binary$`, 'm'), `${ext} not marked binary`);
  }
});

test('every tracked text file is stored with LF endings', () => {
  const listing = execFileSync('git', ['ls-files', '--eol'], { encoding: 'utf8' });

  // A submodule is tracked as a gitlink (mode 160000): a commit pointer, not a file, so it has no
  // line endings and --eol reports a bare "i/". Identified by git's own mode rather than by path,
  // so this cannot excuse a real file that merely lives under a vendored directory.
  const gitlinks = new Set(
    execFileSync('git', ['ls-files', '-s'], { encoding: 'utf8' })
      .split('\n')
      .filter((line) => line.startsWith('160000 '))
      .map((line) => line.split('\t')[1]),
  );

  // The spec says every tracked text file reports i/lf. Filtering for i/crlf alone would let
  // i/mixed or i/cr through, so assert the positive: anything git treats as text is i/lf.
  const notLf = listing
    .split('\n')
    // i/none is an empty file (no line endings to normalise); i/-text is binary.
    .filter((line) => line.trim() && !/^i\/(lf|none|-text)/.test(line))
    .filter((line) => !gitlinks.has(line.split('\t')[1]))
    .map((line) => line.trim().replace(/\s+/g, ' '));

  assert.deepEqual(notLf, []);
});
