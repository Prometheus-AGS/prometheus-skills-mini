import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const source = '/Users/gqadonis/Projects/prometheus/the-boss';
const root = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const output = new URL('./boss-workspace-inputprep.json', import.meta.url);
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), source, root, copies: [], skippedDanglingLinks: [], status: 'preparing' };
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
try {
  report.sourceTree = execFileSync('git', ['-C', source, 'ls-tree', 'HEAD', 'packages'], { encoding: 'utf8' });
  report.candidateTree = execFileSync('git', ['-C', root, 'ls-tree', 'HEAD', 'packages'], { encoding: 'utf8' });
  report.sourceTrackedStatus = execFileSync('git', ['-C', source, 'status', '--porcelain', '--untracked-files=no', '--', 'packages'], { encoding: 'utf8' });
  report.candidateTrackedStatus = execFileSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=no', '--', 'packages'], { encoding: 'utf8' });
  if (report.sourceTree !== report.candidateTree || report.sourceTrackedStatus || report.candidateTrackedStatus) throw new Error('Workspace source authority differs');
  for (const name of fs.readdirSync(path.join(source, 'packages'))) {
    const from = path.join(source, 'packages', name, 'node_modules');
    if (!fs.existsSync(from)) continue;
    const to = path.join(root, 'packages', name, 'node_modules');
    fs.cpSync(from, to, { recursive: true, dereference: true, filter(filename) {
      if (fs.lstatSync(filename).isSymbolicLink()) {
        try { fs.statSync(filename); }
        catch (e) {
          if (e.code !== 'ENOENT') throw e;
          report.skippedDanglingLinks.push({ path: filename, target: fs.readlinkSync(filename), error: e.code });
          save();
          return false;
        }
      }
      return true;
    } });
    report.copies.push({ from, to, dereferenced: true });
    save();
  }
  report.status = 'prepared';
} catch (e) {
  report.status = 'failed';
  report.error = { message: e.message, code: e.code, path: e.path, dest: e.dest };
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify(report, null, 2));
}
