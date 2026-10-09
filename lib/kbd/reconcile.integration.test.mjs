// Completed-delivery integration: real entry points, filesystem artifacts and installed runtime.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mini = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const full = process.env.KBD_FULL_PACK_ROOT;
const entries = [{ name: 'mini', program: process.execPath, args: [path.join(mini, 'scripts/kbd-apply.mjs')] }];
if (full) entries.push({ name: 'full', program: 'bash', args: [path.join(full, 'skills/process/kbd-process-orchestrator/skills/kbd-apply/kbd-apply.sh')] });
const digest = (text) => crypto.createHash('sha256').update(text).digest('hex');
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}
function hashes(dir) {
  const result = {};
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) result[path.relative(dir, file)] = digest(fs.readFileSync(file));
    }
  };
  walk(dir);
  return result;
}
function fixture(backend = 'native-kbd') {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kbd-reconcile-acceptance-'));
  const root = path.join(temp, 'project');
  const key = crypto.generateKeyPairSync('ed25519');
  const publicBytes = key.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const privateBytes = key.privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32);
  const keyFile = path.join(temp, 'device.json');
  fs.writeFileSync(keyFile, JSON.stringify({ schemaVersion: '1', keyId: `ed25519:${digest(publicBytes)}`, privateKey: privateBytes.toString('base64') }), { mode: 0o600 });
  const env = { ...process.env, PROMETHEUS_DATA_DIR: path.join(temp, 'data'), PROMETHEUS_DEVICE_KEY_FILE: keyFile,
    PROMETHEUS_KBD_CONTROL_PLANE: '0', KBD_ORCHESTRATOR_ROOT: path.join(temp, 'no-hooks') };
  if (full) {
    // Carry the real guard/runtime helpers, but no service-backed hook configuration.
    fs.cpSync(path.join(full, 'skills/process/kbd-process-orchestrator/shared/lib'),
      path.join(env.KBD_ORCHESTRATOR_ROOT, 'shared/lib'), { recursive: true });
  }
  write(path.join(root, '.kbd-orchestrator/project.json'), { name: 'reconcile-acceptance', specBackend: backend });
  write(path.join(root, '.kbd-orchestrator/current-waypoint.json'), { phase: 'p', path: ['p'] });
  const progress = path.join(root, '.kbd-orchestrator/phases/p/progress.json');
  write(progress, { phase: 'p', changes_total: 1, changes_completed: 0,
    changes: [{ id: 'c', status: 'PENDING', tasks_done: 0, tasks_total: 2 }] });
  let command = 0;
  const cli = (args, expected = 0) => {
    const result = spawnSync('prometheus', ['kbd', '--path', root, ...args], { cwd: root, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    assert.equal(result.status, expected, `prometheus ${args.join(' ')}: ${result.stderr}`);
    return result.stdout;
  };
  const mutate = (args) => cli([...args, '--command-id', `acceptance-${++command}`]);
  const base = backend === 'native-kbd' ? '.kbd-orchestrator/changes' : backend === 'openspec' ? 'openspec/changes' : 'specs';
  const tasksFile = path.join(root, base, 'c', backend === 'native-kbd' ? 'tasks.json' : 'tasks.md');
  const tasks = (done = [false, false]) => write(tasksFile, backend === 'native-kbd'
    ? { tasks: done.map((value, i) => ({ id: String(i + 1), title: ['First', 'Second', 'Third'][i], done: value })) }
    : done.map((value, i) => `- [${value ? 'x' : ' '}] ${backend === 'speckit' ? `T00${i + 1} ` : ''}${['First', 'Second', 'Third'][i]}`).join('\n'));
  tasks();
  return { temp, root, env, progress, tasksFile, base, tasks, cli, mutate, dispose: () => fs.rmSync(temp, { recursive: true, force: true }) };
}
function invoke(entry, fixture, args = [], expected = 0) {
  const before = args.includes('--repair') ? null : hashes(fixture.temp);
  const result = spawnSync(entry.program, [...entry.args, 'reconcile', ...args, '--json'], {
    cwd: fixture.root, env: fixture.env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, expected, `${entry.name} ${args.join(' ')}: ${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  assert.equal(report.clean, expected === 0);
  if (before) assert.deepEqual(hashes(fixture.temp), before, 'ordinary scan changed project or canonical authority');
  return report;
}

for (const entry of entries) {
  test(`${entry.name}: real filesystem backends, archive errors and legacy repairs`, () => {
    for (const backend of ['native-kbd', 'openspec', 'speckit']) {
      const f = fixture(backend);
      try {
        invoke(entry, f);
        f.tasks([true, false]);
        assert.equal(invoke(entry, f, [], 1).drift[0].kind, 'count');
        invoke(entry, f, ['--repair']);
        const unchanged = hashes(f.temp);
        invoke(entry, f, ['--repair']);
        assert.deepEqual(hashes(f.temp), unchanged, 'repeat count repair wrote state');
        const p = json(f.progress); p.changes_completed = 9; write(f.progress, p);
        assert(invoke(entry, f, [], 1).drift.some((row) => row.kind === 'phase-count'));
        invoke(entry, f, ['--repair']);
        const source = path.dirname(f.tasksFile);
        const archive = path.join(f.root, f.base, 'archive', '2026-10-09-c');
        fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.renameSync(source, archive);
        invoke(entry, f);
        fs.cpSync(archive, path.join(f.root, f.base, 'archive', '2026-10-08-c'), { recursive: true });
        assert(invoke(entry, f, [], 2).errors.some((row) => /ambiguous/.test(row.message)));
        fs.rmSync(path.join(f.root, f.base, 'archive', '2026-10-08-c'), { recursive: true });
        const archivedTasks = path.join(archive, path.basename(f.tasksFile));
        write(archivedTasks, backend === 'native-kbd' ? '{broken' : 'no task rows');
        invoke(entry, f, [], 2);
        fs.rmSync(archivedTasks);
        invoke(entry, f, [], 2);
        invoke(entry, f, ['--unknown'], 2);
      } finally { f.dispose(); }
    }
    const f = fixture();
    try {
      const nested = path.join(f.root, '.kbd-orchestrator/phases/p/children/child');
      fs.mkdirSync(nested, { recursive: true }); fs.copyFileSync(f.progress, path.join(nested, 'progress.json'));
      write(path.join(f.root, '.kbd-orchestrator/current-waypoint.json'), { phase: 'p', path: ['p', 'child'] });
      assert.equal(invoke(entry, f).phase, 'p::child');
      invoke(entry, f, ['p']);
      const before = hashes(f.temp);
      invoke(entry, f, ['p', '--repair'], 2);
      assert.deepEqual(hashes(f.temp), before);
    } finally { f.dispose(); }
  });

  test(`${entry.name}: real canonical identity, repair replay and refused transitions`, () => {
    const f = fixture();
    try {
      // Migration imports real legacy state; subsequent registration/transitions use the installed CLI.
      f.cli(['migrate', '--apply']);
      f.mutate(['phase', 'activate', '--id', 'p']);
      f.mutate(['task', 'register', '--phase', 'p', '--change', 'c', '--id', 'c-t1', '--title', 'First', '--sequence', '1']);
      f.mutate(['task', 'register', '--phase', 'p', '--change', 'c', '--id', 'c-t2', '--title', 'Second', '--sequence', '2']);
      invoke(entry, f);
      f.tasks([true, true]);
      const drift = invoke(entry, f, [], 1);
      assert.equal(drift.drift.filter((row) => row.kind === 'ledger-pending').length, 2);
      invoke(entry, f, ['--repair']);
      const state = JSON.parse(f.cli(['status', '--json']));
      assert.deepEqual(Object.keys(state.phases.p.changes.c.tasks).sort(), ['c-t1', 'c-t2']);
      const before = hashes(f.temp);
      invoke(entry, f, ['--repair']);
      assert.deepEqual(hashes(f.temp), before, 'repeated canonical repair emitted effects');
      f.tasks([false, true]);
      assert(invoke(entry, f, [], 1).drift.some((row) => row.kind === 'ledger-ahead'));
      const ahead = hashes(f.temp); invoke(entry, f, ['--repair'], 1); assert.deepEqual(hashes(f.temp), ahead);
      f.tasks([true, true, true]);
      assert(invoke(entry, f, [], 1).drift.some((row) => row.kind === 'unmappable'));
      f.tasks([true, true]);
      const originalProjection = fs.readFileSync(f.progress, 'utf8');
      const projection = json(f.progress);
      projection.changes[0].tasks_done = 999; projection.completion.implementation.completed = 999;
      write(f.progress, projection);
      assert(invoke(entry, f, [], 1).drift.filter((row) => row.kind === 'projection').length >= 2);
      write(f.progress, originalProjection);
      const source = path.dirname(f.tasksFile);
      const archive = path.join(f.root, f.base, 'archive/2026-10-09-c');
      fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.renameSync(source, archive);
      invoke(entry, f);
      // The distributed entry point must execute the same complete archived scan.
      const packaged = entry.name === 'mini'
        ? { ...entry, args: [path.join(mini, 'dist/plugins/codex/prometheus-skills-mini/scripts/kbd-apply.mjs')] }
        : { ...entry, args: [path.join(full, 'dist/plugins/codex/prometheus-skill-pack/skills/kbd-apply/kbd-apply.sh')] };
      invoke(packaged, f);
      f.mutate(['phase', 'create', '--id', 'other', '--title', 'Other']);
      f.mutate(['phase', 'activate', '--id', 'other']);
      const inactive = hashes(f.temp); invoke(entry, f, ['p', '--repair'], 2); assert.deepEqual(hashes(f.temp), inactive);
      f.mutate(['phase', 'activate', '--id', 'p']);
      f.mutate(['change', 'register', '--phase', 'p', '--id', 'cancelled', '--title', 'Cancelled']);
      f.mutate(['task', 'register', '--phase', 'p', '--change', 'cancelled', '--id', '1', '--title', 'Cancelled', '--sequence', '1']);
      f.mutate(['task', 'transition', '--phase', 'p', '--change', 'cancelled', '--id', '1', '--status', 'cancelled']);
      write(path.join(f.root, f.base, 'cancelled/tasks.json'), { tasks: [{ id: '1', title: 'Cancelled', done: true }] });
      assert(invoke(entry, f, [], 1).drift.some((row) => row.kind === 'cancelled'));
      const cancelled = hashes(f.temp); invoke(entry, f, ['--repair'], 1); assert.deepEqual(hashes(f.temp), cancelled);
      f.mutate(['change', 'register', '--phase', 'p', '--id', 'paused', '--title', 'Paused']);
      f.mutate(['task', 'register', '--phase', 'p', '--change', 'paused', '--id', '1', '--title', 'Paused', '--sequence', '1']);
      write(path.join(f.root, f.base, 'paused/tasks.json'), { tasks: [{ id: '1', title: 'Paused', done: true }] });
      // A real unregistered signer cannot commit a canonical transition. Pausing alone
      // intentionally does not prohibit administrative task transitions in this runtime.
      const other = fixture();
      f.env.PROMETHEUS_DEVICE_KEY_FILE = other.env.PROMETHEUS_DEVICE_KEY_FILE;
      try {
      assert(invoke(entry, f, ['--repair'], 2).errors.some((row) => row.kind === 'repair'));
      } finally {
        f.env.PROMETHEUS_DEVICE_KEY_FILE = path.join(f.temp, 'device.json');
        other.dispose();
      }
      const finalState = JSON.parse(f.cli(['status', '--json']));
      assert.notEqual(finalState.phases.p.changes.paused.tasks['1'].status, 'complete');
      const authority = path.join(f.env.PROMETHEUS_DATA_DIR, 'prometheus/kbd/projects', finalState.projectId, 'project.loro');
      fs.renameSync(authority, `${authority}.unavailable`);
      invoke(entry, f, [], 2);
    } finally { f.dispose(); }
  });
}
