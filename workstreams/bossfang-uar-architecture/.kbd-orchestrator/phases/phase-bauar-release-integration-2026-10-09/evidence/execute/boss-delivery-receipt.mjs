import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const evidence = path.dirname(new URL(import.meta.url).pathname);
const root = '/Users/gqadonis/.claude/worktrees/bauar-release-boss';
const primary = '/Users/gqadonis/Projects/prometheus/the-boss';
const output = path.join(root, 'dist/mac-arm64');
const candidates = fs.readdirSync(output).filter(name => name.endsWith('.app'));
if (candidates.length !== 1) throw new Error(`Actual app selection ambiguous: ${JSON.stringify(candidates)}`);
const app = fs.realpathSync(path.join(output, candidates[0]));
const resources = path.join(app, 'Contents/Resources');
const payload = path.join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64');
function hash(file) {
  const digest = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const bytes = Buffer.alloc(1024 * 1024);
  let n;
  while ((n = fs.readSync(fd, bytes, 0, bytes.length, null))) digest.update(bytes.subarray(0, n));
  fs.closeSync(fd);
  return digest.digest('hex');
}
const info = file => ({ path: file, size: fs.statSync(file).size, sha256: hash(file) });
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
const preparation = read(path.join(evidence, 'boss-local-uar-preparation.json'));
const before = read(path.join(evidence, 'boss-graph-install.json')).before;
const assemblyPath = path.join(evidence, 'boss-bundle-2026-10-09T13-38-47-743Z.json');
const assembly = read(assemblyPath);
const binary = info(path.join(payload, 'uar-sidecar'));
const markerFile = info(path.join(payload, '.uar-local-payload.json'));
const manifestFile = info(path.join(payload, 'payload-manifest.json'));
const marker = read(markerFile.path);
const manifest = read(manifestFile.path);
const authorities = (cwd, files) => files.map(entry => ({ path: entry.path, sha256: hash(path.join(cwd, entry.path)) }));
const current = {
  candidateHead: git(root, ['rev-parse', 'HEAD']),
  primaryHead: git(primary, ['rev-parse', 'HEAD']),
  candidate: authorities(root, before.candidate),
  primary: authorities(primary, before.primary),
  candidateStatus: git(root, ['status', '--porcelain', '--untracked-files=normal']),
  miniHead: git(path.join(root, 'resources/prometheus-skills-mini'), ['rev-parse', 'HEAD']),
  catalogHead: git(path.join(root, 'resources/prometheus-skills-mini/tools/liter-llm'), ['rev-parse', 'HEAD']),
};
const preservation = {
  candidate: JSON.stringify(before.candidate) === JSON.stringify(current.candidate),
  primary: JSON.stringify(before.primary) === JSON.stringify(current.primary),
  candidateHead: before.candidateHead === current.candidateHead,
  primaryHead: before.primaryHead === current.primaryHead,
};
const binding = {
  binaryMatchesBuiltArchive: binary.sha256 === preparation.binary.sha256,
  sourceMatchesBuiltArchive: marker.source === preparation.source && manifest.source === preparation.source,
  markerArchiveMatches: marker.archiveSha256 === preparation.archive.sha256,
  manifestArchiveMatches: manifest.archiveSha256 === preparation.archive.sha256,
  fileRecordsMatch: JSON.stringify(marker.files) === JSON.stringify(manifest.files),
};
const hooks = ['scripts/before-pack.js', 'scripts/after-pack.js', 'scripts/local-uar-payload.cjs', 'scripts/uar-payload-integrity.cjs'].map(file => ({ ...info(path.join(root, file)), matchesHead: fs.readFileSync(path.join(root, file)).equals(execFileSync('git', ['-C', root, 'show', `HEAD:${file}`])) }));
const receipt = {
  schemaVersion: 1, at: new Date().toISOString(), status: 'assembled', app,
  source: { boss: current.candidateHead, uar: preparation.source },
  assemblyReceipt: info(assemblyPath), assemblyExitCode: assembly.exitCode,
  appInfo: info(path.join(app, 'Contents/Info.plist')),
  appAsar: info(path.join(resources, 'app.asar')),
  binary, markerFile, marker, manifestFile, binding,
  preparationReceipt: info(path.join(evidence, 'boss-local-uar-preparation.json')),
  hookSources: hooks,
  hookOutcomes: [
    { hook: 'beforePack', status: 'passed', evidence: 'Actual assembly completed after exact native rebuild, staged current local UAR payload, bundled-binary verification, and pinned mini preparation.' },
    { hook: 'afterPack', status: 'passed', evidence: 'Actual assembly exit0 with unchanged hook: packaged Claude CLI check, local UAR identity/inventory/hash/executable checks, and invalid-launch-token rejection probe requiring exit2 and refusal message.' },
  ],
  currentAuthorities: current, authorityPreservation: preservation,
  signing: 'skipped: CSC_IDENTITY_AUTO_DISCOVERY=false',
  publication: 'not-authorized; --publish never',
  runtime: 'operator-deferred; only inseparable afterPack launch-rejection probe ran',
  certification: 'operator-deferred',
};
if (assembly.exitCode !== 0 || !Object.values(binding).every(Boolean) || !Object.values(preservation).every(Boolean) || hooks.some(entry => !entry.matchesHead)) receipt.status = 'identity-or-authority-mismatch';
const receiptPath = path.join(evidence, 'boss-delivery.json');
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
const bundlePath = path.join(evidence, 'boss-bundle.json');
const bundle = read(bundlePath);
bundle.at = receipt.at;
bundle.status = receipt.status;
bundle.app = app;
bundle.deliveryReceipt = info(receiptPath);
bundle.bundledUar = { binary, markerFile, source: marker.source, archiveSha256: marker.archiveSha256, binding };
bundle.hookOutcomes = receipt.hookOutcomes;
bundle.authorityPreservationAfterDelivery = preservation;
bundle.deliveryCommandReceipts = bundle.deliveryCommandReceipts.map(entry => {
  const actual = read(entry.path);
  return { ...entry, sha256: hash(entry.path), status: actual.status, exitCode: actual.exitCode };
});
fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + '\n');
console.log(JSON.stringify({ receiptPath, status: receipt.status, app, binary, markerFile, manifestFile, binding, preservation, candidateStatus: current.candidateStatus }));
process.exitCode = receipt.status === 'assembled' ? 0 : 1;
