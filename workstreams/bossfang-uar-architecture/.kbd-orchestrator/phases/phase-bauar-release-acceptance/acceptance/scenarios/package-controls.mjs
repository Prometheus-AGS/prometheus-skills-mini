import { copyFile, mkdir, realpath, writeFile, open } from 'node:fs/promises';
import { join, dirname, basename, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readJson, requireValue, verifyRef, writeNew, hashFile, within, safeError } from '../lib/records.mjs';
import { argumentsMap, scenarioContext, runFinite, finishScenario, freshDirectory, fileRef } from './scenario-common.mjs';

const markerName = '.uar-local-payload.json';
function relativeFile(name) {
  requireValue(typeof name === 'string' && name.length > 0 && !name.includes('\\') && !posix.isAbsolute(name)
    && posix.normalize(name) === name && name !== '..' && !name.startsWith('../'), 'payload_relative_path_invalid');
  return name;
}
async function prepare(args) {
  const config = await readJson(args.get('--config'));
  const root = args.get('--root');
  requireValue(within(dirname(dirname(args.get('--config'))), config.privateRoot), 'private_root_outside_phase');
  requireValue(within(config.privateRoot, root), 'control_root_not_private');
  await mkdir(config.privateRoot, { recursive: true, mode: 0o700 });
  requireValue(await realpath(config.privateRoot) === config.privateRoot, 'private_root_redirected');
  await mkdir(root, { recursive: false, mode: 0o700 });
  const component = config.components.find(item => item.id === 'package-pristine');
  requireValue(component, 'pristine_component_missing');
  const originalMarkerPath = component.packagePaths.find(path => path.endsWith(`/${markerName}`));
  const payloadRoot = dirname(originalMarkerPath);
  const marker = await readJson(originalMarkerPath);
  const manifestPath = join(payloadRoot, 'payload-manifest.json');
  const manifest = await readJson(manifestPath);
  requireValue(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 4096,
    'payload_inventory_missing');
  const names = [...new Set([...manifest.files.map(item => relativeFile(item.path)), 'payload-manifest.json', markerName])];
  const originals = [];
  for (const name of names) originals.push(await fileRef(join(payloadRoot, name)));
  const validator = component.sourcePaths.find(path => path.endsWith('/scripts/uar-payload-integrity.cjs'));
  const inspector = component.sourcePaths.find(path => path.endsWith('/scripts/local-uar-payload.cjs'));
  const source = await fileRef(validator);
  const inspectorRef = await fileRef(inspector);
  const original = await fileRef(originalMarkerPath);
  const controls = [];
  for (const kind of ['pristine', 'stale-source', 'public-mode']) {
    const resources = join(root, kind, 'Resources');
    const target = join(resources, 'app.asar.unpacked/resources/binaries/darwin-arm64');
    await mkdir(target, { recursive: true, mode: 0o700 });
    for (const name of names) {
      const destination = join(target, name);
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      await copyFile(join(payloadRoot, name), destination);
    }
    const copiedMarker = join(target, markerName);
    if (kind === 'stale-source') {
      const changed = { ...marker, source: createHash('sha256').update(`deliberate-stale:${marker.source}`).digest('hex').slice(0, 40) };
      await writeFile(copiedMarker, `${JSON.stringify(changed, null, 2)}\n`, { mode: 0o600 });
    }
    const control = { id: `package-${kind}`, kind, original, controlled: await fileRef(copiedMarker),
      argumentPath: resources, expectedExit: kind === 'pristine' ? 'zero' : 'nonzero' };
    if (kind !== 'pristine') Object.assign(control, { positiveComponentId: 'package-pristine',
      failurePredicate: { source, stream: 'stderr', literal: kind === 'stale-source'
        ? 'Local UAR payload identity does not match its source pin for'
        : 'Local UAR payload cannot be used for a public release:' } });
    controls.push(control);
  }
  const archive = await fileRef(args.get('--archive'));
  const archiveRecordPath = archive.path.replace(/\.tar\.gz$/, '.json');
  requireValue(archiveRecordPath !== archive.path, 'archive_filename_invalid');
  const archiveRecord = await fileRef(archiveRecordPath);
  const pin = await fileRef(join(dirname(dirname(inspector)), 'build/local-uar-source.json'));
  for (const ref of originals) await verifyRef(ref);
  const descriptor = await writeNew(join(root, 'controls.json'), { schemaVersion: 1, kind: 'prepared-package-controls',
    config: await fileRef(args.get('--config')), root, validator: source, inspector: inspectorRef, pin,
    originals, archive, archiveRecord, validatorControls: controls, acceptanceExecuted: false });
  process.stdout.write(`${JSON.stringify({ preparedControls: controls.length, descriptor, acceptanceExecuted: false })}\n`);
}

async function git(context, cwd, args, captureRevision = false) {
  let revision;
  const run = await runFinite(context, { program: '/usr/bin/git', args: ['-c', 'core.hooksPath=/dev/null', ...args], cwd,
    env: { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_ATTR_NOSYSTEM: '1' } }, {
    observeLine(stream, line) { if (captureRevision && stream === 'stdout' && /^[a-f0-9]{40}$/.test(line)) revision = line; },
    result() { return { revisionObserved: revision !== undefined }; }
  });
  requireValue(run.result.exitCode === 0 && (!captureRevision || revision), 'archive_fixture_git_failed');
  return { ...run, revision };
}
async function inspect(context, inspector, sourceRoot) {
  let positive = false;
  let checksumRefused = false;
  const run = await runFinite(context, {
    program: context.config.runtimes.child.path,
    args: ['-e', 'require(process.argv[1]).inspectLocalUarRecord();process.stdout.write("INSPECTED\\n")', inspector],
    cwd: sourceRoot, env: { THE_BOSS_LOCAL_UAR_SOURCE_DIR: sourceRoot, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }
  }, {
    observeLine(stream, line) {
      if (stream === 'stdout' && line === 'INSPECTED') positive = true;
      if (stream === 'stderr' && line.includes('Local UAR archive checksum does not match its record')) checksumRefused = true;
    }, result() { return { inspectorReturned: positive, archiveChecksumRefused: checksumRefused }; }
  });
  return { ...run, positive, checksumRefused };
}

async function archiveCheck(args) {
  const context = await scenarioContext(args.get('--config'));
  const evidence = [];
  let cleanupConfirmed = true;
  let completed = 0;
  try {
    const descriptor = await readJson(args.get('--inputs'));
    requireValue(descriptor.kind === 'prepared-package-controls' && descriptor.acceptanceExecuted === false,
      'package_descriptor_invalid');
    for (const ref of [descriptor.inspector, descriptor.pin, descriptor.archive, descriptor.archiveRecord, ...descriptor.originals]) await verifyRef(ref);
    requireValue(context.component.sourcePaths.includes(descriptor.inspector.path), 'archive_inspector_not_bound');
    const recipe = await freshDirectory(context.root, 'archive-recipe');
    const sourceRoot = join(recipe, 'source');
    await mkdir(sourceRoot);
    await writeFile(join(sourceRoot, 'fixture.txt'), 'Disposable archive checksum control.\n', { flag: 'wx' });
    evidence.push((await git(context, sourceRoot, ['init', '--quiet'])).receipt);
    evidence.push((await git(context, sourceRoot, ['add', '--', 'fixture.txt'])).receipt);
    evidence.push((await git(context, sourceRoot, ['-c', 'user.name=BAUAR local fixture', '-c', 'user.email=fixture@invalid',
      'commit', '--quiet', '--no-gpg-sign', '-m', 'Archive inspection fixture'])).receipt);
    const head = await git(context, sourceRoot, ['rev-parse', 'HEAD'], true);
    evidence.push(head.receipt);
    const moduleRoot = join(recipe, 'inspector');
    await mkdir(join(moduleRoot, 'scripts'), { recursive: true });
    await mkdir(join(moduleRoot, 'build'));
    const copiedInspector = join(moduleRoot, 'scripts/local-uar-payload.cjs');
    await copyFile(descriptor.inspector.path, copiedInspector);
    requireValue(await hashFile(copiedInspector) === descriptor.inspector.sha256, 'inspector_copy_changed');
    const pin = await readJson(descriptor.pin.path);
    await writeNew(join(moduleRoot, 'build/local-uar-source.json'), { ...pin, revision: head.revision });
    const output = join(sourceRoot, 'dist/boss-sidecar');
    await mkdir(output, { recursive: true });
    const archivePath = join(output, basename(descriptor.archive.path));
    await copyFile(descriptor.archive.path, archivePath);
    const originalRecord = await readJson(descriptor.archiveRecord.path);
    requireValue(originalRecord.sha256 === descriptor.archive.sha256, 'original_archive_record_mismatch');
    await writeNew(join(output, basename(descriptor.archiveRecord.path)), { ...originalRecord, source: head.revision });
    // Healthy copied inspector executes first against the actual archive bytes.
    const healthy = await inspect(context, copiedInspector, sourceRoot);
    evidence.push(healthy.receipt);
    requireValue(healthy.result.exitCode === 0 && healthy.positive && !healthy.checksumRefused, 'archive_positive_failed', 1);
    completed++;
    const originalCopy = await fileRef(archivePath);
    const handle = await open(archivePath, 'r+');
    try { const bytes = Buffer.alloc(1); await handle.read(bytes, 0, 1, 0); bytes[0] ^= 1; await handle.write(bytes, 0, 1, 0); await handle.sync(); }
    finally { await handle.close(); }
    requireValue(await hashFile(archivePath) !== originalCopy.sha256, 'archive_corruption_not_applied');
    const corrupt = await inspect(context, copiedInspector, sourceRoot);
    evidence.push(corrupt.receipt);
    requireValue(corrupt.result.exitCode !== null && corrupt.result.exitCode !== 0 && corrupt.checksumRefused && !corrupt.positive,
      'archive_corruption_not_refused', 1);
    completed++;
    for (const ref of [descriptor.inspector, descriptor.pin, descriptor.archive, descriptor.archiveRecord, ...descriptor.originals]) await verifyRef(ref);
    evidence.push(await fileRef(args.get('--inputs')), descriptor.archive, descriptor.archiveRecord, descriptor.inspector,
      await fileRef(fileURLToPath(import.meta.url)));
    await finishScenario(context, 'PASS', { actualInspectorInvocations: 2, pristineArchiveAccepted: true,
      corruptedArchiveRefused: true, originalInputsUnchanged: true, copiedInspectorByteIdentical: true, cleanupConfirmed }, evidence, completed, 1);
  } catch (error) {
    const safe = safeError(error);
    cleanupConfirmed = safe.category !== 'scenario_child_cleanup_incomplete';
    await finishScenario(context, safe.exitCode === 1 ? 'FAIL' : 'BLOCKED',
      { completedControls: completed, cleanupConfirmed }, evidence, completed, 0);
    process.exitCode = safe.exitCode;
  }
}

try {
  const mode = process.argv[2];
  const args = argumentsMap(process.argv.slice(3));
  if (mode === '--prepare') await prepare(args);
  else if (mode === '--archive-check') await archiveCheck(args);
  else requireValue(false, 'package_mode_invalid');
} catch (error) {
  const safe = safeError(error);
  process.stdout.write(`${JSON.stringify({ status: safe.exitCode === 1 ? 'FAIL' : 'BLOCKED', category: safe.category })}\n`);
  process.exitCode = safe.exitCode;
}
