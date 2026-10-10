import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const directory = new URL('.', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ref = async path => { const bytes = await fs.readFile(path); return { path, bytes: bytes.length, sha256: hash(bytes) }; };
const receipt = async name => JSON.parse(await fs.readFile(new URL(name, directory), 'utf8'));
const require = createRequire(import.meta.url);
let step = 'stage_receipts';
try {
  const plan = await receipt('boss-package-plan-04.json');
  const prior = await receipt('boss-package-01.json');
  const stages = [];
  for (const name of ['boss-stage-0-receipt-03.json', 'boss-stage-1-receipt-04.json', 'boss-stage-2-receipt-04.json']) {
    const current = await receipt(name);
    if (current.result.exitCode !== 0 || current.result.category !== 'completed' || !current.result.cleanup.groupAbsent || current.result.cleanup.unknownDescendants) throw new Error('Stage completion not established');
    stages.push(await ref(new URL(name, directory).pathname));
  }
  step = 'h02_restoration';
  const restoration = await receipt('h02-packaging-restoration-02.json');
  if (!restoration.restored || restoration.failed || restoration.interrupted || restoration.currentSha256 !== plan.temporaryScenarioStaging.originalSha256 ||
      hash(await fs.readFile(plan.temporaryScenarioStaging.file)) !== plan.temporaryScenarioStaging.originalSha256) throw new Error('H02 restoration not established');
  step = 'finite_sources';
  const currentSource = [];
  for (const expected of plan.source) {
    const actual = await ref(expected.path);
    if (actual.sha256 !== expected.sha256) throw new Error('Finite build source changed');
    currentSource.push(actual);
  }
  const fixtureSource = [];
  for (const expected of plan.fixtureSource) {
    const actual = await ref(expected.path);
    if (actual.sha256 !== expected.sha256) throw new Error('Finite fixture source changed');
    fixtureSource.push(actual);
  }
  step = 'package_files';
  const packageFiles = {};
  for (const [name, selected] of Object.entries(prior.packageFiles)) packageFiles[name] = await ref(selected.path);
  if (packageFiles.uar.sha256 !== prior.packageFiles.uar.sha256) throw new Error('Retained server-full sidecar changed');
  const archive = await ref(prior.archive.path);
  if (archive.sha256 !== prior.archive.sha256) throw new Error('Retained source archive changed');
  if (packageFiles.asar.sha256 === prior.packageFiles.asar.sha256) throw new Error('ASAR correction not established');
  step = 'compiled_root_binding';
  const toolPath = '/Users/gqadonis/Projects/prometheus/the-boss/node_modules/.pnpm/@electron+asar@3.4.1/node_modules/@electron/asar/lib/asar.js';
  const asar = require(toolPath);
  const chunks = asar.listPackage(packageFiles.asar.path).map(path => path.startsWith('/') ? path.slice(1) : path).filter(path => path.startsWith('out/main/LoggerService-') && path.endsWith('.js') && !path.slice(9).includes('/'));
  if (chunks.length !== 1) throw new Error('Compiled root chunk is ambiguous');
  const chunk = chunks[0];
  const compiled = await fs.readFile(join(plan.commands[1].cwd, chunk));
  const packaged = asar.extractFile(packageFiles.asar.path, chunk);
  const text = packaged.toString('utf8');
  const compiledRootBinding = { path: chunk, buildSha256: hash(compiled), packageSha256: hash(packaged), matches: hash(compiled) === hash(packaged),
    containsPrivateRootContract: text.includes('THE_BOSS_PROFILE_ROOT'), synchronousRefusal: text.includes('writeSync(process.stderr.fd'),
    fixedRefusal: text.includes('THE_BOSS_PROFILE_ROOT is invalid or unavailable.'), exitsNonzero: text.includes('process.exit(2)') };
  if (!compiledRootBinding.matches || !compiledRootBinding.containsPrivateRootContract || !compiledRootBinding.synchronousRefusal ||
      !compiledRootBinding.fixedRefusal || !compiledRootBinding.exitsNonzero) throw new Error('Compiled startup correction not established');
  step = 'retention';
  const retention = await receipt('boss-retention-02.json');
  for (const expected of retention.selectedIdentities) {
    if ((await ref(expected.path)).sha256 !== expected.sha256) throw new Error('Retained package01 identity changed');
  }
  const result = { schemaVersion: 1, kind: 'boss-package', completedAt: new Date().toISOString(), scope: prior.scope, status: 'PASS', runtimeAcceptance: 'NOT_RUN',
    bossHead: plan.bossHead, node: plan.node, app: prior.app, stages, sourcePlan: await ref(new URL('boss-package-plan-04.json', directory).pathname),
    sourceUnchanged: true, currentSource, fixtureSource, packageFiles, uarSource: prior.uarSource, uarProfile: prior.uarProfile, archive, uarMatches: true,
    compiledRootBinding, asarChanged: true, retention: await ref(new URL('boss-retention-02.json', directory).pathname),
    previousPackage: await ref(new URL('boss-package-01.json', directory).pathname),
    h02Restoration: await ref(new URL('h02-packaging-restoration-02.json', directory).pathname), asarInspectionTool: await ref(toolPath),
    limitations: prior.limitations, exception: prior.exception, note: 'Successful preparation03 was preserved; only the failed coherent Boss build and dependent packaging were retried in attempt04.' };
  await fs.writeFile(new URL('boss-package-02.json', directory), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: result.status, runtimeAcceptance: result.runtimeAcceptance, packageFiles, compiledRootBinding, h02Restored: true, retainedPackage01Matches: true }));
} catch {
  await fs.writeFile(new URL('boss-package-verification-failure-03.json', directory), JSON.stringify({ schemaVersion: 1, status: 'FAIL', step, rawDiagnosticRetained: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: 'FAIL', step, rawDiagnosticRetained: false }));
  process.exitCode = 2;
}
