import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { readSkillSystem, collectDistributionSkills, compareVersions } from './skill-system.mjs';

const workspace = (run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'skill-system-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const baseContract = (overrides = {}) => ({
  schemaVersion: 'prometheus-mini-skill-system-v1',
  name: 'prometheus-skills-mini',
  releaseVersion: '0.1.0',
  minimumActiveVersion: '0.1.0',
  inventory: { roots: [{ id: 'core', path: 'skills', scan: 'children' }] },
  targets: [{ id: 'claude', path: '.claude/skills', mode: 'copy', sourceTreeLifecycle: 'install-only' }],
  outputs: {},
  ...overrides,
});

const writeManifest = (dir, contract) =>
  writeFileSync(path.join(dir, 'skill-system.json'), JSON.stringify(contract), 'utf8');

const writeSkill = (dir, name, frontmatter = `name: ${name}\ndescription: test skill`) => {
  const skillDir = path.join(dir, 'skills', name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(path.join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n\nbody\n`, 'utf8');
};

test('readSkillSystem loads a valid manifest', () => {
  workspace((dir) => {
    writeManifest(dir, baseContract());

    const contract = readSkillSystem(dir);

    assert.equal(contract.name, 'prometheus-skills-mini');
  });
});

test('readSkillSystem rejects a missing manifest file', () => {
  workspace((dir) => {
    assert.throws(() => readSkillSystem(dir), /distribution manifest is missing/);
  });
});

test('readSkillSystem rejects an unrecognized schemaVersion', () => {
  workspace((dir) => {
    writeManifest(dir, baseContract({ schemaVersion: 'something-else' }));

    assert.throws(() => readSkillSystem(dir), /unsupported distribution manifest schemaVersion/);
  });
});

test('readSkillSystem rejects any target whose mode is not "copy"', () => {
  workspace((dir) => {
    writeManifest(
      dir,
      baseContract({
        targets: [{ id: 'claude', path: '.claude/skills', mode: 'symlink', sourceTreeLifecycle: 'install-only' }],
      }),
    );

    assert.throws(() => readSkillSystem(dir), /must use mode "copy"/);
  });
});

test('readSkillSystem rejects releaseVersion below minimumActiveVersion', () => {
  workspace((dir) => {
    writeManifest(dir, baseContract({ releaseVersion: '0.0.9', minimumActiveVersion: '0.1.0' }));

    assert.throws(() => readSkillSystem(dir), /below minimumActiveVersion/);
  });
});

test('compareVersions orders semantic versions numerically, not lexically', () => {
  assert.equal(compareVersions('0.9.0', '0.10.0'), -1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('2.0.0', '1.9.9'), 1);
});

test('collectDistributionSkills finds every skill directory that has a SKILL.md', () => {
  workspace((dir) => {
    writeSkill(dir, 'doctor');
    writeSkill(dir, 'kbd-analyze');

    const skills = collectDistributionSkills(dir, baseContract());

    assert.deepEqual(
      skills.map((skill) => skill.name),
      ['doctor', 'kbd-analyze'],
    );
  });
});

test('a skill directory without a SKILL.md is silently skipped, not an error', () => {
  workspace((dir) => {
    writeSkill(dir, 'doctor');
    mkdirSync(path.join(dir, 'skills', 'ideation-mindmap'), { recursive: true }); // no SKILL.md yet

    const skills = collectDistributionSkills(dir, baseContract());

    assert.deepEqual(
      skills.map((skill) => skill.name),
      ['doctor'],
    );
  });
});

test('a skill directory name is used when frontmatter has no name key', () => {
  workspace((dir) => {
    writeSkill(dir, 'fallback-name', 'description: no name key here');

    const skills = collectDistributionSkills(dir, baseContract());

    assert.deepEqual(
      skills.map((skill) => skill.name),
      ['fallback-name'],
    );
  });
});

test('two skills that resolve to the same distributed name are rejected', () => {
  workspace((dir) => {
    writeSkill(dir, 'dir-one', 'name: shared-name\ndescription: first');
    writeSkill(dir, 'dir-two', 'name: shared-name\ndescription: second');

    assert.throws(() => collectDistributionSkills(dir, baseContract()), /duplicate distributed skill name/);
  });
});

test('an unsafe skill name is rejected rather than copied into the payload', () => {
  workspace((dir) => {
    writeSkill(dir, 'weird', 'name: ../../escape\ndescription: bad');

    assert.throws(() => collectDistributionSkills(dir, baseContract()), /unsafe skill name/);
  });
});

test('a missing inventory root is a hard error, not an empty result', () => {
  workspace((dir) => {
    assert.throws(
      () => collectDistributionSkills(dir, baseContract()),
      /skill inventory root is unavailable/,
    );
  });
});
