import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
const cwd = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const node = '/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node';
const pnpm = '/Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs';
const stage = process.argv[2];
const stages = {
  'graph-online': [pnpm, 'install', '--no-offline', '--frozen-lockfile', '--frozen-store', '--ignore-scripts'],
  dsh: [pnpm, '--filter', '@cherrystudio/dsh-bridge', 'build'],
  prepare: ['scripts/prepare-local-uar-payload.cjs'],
  build: [pnpm, 'run', 'build'],
  bundle: [pnpm, 'exec', 'electron-builder', '--mac', '--arm64', '--dir', '--publish', 'never'],
};
if (!stages[stage]) throw new Error('Specify prepare, build, or bundle');
if (process.env.CI || process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Requires native non-CI darwin-arm64');
const directory = path.dirname(new URL(import.meta.url).pathname);
const startedAt = new Date().toISOString();
const name = `boss-${stage}-${startedAt.replaceAll(':', '-').replaceAll('.', '-')}`;
const logfile = path.join(directory, name + '.log');
const receipt = path.join(directory, name + '.json');
const environment = {
  THE_BOSS_UAR_ENABLED: '1',
  THE_BOSS_UAR_LOCAL: '1',
  THE_BOSS_LOCAL_UAR_SOURCE_DIR: '/Users/gqadonis/.claude/worktrees/bauar-release-uar',
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'warn',
};
const env = { ...process.env, ...environment, PATH: path.dirname(node) + ':/usr/local/bin:' + process.env.PATH };
const data = { schemaVersion: 1, stage, startedAt, program: node, args: stages[stage], cwd, environment, pathPrepend: [path.dirname(node), '/usr/local/bin'], shell: false, orchestrator: { path: process.execPath, version: process.version }, logfile, status: 'running', exitCode: null };
const save = () => fs.writeFileSync(receipt, JSON.stringify(data, null, 2) + '\n');
save();
const output = fs.createWriteStream(logfile);
console.log(JSON.stringify({ receipt, logfile, program: node, args: stages[stage], cwd }));
const child = spawn(node, stages[stage], { cwd, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', chunk => { output.write(chunk); process.stdout.write(chunk); });
child.stderr.on('data', chunk => { output.write(chunk); process.stderr.write(chunk); });
child.on('error', error => { data.error = error.message; save(); });
child.on('close', (code, signal) => {
  output.end(() => {
    data.exitCode = code;
    data.signal = signal;
    data.status = code === 0 ? 'complete' : 'failed';
    data.finishedAt = new Date().toISOString();
    data.logSha256 = crypto.createHash('sha256').update(fs.readFileSync(logfile)).digest('hex');
    save();
    console.log(JSON.stringify({ receipt, status: data.status, exitCode: code }));
    process.exitCode = code ?? 1;
  });
});
