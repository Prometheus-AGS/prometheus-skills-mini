import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const root = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const primary = '/Users/gqadonis/Projects/prometheus/the-boss';
const evidence = path.dirname(new URL(import.meta.url).pathname);
const node = '/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node';
const pnpm = '/Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs';
const retained = path.join(root, '.context/bauar-dependency-inputs/before-graph-rebuild');
const receipt = path.join(evidence, 'boss-graph-install.json');
const startedAt = new Date().toISOString();
const logfile = path.join(evidence, `boss-graph-install-${startedAt.replaceAll(':', '-').replaceAll('.', '-')}.log`);
const args = [pnpm, 'install', '--offline', '--frozen-lockfile', '--frozen-store', '--ignore-scripts'];
const environment = { PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'warn' };
const env = { ...process.env, ...environment, PATH: path.dirname(node) + ':/usr/local/bin:' + process.env.PATH };
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report = {
  schemaVersion: 1, startedAt, status: 'starting', root, primary, retained,
  orchestrator: { program: process.execPath, version: process.version },
  program: node, args, cwd: root, environment,
  pathPrepend: [path.dirname(node), '/usr/local/bin'], shell: false,
  logfile, moves: [], exitCode: null,
  priorEvidence: ['boss-input-direct-cli-failure.json', 'boss-pnpm-route-failure.log', 'boss-input-repair.json', 'boss-input-diagnosis.json', 'boss-graph-correction-proposal.json'],
  lifecycleScripts: 'disabled for project and dependencies',
  sharedStore: 'read-only via --frozen-store',
  network: 'offline; missing locked asset is a stopping failure',
};
const save = () => fs.writeFileSync(receipt, JSON.stringify(report, null, 2) + '\n');
function git(cwd, argv) {
  const r = spawnSync('git', ['-C', cwd, ...argv], { encoding: 'utf8', shell: false });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout;
}
function authorities(cwd) {
  const files = git(cwd, ['ls-files', '-z', '--', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc', 'patches', 'packages/*/package.json', 'build/local-uar-source.json', 'build/integration-artifacts.json']).split('\0').filter(Boolean);
  return files.map(file => ({ path: file, sha256: hash(path.join(cwd, file)) }));
}
try {
  if (fs.existsSync(retained)) throw new Error(`Retention destination already exists: ${retained}`);
  report.before = { candidateHead: git(root, ['rev-parse', 'HEAD']).trim(), primaryHead: git(primary, ['rev-parse', 'HEAD']).trim(), candidate: authorities(root), primary: authorities(primary), candidateStatus: git(root, ['status', '--porcelain', '--untracked-files=normal']) };
  report.toolAuthorities = [node, pnpm].map(p => ({ path: p, sha256: hash(p) }));
  const workspace = JSON.parse(fs.readFileSync(path.join(evidence, 'boss-workspace-inputprep.json')));
  const inputs = [path.join(root, 'node_modules'), ...workspace.copies.map(item => item.to)];
  save();
  for (const from of inputs) {
    const to = path.join(retained, path.relative(root, from));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    report.moves.push({ from, to, at: new Date().toISOString(), operation: 'rename-retain', deleted: false });
    save();
  }
  report.status = 'install-running';
  save();
  console.log(JSON.stringify({ receipt, logfile, program: node, args, cwd: root, retained }));
  const log = fs.createWriteStream(logfile);
  const child = spawn(node, args, { cwd: root, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  report.pid = child.pid;
  save();
  child.stdout.on('data', chunk => { log.write(chunk); process.stdout.write(chunk); });
  child.stderr.on('data', chunk => { log.write(chunk); process.stderr.write(chunk); });
  child.on('error', error => { report.error = error.message; save(); });
  child.on('close', (code, signal) => {
    log.end(() => {
      report.exitCode = code;
      report.signal = signal;
      report.finishedAt = new Date().toISOString();
      report.logSha256 = hash(logfile);
      report.after = { candidateHead: git(root, ['rev-parse', 'HEAD']).trim(), primaryHead: git(primary, ['rev-parse', 'HEAD']).trim(), candidate: authorities(root), primary: authorities(primary), candidateStatus: git(root, ['status', '--porcelain', '--untracked-files=normal']) };
      report.authorityPreservation = {
        candidate: JSON.stringify(report.before.candidate) === JSON.stringify(report.after.candidate),
        primary: JSON.stringify(report.before.primary) === JSON.stringify(report.after.primary),
        candidateHead: report.before.candidateHead === report.after.candidateHead,
        primaryHead: report.before.primaryHead === report.after.primaryHead,
      };
      const preserved = Object.values(report.authorityPreservation).every(Boolean);
      report.status = code === 0 && preserved ? 'graph-materialized' : 'failed-stopped';
      report.next = code === 0 ? 'Exact previously failed builder version route; app commands still await root archive handoff' : 'Report exact diagnostics; no online fallback, retry, or lock/source modification';
      save();
      console.log(JSON.stringify({ receipt, exitCode: code, status: report.status, authorityPreservation: report.authorityPreservation }));
      process.exitCode = code === 0 && preserved ? 0 : code || 1;
    });
  });
} catch (error) {
  report.status = 'preinstall-failed-stopped';
  report.error = { message: error.message, code: error.code, path: error.path };
  report.finishedAt = new Date().toISOString();
  save();
  console.error(error.message);
  process.exitCode = 1;
}
