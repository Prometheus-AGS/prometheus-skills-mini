import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readJson, writeNew, hashFile, digest, requireValue, verifyRef } from '../lib/records.mjs';
import { readReceipt } from '../lib/receipts.mjs';
import { freshDirectory, runFinite, fileRef } from './scenario-common.mjs';

const entryPath = fileURLToPath(new URL('../local-release-acceptance.mjs', import.meta.url));
const childPath = fileURLToPath(new URL('./evidence-controls.mjs', import.meta.url));

export async function fixture(context, mode) {
  const root = await freshDirectory(context.root, 'coordinator-control');
  const acceptance = join(root, 'acceptance');
  const outputRoot = join(root, 'evidence');
  await mkdir(acceptance); await mkdir(outputRoot);
  const config = structuredClone(context.config);
  const originalSeal = await readJson(config.runtimeSealPath);
  const marker = join(root, 'actual-effects.jsonl');
  const command = { program: config.runtimes.coordinator.path,
    args: [childPath, '--fixture-child', mode, '--marker', marker], cwd: root };
  config.executionKey = `e02-${randomUUID()}`;
  config.outputRoot = outputRoot; config.privateRoot = join(root, 'private');
  config.runtimeSealPath = join(outputRoot, 'seal.json');
  config.components = [{ id: 'fixture', ownerTaskKey: context.component.ownerTaskKey,
    scenarioIds: ['E02.fixture'], sourcePaths: [childPath,
      fileURLToPath(new URL('./evidence-fixtures.mjs', import.meta.url)),
      fileURLToPath(new URL('./scenario-common.mjs', import.meta.url))], packagePaths: [], command,
    environment: { PATH: `${dirname(config.runtimes.child.path)}:/usr/bin:/bin:/usr/sbin:/sbin`, LANG: 'en_US.UTF-8' },
    environmentClass: 'runtime-private', fixtureEnvKeys: [], budgetMs: mode === 'interrupted' ? 1000 : 10000,
    adapter: { kind: 'component' } }];
  config.scenarios = [{ id: 'E02.fixture', ownerTaskKey: context.component.ownerTaskKey, componentId: 'fixture', negativeRequired: false }];
  config.finalization = { formatReceiptPath: join(root, 'format-unavailable.json'), reviewReceiptPath: join(root, 'review-unavailable.json') };
  const path = join(acceptance, 'candidate-inputs.json');
  if (mode === 'missing-input') config.manifests[0] = { ...config.manifests[0], path: join(root, 'missing.json') };
  if (mode === 'changed-input') {
    const original = config.manifests[0];
    const copy = join(root, 'changed-manifest.json');
    await writeFile(copy, await readFile(original.path), { flag: 'wx' });
    requireValue(await hashFile(copy) === original.sha256, 'control_copy_mismatch');
    await writeFile(copy, '\n', { flag: 'a' });
    config.manifests[0] = { ...original, path: copy };
  }
  await writeNew(path, config);
  const seal = { ...originalSeal, executionKey: config.executionKey, configSha256: await hashFile(path),
    commands: [{ componentId: 'fixture', ...command, programSha256: config.runtimes.coordinator.sha256 }] };
  // The real completed production declaration/build/readiness evidence is reused
  // read-only. Deliberately bad inputs must fail before any child is admitted.
  await writeNew(config.runtimeSealPath, seal);
  return { root, path, config, marker };
}

export async function invoke(context, control, stage = 'integration') {
  let output;
  let records = 0;
  const run = await runFinite(context, { program: context.config.runtimes.coordinator.path,
    args: [entryPath, '--config', control.path, '--stage', stage], cwd: control.root }, {
    observeLine(stream, line) {
      if (stream !== 'stdout' || !line.startsWith('{')) return;
      let value; try { value = JSON.parse(line); } catch { return; }
      if (value.schemaVersion === 1 && [0, 1, 2].includes(value.exitCode)) { output = value; records++; }
    }, result() { return { coordinatorRecords: records, coordinatorExitObserved: output !== undefined }; }
  }, 45000);
  requireValue(records === 1 && output.exitCode === run.result.exitCode, 'coordinator_output_missing');
  const evidence = [run.receipt, await fileRef(control.path), await fileRef(control.config.runtimeSealPath)];
  if (output.receipt) { await verifyRef(output.receipt); evidence.push({ path: output.receipt.path, sha256: output.receipt.sha256 }); }
  return { ...run, output, evidence };
}
export async function effects(control) {
  try {
    const text = await readFile(control.marker, 'utf8');
    return text.split('\n').filter(Boolean).length;
  } catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
}
export async function execution(control) {
  const root = join(control.config.outputRoot, `execution-${digest(control.config.executionKey).slice(0, 24)}`,
    `component-${digest('fixture').slice(0, 24)}`);
  const attempts = await readdir(root, { withFileTypes: true });
  requireValue(attempts.length === 1 && attempts[0].isDirectory(), 'fixture_execution_count_invalid');
  const path = join(root, attempts[0].name, 'execution.json');
  return { record: await readReceipt(path), ref: await fileRef(path) };
}
