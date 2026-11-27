// The opt-in outcome-first corpus (Mini #98) and the memory sources its cases pin. No model session
// runs here. Each scenario names the production failure it would catch: an opt-in corpus that cannot
// be selected or that silently replaces the default one, a case fixture missing a skill it relies on,
// and a lookup that escapes to the operator's real memory service or is not counted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadCorpus } from './lib/common.mjs';
import { startMemorySources } from './lib/memory-stub.mjs';

const lookup = path.join(ROOT, 'scripts', 'kbd-memory-recall.mjs');

function project(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'outcome-first-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
  fs.writeFileSync(path.join(root, '.kbd-orchestrator', 'project.json'), JSON.stringify({ name: 'notes-export-fixture' }));
  return root;
}

// Asynchronous on purpose: the stand-in service runs in this process, so a blocking spawn would
// stop it answering.
async function recall(root, env) {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [lookup, '--outcome', 'notes export in creation order', '--blocker', 'notes out of order'],
      { cwd: root, env: { ...process.env, ...env }, windowsHide: true });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout }));
  });
}

const markers = (root) => (fs.existsSync(path.join(root, '.eval-markers')) ? fs.readdirSync(path.join(root, '.eval-markers')).sort() : []);

test('the opt-in corpus loads, the default corpus is unchanged, and an unknown corpus is refused', () => {
  const optIn = loadCorpus('outcome-first');
  assert.equal(optIn.cases.length, 9);
  assert.ok(optIn.cases.every((entry) => entry.class === 'agent' && entry.prompt && entry.rubric && entry.expected));
  assert.equal(loadCorpus().cases.length, 23);
  assert.ok(loadCorpus().cases.every((entry) => !entry.id.startsWith('OF')));
  assert.throws(() => loadCorpus('no-such-corpus'), /no such corpus/);
  assert.throws(() => loadCorpus('../../package'), /use a corpus name/);
});

test('every skill the opt-in fixture installs exists in the generated package', () => {
  const { fixture } = loadCorpus('outcome-first');
  for (const name of fixture.skills) {
    assert.ok(fs.existsSync(path.join(ROOT, fixture.installedPack, 'skills', name, 'SKILL.md')), name);
  }
  for (const script of ['kbd-memory-recall.mjs', 'kbd-bottleneck-detector.mjs']) {
    assert.ok(fs.existsSync(path.join(ROOT, fixture.installedPack, 'scripts', script)), script);
  }
});

test('running the default corpus with --no-helper, or an unknown corpus, is refused before any session starts', () => {
  const run = (args) => spawnSync(process.execPath, [path.join(ROOT, 'evals/vlbv-protocol/run.mjs'), ...args], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(run(['--stub', 'exit0', '--no-helper']).status, 0);
  const unknown = run(['--stub', 'exit0', '--corpus', 'no-such-corpus']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr + unknown.stdout, /no such corpus/);
});

test('a seeded lesson reaches the real lookup script and one search leaves exactly one marker', async (t) => {
  const root = project(t);
  const sources = await startMemorySources({ surreal: 'seeded', pk: 'absent', lesson: 'check the type of createdAt first' }, { project: root, scratchRoot: root });
  t.after(() => sources.close());

  const result = await recall(root, sources.env);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /check the type of createdAt first/);
  assert.deepEqual(markers(root), ['memory-search-1']);
});

test('with the memory service down and pk present, the lookup answers from pk and no search is recorded',
  { skip: process.platform === 'win32' ? 'no stand-in pk executable on Windows' : false }, async (t) => {
    const root = project(t);
    const sources = await startMemorySources({ surreal: 'down', pk: 'present' }, { project: root, scratchRoot: root });

    const result = await recall(root, sources.env);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /pk/);
    assert.deepEqual(markers(root), []);
  });

test('with both sources down the lookup exits 0 and says nothing was recalled', async (t) => {
  const root = project(t);
  const sources = await startMemorySources({ surreal: 'down', pk: 'absent' }, { project: root, scratchRoot: root });

  const result = await recall(root, sources.env);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /No lessons recalled; continue from current evidence\./);
  assert.deepEqual(markers(root), []);
});
