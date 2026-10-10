import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = '/Users/gqadonis/.claude/worktrees/bauar-uar';
const output = path.dirname(fileURLToPath(import.meta.url));
const metadataArgs = ['metadata', '--no-deps', '--format-version', '1', '--locked', '--no-default-features', '--features', 'server-full'];
const result = spawnSync('cargo', metadataArgs, {cwd: root, encoding: 'utf8', shell: false});
if (result.status !== 0) throw new Error('Cargo metadata failed');
const meta = JSON.parse(result.stdout);
const pkg = meta.packages.find(p => p.name === 'universal-agent-runtime');
const active = new Set();
function activate(feature) {
  if (active.has(feature)) return;
  active.add(feature);
  for (const next of pkg.features[feature] || []) {
    if (!next.startsWith('dep:') && !next.includes('/')) activate(next);
  }
}
activate('server-full');
const targets = pkg.targets.map(t => ({name: t.name, kind: t.kind, path: path.relative(root, t.src_path), requiredFeatures: t['required-features'] || [], test: t.test, doctest: t.doctest}));
const tests = targets.filter(t => t.kind.includes('test'));
const withdrawn = tests.filter(t => t.name === 'bauar_session_owner');
const featureGated = tests.filter(t => t.name !== 'bauar_session_owner' && t.requiredFeatures.some(f => !active.has(f)));
const selected = tests.filter(t => t.name !== 'bauar_session_owner' && t.requiredFeatures.every(f => active.has(f)));
const args = ['test', '--locked', '--no-default-features', '--features', 'server-full', '--lib', '--bins', ...selected.flatMap(t => ['--test', t.name])];
const capturedAt = new Date().toISOString();
function write(name, value) {
  const final = path.join(output, name);
  const temp = final + '.tmp';
  fs.writeFileSync(temp, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  fs.renameSync(temp, final);
}
write('cargo-target-inventory.json', {schemaVersion: 1, capturedAt, command: {executable: 'cargo', args: metadataArgs, cwd: root, exitCode: result.status}, defaultMembers: meta.workspace_default_members, targetDirectory: meta.target_directory, activeRootFeatures: [...active].sort(), targets, counts: {integrationTargets: tests.length, selected: selected.length, withdrawn: withdrawn.length, featureGated: featureGated.length}, exclusionAccess: 'Withdrawn target metadata only. Neither excluded source file was read, searched, hashed or executed.'});
write('candidate-invocation.json', {schemaVersion: 1, capturedAt, status: 'NOTRUN', cwd: root, executable: 'cargo', args, buildEnvironment: {CARGO_TARGET_DIR: meta.target_directory}, qualification: 'Target-selection candidate only; fixture prerequisites are unresolved. Do not run as-is.', withdrawnTargets: withdrawn.map(t => t.name), featureGatedTargets: featureGated.map(t => ({name: t.name, missingFeatures: t.requiredFeatures.filter(f => !active.has(f))})), omittedDefaultCoverage: ['example compilation', 'library doctests'], proposedAdditionalOmission: {target: 'uar_integration', test: 'test_verify_legacy_mcp_tools', applied: false, reason: 'Unguarded ambient dotenv load and configured tool invocation contradict accepted empty shipped defaults. Root must authorize a fixture correction or explicit omission.'}, noTestOrBuildLaunched: true, phaseCompletion: false});
write('legacy-fixture-source.txt', fs.readFileSync(path.join(root, 'tests/uar_integration.rs'), 'utf8').split('\n').slice(579, 633).map((line, i) => `${580 + i}: ${line}`).join('\n') + '\n');
write('result.json', {schemaVersion: 1, capturedAt, taskKeys: ['bauar-02-execution-authorization/8', 'bauar-04-resource-credential-lifecycle/10'], boundary: 'Completed selected production; outstanding repository regression requirement', status: 'NOTRUN', metadataStatus: 'PASS', testExitCode: null, testRuns: 0, buildRuns: 0, evidence: [{path: 'tests/uar_integration.rs', lines: '580-632', observation: 'Unguarded dotenv load, root mcp.json load, first configured tool call; empty configuration reaches expect requiring a tool.'}, {path: 'mcp.json', observation: 'Parsed current value is {mcpServers:{}}.'}, {path: '/Users/gqadonis/.env', observation: 'Existence only observed true; contents never inspected.'}, {path: 'tests/integration/live/harness.rs', lines: '343-375,559-561', observation: 'Startup removes shared temp uar-live-itest-* directories/files older than 300 seconds without checking creator PID liveness.'}, {path: 'src/config.rs', lines: '465-473', observation: 'ServiceOwnership default is External; missing ownership in live harness config is not itself managed-service takeover.'}], dotenvInventory: {tests: ['tests/uar_integration.rs:1,56,100,586,642'], otherAllowedSources: ['src/main.rs:23', 'src/bin/uar-sidecar.rs:147'], omittedFromSearch: ['tests/bauar_session_owner.rs', 'src/uar/mcp_server.rs'], gatedCallers: ['test_m2_run_lifecycle', 'test_m3_api_flow', 'test_m4_tool_execution', 'test_m6_skills_execution', 'test_verify_filesystem_skills'], ungatedCaller: 'test_verify_legacy_mcp_tools'}, requiredBeforeExecution: ['Root disposition for the legacy configured-MCP fixture: surgical correction or explicit named omission, never silently excluded.', 'Private test-process temporary directory, preventing the existing stale-scratch sweep from touching other invocations.', 'Reviewed allowlist environment, RUN_LLM_TESTS=0, fixture-only provider configuration; validate actual child-process dotenv behavior before launching real binaries.', 'Confirm single writer in existing target directory immediately before executing; no lock acquired because no build launched.', 'Finish safety assessment of remaining lib/integration paths; target inventory is not a complete isolation proof.'], retainedAcceptance: '../authorization-task7-acceptance.json; no acceptance replay', formatting: 'No formatting command/edit. Root records the operator phase-only waiver.', noProductChanges: true, noCanonicalChanges: true, noServiceLaunches: true, noForbiddenSourceAccess: true, qualification: 'No vulnerability conclusion, unqualified T2 pass, phase completion or release certification.'});
console.log(JSON.stringify({status: 'NOTRUN', counts: {all: tests.length, selected: selected.length, withdrawn: withdrawn.length, featureGated: featureGated.length}, output}));
