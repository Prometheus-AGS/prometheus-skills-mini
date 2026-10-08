// Final-boundary integration only. Run this file directly with Node 22+ so a
// missing prerequisite retains exit 2 (BLOCKED), rather than a runner skip.
// Required: LDD_MINI_ROOT, LDD_SCRATCH_ROOT, LDD_EVIDENCE_DIR and
// LDD_MINI_HISTORICAL_BASELINE, all explicit absolute paths, plus the recorded
// LDD_MINI_SOURCE_ID commit/tree or source-manifest SHA-256. No live homes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const required = name => {
  const value = process.env[name];
  if (!value || !path.isAbsolute(value)) throw Error(`${name} must be an explicit absolute path`);
  return fs.realpathSync(value);
};
let source, scratchParent, evidence, historical, sourceIdentity;
try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw Error('Node 22+ is required');
  if (process.platform === 'win32') throw Error('this executable-mode gate requires a POSIX filesystem; Windows remains a separate acceptance boundary');
  source = required('LDD_MINI_ROOT');
  scratchParent = required('LDD_SCRATCH_ROOT');
  evidence = required('LDD_EVIDENCE_DIR');
  historical = required('LDD_MINI_HISTORICAL_BASELINE');
  sourceIdentity = process.env.LDD_MINI_SOURCE_ID;
  if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(sourceIdentity ?? '')) throw Error('LDD_MINI_SOURCE_ID must identify recorded candidate source');
  assert.equal(source, fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')));
  assert.ok(fs.statSync(scratchParent).isDirectory());
  assert.ok(fs.statSync(evidence).isDirectory());
  assert.ok(fs.statSync(historical).isFile());
  if (!fs.existsSync(path.join(source, 'node_modules/@fission-ai/openspec/package.json'))) throw Error('locked mini npm ci prerequisite is missing');
  // Explicit scratch roots must not be either candidate or a native runtime home.
  if ([source, '/Users/gqadonis/.codex', '/Users/gqadonis/.claude', '/Users/gqadonis/.cortex', '/Users/gqadonis/.prometheus'].some(p => scratchParent === p || scratchParent.startsWith(`${p}${path.sep}`))) throw Error('scratch root is not isolated');
} catch (error) {
  process.stderr.write(`BLOCKED: mini integration prerequisite: ${error.message}\n`);
  process.exit(2);
}

const root = fs.mkdtempSync(path.join(scratchParent, 'mini-production-'));
process.once('exit', () => fs.rmSync(root, { recursive: true, force: true }));
const checkout = path.join(root, 'candidate copy with spaces #');
const home = path.join(root, 'home');
const codex = path.join(root, 'custom codex home');
for (const p of [home, codex, path.join(root, 'tmp'), path.join(root, 'learning')]) fs.mkdirSync(p, { recursive: true });
const env = {
  PATH: '/usr/bin:/bin', HOME: home, CODEX_HOME: codex,
  CLAUDE_CONFIG_DIR: path.join(home, '.claude'), CORTEX_DATA_DIR: path.join(root, 'cortex'),
  TMPDIR: path.join(root, 'tmp'), MINI_DOCTOR_HOME: home,
  PROMETHEUS_PLUGIN_ROOT: checkout, CLAUDE_PLUGIN_ROOT: checkout,
  PROMETHEUS_LEARNING_LOG: path.join(root, 'learning/log.jsonl'),
  PROMETHEUS_LEARNING_OUTBOX: path.join(root, 'learning/outbox'),
  PROMETHEUS_LEARNING_INDEX: path.join(root, 'learning/index'),
  PROMETHEUS_LEARNING_LOG_DIR: path.join(root, 'learning/log'),
  PROMETHEUS_LEARNING_STORE_ROOT: path.join(root, 'learning/store'),
  PYTHONDONTWRITEBYTECODE: '1',
};
const excluded = new Set(['.git', 'node_modules', 'target', '.scratch', '.kbd-orchestrator']);
fs.cpSync(source, checkout, { recursive: true, dereference: false,
  filter: p => !excluded.has(path.basename(p)) && !path.basename(p).startsWith('.mini-distribution-') });
const commands = [];
const results = new Map();
let sequence = 0;
function run(script, args = [], expected = 0, options = {}) {
  const startedAt = new Date().toISOString();
  const argv = [path.join(checkout, script), ...args];
  const result = spawnSync(process.execPath, argv, {
    cwd: options.cwd ?? checkout, env: { ...env, ...options.env }, shell: false,
    input: options.input ?? '', encoding: 'utf8', timeout: 60_000, maxBuffer: 32 * 1024 * 1024,
  });
  const prefix = path.join(evidence, `mini-${String(++sequence).padStart(3, '0')}`);
  fs.writeFileSync(`${prefix}.stdout`, result.stdout ?? '');
  fs.writeFileSync(`${prefix}.stderr`, result.stderr ?? '');
  commands.push({ executable: process.execPath, argv, cwd: options.cwd ?? checkout,
    startedAt, endedAt: new Date().toISOString(), exitCode: result.status, signal: result.signal,
    stdout: `${prefix}.stdout`, stderr: `${prefix}.stderr` });
  assert.ifError(result.error);
  assert.equal(result.status, expected, `${script}: ${result.stderr}\n${result.stdout}`);
  return result;
}
function request(command, input, expected = 0, packagePath = 'dist/plugins/codex/prometheus-skills-mini') {
  const file = path.join(root, `request-${randomUUID()}.json`);
  fs.writeFileSync(file, JSON.stringify(input));
  const result = run(`${packagePath}/skills/agent-team-creator/scripts/cli.mjs`, [command, '--input', file], expected);
  return JSON.parse(expected === 0 ? result.stdout : result.stderr);
}
function snapshot(directory) {
  const entries = [];
  function visit(p, rel = '') {
    const stat = fs.lstatSync(p);
    assert.equal(stat.isSymbolicLink(), false, `unexpected generated link: ${p}`);
    entries.push({ path: rel, kind: stat.isDirectory() ? 'directory' : 'file', mode: stat.mode & 0o7777,
      sha256: stat.isFile() ? hash(fs.readFileSync(p)) : null });
    if (stat.isDirectory()) for (const name of fs.readdirSync(p).sort()) visit(path.join(p, name), path.posix.join(rel, name));
  }
  visit(directory);
  return entries;
}
const contract = JSON.parse(fs.readFileSync(path.join(checkout, 'skill-system.json')));
const owned = ['claudePackage', 'codexPackage', 'claudeMarketplace', 'codexMarketplace'].map(k => contract.outputs[k]);
const generatedSnapshot = () => Object.fromEntries(owned.map(p => [p, snapshot(path.join(checkout, p))]));
const team = id => ({ schemaVersion: 1, id, outcome: 'Exercise the packaged project adoption contract', scope: 'project', harness: 'codex',
  roles: [{ id: 'implementer', description: 'Own implementation', prompt: 'Read the project instructions and preserve evidence.',
    skills: [], owns: ['src/**'], inputs: ['Requirements'], outputs: ['Source'], dependsOn: [] }] });
async function closedPort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
  const port = listener.address().port;
  assert.notEqual(port, 23001);
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}
const historicMapping = new Map([
  ['--check exits non-zero and names the stale output once a packaged file is tampered with', 'distribution'],
  ['--check mode (check: true) reports no drift against output it just wrote and writes nothing new', 'distribution'],
  ['--check mode detects drift when the packaged output differs from a fresh build', 'distribution'],
  ['generateDistribution writes both plugin packages with the skill payload and manifests', 'distribution'],
  ['marketplace.json files carry a single self-referencing plugin entry with the release version', 'distribution'],
  ['running the generator against a clean fixture, then --check, exits 0 with no drift reported', 'distribution'],
  ['the Claude manifest has no hooks field and points skills/mcpServers at relative paths', 'distribution'],
  ['the Codex manifest carries an interface block and no hooks field', 'distribution'],
  ['a hooks.json referencing a file that does not exist fails the build rather than shipping a broken hook', 'source-rejection'],
  ['an .mcp.json containing a literal Tavily API key fails the build', 'source-rejection'],
  ['an .mcp.json containing the source root as a literal path fails the build', 'source-rejection'],
  ['the CLI runs through the current node executable with no shell', 'openspec'],
  ['the CLI runs with an emptied PATH, proving no global install is used', 'openspec'],
  ['the default spawner runs the local OpenSpec through its JavaScript entry, with no PATH', 'openspec'],
  ['the pinned OpenSpec CLI runs from its JavaScript entry without a global install', 'openspec'],
  ['validation passes on this repository and reports the totals', 'openspec'],
]);
const superseded = new Map([
  ['hooks.json and every file it references are copied into the Claude package only', 'The current contract ships real hook closure in both Claude and Codex packages; distribution asserts both. The old Claude-only assertion is retired.'],
  ['the OpenSpec CLI is pinned to an exact version and is the only dependency', 'Root bootstrap OpenSpec is exact, while the supported product also has a separate locked team runtime and an explicit managed CLI selection policy; a whole-product sole-dependency assertion is retired.'],
]);

test('mini packaged production boundaries for the frozen candidate', async t => {
  t.after(() => {
    const oldBytes = fs.readFileSync(historical);
    const lines = oldBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
    const baseline = { schemaVersion: 1, status: [...results.values()].every(r => r === 'pass') && results.size === 7 ? 'pass' : 'fail',
      sourceRoot: source, sourceIdentity, releaseVersion: contract.releaseVersion, nodeVersion: process.version, scratchRoot: root,
      authoredContractSha256: hash(fs.readFileSync(path.join(source, 'skill-system.json'))),
      historical: { path: historical, sha256: hash(oldBytes), observedNames: lines.length,
        reportedLegacyFailureCount: 11, discrepancy: '19 names versus 11 reported failures; individual legacy receipts remain unavailable',
        items: lines.map(name => ({ name, acceptance: historicMapping.get(name) ?? null,
          disposition: superseded.has(name) ? 'superseded-legacy-assertion' : historicMapping.has(name) && results.get(historicMapping.get(name)) === 'pass' ? 'mapped-current-production-pass' : 'unverified',
          reason: superseded.get(name) ?? (historicMapping.has(name) ? 'Current real generator/package reproduction; not retroactive legacy acceptance.' : 'The change-scoped internal detector assertion has no equivalent public CLI selector. Public backend detection is covered; the exact legacy assertion remains unverified.') })) },
      acceptance: Object.fromEntries(results), commands,
      limitations: ['No live Claude/Codex native invocation or inference was performed.', 'Mini doctor all-checks is excluded because its service probes use fixed live endpoints.',
        'Custom CODEX_HOME is preserved; mini native copies intentionally target .agents/.claude, not the full pack generation lifecycle.'] };
    fs.writeFileSync(path.join(evidence, 'mini-production-baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`);
    fs.rmSync(root, { recursive: true, force: true });
  });
  async function scenario(id, title, body) {
    results.set(id, 'fail');
    await t.test(title, async () => { await body(); results.set(id, 'pass'); });
  }
  await scenario('distribution', 'real generator is idempotent and detects byte/executable drift in packaged files', () => {
    run('scripts/generate-skill-system-distribution.mjs');
    const first = generatedSnapshot();
    run('scripts/generate-skill-system-distribution.mjs');
    assert.deepEqual(generatedSnapshot(), first);
    run('scripts/generate-skill-system-distribution.mjs', ['--check']);
    assert.deepEqual(generatedSnapshot(), first, '--check wrote into the owned outputs');
    for (const platform of ['claude', 'codex']) {
      const packageRoot = path.join(checkout, contract.outputs[`${platform}Package`]);
      const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, `.${platform}-plugin/plugin.json`)));
      assert.equal(manifest.version, contract.releaseVersion);
      assert.equal(Object.hasOwn(manifest, 'hooks'), false);
      if (platform === 'codex') assert.ok(manifest.interface);
      assert.equal(manifest.skills, './skills');
      assert.equal(manifest.mcpServers, './.mcp.json');
      const hooks = fs.readFileSync(path.join(packageRoot, 'hooks/hooks.json'), 'utf8');
      for (const match of hooks.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\s]+)/g)) {
        const target = path.resolve(packageRoot, match[1]);
        assert.ok(target.startsWith(`${packageRoot}${path.sep}`));
        assert.ok(fs.statSync(target).isFile(), `packaged hook target missing: ${match[1]}`);
      }
      const cli = path.join(packageRoot, 'skills/agent-team-creator/scripts/cli.mjs');
      const sourceMode = fs.statSync(path.join(checkout, 'skills/agent-team-creator/scripts/cli.mjs')).mode & 0o111;
      assert.notEqual(sourceMode, 0, 'the approved executable source lost its intent');
      assert.equal(fs.statSync(cli).mode & 0o111, sourceMode);
      fs.accessSync(cli, fs.constants.X_OK);
      run(path.relative(checkout, cli), ['--help']);
    }
    for (const platform of ['claude', 'codex']) {
      const marketplace = JSON.parse(fs.readFileSync(path.join(checkout, contract.outputs[`${platform}Marketplace`])));
      assert.equal(marketplace.plugins.length, 1);
      assert.equal(marketplace.plugins[0].version, contract.releaseVersion);
      const pluginSource = marketplace.plugins[0].source;
      const relative = typeof pluginSource === 'string' ? pluginSource : pluginSource.path;
      assert.equal(path.resolve(checkout, relative), path.join(checkout, contract.outputs[`${platform}Package`]));
    }
    const target = path.join(checkout, contract.outputs.codexPackage, 'skills/agent-team-creator/scripts/cli.mjs');
    const original = fs.readFileSync(target), mode = fs.statSync(target).mode & 0o777;
    try {
      fs.chmodSync(target, mode & ~0o111);
      assert.match(run('scripts/generate-skill-system-distribution.mjs', ['--check'], 1).stderr, /stale/i);
      fs.chmodSync(target, mode);
      fs.appendFileSync(target, '\n// integration negative control\n');
      assert.match(run('scripts/generate-skill-system-distribution.mjs', ['--check'], 1).stderr, /stale/i);
    } finally { fs.writeFileSync(target, original); fs.chmodSync(target, mode); }
    run('scripts/generate-skill-system-distribution.mjs', ['--check']);
  });
  await scenario('source-rejection', 'actual generator refuses missing hook closure and unsafe MCP payloads without replacing outputs', () => {
    const before = generatedSnapshot();
    const hooks = path.join(checkout, 'hooks/hooks.json');
    const hooksBytes = fs.readFileSync(hooks);
    const mcp = path.join(checkout, '.mcp.json');
    const mcpBytes = fs.existsSync(mcp) ? fs.readFileSync(mcp) : null;
    try {
      const text = hooksBytes.toString('utf8');
      assert.ok(text.includes('${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.mjs'));
      fs.writeFileSync(hooks, text.replaceAll('${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.mjs', '${CLAUDE_PLUGIN_ROOT}/missing-integration-target.mjs'));
      assert.match(run('scripts/generate-skill-system-distribution.mjs', [], 1).stderr, /missing file/);
      assert.deepEqual(generatedSnapshot(), before);
      fs.writeFileSync(hooks, hooksBytes);
      // Deliberately synthetic sentinel: this is not a credential or provider.
      fs.writeFileSync(mcp, JSON.stringify({ mcpServers: {}, integrationSentinel: 'tvly-abcdefghijklmnopqrstuvwx' }));
      assert.match(run('scripts/generate-skill-system-distribution.mjs', [], 1).stderr, /literal Tavily credential/);
      assert.deepEqual(generatedSnapshot(), before);
      fs.writeFileSync(mcp, JSON.stringify({ mcpServers: {}, integrationSentinel: checkout }));
      assert.match(run('scripts/generate-skill-system-distribution.mjs', [], 1).stderr, /machine-specific absolute path/);
      assert.deepEqual(generatedSnapshot(), before);
    } finally {
      fs.writeFileSync(hooks, hooksBytes);
      if (mcpBytes === null) fs.rmSync(mcp, { force: true }); else fs.writeFileSync(mcp, mcpBytes);
    }
    run('scripts/generate-skill-system-distribution.mjs', ['--check']);
  });
  await scenario('openspec', 'actual managed OpenSpec JavaScript process runs from locked scratch cache with no global PATH', () => {
    const manifestFile = path.join(source, 'node_modules/@fission-ai/openspec/package.json');
    assert.ok(fs.existsSync(manifestFile), 'BLOCKED: locked mini npm ci prerequisite is missing');
    const installed = JSON.parse(fs.readFileSync(manifestFile));
    const declared = JSON.parse(fs.readFileSync(path.join(checkout, 'package.json')));
    assert.equal(installed.version, declared.devDependencies['@fission-ai/openspec']);
    const cache = path.join(root, 'managed-openspec');
    const prefix = path.join(cache, 'versions', installed.version);
    fs.mkdirSync(prefix, { recursive: true });
    fs.cpSync(path.join(source, 'node_modules'), path.join(prefix, 'node_modules'), { recursive: true, dereference: false });
    // Operator preprovisioning records actual copied locked package bytes, not
    // an invented CLI response, upstream refresh or npm installation receipt.
    fs.writeFileSync(path.join(prefix, 'installed.json'), JSON.stringify({ version: installed.version, provenance: 'copied actual locked candidate npm-ci package for scratch operator preprovisioning' }));
    fs.writeFileSync(path.join(cache, 'selected.json'), JSON.stringify({ version: installed.version }));
    const operatorEnv = { PATH: '', PROMETHEUS_OPENSPEC_HOME: cache, PROMETHEUS_OPENSPEC_VERSION: installed.version,
      OPENSPEC_NO_UPDATE_CHECK: '1', DO_NOT_TRACK: '1', OPEN_SPEC_INTERACTIVE: '0' };
    const entry = 'lib/platform/openspec/cli.mjs';
    assert.equal(run(entry, ['run', '--project', checkout, '--', '--version'], 0, { env: operatorEnv }).stdout.trim(), installed.version);
    const project = path.join(root, 'openspec-backend-project'); fs.mkdirSync(path.join(project, 'openspec'), { recursive: true });
    assert.equal(run('scripts/kbd-apply.mjs', ['detect'], 0, { cwd: project, env: operatorEnv }).stdout.trim(), 'openspec');
    assert.equal(run('scripts/kbd-apply.mjs', ['detect'], 0, { cwd: project, env: { ...operatorEnv, PROMETHEUS_OPENSPEC_DISABLE: '1' } }).stdout.trim(), '');
    const validated = run('scripts/spec-validate.mjs', [], 0, { env: operatorEnv });
    assert.match(validated.stdout, /Totals:\s*\d+ passed, 0 failed \(\d+ items\)/);
  });
  await scenario('installer', 'actual skill-copy installer preserves edited/unrelated files and refuses full-pack coexistence', () => {
    const installed = run('scripts/doctor.mjs', ['--fix', 'copy-skills']);
    assert.equal(JSON.parse(installed.stdout).status, 'fixed');
    const managed = path.join(home, '.claude/skills/agent-team-creator');
    assert.ok(fs.statSync(path.join(managed, 'SKILL.md')).isFile());
    assert.equal(fs.lstatSync(managed).isSymbolicLink(), false);
    assert.ok(fs.statSync(path.join(managed, '.prometheus-mini-managed.json')).isFile());
    const edited = path.join(managed, 'SKILL.md');
    fs.writeFileSync(edited, 'operator-edited skill\n');
    const unrelated = path.join(home, '.claude/skills/operator-owned/SKILL.md');
    fs.mkdirSync(path.dirname(unrelated), { recursive: true }); fs.writeFileSync(unrelated, 'unrelated\n');
    run('scripts/doctor.mjs', ['--fix', 'copy-skills']);
    assert.equal(fs.readFileSync(edited, 'utf8'), 'operator-edited skill\n');
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'unrelated\n');
    const overlap = path.join(home, '.claude/skills/kbd-process-orchestrator');
    const marker = path.join(overlap, '.prometheus-mini-managed.json');
    const markerBytes = fs.readFileSync(marker);
    try {
      for (const invalid of ['{ malformed', JSON.stringify({ owner: 'prometheus-mini', files: { 'SKILL.md': '0'.repeat(64) } })]) {
        fs.writeFileSync(marker, invalid);
        const unchanged = snapshot(home);
        assert.equal(JSON.parse(run('scripts/doctor.mjs', ['--fix', 'copy-skills'], 1).stdout).status, 'refused');
        assert.deepEqual(snapshot(home), unchanged, 'ambiguous shared-skill ownership allowed writes');
      }
      fs.rmSync(marker);
      const unchanged = snapshot(home);
      assert.equal(JSON.parse(run('scripts/doctor.mjs', ['--fix', 'copy-skills'], 1).stdout).status, 'refused');
      assert.deepEqual(snapshot(home), unchanged, 'unreceipted full/shared marker allowed writes');
    } finally { fs.writeFileSync(marker, markerBytes); }
    const state = path.join(home, '.prometheus/setup-state.json');
    fs.mkdirSync(path.dirname(state), { recursive: true }); fs.writeFileSync(state, '{}\n');
    const before = snapshot(home);
    assert.equal(JSON.parse(run('scripts/doctor.mjs', ['--fix', 'copy-skills'], 1).stdout).status, 'refused');
    assert.deepEqual(snapshot(home), before);
  });
  await scenario('custom-home', 'actual command install/uninstall uses explicit scratch output and retains unrelated commands', () => {
    const output = path.join(codex, 'selected commands');
    fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, 'operator.md'), 'operator command\n');
    run('scripts/generate-commands.mjs', ['--output', output]);
    assert.ok(fs.statSync(path.join(output, 'agent-team-creator.md')).isFile());
    assert.match(fs.readFileSync(path.join(output, 'agent-team-creator.md'), 'utf8'), /\$ARGUMENTS/);
    assert.equal(fs.existsSync(path.join(home, '.claude/commands')), false);
    run('scripts/generate-commands.mjs', ['--output', output, '--uninstall']);
    assert.equal(fs.existsSync(path.join(output, 'agent-team-creator.md')), false);
    assert.equal(fs.readFileSync(path.join(output, 'operator.md'), 'utf8'), 'operator command\n');
  });
  await scenario('team-model', 'packaged team adoption preserves selection/config and explicit model uncertainty', () => {
    const project = path.join(root, 'project with spaces'); fs.mkdirSync(project);
    fs.mkdirSync(path.join(project, '.codex')); fs.writeFileSync(path.join(project, '.codex/config.toml'), 'model = "operator-model"\n');
    fs.writeFileSync(path.join(project, 'AGENTS.md'), 'Operator instructions\r\n');
    const alpha = team('alpha'), beta = team('beta');
    const before = snapshot(project);
    const dry = request('install-project', { project, team: alpha, dryRun: true });
    assert.equal(dry.dryRun, true); assert.deepEqual(snapshot(project), before);
    assert.equal(request('install-project', { project, team: alpha }).activeTeam, 'alpha');
    fs.mkdirSync(path.join(project, '.agent-team/beta'), { recursive: true });
    fs.writeFileSync(path.join(project, '.agent-team/beta/team.json'), JSON.stringify(beta));
    assert.equal(request('install-project', { project }).activeTeam, 'alpha');
    assert.equal(fs.readFileSync(path.join(project, '.codex/config.toml'), 'utf8'), 'model = "operator-model"\n');
    assert.equal(request('install-project', { project, check: true }).clean, true);
    assert.match(fs.readFileSync(path.join(project, 'AGENTS.md'), 'utf8'), /^Operator instructions\r\n/);
    const routing = path.join(project, '.agent-team/project-routing.json');
    const saved = fs.readFileSync(routing); fs.rmSync(routing);
    assert.match(request('install-project', { project }, 1).error, /Multiple teams/); fs.writeFileSync(routing, saved);
    const configured = { ...alpha, modelPolicy: { model: 'gpt-6.1-sol' } };
    const catalog = { availableModels: ['gpt-6.1-sol'] };
    const selected = request('models-select', { team: configured, roleId: 'implementer', catalog });
    assert.equal(selected.selected.id, 'gpt-6.1-sol');
    assert.ok(selected.warnings.some(w => /operator-declared/.test(w)));
    const priced = request('models-select', { team: configured, roleId: 'implementer', catalog, taskPolicy: { maxInputPerMillion: 1 } });
    assert.equal(priced.selected, null); assert.ok(priced.rejected[0].reasons.includes('price unknown; cannot satisfy ceiling'));
  });
  await scenario('absent-service', 'packaged hooks and model/memory CLI degrade with no optional services', async () => {
    const project = path.join(root, 'no-team-project'); fs.mkdirSync(project);
    const packagePath = 'dist/plugins/claude/prometheus-skills-mini';
    const hook = run(`${packagePath}/scripts/hook-entry.mjs`, ['--hook', 'subagentstart-learning', '--harness', 'claude-code'], 0,
      { cwd: project, input: JSON.stringify({ cwd: project, agent_id: 'unbound-role' }) });
    assert.equal(hook.stdout, '');
    const port = await closedPort();
    assert.match(request('models-discover', { kind: 'openai', baseUrl: `http://127.0.0.1:${port}`, timeoutMs: 500 }, 1).error, /unavailable|failed|transport|network/i);
    const state = path.join(root, 'team-state.json');
    request('init', { state, team: team('offline') });
    const projectId = `mini-offline-${randomUUID()}`;
    fs.mkdirSync(path.join(project, '.prometheus'));
    fs.writeFileSync(path.join(project, '.prometheus/project.json'), JSON.stringify({ schemaVersion: 1, projectId }));
    const queued = request('memory-queue', { state, project, expectedRevision: 0, entry: { content: 'An explicit durable scope.', scope: 'team:offline', provenance: { evidence: ['scratch-only'] } } });
    assert.equal(queued.outbox[0].projectId, projectId);
    const id = queued.outbox[0].id;
    const publication = request('memory-publish', { state, project, expectedRevision: queued.revision, publication: { id } });
    assert.equal(publication.publication.status, 'queued');
    assert.equal(publication.publication.receipt.uncertain, false);
    const restarted = request('status', { state });
    assert.equal(restarted.outbox[0].projectId, projectId);
    assert.equal(restarted.outbox[0].status, 'queued');
    assert.equal(restarted.outbox[0].receipt.reason, 'no memory endpoint configured');
  });
});
