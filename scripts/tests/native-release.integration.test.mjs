import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { once } from 'node:events';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { assetName, currentHost, executable, releaseTag, releaseVersion, root } from '../../lib/native-release/catalog.mjs';
import { fileHash, receiptFile } from '../../lib/native-release/receipt.mjs';

const run = promisify(execFile);
const installer = path.join(root, 'scripts/install-native.mjs');
const planner = path.join(root, 'scripts/native-release.mjs');
const tmp = (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-native-gate-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3 }));
  return directory;
};
const onPath = (tool) => execFileSync(process.platform === 'win32' ? 'where' : 'which', [tool], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];

async function mirror(t, listener) {
  const server = http.createServer(listener);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return 'http://127.0.0.1:' + server.address().port + '/download';
}

test('installer downloads the exact native CLI, verifies its checksum, and refuses corruption and edited executables', async t => {
  const directory = tmp(t);
  const source = onPath('prometheus');
  const asset = assetName('prometheus', currentHost());
  const sum = fileHash(source);
  let corrupt = false;
  const requests = [];
  const base = await mirror(t, (request, response) => {
    requests.push(request.url);
    if (request.url === `/download/${releaseTag}/SHA256SUMS`) response.end((corrupt ? '0'.repeat(64) : sum) + '  ' + asset + '\n');
    else if (request.url === `/download/${releaseTag}/${asset}`) fs.createReadStream(source).pipe(response);
    else { response.statusCode = 404; response.end(); }
  });
  const env = { ...process.env, MINI_NATIVE_RELEASE_BASE_URL: base };
  const install = () => run(process.execPath, [installer, 'prometheus', '--bin-dir', directory], { env });
  const { stdout } = await install();
  const installed = JSON.parse(stdout).path;
  assert.equal(JSON.parse(stdout).source, 'release');
  assert.equal(fileHash(installed), sum);
  assert.match((await run(installed, ['--version'])).stdout, /prometheus/i);
  assert.deepEqual(requests.sort(), [`/download/${releaseTag}/${asset}`, `/download/${releaseTag}/SHA256SUMS`].sort());
  const home = path.join(directory, 'home');
  fs.mkdirSync(home);
  const discover = await run(process.execPath, [path.join(root, 'scripts/doctor.mjs'), '--fix', 'copy-skills'], {
    env: { ...process.env, MINI_DOCTOR_HOME: home, PATH: directory + path.delimiter + process.env.PATH }, maxBuffer: 4 * 1024 * 1024,
  });
  assert.notEqual(JSON.parse(discover.stdout).status, 'refused');
  corrupt = true;
  await assert.rejects(install, /SHA-256 mismatch/);
  assert.equal(fileHash(installed), sum);
  assert.equal(JSON.parse(fs.readFileSync(receiptFile(installed))).sha256, sum);
  fs.writeFileSync(installed, 'locally edited executable');
  await assert.rejects(install, /Refusing to replace unowned or edited executable/);
  assert.equal(fs.readFileSync(installed, 'utf8'), 'locally edited executable');
});

test('main version bump, tag and manual release plan use one immutable commit and six native hosts', async t => {
  const dir = tmp(t);
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'local@example.invalid');
  git('config', 'user.name', 'Local acceptance');
  git('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"version":"0.0.1"}');
  git('add', 'package.json'); git('commit', '-qm', 'previous version');
  const before = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: releaseVersion }));
  git('commit', '-qam', 'new version');
  const sha = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/main', sha);
  const event = path.join(dir, 'event');
  const outputs = path.join(dir, 'outputs');
  const plan = async (eventName, ref, previous = before) => {
    fs.writeFileSync(event, JSON.stringify({ before: previous }));
    fs.writeFileSync(outputs, '');
    await run(process.execPath, [planner, 'plan'], { cwd: dir, env: { ...process.env,
      GITHUB_EVENT_PATH: event, GITHUB_EVENT_NAME: eventName, GITHUB_REF: ref, GITHUB_SHA: sha, GITHUB_OUTPUT: outputs } });
    return Object.fromEntries(fs.readFileSync(outputs, 'utf8').trim().split('\n').map(line => {
      const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
    }));
  };
  const result = await plan('push', 'refs/heads/main');
  assert.equal(result.commit, sha);
  assert.equal(result.tag, releaseTag);
  const jobs = JSON.parse(result.matrix).include;
  assert.equal(jobs.length, 24);
  assert.equal(new Set(jobs.map(job => job.runner)).size, 6);
  assert.equal((await plan('push', 'refs/heads/main', sha)).enabled, 'false');
  assert.equal((await plan('workflow_dispatch', 'refs/heads/main')).commit, sha);
  await assert.rejects(() => plan('workflow_dispatch', 'refs/heads/topic'), /Select main/);
  git('tag', releaseTag, sha);
  assert.equal((await plan('push', 'refs/tags/' + releaseTag)).commit, sha);
  git('tag', '-f', releaseTag, before);
  await assert.rejects(() => plan('push', 'refs/tags/' + releaseTag), /different commit/);
});

test('missing pk asset falls back to its locked source and executes the installed CLI', {
  skip: process.env.MINI_NATIVE_SOURCE_GATE !== '1' && 'set MINI_NATIVE_SOURCE_GATE=1 for the serialized Cargo integration',
}, async (t) => {
  const directory = tmp(t);
  const requests = [];
  const base = await mirror(t, (request, response) => {
    requests.push(request.url); response.statusCode = 404; response.end();
  });
  const { stdout } = await run(process.execPath, [installer, 'pk', '--bin-dir', directory],
    { env: { ...process.env, MINI_NATIVE_RELEASE_BASE_URL: base }, maxBuffer: 16 * 1024 * 1024 });
  const file = path.join(directory, executable('pk'));
  assert.equal(JSON.parse(stdout.trim().split('\n').at(-1)).source, 'cargo');
  assert.equal(JSON.parse(fs.readFileSync(receiptFile(file))).sha256, fileHash(file));
  assert.match((await run(file, ['--version'])).stdout, /pk 1\.11\.0/);
  assert.deepEqual(requests, [`/download/${releaseTag}/${assetName('pk', currentHost())}`]);
});
