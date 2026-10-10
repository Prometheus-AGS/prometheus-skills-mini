import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const primary = '/Users/gqadonis/Projects/prometheus/the-boss';
const candidate = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const receipt = new URL('./boss-input-relocation.json', import.meta.url);
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), primary, candidate, reason: 'Copied dependency .bin shims retain absolute primary NODE_PATH and cmd-shim-target paths; relocate only those literal prefixes in ignored candidate shims.', scopeApproval: 'Root handoff explicitly approved bounded copied-input relocation on 2026-10-09.', changed: [] };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function relocate(file, kind) {
  const before = fs.readFileSync(file);
  if (!before.includes(Buffer.from(primary))) return;
  const text = before.toString('utf8');
  const matches = text.split(primary).length - 1;
  const after = Buffer.from(text.split(primary).join(candidate));
  fs.writeFileSync(file, after);
  report.changed.push({ path: file, kind, beforeSha256: hash(before), afterSha256: hash(after), matches });
}
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile() && path.basename(directory) === '.bin') {
      relocate(file, 'copied-bin-shim');
    }
  }
}
visit(path.join(candidate, 'node_modules'));
for (const name of fs.readdirSync(path.join(candidate, 'packages'))) {
  const modules = path.join(candidate, 'packages', name, 'node_modules');
  if (fs.existsSync(modules)) visit(modules);
}
const workspaceState = path.join(candidate, 'node_modules/.pnpm-workspace-state-v1.json');
const stateBefore = JSON.parse(fs.readFileSync(workspaceState, 'utf8'));
report.workspaceStateBeforeKeys = Object.keys(stateBefore.projects ?? {});
relocate(workspaceState, 'copied-workspace-cache');
const stateAfter = JSON.parse(fs.readFileSync(workspaceState, 'utf8'));
report.workspaceStateAfterKeys = Object.keys(stateAfter.projects ?? {});
report.finishedAt = new Date().toISOString();
report.status = 'complete';
fs.writeFileSync(receipt, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, changedShims: report.changed.length, receipt: receipt.pathname }));
