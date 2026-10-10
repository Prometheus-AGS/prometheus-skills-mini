import { mkdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runOwned } from '../lib/processes.mjs';
import { privateEnvironment } from '../lib/environment.mjs';
import { readJson, requireValue, writeNew, within, hashFile } from '../lib/records.mjs';
import { writeReceipt } from '../lib/receipts.mjs';

export function argumentsMap(args) {
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    requireValue(args[i]?.startsWith('--') && args[i + 1] && !values.has(args[i]), 'scenario_arguments_invalid');
    values.set(args[i], args[i + 1]);
  }
  return values;
}
export async function scenarioContext(configPath) {
  const config = await readJson(configPath);
  const binding = await readJson(process.env.BAUAR_COMPONENT_BINDING_PATH);
  const root = process.env.BAUAR_PRIVATE_ROOT;
  requireValue(within(config.privateRoot, root) && await realpath(root) === root, 'scenario_root_not_private');
  const component = config.components.find(item => item.id === binding.componentId);
  requireValue(component, 'scenario_component_missing');
  return { config, component, binding, root, receiptPath: process.env.BAUAR_COMPONENT_RECEIPT_PATH };
}
export async function runFinite(context, command, policy, budgetMs = 30000) {
  const root = join(context.root, `owned-${randomUUID()}`);
  const environmentConfig = { ...context.config, privateRoot: context.root };
  const component = { environmentClass: 'runtime-private', fixtureEnvKeys: [],
    environment: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', LANG: 'en_US.UTF-8' } };
  const { env } = await privateEnvironment(environmentConfig, component, root,
    join(root, 'unused-binding.json'), join(root, 'unused-component.json'));
  const result = await runOwned({ ...command, env: { ...env, ...command.env }, budgetMs,
    outputPolicy: { ...policy, onStarted: ({ pid, startedAt }) => writeNew(join(root, 'owned-process.json'),
      { schemaVersion: 1, pid, startedAt, processGroupId: pid }) } });
  const receipt = await writeNew(join(root, 'process.json'), { schemaVersion: 1, kind: 'scenario-process', result });
  requireValue(result.category === 'completed' && result.cleanup.groupAbsent && !result.cleanup.unknownDescendants,
    'scenario_child_cleanup_incomplete');
  return { result, receipt, root };
}
export async function finishScenario(context, status, observations, evidence, executedCount, negativeCount) {
  const scenarios = context.config.scenarios.filter(item => item.componentId === context.component.id).map(item => ({
    id: item.id, ownerTaskKey: item.ownerTaskKey, status, observations, executedCount,
    negativeControl: { status: status === 'PASS' ? 'PASS' : 'BLOCKED', executedCount: negativeCount }, evidence
  }));
  await writeReceipt(context.receiptPath, { schemaVersion: 1, kind: 'component', binding: context.binding,
    status, scenarios, cleanup: { descendantsReconciled: observations.cleanupConfirmed === true,
      ownedResourcesRemaining: observations.cleanupConfirmed === true ? 0 : 1,
      ledger: [{ kind: 'process', state: observations.cleanupConfirmed === true ? 'closed' : 'retained', owned: true },
        { kind: 'directory', state: 'retained', owned: true }] } });
}
export async function freshDirectory(root, prefix) {
  const path = join(root, `${prefix}-${randomUUID()}`);
  await mkdir(path, { mode: 0o700 });
  requireValue(await realpath(path) === path, 'scenario_directory_redirected');
  return path;
}
export async function fileRef(path) { return { path, sha256: await hashFile(path) }; }
