import { readFile, mkdir, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eligiblePath, regularFile, readJson, verifyRef, writeNew, requireValue, safeError, digest, within, hashFile }
  from '../../acceptance/lib/records.mjs';
import { dispatchJudge, JudgeUnavailableError }
  from '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/lib/review/judge-client.mjs';
import { extractJsonFromCompletion, normalizeFindings }
  from '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/lib/review/judge-findings.mjs';
import { parseModelsToml, resolveRoleAssignment }
  from '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini/lib/review/model-resolution.mjs';

// Dormant preparation. Root releases only after actual full integration and artifact QA PASS.
const phase = 'phase-bauar-release-acceptance';
const phaseRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const primary = '/Users/gqadonis/Projects/prometheus/prometheus-skills-mini';
const gateway = 'http://localhost:4000/v1';
const modelsPath = '/Users/gqadonis/.prometheus/kbd/models.toml';
const proxyPath = '/Users/gqadonis/.config/liter-llm/liter-llm-proxy.toml';
const secretsPath = '/Users/gqadonis/.prometheus/kbd/secrets.env';
const mandatePath = join(primary, 'skills/adversarial-review/assets/reviewer-mandate-diff.md');
const exactModules = ['judge-client.mjs', 'judge-findings.mjs', 'model-resolution.mjs']
  .map(name => join(primary, 'lib/review', name));
const hashes = ['configSha256', 'sourceSha256', 'packageSha256', 'profileSha256', 'runtimeSealSha256'];
const selectedIdentity = { providerId: 'minimax', providerConnectionId: 'minimax-direct', modelId: 'MiniMax-M3' };
function publicPath(path) {
  eligiblePath(path);
  requireValue(!/(?:^|[/\\])(?:private|\.env(?:\..*)?|secrets\.env)(?:$|[/\\])/.test(path),
    'private_or_secret_body_not_selected');
  return path;
}
async function record(ref) { publicPath(ref.path); await verifyRef(ref); return readJson(ref.path); }
function assertBinding(actual, expected, category) {
  requireValue(actual.executionKey === expected.executionKey
    && hashes.every(key => actual[key] === expected[key]), category);
}
function usableText(text) { return typeof text === 'string' && text.trim().length > 0 && text.length <= 16000; }
function strictOutput(value) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value)
    && Array.isArray(value.findings) && value.findings.length <= 100, 'reviewer_output_invalid');
  for (const finding of value.findings) {
    requireValue(finding && typeof finding === 'object' && !Array.isArray(finding)
      && ['CRITICAL', 'WARNING', 'SUGGESTION'].includes(String(finding.severity).toUpperCase())
      && usableText(finding.claim) && usableText(finding.evidence), 'reviewer_output_invalid');
    if (finding.file !== undefined) requireValue(usableText(finding.file), 'reviewer_output_invalid');
    if (finding.line !== undefined) requireValue(Number.isSafeInteger(finding.line) && finding.line >= 0,
      'reviewer_output_invalid');
    if (finding.suggested_fix !== undefined) requireValue(usableText(finding.suggested_fix), 'reviewer_output_invalid');
  }
  requireValue(value.checked_classes === undefined || Array.isArray(value.checked_classes)
    && value.checked_classes.length <= 100 && value.checked_classes.every(usableText), 'reviewer_output_invalid');
  requireValue(value.findings.length > 0 || value.checked_classes?.length > 0, 'zero_findings_due_diligence_missing');
  return value;
}
async function credential() {
  if (typeof process.env.LITER_LLM_MASTER_KEY === 'string' && process.env.LITER_LLM_MASTER_KEY.trim())
    return { value: process.env.LITER_LLM_MASTER_KEY, source: 'existing-process-environment' };
  // Node-only adaptation of documented shell sourcing: literal assignments only, last wins.
  // Never execute shell expansion/substitution or persist the file, its digest, or any key.
  let text;
  try { await regularFile(secretsPath); text = await readFile(secretsPath, 'utf8'); }
  catch { return null; }
  let value;
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*(?:export\s+)?LITER_LLM_MASTER_KEY\s*=/.test(line)) continue;
    const match = /^\s*(?:export\s+)?LITER_LLM_MASTER_KEY\s*=\s*(?:"([^"$\x60\\]*)"|'([^']*)'|([A-Za-z0-9_.:/+=-]+))\s*(?:#.*)?$/.exec(line);
    if (!match) return null;
    value = match[1] ?? match[2] ?? match[3];
  }
  return value?.trim() ? { value, source: 'documented-secrets-env-literal-last-wins' } : null;
}
function transportCategory(statuses) {
  if (statuses.some(status => status === 401 || status === 403)) return 'gateway_authorization_rejected';
  if (statuses.some(status => status === 429)) return 'gateway_rate_limited';
  if (statuses.some(status => status >= 400)) return 'configured_route_rejected_or_unavailable';
  return 'configured_gateway_unavailable';
}
async function main() {
  const args = process.argv.slice(2);
  requireValue(args.length === 5 && args[0] === '--run' && args[1] === '--inputs' && args[3] === '--inputs-sha256',
    'explicit_root_invocation_and_request_required');
  const requestRef = { path: publicPath(args[2]), sha256: args[4] };
  const request = await record(requestRef);
  requireValue(request.schemaVersion === 1 && request.phase === phase && request.kind === 'fresh-rest-review-request'
    && request.gateway === gateway && [1, 2, 3].includes(request.concurrency)
    && Array.isArray(request.modules), 'review_request_invalid');
  const inputs = [requestRef, request.dispatcher, request.records, request.config, request.runtimeSeal,
    request.integration, request.artifactQa, request.packetManifest, request.mandate, request.models,
    request.proxyConfiguration, ...request.modules];
  // Enumerate finite public refs before their file reads; private runtime bodies and F6 are never selected.
  for (const ref of inputs) publicPath(ref.path);
  requireValue(request.modules.length === exactModules.length
    && exactModules.every(path => request.modules.filter(ref => ref.path === path).length === 1)
    && request.mandate.path === mandatePath && request.models.path === modelsPath
    && request.proxyConfiguration.path === proxyPath
    && request.dispatcher.path === fileURLToPath(import.meta.url)
    && request.records.path === join(phaseRoot, 'acceptance/lib/records.mjs'), 'review_source_contract_changed');
  for (const ref of inputs) await verifyRef(ref);
  const config = await record(request.config), seal = await record(request.runtimeSeal);
  const integration = await record(request.integration), qa = await record(request.artifactQa);
  const manifest = await record(request.packetManifest);
  requireValue(config.schemaVersion === 1 && config.phase === phase && config.components.length === 8
    && config.scenarios.length === 14 && config.runtimeSealPath === request.runtimeSeal.path,
    'selected_local_acceptance_contract_changed');
  requireValue(integration.kind === 'aggregate' && integration.stage === 'integration'
    && integration.status === 'PASS' && integration.components.length === 8
    && integration.observations.requiredComponents === 8 && integration.observations.observedComponents === 8
    && integration.observations.passedComponents === 8 && integration.observations.observedScenarios === 14
    && integration.executionKey === config.executionKey && integration.configSha256 === request.config.sha256
    && integration.runtimeSealSha256 === request.runtimeSeal.sha256, 'full_integration_pass_required');
  requireValue(seal.configSha256 === request.config.sha256 && seal.sourceSha256 === integration.sourceSha256,
    'runtime_binding_changed');
  requireValue(qa.schemaVersion === 1 && qa.kind === 'standalone-produced-artifact-qa'
    && qa.phase === phase && qa.status === 'PASS' && qa.executedCount > 0
    && qa.executedCount === qa.checks.length && qa.checks.every(check => check.status === 'PASS')
    && qa.observations.mandatoryComponents === 8 && qa.observations.requiredScenarioRows === 14,
    'actual_artifact_qa_pass_required');
  assertBinding(qa, integration, 'artifact_qa_binding_changed');
  requireValue([request.config, request.runtimeSeal, request.integration].every(ref =>
    qa.inputs.some(input => input.path === ref.path && input.sha256 === ref.sha256)), 'qa_provenance_missing');
  requireValue(manifest.schemaVersion === 1 && manifest.kind === 'finite-cumulative-review-packets'
    && manifest.completeEnumeratedSourceCoverage === true && manifest.truncationOccurred === false
    && manifest.capBytesPerField === 40000 && manifest.excludedF6Accessed === false
    && manifest.packetCount > 0 && manifest.packetCount <= 1024
    && manifest.packetCount === manifest.packetRefs.length
    && new Set(manifest.packetRefs.map(ref => ref.id)).size === manifest.packetCount,
    'complete_packet_manifest_required');
  requireValue([request.config, request.runtimeSeal, request.integration].every(ref =>
    manifest.inputs.some(input => input.path === ref.path && input.sha256 === ref.sha256)), 'packet_provenance_missing');
  const packetIds = new Set(manifest.packetRefs.map(ref => ref.id));
  requireValue(manifest.coverage.length === manifest.sourceCount
    && manifest.coverage.every(row => row.complete === true && row.packetIds.every(id => packetIds.has(id)))
    && manifest.packetRefs.every(ref => manifest.coverage.some(row => row.packetIds.includes(ref.id))),
    'packet_source_coverage_incomplete');
  for (const ref of manifest.packetRefs) {
    publicPath(ref.path); requireValue(within(dirname(request.packetManifest.path), ref.path), 'packet_scope_changed');
  }
  const packets = [];
  for (const ref of manifest.packetRefs) {
    const packet = await record(ref);
    requireValue(packet.mode === 'diff' && packet.phase === phase && packet.target === ref.id
      && packet.truncation?.any_truncated === false && !packet.producer_identity,
      'packet_contract_or_unknown_producer_changed');
    requireValue(packet.evidence_summary?.config?.sha256 === request.config.sha256
      && packet.evidence_summary?.runtimeSeal?.sha256 === request.runtimeSeal.sha256
      && packet.evidence_summary?.integration?.sha256 === request.integration.sha256,
      'packet_release_binding_changed');
    for (const field of Object.values(packet)) requireValue(
      Buffer.byteLength(typeof field === 'string' ? field : JSON.stringify(field)) <= 40000, 'packet_truncated_or_oversize');
    packets.push({ ref, raw: await readFile(ref.path, 'utf8') });
  }
  const models = parseModelsToml(await readFile(modelsPath, 'utf8'));
  const assignment = resolveRoleAssignment('critic', { env: {}, modelsToml: models });
  requireValue(assignment.source === 'models.toml' && assignment.alias === 'MiniMax-M3'
    && digest(assignment.identity) === digest(selectedIdentity) && models.gateway.candidates[0] === gateway,
    'configured_critic_or_gateway_changed');
  // Inspect route identity only in memory. Never emit gateway configuration/credential values.
  const proxy = await readFile(proxyPath, 'utf8');
  const routes = proxy.split(/(?=^\[\[models\]\])/m).filter(block => /^name\s*=\s*"MiniMax-M3"\s*$/m.test(block));
  requireValue(routes.length === 1 && /^provider_model\s*=\s*"MiniMax-M3"\s*$/m.test(routes[0])
    && /^base_url\s*=\s*"https:\/\/api\.minimax\.io\/v1"\s*$/m.test(routes[0]), 'configured_critic_route_changed');
  const mandate = await readFile(mandatePath, 'utf8');
  requireValue(mandate.length > 0, 'review_mandate_unavailable');
  const output = publicPath(request.outputDirectory);
  requireValue(within(join(phaseRoot, 'evidence', 'execute'), output), 'review_output_outside_phase');
  await mkdir(output, { mode: 0o700 });
  requireValue(await realpath(output) === output, 'review_output_redirected');
  const auth = await credential();
  const startedAt = new Date().toISOString(), results = new Array(packets.length);
  let next = 0;
  async function worker() {
    while (next < packets.length) {
      const index = next++, packet = packets[index], statuses = [];
      let attempts = 0;
      let result;
      if (!auth) result = { status: 'UNAVAILABLE', category: 'gateway_credential_unavailable', requestAttempts: 0 };
      else try {
        const completion = await dispatchJudge({ baseUrl: gateway, authToken: auth.value,
          model: assignment.alias, system: mandate, packet: packet.raw,
          fetchImpl: async (...args) => {
            attempts++; const response = await fetch(...args); statuses.push(response.status); return response;
          } });
        const extracted = strictOutput(extractJsonFromCompletion(completion));
        const normalized = normalizeFindings(extracted, { mode: 'diff', judgeModel: assignment.alias,
          judgeIdentity: assignment.identity, producer: 'unknown', producerIdentity: null, endpoint: gateway });
        requireValue(normalized.findings.length === extracted.findings.length
          && normalized.cross_model_check === 'unverified-producer-unknown', 'reviewer_normalization_changed');
        requireValue(!JSON.stringify(normalized).includes(auth.value), 'reviewer_output_credential_echo');
        const findings = await writeNew(join(output, 'findings-' + String(index + 1).padStart(4, '0') + '.json'), normalized);
        result = { status: 'NORMALIZED', category: 'awaiting_sycophancy_and_independence_disposition',
          findings, verdict: normalized.verdict, findingCount: normalized.findings.length,
          checkedClassCount: normalized.checked_classes?.length ?? 0, requestAttempts: attempts };
      } catch (error) {
        const safe = safeError(error);
        result = { status: error instanceof JudgeUnavailableError ? 'UNAVAILABLE' : 'REJECTED',
          category: error instanceof JudgeUnavailableError ? transportCategory(statuses) : safe.category,
          requestAttempts: attempts };
      }
      results[index] = { packet: packet.ref, ...result, httpStatuses: statuses };
      // Per-packet immutable result survives an interruption; never retain raw completion/HTTP error.
      await writeNew(join(output, 'result-' + String(index + 1).padStart(4, '0') + '.json'), {
        schemaVersion: 1, kind: 'fresh-rest-packet-result', request: requestRef, ...results[index],
        cross_model_check: 'unverified-producer-unknown', reviewerIdentity: selectedIdentity,
        freshContext: 'mandate-and-one-packet-only', screened: false });
    }
  }
  await Promise.all(Array.from({ length: request.concurrency }, () => worker()));
  for (const ref of inputs) await verifyRef(ref);
  for (const packet of packets) await verifyRef(packet.ref);
  const complete = results.every(result => result.status === 'NORMALIZED');
  const critical = results.some(result => result.verdict === 'BLOCK');
  const resultRefs = [];
  for (let i = 0; i < results.length; i++) {
    const path = join(output, 'result-' + String(i + 1).padStart(4, '0') + '.json');
    resultRefs.push({ path, sha256: await hashFile(path) });
  }
  const report = { schemaVersion: 1, kind: 'fresh-rest-review-dispatch', phase, startedAt,
    endedAt: new Date().toISOString(), request: requestRef, inputs, ...Object.fromEntries(
      ['executionKey', ...hashes].map(key => [key, integration[key]])),
    status: complete ? 'DISPATCH_COMPLETE_UNADJUDICATED' : 'DISPATCH_INCOMPLETE',
    selectedRole: 'critic', reviewerIdentity: selectedIdentity, reviewerModel: assignment.alias,
    producerIdentity: null, observedProducerModels: ['gpt-6-astra', 'gpt-6.1-sol'],
    cross_model_check: 'unverified-producer-unknown', independenceVerified: false,
    isolationMode: 'rest-gateway:' + gateway, context: 'mandate-and-one-packet-only',
    credentialSource: auth?.source ?? 'unavailable', packetCount: packets.length,
    normalizedPackets: results.filter(result => result.status === 'NORMALIZED').length,
    rejectedPackets: results.filter(result => result.status === 'REJECTED').length,
    unavailablePackets: results.filter(result => result.status === 'UNAVAILABLE').length,
    criticalFindingsObserved: critical, packetResults: resultRefs, packetCoverage: results,
    sycophancyScreened: false, operatorIndependenceDisposition: null, reviewGatePassed: false,
    limitations: ['Configured different-family critic; original producer connection identity remains unknown.',
      'Gateway route is source-configured, not a runtime self-identification proof of provider.',
      'Only complete public packets reviewed; private runtime bodies and F6 excluded.',
      'Supervisor fixture transport, unsigned local target and restart reconciliation limits remain.',
      'Root must screen normalized findings and resolve independence before final review adjudication.'] };
  const reportRef = await writeNew(join(output, 'dispatch-coverage.json'), report);
  console.log(JSON.stringify({ status: report.status, report: reportRef, packetCount: packets.length,
    normalizedPackets: report.normalizedPackets, criticalFindingsObserved: critical,
    cross_model_check: report.cross_model_check, reviewGatePassed: false }));
  return complete ? 0 : 2;
}
try { process.exitCode = await main(); }
catch (error) { console.log(JSON.stringify({ status: 'DISPATCH_INCOMPLETE', ...safeError(error),
  reviewGatePassed: false })); process.exitCode = 2; }

