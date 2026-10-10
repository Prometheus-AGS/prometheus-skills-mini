import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const directory = path.dirname(new URL(import.meta.url).pathname);
const root = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const primary = '/Users/gqadonis/Projects/prometheus/the-boss';
const node = '/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node';
const pnpm = '/Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const artifact = p => ({ path: p, sha256: hash(p) });
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const inputs = read('boss-inputprep.json');
const relocation = read('boss-input-relocation.json');
const workspace = read('boss-workspace-inputprep.json');
const artifacts = JSON.parse(fs.readFileSync(path.join(root, 'build/integration-artifacts.json'), 'utf8'));
const report = { schemaVersion: 1, at: new Date().toISOString(), phase: 'phase-bauar-release-integration-2026-10-09', task: 'bauar-int-02-local-current-uar-payload/5', root, status: 'inputs-prepared-awaiting-root-archive-handoff', commands: [], toolAuthorities: [], inputReceipts: ['boss-inputprep.json', 'boss-workspace-inputprep.json', 'boss-input-relocation.json'].map(name => artifact(path.join(directory, name))), hookOutcomes: [{ hook: 'beforePack', status: 'not-run' }, { hook: 'afterPack', status: 'not-run' }], runtime: 'operator-deferred', certification: 'operator-deferred', publication: 'not-authorized' };
const env = { ...process.env, PATH: path.dirname(node) + ':/usr/local/bin:' + process.env.PATH };
for (const [program, args] of [[node, ['--version']], [node, [pnpm, '--version']], ['/usr/local/bin/pnpm', ['--version']], [node, [path.join(root, 'node_modules/electron-builder/cli.js'), '--version']]]) {
  const r = spawnSync(program, args, { cwd: root, env, encoding: 'utf8', shell: false });
  report.commands.push({ program, args, cwd: root, exitCode: r.status, stdout: r.stdout, stderr: r.stderr });
}
report.toolAuthorities = [node, pnpm, fs.realpathSync('/usr/local/bin/pnpm'), path.join(root, 'node_modules/electron-builder/package.json')].map(artifact);
report.catalog = { revision: inputs.literHead, expectedRevision: artifacts.sources['liter-llm'].revision, providers: inputs.catalogs[0].sha256, expectedProviders: artifacts.catalogs['liter-llm'].providers, models: inputs.catalogs[1].sha256, expectedModels: artifacts.catalogs['liter-llm'].models };
report.catalog.matches = report.catalog.revision === report.catalog.expectedRevision && report.catalog.providers === report.catalog.expectedProviders && report.catalog.models === report.catalog.expectedModels;
report.sourcePreservation = { bossHeadBefore: inputs.bossHeadBefore, bossHeadAfter: inputs.bossHeadAfter, primaryHeadBefore: inputs.primaryHeadBefore, primaryHeadAfter: inputs.primaryHeadAfter, literSourceHeadBefore: inputs.literSourceHeadBefore, literSourceHeadAfter: inputs.literSourceHeadAfter, packagesTree: workspace.sourceTree.trim(), packageAuthority: inputs.inputHashes.map(x => ({ file: x.file, recorded: x.primary, currentPrimary: hash(path.join(primary, x.file)), currentCandidate: hash(path.join(root, x.file)) })), originalRelocatedInputsUnchanged: relocation.changed.every(x => hash(x.path.replace(root, primary)) === x.beforeSha256) };
report.candidateWorkspaceKeys = relocation.workspaceStateAfterKeys;
report.candidateWorkspaceOnly = report.candidateWorkspaceKeys.length === 9 && report.candidateWorkspaceKeys.every(p => p === root || p.startsWith(root + '/'));
report.skippedDanglingLinks = inputs.skippedDanglingLinks.length;
report.relocatedPaths = relocation.changed.length;
report.childRuntime = { node, version: report.commands[0].stdout.trim(), pnpm, versionPnpm: report.commands[1].stdout.trim(), pathPrepend: [path.dirname(node), '/usr/local/bin'], ciPresent: Boolean(process.env.CI), platform: process.platform, arch: process.arch };
const failures = report.commands.filter(x => x.exitCode !== 0);
if (failures.length || !report.catalog.matches || !report.candidateWorkspaceOnly || !report.sourcePreservation.originalRelocatedInputsUnchanged) { report.status = 'input-failure'; process.exitCode = 1; }
fs.writeFileSync(path.join(directory, 'boss-bundle.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
