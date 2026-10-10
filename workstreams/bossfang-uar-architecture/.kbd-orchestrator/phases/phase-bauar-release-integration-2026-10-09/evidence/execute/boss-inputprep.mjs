import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const primary = '/Users/gqadonis/Projects/prometheus/the-boss';
const evidence = path.dirname(new URL(import.meta.url).pathname);
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), root, primary, commands: [], skippedDanglingLinks: [], status: 'preparing' };
const save = () => fs.writeFileSync(path.join(evidence, 'boss-inputprep.json'), JSON.stringify(report, null, 2) + '\n');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  report.commands.push({ program: 'git', args, cwd, exitCode: r.status, stdout: r.stdout, stderr: r.stderr });
  save();
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}
try {
  report.bossHeadBefore = git(root, ['rev-parse', 'HEAD']);
  report.primaryHeadBefore = git(primary, ['rev-parse', 'HEAD']);
  report.inputHashes = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'].map(file => ({ file, primary: hash(path.join(primary, file)), candidate: hash(path.join(root, file)) }));
  if (report.inputHashes.some(x => x.primary !== x.candidate)) throw new Error('Input authority differs');
  save();
  fs.cpSync(path.join(primary, 'node_modules'), path.join(root, 'node_modules'), {
    recursive: true, dereference: true,
    filter(source) {
      if (fs.lstatSync(source).isSymbolicLink()) {
        try { fs.statSync(source); }
        catch (e) {
          if (e.code !== 'ENOENT') throw e;
          report.skippedDanglingLinks.push({ path: source, target: fs.readlinkSync(source), error: e.code });
          save();
          return false;
        }
      }
      return true;
    }
  });
  report.dependenciesCopiedAt = new Date().toISOString();
  const source = '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/tools/liter-llm';
  const dest = path.join(root, 'resources/prometheus-skills-mini/tools/liter-llm');
  const revision = '4f25d39f0075656b70bf945880d6033beda6d663';
  report.literSourceHeadBefore = git(source, ['rev-parse', 'HEAD']);
  git(root, ['clone', '--local', '--no-hardlinks', '--no-checkout', source, dest]);
  git(dest, ['checkout', '--detach', revision]);
  report.literHead = git(dest, ['rev-parse', 'HEAD']);
  report.catalogs = ['providers.json', 'catalog.json'].map(file => ({ file, sha256: hash(path.join(dest, 'schemas', file)) }));
  report.literSourceHeadAfter = git(source, ['rev-parse', 'HEAD']);
  report.bossHeadAfter = git(root, ['rev-parse', 'HEAD']);
  report.primaryHeadAfter = git(primary, ['rev-parse', 'HEAD']);
  report.status = 'prepared-awaiting-actual-archive';
} catch (e) {
  report.status = 'failed';
  report.error = { message: e.message, code: e.code, path: e.path, dest: e.dest, stack: e.stack };
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({ status: report.status, skippedDanglingLinks: report.skippedDanglingLinks.length, error: report.error }, null, 2));
}
