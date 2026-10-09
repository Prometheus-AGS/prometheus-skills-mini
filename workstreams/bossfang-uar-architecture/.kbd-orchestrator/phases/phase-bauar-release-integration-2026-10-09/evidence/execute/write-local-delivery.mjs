import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dir = path.dirname(fileURLToPath(import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const sha = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, name))).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
const artifact = ({ path, sha256 }) => ({ path, sha256 });
const inputs = read('build-inputs.json');
const intake = read('source-intake.json');
const pin = read('boss-local-pin.json');
const build = read('uar-build.json');
const pack = read('uar-package.json');
const delivery = read('boss-delivery.json');
const bundle = read('boss-bundle.json');
const preparation = read('boss-local-uar-preparation.json');
const prepareCommand = JSON.parse(fs.readFileSync(preparation.commandReceipt.path, 'utf8'));
const commandReceipts = bundle.deliveryCommandReceipts.map(ref => ({ ref, data: JSON.parse(fs.readFileSync(ref.path, 'utf8')) }));
const command = (c, toolVersion, exitCode = c.exitCode) => ({ program: c.program, args: c.args, cwd: c.cwd, toolVersion, exitCode });
const authorities = new Map();
for (const entry of [...build.authoritiesAfter, ...build.dependencies, ...inputs.authorities.boss]) authorities.set(entry.path, artifact(entry));
authorities.set(path.join(bundle.root, pin.pin.path), { path: path.join(bundle.root, pin.pin.path), sha256: pin.pin.sha256After });
for (const entry of delivery.currentAuthorities.candidate) {
  const absolute = path.join(bundle.root, entry.path);
  authorities.set(absolute, { path: absolute, sha256: entry.sha256 });
}
const receipt = {
  schemaVersion: 1,
  phase: build.phase,
  at: new Date().toISOString(),
  sourceIntakeSha256: sha('source-intake.json'),
  uarCommit: build.source.commit,
  bossCommit: pin.commit.hash,
  platform: 'darwin-arm64',
  features: ['server-full'],
  dependencyAuthority: [...authorities.values()],
  commands: [
    command(build.command, build.tools.find(t => t.program === 'cargo').stdout, build.exitCode),
    command(pack.command, pack.tools.node.version, pack.exitCode),
    command(prepareCommand, `Node ${bundle.childRuntime.version}`),
    ...commandReceipts.map(({ data }) => command(data, `Node ${bundle.childRuntime.version}; pnpm ${bundle.childRuntime.versionPnpm}${data.stage === 'bundle' ? '; electron-builder 26.15.6; Electron 44.2.0' : ''}`))
  ],
  binary: artifact(build.output),
  archive: artifact(pack.output.archive),
  fileManifest: artifact(pack.output.payloadManifest),
  app: { path: delivery.app, bundledBinary: artifact(delivery.binary), sourceMarker: delivery.marker.source },
  hookOutcomes: delivery.hookOutcomes.map(h => ({ hook: h.hook, status: 'complete', receiptPath: 'boss-delivery.json' })),
  statuses: { production: 'complete', build: 'complete', package: 'complete', runtime: 'operator-deferred', certification: 'operator-deferred', publication: 'not-authorized' },
  downstream: [
    'Runtime acceptance, negative controls, broad regression and cumulative independent review remain operator-deferred and unpassed.',
    'F6 remains cancelled; excluded source files were not accessed directly by task6.',
    'No signed, installed, macOS Intel, Windows, public CI or remote acceptance claim; shipping/C05 remains unchanged.',
    'Publication, branch push, shared merge and public release artifacts are not authorized.',
    'Retain candidates, local artifacts, receipts and original caches. Root owns canonical completion, archive and cleanup.',
    'local-delivery-handoff.md contains receipt hashes, earlier failure history, precise hook limits and source preservation boundaries.'
  ]
};
write('local-delivery.json', receipt);
const receiptSha = sha('local-delivery.json');
const schemaPath = path.resolve(dir, '../../contracts/local-delivery.schema.json');
const Ajv2020 = require('/Users/gqadonis/node_modules/ajv/dist/2020.js').default;
const addFormats = require('/Users/gqadonis/node_modules/ajv-formats');
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync(schemaPath, 'utf8')));
const valid = validate(receipt);
const inputNames = ['source-intake.json', 'build-inputs.json', 'boss-local-pin.json', 'uar-build.json', 'uar-package.json', 'boss-local-uar-preparation.json', 'boss-delivery.json', 'boss-bundle.json'];
const inputReceipts = [...inputNames.map(name => ({ path: name, sha256: sha(name) })), ...commandReceipts.map(({ ref }) => ({ path: path.basename(ref.path), sha256: sha(path.basename(ref.path)) })), { path: path.basename(preparation.commandReceipt.path), sha256: sha(path.basename(preparation.commandReceipt.path)) }];
write('local-delivery-validation.json', {
  schemaVersion: 1, at: new Date().toISOString(), phase: receipt.phase, task: 'bauar-int-02-local-current-uar-payload/6',
  receipt: { path: 'local-delivery.json', sha256: receiptSha },
  schema: { path: schemaPath, sha256: crypto.createHash('sha256').update(fs.readFileSync(schemaPath)).digest('hex') },
  validator: { node: process.version, ajv: require('/Users/gqadonis/node_modules/ajv/package.json').version, ajvFormats: require('/Users/gqadonis/node_modules/ajv-formats/package.json').version, dialect: '2020-12', strict: true, attempts: 1 },
  valid, errors: validate.errors ?? [], inputReceipts,
  scope: 'Receipt schema validation and receipt-file hashes only; no product reads, builds, tests, probes, services or independent review. Product identities are inherited from actual operation receipts.',
  certification: 'operator-deferred', canonicalState: 'root-owned; not mutated'
});
const link = name => `[${name}](${name})`;
const commandRows = receipt.commands.map((c, i) => `| ${i + 1} | \`${[c.program, ...c.args].join(' ')}\` | ${c.exitCode} | ${c.toolVersion} |`).join('\n');
const receiptRows = inputReceipts.map(r => `| ${link(r.path)} | \`${r.sha256}\` |`).join('\n');
const handoff = `# Local delivery handoff — change02 / task 6

The three-repository source intake, current-UAR production build, sidecar archive and unsigned local darwin-arm64 Boss directory bundle are complete. Runtime acceptance, tests, negative controls, cumulative independent review and certification remain **operator-deferred and UNPASSED**. F6 remains **cancelled**. Publication is **not-authorized**. This receipt does not advance shipping/C05.

Actual app: [The Boss.app](<${delivery.app}>). Actual archive: [uar-sidecar-darwin-arm64.tar.gz](<${receipt.archive.path}>). These are retained local outputs; no installation, signed app/DMG, notarization, remote release or additional platform delivery is claimed.

${link('local-delivery.json')} SHA256: \`${receiptSha}\`. ${link('local-delivery-validation.json')}: strict draft 2020-12 schema validation ${valid ? 'valid' : 'INVALID'}, executed once using Node ${process.version} and installed Ajv. Formal schema validity is receipt structure evidence, not independent review or certification. Task6 consumed existing receipts and hashed receipt files only; it did not rerun successful builds or access product files.

## Source and payload identity

- UAR source checkpoint: \`${receipt.uarCommit}\`.
- Boss final pin commit: \`${receipt.bossCommit}\`; parent intake checkpoint: \`${pin.commit.parent}\`. The only post-intake source edit was the local UAR revision pin.
- Bossfang checkpoint: \`1d518936cb15b79d30bdd315510ff925613a0f4d\`, approved bac04 baseline with 279 inherited commits; original main remains \`16beef0fcf3053970a901990df4fedbdf86bd87d\` at the documented intake boundary.
- Intake: 241 selected paths, 94 additions and 147 modifications. ${link('source-intake.json')} SHA256 \`${receipt.sourceIntakeSha256}\`; ${link('source-intake-handoff.md')} retains bases, source roots and strict approval producer/caller inventory.
- Built UAR binary: \`${receipt.binary.path}\`, ${build.output.bytes} bytes, SHA256 \`${receipt.binary.sha256}\`.
- Archive: ${pack.output.archive.bytes} bytes, SHA256 \`${receipt.archive.sha256}\`; the existing packager emitted 12 files from the actual UAR checkpoint.
- Archive file manifest: \`${receipt.fileManifest.path}\`, SHA256 \`${receipt.fileManifest.sha256}\`.
- App bundled UAR binary: \`${receipt.app.bundledBinary.path}\`, SHA256 \`${receipt.app.bundledBinary.sha256}\`, matching the actual build/archive receipt.
- App source marker: \`${delivery.markerFile.path}\`, SHA256 \`${delivery.markerFile.sha256}\`, source \`${delivery.marker.source}\`, archive SHA256 \`${delivery.marker.archiveSha256}\`.
- App payload manifest: \`${delivery.manifestFile.path}\`, SHA256 \`${delivery.manifestFile.sha256}\`. Its digest intentionally differs from the archive manifest because Boss adds archiveSha256; the file records match, as recorded in ${link('boss-delivery.json')}.

Build profile was release, native target aarch64-apple-darwin, explicit server-full with default minimal enabled. Test-probes and bauar-native-admission-gate were excluded. Exact dependency-authority hashes are carried in local-delivery.json from recorded build and final Boss authorities; gitlinks and feature expansion remain in ${link('build-inputs.json')}. No dependency pins were upgraded.

## Actual operation history

The following command list deliberately retains the failed offline graph restore (exit 1). Completion applies to the subsequent successful operations, not every historical attempt. Full cwd, argv and versions are in local-delivery.json; environment and logs are in the linked operation receipts.

| # | Actual command | Exit | Recorded tool version |
| --- | --- | --- | --- |
${commandRows}

Node22 orchestrated the work and ran UAR packaging. Boss children used the already-installed Node24.11.1 with pnpm12.3.4; this is an explicit runtime adaptation from the planned Node22 child commands, not an installed toolchain upgrade. Existing dependency-copy failures and route failures remain in ${link('boss-input-direct-cli-failure.json')}, ${link('boss-input-diagnosis.json')}, ${link('boss-input-repair.json')} and [pnpm route log](boss-pnpm-route-failure.log). Exact dependency lookup was repaired in candidate generated inputs, then the observed incomplete copied graph was restored using the frozen lockfile/store and ignore-scripts. Offline restoration failed on missing locked assets; the authorized online restoration reused 2614, downloaded 139 and added 2761 packages. Earlier copied inputs were retained under the candidate .context/bauar-dependency-inputs/before-graph-rebuild directory. There was no product source repair, root prepare lifecycle execution, shared Git configuration change or pin upgrade.

The successful DSH bridge build, Boss build and electron-builder directory assembly all exited 0. Existing beforePack and afterPack remained intact and completed. beforePack performed native rebuilding, current local UAR staging, bundled binary checks and pinned mini preparation. afterPack performed packaged Claude CLI and UAR identity/inventory/hash/executable checks, including its inseparable invalid-launch-token rejection probe (expected exit2/refusal). These are packaging-hook results only: no Boss managed startup or successful delegated runtime acceptance is claimed. Signing autodiscovery was disabled and publication was disabled with --publish never. The operator-deferred acceptance negative controls were not run.

## Evidence and preservation boundaries

| Receipt | SHA256 |
| --- | --- |
${receiptRows}

Original selected source bytes/modes/index/ref preservation is recorded at the finite intake boundaries in intake/uar.json, intake/boss.json and intake/bossfang.json, linked through source-intake.json. UAR build/package receipts preserve their candidate HEAD and finite dependency authorities. Boss bundle/delivery receipts preserve the candidate and primary authority hashes/HEADs after actual assembly. These historical recorded scopes do not assert unrelated source state or a new final source scan. Task6 did not inspect/hash/search/diff/test tests/bauar_session_owner.rs or src/uar/mcp_server.rs, and did not run whole-original-UAR Git status/diff. No new security hardening was added.

Root retains ownership of canonical task/stage completion, hooks, backend archive and cleanup. Keep all candidate refs, outputs, original caches and receipts; do not prune/reset them. No execute.handoff.json or canonical state was changed by task6. No public four-platform artifacts, signed/installed acceptance, macOS Intel/Windows checks, public CI or remote receiver/IdP/custodian acceptance is claimed. Downstream runtime/review/certification work remains with the operator's deferred boundary.
`;
fs.writeFileSync(path.join(dir, 'local-delivery-handoff.md'), handoff);
console.log(JSON.stringify({ valid, errors: validate.errors, receiptSha256: receiptSha, receipt: path.join(dir, 'local-delivery.json'), validation: path.join(dir, 'local-delivery-validation.json'), handoff: path.join(dir, 'local-delivery-handoff.md'), consumedRepositories: intake.repositories.length }));
process.exitCode = valid ? 0 : 1;
