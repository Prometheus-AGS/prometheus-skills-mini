// Port of adversarial-review/scripts/classify-mobile-execution.sh (prometheus-skill-pack, 196 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { classifySkill, classifyTree } from './mobile-classify.mjs';

function withTempSkills(build) {
  const root = mkdtempSync(path.join(tempDir(), 'mobile-classify-'));
  try {
    return build(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeSkill(root, name, { skillMd = '---\nname: x\n---\n', scripts = {} } = {}) {
  const dir = path.join(root, 'skills', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), skillMd);
  if (Object.keys(scripts).length) {
    mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    for (const [file, content] of Object.entries(scripts)) {
      writeFileSync(path.join(dir, 'scripts', file), content);
    }
  }
  return dir;
}

test('a skill with no scripts/ directory is manifest-only, not script-bearing', () => {
  withTempSkills((root) => {
    writeSkill(root, 'plain');
    const result = classifyTree(root);
    assert.equal(result.script_bearing, 0);
    assert.equal(result.manifest_only, 1);
  });
});

test('a skill whose scripts touch the network is classified R', () => {
  withTempSkills((root) => {
    const dir = writeSkill(root, 'net', { scripts: { 'fetch.sh': '#!/bin/sh\ncurl https://example.com\n' } });
    const row = classifySkill(dir, root);
    assert.equal(row.verdict, 'R');
  });
});

test('a skill whose scripts shell out to a native toolchain is classified E2', () => {
  withTempSkills((root) => {
    const dir = writeSkill(root, 'native', { scripts: { 'compile-agent.sh': '#!/bin/sh\ncargo build --release\n' } });
    const row = classifySkill(dir, root);
    assert.equal(row.verdict, 'E2');
  });
});

test('build/dev tooling scripts with no network calls are classified E0', () => {
  withTempSkills((root) => {
    const dir = writeSkill(root, 'devtool', { scripts: { 'validate-skill.sh': '#!/bin/sh\necho ok\n' } });
    const row = classifySkill(dir, root);
    assert.equal(row.verdict, 'E0');
  });
});

test('a pure transformation script (no fs/clock, no native, no network) is E1 with no capabilities', () => {
  withTempSkills((root) => {
    const dir = writeSkill(root, 'pure', { scripts: { 'transform.sh': '#!/bin/sh\necho "$1" | tr a-z A-Z\n' } });
    const row = classifySkill(dir, root);
    assert.equal(row.verdict, 'E1');
    assert.equal(row.needs_capabilities, false);
  });
});

test('a script touching the filesystem or clock is E1 but needs_capabilities is true', () => {
  withTempSkills((root) => {
    const dir = writeSkill(root, 'fsclock', { scripts: { 'touch.sh': '#!/bin/sh\nmkdir -p out\ndate\n' } });
    const row = classifySkill(dir, root);
    assert.equal(row.verdict, 'E1');
    assert.equal(row.needs_capabilities, true);
  });
});

test('a skill nested inside another skill tree (e.g. under .claude/skills) is a duplicate, E0', () => {
  withTempSkills((root) => {
    const nestedDir = path.join(root, 'skills', 'outer', '.claude', 'skills', 'inner');
    mkdirSync(path.join(nestedDir, 'scripts'), { recursive: true });
    writeFileSync(path.join(nestedDir, 'SKILL.md'), '---\nname: inner\n---\n');
    writeFileSync(path.join(nestedDir, 'scripts', 'x.sh'), 'echo hi\n');
    const row = classifySkill(nestedDir, root);
    assert.equal(row.verdict, 'E0');
    assert.equal(row.nested_duplicate, true);
  });
});

test('classifyTree returns counts and per-skill rows, deterministically sorted', () => {
  withTempSkills((root) => {
    writeSkill(root, 'b-plain');
    writeSkill(root, 'a-plain');
    const result = classifyTree(root);
    assert.equal(result.total_skills, 2);
    assert.deepEqual(
      result.skills.map((r) => r.skill),
      [...result.skills.map((r) => r.skill)].sort(),
    );
  });
});
