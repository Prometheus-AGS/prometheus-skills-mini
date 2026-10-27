// Change-identity guard (issue #194): real project files on disk, the real kbd-apply entry point and the
// real scan. The canonical state handed to the scan is the data the runtime's `status --json` returns;
// the installed CLI cannot be made to produce a damaged identity, so the damaged document is authored here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanReconcile } from './reconcile.mjs';

const mini = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entry = path.join(mini, 'scripts/kbd-apply.mjs');

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

function hashes(dir) {
  const result = {};
  const walk = (current) => {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, item.name);
      if (item.isDirectory()) walk(file);
      else result[path.relative(dir, file)] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    }
  };
  walk(dir);
  return result;
}

// A project whose backend artifacts live in native-kbd form; `rows` are the progress.json change rows.
function project({ rows, backends, runtime = false }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kbd-reconcile-identity-'));
  write(path.join(root, '.kbd-orchestrator/project.json'), { name: 'identity', specBackend: 'native-kbd' });
  write(path.join(root, '.kbd-orchestrator/current-waypoint.json'),
    { phase: 'p', path: ['p'], ...(runtime ? { generatedBy: 'kbd-runtime' } : {}) });
  write(path.join(root, '.kbd-orchestrator/phases/p/progress.json'), { phase: 'p', changes: rows });
  for (const [name, done] of Object.entries(backends)) {
    write(path.join(root, '.kbd-orchestrator/changes', name, 'tasks.json'), { tasks: [{ id: '1', title: 'First', done }] });
  }
  return root;
}

const canonicalChange = (id, status) => ({ id, tasks: { 1: { id: '1', title: 'First', sequence: 1, status } } });
const stateWith = (changes, extra = {}) => ({ activePath: { phaseId: 'p' }, phases: { p: { changes } }, ...extra });
const row = (id) => ({ id, tasks_done: 1, tasks_total: 1 });

test('a repeated progress change ID is reported with its phase and rows as a projection-only finding, and is not repaired', () => {
  const root = project({ rows: [row('c'), row('other'), row('c')], backends: { c: true, other: true } });
  try {
    const before = hashes(root);
    for (const args of [[], ['--repair']]) {
      const run = spawnSync(process.execPath, [entry, 'reconcile', ...args, '--json'], { cwd: root, encoding: 'utf8' });
      assert.equal(run.status, 2, run.stderr);
      const report = JSON.parse(run.stdout);
      assert.equal(report.clean, false);
      assert.deepEqual(report.errors.map((error) => error.kind), ['identity']);
      const [message] = report.errors.map((error) => error.message);
      assert.match(message, /phase p: progress\.json repeats change ID "c" at rows 0, 2/);
      assert.match(message, /projection-only finding and does not by itself show canonical duplication/);
      assert.deepEqual(hashes(root), before, 'the guard must not write');
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a canonical key that differs from its embedded ID, or an ID held by two keys, names the phase and both identities', async () => {
  const root = project({ rows: [row('target')], backends: { target: true }, runtime: true });
  try {
    const state = stateWith({ alias: canonicalChange('target', 'complete'), target: canonicalChange('target', 'complete') });
    const { report } = await scanReconcile(root, undefined, { readCanonical: async () => state });
    assert.equal(report.clean, false);
    assert.deepEqual(report.errors.map((error) => error.kind), ['identity']);
    const [{ message }] = report.errors;
    assert.match(message, /phase p: /);
    assert.match(message, /change key "alias" differs from embedded ID "target"/);
    assert.match(message, /canonical change ID "target" appears at keys "alias" and "target"/);
    assert.match(message, /does not repair canonical identity/);
    assert.deepEqual(report.drift, []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a retired alias resolves through the canonical state when the CLI reports repairs, and is no finding when it does not', async () => {
  const root = project({ rows: [row('alias')], backends: { alias: true }, runtime: true });
  try {
    const changes = { target: canonicalChange('target', 'complete') };
    const repairs = { r1: { phaseId: 'p', input: { resolution: { targetKey: 'target' } }, originalChanges: { alias: {}, target: {} } } };

    const resolved = await scanReconcile(root, undefined, { readCanonical: async () => stateWith(changes, { changeIdentityRepairs: repairs }) });
    assert.deepEqual(resolved.report.errors, []);
    assert.deepEqual(resolved.report.drift, []);
    assert.equal(resolved.report.clean, true);

    // A CLI that predates identity repair has no changeIdentityRepairs: nothing is warned about identity.
    const absent = await scanReconcile(root, undefined, { readCanonical: async () => stateWith(changes) });
    assert.equal(absent.report.errors.some((error) => error.kind === 'identity'), false);

    const ambiguous = { ...repairs, r2: { phaseId: 'p', input: { resolution: { targetKey: 'other' } }, originalChanges: { alias: {}, other: {} } } };
    const refused = await scanReconcile(root, undefined, { readCanonical: async () => stateWith(changes, { changeIdentityRepairs: ambiguous }) });
    assert.deepEqual(refused.report.errors.map((error) => error.kind), ['identity']);
    assert.match(refused.report.errors[0].message, /retired change alias "alias" maps to "target" and "other"/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
