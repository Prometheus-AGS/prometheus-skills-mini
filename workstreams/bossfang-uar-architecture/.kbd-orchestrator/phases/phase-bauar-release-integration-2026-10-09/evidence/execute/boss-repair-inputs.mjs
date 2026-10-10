import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const evidence = path.dirname(new URL(import.meta.url).pathname);
const primary = '/Users/gqadonis/Projects/prometheus/the-boss';
const root = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const node = '/Users/gqadonis/.nvm/versions/node/v24.11.1/bin/node';
const pnpm = '/Users/gqadonis/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs';
const failingPackage = root + '/node_modules/.pnpm/tsdown@0.22.14_oxc-resolver@11.21.2_tsx@4.21.0_typescript@7.0.2_unrun@0.2.27_@emnapi+core@1.11.2_@emnapi+runtime@1.11.3_/node_modules/rolldown-plugin-dts';
const source = primary + '/node_modules/.pnpm/get-tsconfig@5.0.0-beta.5/node_modules/get-tsconfig';
const dependencyEntry = createRequire(path.join(source, 'package.json')).resolve('resolve-pkg-maps');
const dependency = path.resolve(path.dirname(dependencyEntry), '..');
const destination = path.join(failingPackage, 'node_modules/get-tsconfig');
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function inventory(directory, prefix = '') {
  return fs.readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? inventory(directory, relative) : [{ path: relative, sha256: digest(path.join(directory, relative)) }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}
const report = { schemaVersion: 1, at: new Date().toISOString(), reason: 'Observed copied rolldown-plugin-dts lookup selected hoisted get-tsconfig4.13.6 instead of exact dependency5.0.0-beta.5', copies: [], failuresPreserved: ['boss-pnpm-route-failure.log', 'boss-input-direct-cli-failure.json', 'boss-input-diagnosis.json'] };
for (const [from, to] of [[source, destination], [dependency, path.join(destination, 'node_modules/resolve-pkg-maps')]]) {
  const before = inventory(from);
  const destinationExisted = fs.existsSync(to);
  if (destinationExisted) throw new Error(`Unexpected existing repair destination: ${to}`);
  fs.cpSync(from, to, { recursive: true, dereference: true });
  const after = inventory(to);
  const sourceAfter = inventory(from);
  report.copies.push({ from, to, destinationExisted, before, after, sourceUnchanged: JSON.stringify(before) === JSON.stringify(sourceAfter), exactCopy: JSON.stringify(before) === JSON.stringify(after) });
}
report.resolutionAfter = createRequire(path.join(failingPackage, 'dist/internal.mjs')).resolve('get-tsconfig');
report.versionAfter = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'))).version;
const args = [pnpm, 'exec', 'electron-builder', '--version'];
const environment = { PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'warn' };
const env = { ...process.env, ...environment, PATH: path.dirname(node) + ':/usr/local/bin:' + process.env.PATH };
const result = spawnSync(node, args, { cwd: root, env, encoding: 'utf8', shell: false });
report.retry = { program: node, args, cwd: root, environment, pathPrepend: [path.dirname(node), '/usr/local/bin'], exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
report.status = result.status === 0 ? 'prepared-awaiting-archive' : 'failed-route-retry';
report.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(evidence, 'boss-input-repair.json'), JSON.stringify(report, null, 2) + '\n');
const bundle = JSON.parse(fs.readFileSync(path.join(evidence, 'boss-bundle.json')));
bundle.commands.push(report.retry);
bundle.inputRepair = { path: 'boss-input-repair.json', sha256: digest(path.join(evidence, 'boss-input-repair.json')) };
bundle.status = report.status;
fs.writeFileSync(path.join(evidence, 'boss-bundle.json'), JSON.stringify(bundle, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, resolutionAfter: report.resolutionAfter, retry: report.retry }, null, 2));
process.exitCode = result.status ?? 1;
