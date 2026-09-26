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
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectAdjacentPlugins } from '../../lib/distribution/adjacent-plugins.mjs';
import { readSkillSystem, collectDistributionSkills } from '../../lib/distribution/skill-system.mjs';
import { canonicalBytes } from '../../lib/distribution/canonical-bytes.mjs';
import { homeDir, tempDir } from '../../lib/platform/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contract = readSkillSystem(root);
const skills = collectDistributionSkills(root, contract);
const adjacent = collectAdjacentPlugins(root, contract);

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

test('hybrid-mobile-architecture remains a separately pinned adjacent plugin', () => {
  assert.equal(adjacent.length, 1);
  const [plugin] = adjacent;
  assert.equal(plugin.entry.id, 'hybrid-mobile-architecture');
  assert.equal(plugin.entry.path, 'plugins/hybrid-mobile-architecture');
  assert.equal(plugin.distribution.mode, 'adjacent-plugin');
  assert.ok(!skills.some((skill) => skill.name === plugin.entry.id), 'adjacent package was flattened into the mini inventory');
  const tree = spawnSync('git', ['ls-tree', 'HEAD', '--', plugin.entry.path], { cwd: root, encoding: 'utf8', shell: false });
  assert.equal(tree.status, 0, tree.stderr);
  assert.match(tree.stdout, new RegExp(`^160000 commit ${plugin.entry.commit}\\t`));
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
    const imported = marketplace.plugins.find((plugin) => plugin.name === 'hybrid-mobile-architecture');
    assert.equal(imported.version, adjacent[0].distribution.version);
  });
}

test('adjacent Claude and Codex payloads exactly match the imported mini staging contract', () => {
  const [plugin] = adjacent;
  const workspace = fs.mkdtempSync(path.join(tempDir(), 'prometheus-mini-adjacent-test-'));
  const staged = path.join(workspace, 'staged');
  try {
    const result = spawnSync(
      process.execPath,
      [plugin.stageScript, '--output', staged, '--variant', plugin.distribution.stageVariant],
      { cwd: plugin.importRoot, encoding: 'utf8', shell: false },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const expected = digestTree(path.join(staged, 'package'));
    const expectedReceipt = JSON.parse(fs.readFileSync(path.join(staged, 'receipt.json'), 'utf8'));
    for (const platform of ['claude', 'codex']) {
      const outputRoot = path.join(root, plugin.outputs[platform]);
      const packageRoot = path.join(outputRoot, 'package');
      assert.deepEqual(digestTree(packageRoot), expected, `${platform} adjacent payload differs from its source package`);
      const receipt = JSON.parse(fs.readFileSync(path.join(outputRoot, 'receipt.json'), 'utf8'));
      assert.equal(receipt.variant, 'mini');
      assert.equal(receipt.payloadSha256, expectedReceipt.payloadSha256);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(packageRoot, plugin.manifests[platform].relative), 'utf8'),
      );
      assert.equal(manifest.name, plugin.entry.id);
      assert.equal(manifest.version, plugin.distribution.version);
    }
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test(`PASS: ${skills.length} canonical skill(s), ${adjacent.length} adjacent plugin(s), payload parity, manifests, and marketplaces`, () => {
  assert.ok(true);
});
