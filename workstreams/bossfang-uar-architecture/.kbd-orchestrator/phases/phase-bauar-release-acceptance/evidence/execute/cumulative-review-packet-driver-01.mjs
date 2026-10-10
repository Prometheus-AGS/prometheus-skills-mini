import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, lstat, realpath, mkdir, open } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, isAbsolute, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Preparation only. Parent invokes after coherent production and full integration PASS.
// No judge dispatch, endpoint discovery, formatter, gate, lifecycle or broad Git query.
const evidence = dirname(fileURLToPath(import.meta.url));
const phaseRoot = dirname(dirname(evidence));
const LIMIT = 40000;
const CHUNK = 36000;
const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const check = (value, category) => { if (!value) throw new Error(category); };
function eligible(path) {
  check(typeof path === 'string' && isAbsolute(path) && normalize(path) === path, 'invalid_finite_path');
  check(!/(?:^|[/\\])(?:bauar_session_owner\.rs|mcp_server\.rs)(?:$|[/\\])/.test(path), 'excluded_f6_path');
  return path;
}
function publicTextPath(path) {
  eligible(path);
  check(!/(?:^|[/\\])(?:private|node_modules|dist|target|\.git)(?:$|[/\\])/.test(path), 'private_or_binary_path');
  check(!/(?:^|[/\\])(?:\.env(?:\..*)?|credentials(?:\..*)?|chat(?:\..*)?|.*\.log)$/.test(path), 'sensitive_record_path');
  return path;
}
async function ref(path) {
  eligible(path);
  const stat = await lstat(path);
  check(stat.isFile() && !stat.isSymbolicLink() && await realpath(path) === path, 'regular_input_required');
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return { path, sha256: hash.digest('hex') };
}
async function verify(value) {
  check(value && /^[a-f0-9]{64}$/.test(value.sha256), 'explicit_digest_required');
  check((await ref(value.path)).sha256 === value.sha256, 'input_hash_changed');
}
const json = async path => JSON.parse(await readFile(eligible(path), 'utf8'));
function split(text) {
  // Public allowlisted source may include synthetic auth fixtures. Preserve it intact;
  // actual private runtime configuration, canaries and logs are never read for packets.
  const result = [];
  let part = '', bytes = 0, offset = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character);
    if (bytes + size > CHUNK) { result.push({ text: part, offset, bytes }); offset += bytes; part = ''; bytes = 0; }
    part += character; bytes += size;
  }
  if (part) result.push({ text: part, offset, bytes });
  check(result.reduce((sum, item) => sum + item.bytes, 0) === Buffer.byteLength(text), 'partition_incomplete');
  return result;
}
function bounded(packet) {
  for (const value of Object.values(packet)) {
    const bytes = Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
    check(bytes <= LIMIT, 'packet_field_exceeds_cap');
  }
  check(packet.truncation?.any_truncated === false, 'packet_truncated');
  return packet;
}
async function immutable(path, value) {
  eligible(path);
  check(await realpath(dirname(path)) === dirname(path), 'output_parent_redirected');
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`); await handle.sync(); }
  finally { await handle.close(); }
  return ref(path);
}
async function main() {
  const requestRef = { path: arg('--inputs'), sha256: arg('--inputs-sha256') };
  await verify(requestRef);
  const request = await json(requestRef.path);
  check(request.schemaVersion === 1 && request.phase === 'phase-bauar-release-acceptance', 'request_invalid');
  const inputs = [request.reviewScope, request.additions, request.config, request.integration,
    request.runtimeSeal, request.packetBuilder, request.judgeClient, request.gitProgram, ...request.contexts];
  for (const value of inputs) eligible(value.path);
  for (const value of inputs) await verify(value);
  const scope = await json(request.reviewScope.path), additions = await json(request.additions.path);
  const config = await json(request.config.path), integration = await json(request.integration.path);
  const seal = await json(request.runtimeSeal.path);
  check(integration.kind === 'aggregate' && integration.stage === 'integration' && integration.status === 'PASS'
    && integration.components.length === config.components.length
    && integration.configSha256 === request.config.sha256
    && integration.runtimeSealSha256 === request.runtimeSeal.sha256
    && integration.executionKey === config.executionKey, 'full_integration_pass_required');
  check(additions.candidateConfig.sha256 === request.config.sha256
    && seal.configSha256 === request.config.sha256 && seal.sourceSha256 === integration.sourceSha256,
  'release_binding_changed');
  check(Object.values(integration.observations).every(value => typeof value === 'boolean'
    || Number.isSafeInteger(value) && value >= 0), 'evidence_summary_not_sanitized');
  check(Object.values(integration.dispositions).every(value =>
    ['PASS', 'FAIL', 'BLOCKED', 'OUT_OF_SCOPE', 'CANCELLED', 'WAIVED'].includes(value)),
  'evidence_dispositions_not_sanitized');
  const regressionArgs = config.components.find(component => component.id === 'uar-regression').command.args;
  const regressionTargets = regressionArgs.flatMap((value, index) => value === '--test' ? [regressionArgs[index + 1]] : []);
  check(regressionTargets.length === 5 && regressionTargets.every(value => /^[A-Za-z0-9_]+$/.test(value)),
    'selected_regression_contract_changed');
  check(scope.repositories.reduce((sum, repo) => sum + repo.paths.length, 0) === 241
    && scope.limitations.inheritedCommits === 279, 'inherited_scope_changed');
  check(request.contexts.some(value => value.role === 'spec')
    && request.contexts.some(value => value.role === 'constraint')
    && request.contexts.some(value => value.role === 'boundary'), 'required_context_missing');
  const repositories = [...scope.repositories, request.phaseRepository];
  for (const repo of repositories) {
    eligible(repo.root);
    check(/^[a-f0-9]{40}$/.test(repo.base), 'literal_base_required');
  }
  const current = new Map([...config.sourceFiles, ...config.gateFiles, ...config.manifests,
    config.profile, config.approvedPlan, config.commandContract, ...seal.scenarioSources].map(value => [value.path, value]));
  const sources = [...scope.repositories.flatMap(repo => repo.paths), ...scope.additions,
    ...scope.futureScenarioSources.map(value => current.get(value.path)), ...additions.recordedScenarioSources,
    ...additions.recordedPreparationSources, ...(additions.recordedHarnessSources ?? []),
    ...(additions.recordedDesktopSources ?? [])];
  check(sources.every(Boolean), 'declared_source_unbound');
  const candidates = [...new Map(sources.map(value => [value.path, current.get(value.path) ?? value])).values()];
  // Complete enumeration and F6 rejection before any source read/hash/Git operation.
  for (const value of candidates) eligible(value.path);
  for (const value of request.contexts) publicTextPath(value.path);
  const withheld = [], selected = [];
  for (const value of candidates) {
    if (/(?:^|[/\\])private(?:$|[/\\])/.test(value.path)) withheld.push({ ...value,
      status: 'private-artifact-ref-only', contentIncluded: false });
    else { publicTextPath(value.path); selected.push(value); }
  }
  for (const value of selected) await verify(value);
  const contexts = [];
  for (const value of request.contexts) {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(value.path));
    for (const [index, chunk] of split(text).entries()) contexts.push({ ...value, index,
      offset: chunk.offset, bytes: chunk.bytes, text: chunk.text });
  }
  const { buildDiffPacket } = await import(pathToFileURL(request.packetBuilder.path));
  const git = (repo, args) => {
    const result = spawnSync(request.gitProgram.path, ['--no-pager', '--literal-pathspecs', '-C', repo.root, ...args],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8',
        GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' } });
    check(!result.error && result.signal === null, 'git_output_incomplete');
    return result;
  };
  for (const repo of repositories) check(git(repo, ['rev-parse', '--verify', `${repo.base}^{commit}`]).status === 0,
    'literal_base_unavailable');
  const summary = { integration: request.integration, config: request.config, runtimeSeal: request.runtimeSeal,
    status: integration.status, componentCount: integration.components.length,
    selectedRegressionTargets: regressionTargets, harnessCaseRequirement: 18,
    observations: integration.observations, dispositions: integration.dispositions,
    limitations: scope.limitations, pairedBoundaries: scope.pairedBoundaries };
  const packets = [], coverage = [];
  for (const value of selected) {
    const matches = repositories.filter(repo => value.path.startsWith(`${repo.root}/`));
    check(matches.length === 1, 'repository_scope_ambiguous');
    const repo = matches[0], file = relative(repo.root, value.path);
    const owners = request.responsibilities.filter(owner => owner.prefixes.some(prefix => value.path.startsWith(prefix)));
    check(owners.length === 1, 'responsibility_scope_ambiguous');
    const tracked = git(repo, ['ls-files', '--error-unmatch', '--', file]);
    check([0, 1].includes(tracked.status), 'tracking_state_unavailable');
    const diff = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=3', repo.base, '--', file]);
    check(diff.status === 0, 'literal_diff_unavailable');
    let text = diff.stdout;
    if (tracked.status === 1) {
      const body = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(value.path));
      text += `\nUNTRACKED COMPLETE CONTENT ${file}\n${body}`;
    }
    check(!/Binary files .* differ/.test(text), 'binary_diff_requires_disposition');
    const chunks = split(text), ids = [];
    for (const [index, chunk] of chunks.entries()) {
      const id = `${repo.name}-${owners[0].id}-${packets.length + 1}`;
      const packet = buildDiffPacket({ phase: request.phase, target: id, files: [file],
        reviewExcludePath: '.kbd-orchestrator/review', changeFiles: {}, producer: request.producer,
        fileTree: value.path, constraints: 'Literal source comparison and complete context fragments follow. No baseline certification is inferred.',
        git: () => ({ status: 0, stdout: chunk.text }), capBytes: LIMIT });
      packet.source_comparison = { repo: repo.name, responsibility: owners[0].id, base: repo.base,
        file, sourceSha256: value.sha256, chunkIndex: index, chunkCount: chunks.length,
        byteOffset: chunk.offset, bytes: chunk.bytes, totalBytes: Buffer.byteLength(text),
        fullDiffSha256: createHash('sha256').update(text).digest('hex'), tracked: tracked.status === 0 };
      packet.evidence_summary = summary;
      packet.review_focus = 'Verify the selected 18-case harness fixture contract and five Cargo targets against actual static contracts and bound runtime evidence. F6 stays excluded. Scope is unsigned local darwin-arm64; restart reports unknown/unsupported and requires reconciliation; application configuration owns MCP credentials. Explicit supervisor fixtures do not certify a direct native transport. Retain the 279 inherited commits and uncertified baseline limitation. No signing, installed operation, remote identity-provider/custody, release or shipping certification is inferred.';
      packet.boundary_contract_refs = request.contexts.filter(context => context.role === 'boundary')
        .map(({ path, sha256 }) => ({ path, sha256 }));
      for (const [contextIndex, context] of contexts.entries()) {
        packet[`context_${String(contextIndex + 1).padStart(3, '0')}`] =
          `${context.role}: ${context.path}\nSHA256 ${context.sha256}\nPart ${context.index + 1}; byte offset ${context.offset}\n${context.text}`;
      }
      bounded(packet); packets.push({ id, packet }); ids.push(id);
    }
    coverage.push({ path: value.path, sha256: value.sha256, repo: repo.name, responsibility: owners[0].id,
      status: chunks.length ? 'complete-literal-diff-or-untracked-content' : 'unchanged-from-literal-base',
      diffBytes: Buffer.byteLength(text), packetIds: ids, complete: true });
  }
  for (const value of inputs) await verify(value);
  for (const value of selected) await verify(value);
  const output = eligible(request.outputDirectory);
  check(output.startsWith(`${evidence}/`) && !output.includes('/private/'), 'output_scope_changed');
  await mkdir(output, { mode: 0o700 });
  check(await realpath(output) === output, 'output_parent_redirected');
  const packetRefs = [];
  for (const [index, value] of packets.entries()) packetRefs.push({ id: value.id,
    ...await immutable(join(output, `packet-${String(index + 1).padStart(4, '0')}.json`), value.packet) });
  const manifest = { schemaVersion: 1, kind: 'finite-cumulative-review-packets', recordedAt: new Date().toISOString(),
    request: requestRef, inputs, sourceCount: selected.length, inheritedAllowlistCount: 241,
    packetCount: packets.length, packetRefs, coverage, withheld,
    completeEnumeratedSourceCoverage: coverage.length === selected.length && coverage.every(value => value.complete),
    contextCoverage: contexts.map(({ text, ...value }) => value), capBytesPerField: LIMIT,
    truncationOccurred: false, baselineLimitations: scope.limitations,
    reviewDispatched: false, reviewExecuted: false, modelIndependenceVerified: false,
    formattingExecuted: false, acceptanceExecuted: false, excludedF6Accessed: false };
  const manifestRef = await immutable(join(output, 'packet-manifest.json'), manifest);
  console.log(JSON.stringify({ status: 'assembled-review-not-dispatched', manifest: manifestRef,
    packetCount: packets.length, sourceCount: selected.length, withheldPrivateArtifacts: withheld.length }));
}
await main().catch(error => { console.log(JSON.stringify({ status: 'packet-assembly-incomplete',
  category: error.code === 'EEXIST' ? 'immutable_output_exists' : /^[a-z_]+$/.test(error.message)
    ? error.message : 'unavailable_input', reviewDispatched: false })); process.exitCode = 2; });
