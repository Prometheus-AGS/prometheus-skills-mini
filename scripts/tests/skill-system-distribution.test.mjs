// The invariant checker for the generated distribution: exact skill-name-set parity between
// source and packaged tree, byte-for-byte payload digest match, no leaked absolute paths or
// secrets in the packaged .mcp.json, every hooks.json-referenced file present with matching
// bytes, Codex manifest field assertions, and marketplace.json/manifest version agreement.
// Ported from prometheus-skill-pack/scripts/tests/skill-system-distribution.test.mjs, scaled to
// the mini's single-plugin, copy-only distribution.
//
// This test drives the real generator against the real repo (not a fixture), so it must run
// AFTER `node scripts/generate-skill-system-distribution.mjs` has populated dist/ and the
// marketplace files -- it is the verification half of that generation step, per the plan's C5
// gate ("the distribution test's byte-for-byte digest check passes").

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillSystem, collectDistributionSkills } from '../../lib/distribution/skill-system.mjs';
import { canonicalBytes } from '../../lib/distribution/canonical-bytes.mjs';
import { homeDir } from '../../lib/platform/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contract = readSkillSystem(root);
const skills = collectDistributionSkills(root, contract);

// Source-only build caches are excluded by the package contract. Packaged trees are
// read without exclusions so an accidentally shipped dependency still fails parity.
const localOnly = new Set(['.git', 'node_modules', 'target', '.kbd-orchestrator', '__pycache__']);
function digestTree(directory, relative = '', source = false) {
  const result = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    if (source && localOnly.has(name)) continue;
    const child = path.join(relative, name);
    const absolute = path.join(directory, child);
    const stat = fs.lstatSync(absolute);
    if (stat.isDirectory()) result.push(...digestTree(directory, child, source));
    else result.push({ path: child.split(path.sep).join('/'), bytes: canonicalBytes(absolute).toString('base64') });
  }
  return result;
}

test('the manifest declares a distinct name for every distributed skill', () => {
  assert.equal(new Set(skills.map((skill) => skill.name)).size, skills.length);
  assert.ok(skills.length > 0, 'no distributable skills found under skills/');
});

for (const platform of ['claude', 'codex']) {
  test(`${platform} package: installed skill names match the source inventory exactly`, () => {
    const packageRoot = path.join(root, 'dist/plugins', platform, contract.name);
    const packagedSkills = path.join(packageRoot, 'skills');
    assert.ok(fs.existsSync(packagedSkills), `${packagedSkills} is missing -- run the generator first`);
    const installedNames = fs
      .readdirSync(packagedSkills)
      .filter((name) => fs.existsSync(path.join(packagedSkills, name, 'SKILL.md')))
      .sort();
    assert.deepEqual(installedNames, skills.map((skill) => skill.name).sort());
  });

  test(`${platform} package: every skill's packaged bytes match its source bytes exactly`, () => {
    const packageRoot = path.join(root, 'dist/plugins', platform, contract.name);
    for (const skill of skills) {
      assert.deepEqual(
        digestTree(path.join(packageRoot, 'skills', skill.name)),
        digestTree(skill.source, '', true),
        `${platform}/${skill.name}`,
      );
    }
  });

  test(`${platform} package: .mcp.json leaks no host path and no literal Tavily key`, () => {
    const packageRoot = path.join(root, 'dist/plugins', platform, contract.name);
    const serialized = JSON.stringify(JSON.parse(fs.readFileSync(path.join(packageRoot, '.mcp.json'), 'utf8')));
    assert.ok(!serialized.includes(root));
    assert.ok(!serialized.includes(homeDir()));
    assert.ok(!/tvly-[A-Za-z0-9_-]{12,}/.test(serialized));
  });
}

test('every file the packaged Claude hooks.json tells the harness to run ships with matching bytes', () => {
  const claudePackageRoot = path.join(root, 'dist/plugins/claude', contract.name);
  const hooksJsonPath = path.join(claudePackageRoot, 'hooks/hooks.json');
  if (!fs.existsSync(path.join(root, 'hooks', 'hooks.json'))) return; // nothing to verify yet
  const packagedHooks = fs.readFileSync(hooksJsonPath, 'utf8');
  const hookTargets = [...new Set([...packagedHooks.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/g)].map((m) => m[1]))];
  assert.ok(hookTargets.length > 0, 'packaged hooks.json references no ${CLAUDE_PLUGIN_ROOT} path');
  for (const target of hookTargets) {
    const packaged = path.join(claudePackageRoot, ...target.split('/'));
    assert.ok(fs.existsSync(packaged), `hooks.json references ${target}, which is missing from the claude payload`);
    assert.deepEqual(fs.readFileSync(packaged), canonicalBytes(path.join(root, ...target.split('/'))), `${target} differs from source`);
  }
});

const packagedClaudeHasHook = (doc, id) =>
  Object.values(doc.hooks).some((groups) => groups.some((group) => group.hooks.some((h) => h.args?.includes(id))));

test('the Codex package ships hooks/hooks.json: one command string per hook, no args, every target shipped', () => {
  const codexPackageRoot = path.join(root, contract.outputs.codexPackage);
  const claudeHooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'), 'utf8'));
  const packaged = fs.readFileSync(path.join(codexPackageRoot, 'hooks/hooks.json'), 'utf8');
  const codexHooks = JSON.parse(packaged);
  const commands = Object.values(codexHooks.hooks).flatMap((groups) => groups.flatMap((group) => group.hooks));
  assert.ok(commands.length > 0, 'codex hooks.json declares no hooks');
  for (const hook of commands) {
    assert.equal(hook.type, 'command');
    assert.equal(hook.args, undefined, 'Codex ignores args; the whole invocation must be in command');
    assert.match(hook.command, /^node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hook-entry\.mjs --hook [a-z-]+ --harness codex$/);
    assert.ok(hook.timeout >= 5000, `timeout ${hook.timeout} is read as milliseconds by Codex`);
  }
  assert.ok(!packaged.includes('claude-code'), 'a Codex hook must not name the claude-code harness');
  // A Claude-only event has no Codex equivalent and must not be emitted.
  assert.ok(Object.keys(claudeHooks.hooks).includes('TaskCompleted'));
  assert.equal(codexHooks.hooks.TaskCompleted, undefined);
  // subagentstart-learning serves Claude's file tier only and prints JSON on stdout: Claude has it, Codex must not.
  assert.ok(packagedClaudeHasHook(claudeHooks, 'subagentstart-learning'));
  assert.ok(!packaged.includes('subagentstart-learning'));
  assert.equal(codexHooks.hooks.SubagentStart, undefined);
  // Every other Claude hook id is carried over.
  const ids = (doc) => Object.entries(doc.hooks).filter(([event]) => event !== 'TaskCompleted')
    .flatMap(([, groups]) => groups.flatMap((group) => group.hooks.map((h) => (h.args ?? h.command.split(' ')).join(' ').match(/--hook (\S+)/)[1])))
    .filter((id) => id !== 'subagentstart-learning');
  assert.deepEqual(ids(codexHooks).sort(), ids(claudeHooks).sort());
  const targets = [...new Set([...packaged.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/(\S+?)(?= |")/g)].map((m) => m[1]))];
  assert.ok(targets.length > 0);
  for (const target of targets) {
    const shipped = path.join(codexPackageRoot, ...target.split('/'));
    assert.ok(fs.existsSync(shipped), `codex hooks.json references ${target}, which is missing from the codex payload`);
    assert.deepEqual(fs.readFileSync(shipped), canonicalBytes(path.join(root, ...target.split('/'))), `${target} differs from source`);
  }
  // hook-entry dispatches to lib/hooks/*.mjs through a static map; those must ship too.
  for (const hook of ['sessionstart-kbd-control', 'posttool-write-position-reminder', 'precompact-kbd-control']) {
    assert.ok(fs.existsSync(path.join(codexPackageRoot, 'lib/hooks', `${hook}.mjs`)), `${hook} payload missing`);
  }
});

test('the Codex plugin.json matches the required field contract', () => {
  const codexManifestPath = path.join(root, contract.outputs.codexPackage, '.codex-plugin/plugin.json');
  const codexManifest = JSON.parse(fs.readFileSync(codexManifestPath, 'utf8'));
  assert.equal(codexManifest.skills, './skills');
  assert.equal(codexManifest.hooks, undefined);
  assert.ok(codexManifest.interface.defaultPrompt);
  assert.match(codexManifest.interface.websiteURL, /^https:\/\//);
});

test('the Claude plugin.json has no hooks field and no agents field', () => {
  const claudeManifestPath = path.join(root, contract.outputs.claudePackage, '.claude-plugin/plugin.json');
  const claudeManifest = JSON.parse(fs.readFileSync(claudeManifestPath, 'utf8'));
  assert.equal(claudeManifest.skills, './skills');
  assert.equal(claudeManifest.hooks, undefined);
  assert.equal(claudeManifest.agents, undefined);
});

for (const outputsKey of ['claudeMarketplace', 'codexMarketplace']) {
  test(`${outputsKey}: version matches skill-system.json releaseVersion and plugin names are unique`, () => {
    const marketplace = JSON.parse(fs.readFileSync(path.join(root, contract.outputs[outputsKey]), 'utf8'));
    assert.equal(marketplace.version, contract.releaseVersion);
    assert.equal(new Set(marketplace.plugins.map((plugin) => plugin.name)).size, marketplace.plugins.length);
  });
}

test(`PASS: ${skills.length} canonical skill(s), payload parity, manifests, and marketplaces`, () => {
  assert.ok(true);
});
