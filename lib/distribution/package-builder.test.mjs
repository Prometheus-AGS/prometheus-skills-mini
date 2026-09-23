import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { generateDistribution } from './package-builder.mjs';

const CONTRACT = {
  schemaVersion: 'prometheus-mini-skill-system-v1',
  name: 'prometheus-skills-mini-fixture',
  releaseVersion: '0.1.0',
  minimumActiveVersion: '0.1.0',
  inventory: { roots: [{ id: 'core', path: 'skills', scan: 'children' }] },
  targets: [{ id: 'claude', path: '.claude/skills', mode: 'copy', sourceTreeLifecycle: 'install-only' }],
  outputs: {
    claudeMarketplace: '.claude-plugin/marketplace.json',
    codexMarketplace: '.agents/plugins/marketplace.json',
    claudePackage: 'dist/plugins/claude/prometheus-skills-mini-fixture',
    codexPackage: 'dist/plugins/codex/prometheus-skills-mini-fixture',
  },
};

function buildSourceTree(dir) {
  mkdirSync(path.join(dir, 'skills', 'sample-skill'), { recursive: true });
  writeFileSync(
    path.join(dir, 'skills', 'sample-skill', 'SKILL.md'),
    '---\nname: sample-skill\ndescription: A sample skill for testing.\n---\n\nBody text.\n',
    'utf8',
  );
  mkdirSync(path.join(dir, 'hooks'), { recursive: true });
  writeFileSync(
    path.join(dir, 'hooks', 'hooks.json'),
    JSON.stringify({
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.mjs'] }],
          },
        ],
      },
    }),
    'utf8',
  );
  mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  writeFileSync(path.join(dir, 'scripts', 'hook-entry.mjs'), 'console.log("hook");\n', 'utf8');
}

const workspace = (run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'package-builder-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('generateDistribution writes both plugin packages with the skill payload and manifests', () => {
  workspace((dir) => {
    buildSourceTree(dir);

    const { skills } = generateDistribution(dir, CONTRACT);

    assert.deepEqual(
      skills.map((skill) => skill.name),
      ['sample-skill'],
    );
    const claudeSkill = path.join(dir, CONTRACT.outputs.claudePackage, 'skills', 'sample-skill', 'SKILL.md');
    const codexSkill = path.join(dir, CONTRACT.outputs.codexPackage, 'skills', 'sample-skill', 'SKILL.md');
    assert.ok(existsSync(claudeSkill));
    assert.ok(existsSync(codexSkill));
    assert.equal(readFileSync(claudeSkill, 'utf8'), readFileSync(codexSkill, 'utf8'));
  });
});

test('the Claude manifest has no hooks field and points skills/mcpServers at relative paths', () => {
  workspace((dir) => {
    buildSourceTree(dir);

    generateDistribution(dir, CONTRACT);

    const manifest = JSON.parse(
      readFileSync(path.join(dir, CONTRACT.outputs.claudePackage, '.claude-plugin', 'plugin.json'), 'utf8'),
    );
    assert.equal(manifest.skills, './skills');
    assert.equal(manifest.mcpServers, './.mcp.json');
    assert.equal(manifest.hooks, undefined);
    assert.equal(manifest.agents, undefined);
  });
});

test('the Codex manifest carries an interface block and no hooks field', () => {
  workspace((dir) => {
    buildSourceTree(dir);

    generateDistribution(dir, CONTRACT);

    const manifest = JSON.parse(
      readFileSync(path.join(dir, CONTRACT.outputs.codexPackage, '.codex-plugin', 'plugin.json'), 'utf8'),
    );
    assert.equal(manifest.skills, './skills');
    assert.equal(manifest.hooks, undefined);
    assert.ok(manifest.interface.defaultPrompt);
    assert.match(manifest.interface.websiteURL, /^https:\/\//);
  });
});

test('hooks.json and every file it references are copied into the Claude package only', () => {
  workspace((dir) => {
    buildSourceTree(dir);

    generateDistribution(dir, CONTRACT);

    const packagedHooks = path.join(dir, CONTRACT.outputs.claudePackage, 'hooks', 'hooks.json');
    const packagedEntry = path.join(dir, CONTRACT.outputs.claudePackage, 'scripts', 'hook-entry.mjs');
    assert.ok(existsSync(packagedHooks));
    assert.ok(existsSync(packagedEntry));
    assert.ok(!existsSync(path.join(dir, CONTRACT.outputs.codexPackage, 'hooks')));
  });
});

test('a hooks.json referencing a file that does not exist fails the build rather than shipping a broken hook', () => {
  workspace((dir) => {
    buildSourceTree(dir);
    writeFileSync(
      path.join(dir, 'hooks', 'hooks.json'),
      JSON.stringify({
        hooks: { SessionStart: [{ hooks: [{ command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/scripts/missing.mjs'] }] }] },
      }),
      'utf8',
    );

    assert.throws(() => generateDistribution(dir, CONTRACT), /hooks\.json references a missing file/);
  });
});

test('marketplace.json files carry a single self-referencing plugin entry with the release version', () => {
  workspace((dir) => {
    buildSourceTree(dir);

    generateDistribution(dir, CONTRACT);

    const claudeMarketplace = JSON.parse(
      readFileSync(path.join(dir, CONTRACT.outputs.claudeMarketplace), 'utf8'),
    );
    const codexMarketplace = JSON.parse(readFileSync(path.join(dir, CONTRACT.outputs.codexMarketplace), 'utf8'));
    assert.equal(claudeMarketplace.plugins.length, 1);
    assert.equal(claudeMarketplace.plugins[0].name, CONTRACT.name);
    assert.equal(claudeMarketplace.version, CONTRACT.releaseVersion);
    assert.equal(codexMarketplace.plugins[0].policy.installation, 'INSTALLED_BY_DEFAULT');
  });
});

test('--check mode (check: true) reports no drift against output it just wrote and writes nothing new', () => {
  workspace((dir) => {
    buildSourceTree(dir);
    generateDistribution(dir, CONTRACT);

    const { drift } = generateDistribution(dir, CONTRACT, { check: true });

    assert.deepEqual(drift, []);
  });
});

test('--check mode detects drift when the packaged output differs from a fresh build', () => {
  workspace((dir) => {
    buildSourceTree(dir);
    generateDistribution(dir, CONTRACT);
    writeFileSync(
      path.join(dir, CONTRACT.outputs.claudePackage, 'skills', 'sample-skill', 'SKILL.md'),
      'tampered',
      'utf8',
    );

    const { drift } = generateDistribution(dir, CONTRACT, { check: true });

    assert.ok(drift.includes(CONTRACT.outputs.claudePackage));
  });
});

test('an .mcp.json containing the source root as a literal path fails the build', () => {
  workspace((dir) => {
    buildSourceTree(dir);
    writeFileSync(
      path.join(dir, '.mcp.json'),
      JSON.stringify({ mcpServers: { leak: { cwd: dir } } }),
      'utf8',
    );

    assert.throws(() => generateDistribution(dir, CONTRACT), /machine-specific absolute path/);
  });
});

test('an .mcp.json containing a literal Tavily API key fails the build', () => {
  workspace((dir) => {
    buildSourceTree(dir);
    writeFileSync(
      path.join(dir, '.mcp.json'),
      JSON.stringify({ mcpServers: { tavily: { env: { TAVILY_API_KEY: 'tvly-ABCDEFGHIJKLMNOP' } } } }),
      'utf8',
    );

    assert.throws(() => generateDistribution(dir, CONTRACT), /literal Tavily credential/);
  });
});
