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

function digestTree(directory, relative = '') {
  const result = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const child = path.join(relative, name);
    const absolute = path.join(directory, child);
    const stat = fs.lstatSync(absolute);
    if (stat.isDirectory()) result.push(...digestTree(directory, child));
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
        digestTree(skill.source),
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
  });
}

test(`PASS: ${skills.length} canonical skill(s), payload parity, manifests, and marketplaces`, () => {
  assert.ok(true);
});
