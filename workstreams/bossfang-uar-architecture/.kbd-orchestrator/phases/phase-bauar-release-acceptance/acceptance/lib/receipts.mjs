import { fileURLToPath } from 'node:url';
import { digest, readJson, validate, requireValue, verifyRef, writeNew, hashFile } from './records.mjs';

const schemaPath = fileURLToPath(new URL('../receipt.schema.json', import.meta.url));
export async function writeReceipt(path, value) {
  validate(value, await readJson(schemaPath));
  return writeNew(path, value);
}
export async function readReceipt(path) {
  return validate(await readJson(path), await readJson(schemaPath));
}
export function compatibleBinding(actual, expected) {
  // Config/seal metadata may change for another component; exact scope hashes cannot.
  return ['executionKey', 'componentId', 'bindingSha256', 'sourceSha256', 'packageSha256', 'profileSha256', 'scenarioSha256']
    .every(key => actual[key] === expected[key]);
}
export async function readComponent(path, expectedBinding, inventory) {
  const receipt = await readReceipt(path);
  requireValue(receipt.kind === 'component' && compatibleBinding(receipt.binding, expectedBinding), 'component_binding_mismatch');
  inventory ??= receipt.scenarios.map(item => ({ id: item.id, ownerTaskKey: item.ownerTaskKey, negativeRequired: false }));
  requireValue(receipt.scenarios.length === inventory.length && new Set(receipt.scenarios.map(item => item.id)).size === inventory.length,
    'component_inventory_mismatch');
  for (const expected of inventory) {
    const scenario = receipt.scenarios.find(item => item.id === expected.id);
    requireValue(scenario && scenario.ownerTaskKey === expected.ownerTaskKey, 'scenario_identity_mismatch');
    if (scenario.status === 'PASS') {
      requireValue(scenario.executedCount > 0 && Object.keys(scenario.observations).length > 0
        && Object.values(scenario.observations).some(value => value === true || typeof value === 'number' && value > 0),
        'scenario_has_no_actual_observation');
      if (expected.negativeRequired) requireValue(scenario.negativeControl.status === 'PASS'
        && scenario.negativeControl.executedCount > 0, 'paired_negative_missing');
    }
    for (const ref of scenario.evidence) await verifyRef(ref);
  }
  if (receipt.status === 'PASS') requireValue(receipt.scenarios.every(item => item.status === 'PASS')
    && receipt.cleanup.descendantsReconciled && receipt.cleanup.ownedResourcesRemaining === 0, 'component_pass_incomplete');
  return receipt;
}
export async function receiptRef(path) { return { path, sha256: await hashFile(path) }; }
export function statusExit(status) { return status === 'PASS' ? 0 : status === 'FAIL' ? 1 : 2; }
export function aggregateStatus(records) {
  if (records.some(record => record.status === 'FAIL')) return 'FAIL';
  if (records.some(record => record.status !== 'PASS')) return 'BLOCKED';
  return 'PASS';
}
export async function reviewStatus(config, path, kind) {
  const record = await readReceipt(path);
  requireValue(record.kind === kind && record.executionKey === config.executionKey
    && record.sourceSha256 === config.bindings.sourceSha256 && record.packageSha256 === config.bindings.packageSha256
    && record.profileSha256 === config.bindings.profileSha256, 'review_binding_mismatch');
  if (record.status === 'FAIL') return { status: 'FAIL', disposition: 'FAIL' };
  if (record.status === 'PASS') {
    requireValue(record.executedCount > 0 && Object.values(record.observations).some(value => value === true || value > 0), 'review_not_executed');
    if (kind === 'format' || record.independenceVerified === true && record.producerIdentity && record.reviewerIdentity
      && record.producerIdentity !== record.reviewerIdentity && ![record.producerIdentity, record.reviewerIdentity].includes('unknown')) {
      return { status: 'PASS', disposition: 'PASS' };
    }
  }
  if (kind === 'review' && record.operatorDisposition) {
    requireValue(record.executedCount > 0 && record.observations.completedProductReview === true,
      'review_not_executed');
    await verifyRef(record.operatorDisposition);
    const disposition = await readJson(record.operatorDisposition.path);
    requireValue(disposition.schemaVersion === 1 && disposition.executionKey === config.executionKey
      && disposition.sourceSha256 === config.bindings.sourceSha256 && disposition.reviewIndependenceWaived === true
      && disposition.operatorApproved === true && disposition.phase === config.phase, 'review_waiver_invalid');
    return { status: 'PASS', disposition: 'WAIVED' };
  }
  return { status: 'BLOCKED', disposition: 'BLOCKED' };
}
