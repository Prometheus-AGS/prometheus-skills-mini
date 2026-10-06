// Isolated native-build adapter for the observed Electron SQLite ABI mismatch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';

const [mode] = process.argv.slice(2);
assert.equal(process.versions.node, '24.14.1');
assert.ok(mode === 'build' || mode === 'publish');
const root = '/Users/gqadonis/.claude/worktrees/bauar-boss';
const request = createRequire(path.join(root, 'package.json'));
const packageRoot = path.dirname(fs.realpathSync(request.resolve('better-sqlite3/package.json')));
assert.equal(JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'))).version, '12.11.1');
const isolatedNative = path.join(packageRoot, 'build/Release/better_sqlite3.node');
const originalNative = '/Users/gqadonis/Projects/prometheus/the-boss/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node';
const expectedOld = '0000d73c6e2e94318ed2b9339139623d5a0908b195f1e761c16cfd98f9cc6229';
const headers = '/Users/gqadonis/.electron-gyp/44.2.0';
const nodeGyp = path.join(root, 'node_modules/.pnpm/node-gyp@12.4.0/node_modules/node-gyp/bin/node-gyp.js');
const planPath = path.join(import.meta.dirname, 'sqlite-electron-abi-rebuild-plan.json');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const metadata = file => { const s = fs.statSync(file); return { dev: s.dev, ino: s.ino, nlink: s.nlink, bytes: s.size, sha256: hash(file) }; };
const originalBefore = metadata(originalNative);
assert.equal(originalBefore.sha256, expectedOld);
assert.match(fs.readFileSync(path.join(headers, 'include/node/node_version.h'), 'utf8'), /#define NODE_MODULE_VERSION\s+149/);
assert.equal(hash(path.join(headers, 'include/node/config.gypi')),
  '2b550410b92b1eb6a98879a933b3e5af2a98a93a0be2c4fcb8684563fb059374');

if (mode === 'build') {
  assert.equal(hash(isolatedNative), expectedOld);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'bauar-sqlite-abi-149-'));
  const destination = path.join(scratch, 'better-sqlite3');
  const copied = [];
  function copy(dir, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['build', 'bin', 'node_modules'].includes(item.name)) continue;
      const from = path.join(dir, item.name), target = path.join(to, item.name);
      const relative = path.relative(packageRoot, from);
      assert.equal(item.isSymbolicLink(), false);
      // Upstream release downloader is unused by binding.gyp; do not create a shell script.
      if (relative === 'deps/download.sh') continue;
      assert.equal(/\.(sh|py)$/.test(item.name), false);
      if (item.isDirectory()) copy(from, target);
      else { fs.copyFileSync(from, target, fs.constants.COPYFILE_EXCL); copied.push({ file: relative, sha256: hash(from) }); }
    }
  }
  copy(packageRoot, destination);
  const args = [nodeGyp, 'rebuild', '--release', '--runtime=electron',
    '--target=44.2.0', '--arch=arm64', '--nodedir=' + headers];
  const plan = { schemaVersion: 1, createdAt: new Date().toISOString(),
    failureReceipt: 'final-gates/boss-approval-client-runtime-01.json',
    observed: { module: 'V2MigrationGate', code: 'ERR_DLOPEN_FAILED', installedABI: 147, requiredABI: 149 },
    version: '12.11.1', electron: '44.2.0', scratch, destination, args, copied,
    isolatedBefore: metadata(isolatedNative), originalBefore,
    limits: ['No installation, downloads, version/configuration/lockfile change',
      'Node orchestrates the existing native compiler; upstream node-gyp uses its own Python/gyp backend',
      'Source copy excludes unused release downloader; no custom shell/Python file is created',
      'ABI symbol/build evidence is not application runtime or package certification'] };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  const child = spawn(process.execPath, args, { cwd: destination,
    env: { ...process.env, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH },
    stdio: 'inherit' });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject); child.once('exit', (code, signal) => resolve(signal ? 1 : code ?? 1));
  });
  assert.deepEqual(metadata(originalNative), originalBefore);
  assert.equal(hash(isolatedNative), expectedOld);
  process.exitCode = exitCode;
} else {
  const plan = JSON.parse(fs.readFileSync(planPath));
  assert.deepEqual(metadata(originalNative), plan.originalBefore);
  assert.deepEqual(metadata(isolatedNative), plan.isolatedBefore);
  const built = path.join(plan.destination, 'build/Release/better_sqlite3.node');
  const symbols = spawnSync('/usr/bin/nm', ['-g', built], { encoding: 'utf8' });
  assert.equal(symbols.status, 0);
  assert.match(symbols.stdout, /(?:^|\s)_?node_register_module_v149\b/);
  const backup = path.join(plan.scratch, 'better_sqlite3.abi147.backup.node');
  fs.copyFileSync(isolatedNative, backup, fs.constants.COPYFILE_EXCL);
  assert.equal(hash(backup), expectedOld);
  const temporary = isolatedNative + '.bauar-149-' + randomUUID();
  fs.copyFileSync(built, temporary, fs.constants.COPYFILE_EXCL);
  assert.equal(hash(temporary), hash(built));
  fs.renameSync(temporary, isolatedNative);
  assert.deepEqual(metadata(originalNative), plan.originalBefore);
  const receipt = { schemaVersion: 1, publishedAt: new Date().toISOString(), isolatedNative,
    current: metadata(isolatedNative), nativeABI: 149, backup, backupSha256: hash(backup),
    originalUntouched: true, original: metadata(originalNative), sourcePlan: planPath,
    scope: 'Isolated native payload only; application acceptance remains pending' };
  fs.writeFileSync(path.join(import.meta.dirname, 'sqlite-electron-abi-publication.json'),
    JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(receipt));
}
