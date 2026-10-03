import { readFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  refuseUarActivation,
  uarBindingInstall,
  uarBindingPreflight,
  uarBindingStatus,
  uarCapabilities,
  uarPackageInstall,
  uarPackagePreflight,
  uarPackageStatus,
} from '../../../../skills/agent-team-creator/scripts/uar-client.mjs';
import { compileUarPackage } from '../../../../skills/agent-team-creator/scripts/uar-package.mjs';

const baseUrl = process.env.GATE_UAR_BASE_URL ?? 'http://127.0.0.1:1906';
const token = process.env.GATE_UAR_TOKEN ?? mintGateToken(process.env.GATE_UAR_JWT_SECRET);
process.env.GATE_UAR_TOKEN = token;

const connection = { baseUrl, credentialRef: 'env:GATE_UAR_TOKEN' };
const runId = process.env.GATE_RUN_ID ?? randomUUID();
const packageDirectory = fileURLToPath(
  new URL('../../../../.agent-team/two-agent/uar-package-1.0.0', import.meta.url),
);
const sourcePath = fileURLToPath(
  new URL('../../../../skills/agent-team-creator/assets/uar-package.json', import.meta.url),
);

const capabilities = await uarCapabilities({ connection });
const capabilityNames = new Set(capabilities.capabilities.map((item) => item.name ?? item));
if (!capabilities.bindingOwnerId) {
  throw new Error('collaboration capabilities did not return the authenticated binding owner ID');
}
for (const required of [
  'collaboration_definition_packages_v1',
  'collaboration_deployment_bindings_v1',
]) {
  if (!capabilityNames.has(required)) throw new Error(`missing capability ${required}`);
}

const packagePreflight = await uarPackagePreflight({
  connection,
  commandId: 'i1-gate-package-preflight-v1',
  packageDirectory,
});
const packageInstall = await uarPackageInstall({
  connection,
  commandId: 'i1-gate-package-install-v1',
  packageDirectory,
});
const packageStatus = await uarPackageStatus({
  connection,
  packageId: 'urn:example:two-agent/package',
  version: '1.0.0',
});

const installedManifest = packageStatus.response.manifest ?? packageStatus.response.package?.manifest;
if (!installedManifest?.contentDigest) throw new Error('installed package did not return its manifest digest');

const binding = {
  profile: 'urn:prometheus:uar:collaboration:0.1.0-draft.1',
  kind: 'DeploymentBinding',
  id: `urn:example:two-agent/binding/${runId}`,
  version: '1.0.0',
  provenance: {
    source: 'I1 creator-to-UAR integration gate',
    authors: ['Prometheus-AGS'],
  },
  requiredCapabilities: ['collaboration_deployment_bindings_v1'],
  extensions: {},
  exportClass: 'private-installed-state',
  package: {
    id: installedManifest.id,
    version: installedManifest.version,
    digest: installedManifest.contentDigest,
  },
  ownerId: capabilities.bindingOwnerId,
  workspaceId: 'gate-workspace',
  runtimeInstanceId: 'gate-uar',
  revision: 1,
  modelBindings: [{
    requestedAlias: 'team-default',
    providerId: 'gate-provider',
    modelId: 'gate-model',
    credentialRef: 'secret-store://gate/provider',
  }],
  skillBindings: [],
  storage: {
    backend: 'surrealdb-3.3.0',
    connectionRef: 'connection-store://gate/team-state',
    durableTransactions: true,
  },
  policyRevision: 'gate-policy-1',
  effectiveLimits: {
    concurrentTurns: 2,
    maxMembers: 2,
    maxDepth: 1,
    maxPendingTasks: 100,
  },
  effectiveBudget: {
    maxTokens: 100000,
    maxCostMicrounits: 5000000,
    currency: 'USD',
    maxElapsedSeconds: 3600,
  },
  contextGrants: [],
  representationGrantRefs: [],
  status: 'inactive',
};

const bindingPreflight = await uarBindingPreflight({
  connection,
  commandId: `i1-gate-binding-preflight-v1:${runId}`,
  binding,
});
const bindingInstall = await uarBindingInstall({
  connection,
  commandId: `i1-gate-binding-install-v1:${runId}`,
  binding,
});
const bindingStatus = await uarBindingStatus({
  connection,
  bindingId: binding.id,
  workspaceId: binding.workspaceId,
});

const source = JSON.parse(await readFile(sourcePath, 'utf8')).package;
source.manifest.requiredCapabilities.push('unsupported_gate_capability_v1');
source.manifest.capabilityDeclarations.push({
  capability: 'unsupported_gate_capability_v1',
  required: true,
});
const unsupported = compileUarPackage(source);
const unsupportedResponse = await fetch(`${baseUrl}/api/v1/collaboration/packages:preflight`, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    commandId: 'i1-gate-unsupported-capability-v1',
    manifest: unsupported.manifestUtf8,
    files: Object.fromEntries(unsupported.files.map((file) => [file.path, file.contentUtf8])),
  }),
});
const unsupportedBody = await unsupportedResponse.json();
const unsupportedDiagnostics = unsupportedBody.diagnostics ?? [];
if (
  unsupportedResponse.status !== 200
  || unsupportedBody.activationSupported !== false
  || !unsupportedDiagnostics.some((item) => (
    item.disposition === 'required-unsupported'
    && String(item.message).includes('unsupported_gate_capability_v1')
  ))
) {
  throw new Error(`unsupported capability was not refused by the activation contract: ${JSON.stringify(unsupportedBody)}`);
}

let activationRefusal;
try {
  refuseUarActivation();
  throw new Error('activation unexpectedly succeeded');
} catch (error) {
  activationRefusal = String(error.message ?? error);
  if (!activationRefusal.includes('not implemented in I1')) throw error;
}

process.stdout.write(`${JSON.stringify({
  surrealDb: '3.3.0',
  capabilities: [...capabilityNames].sort(),
  packagePreflight,
  packageInstall,
  packageStatus,
  bindingPreflight,
  bindingInstall,
  bindingStatus,
  unsupportedCapability: {
    status: unsupportedResponse.status,
    activationSupported: unsupportedBody.activationSupported,
    diagnostics: unsupportedDiagnostics,
  },
  activationRefusal,
}, null, 2)}\n`);

function mintGateToken(secret) {
  if (!secret) throw new Error('GATE_UAR_TOKEN or GATE_UAR_JWT_SECRET is required');
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: 'gate-owner',
    name: 'I1 Integration Gate',
    roles: ['operator'],
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}
