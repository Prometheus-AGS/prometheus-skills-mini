// Scenarios for the skill validator, driven through its entry point:
//   node scripts/validate-skills.mjs [--strict] [--json] [<skill-dir> ...]
//
// Production failures caught: a skill shipped with a top-level `version` or a
// list of tags, which the Agent Skills specification does not allow; a
// description the packaged plugin cannot read, which would ship empty; a shell
// script added to a pack that must run on Windows with Node alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const entry = path.join(repoRoot, 'scripts', 'validate-skills.mjs');

const validate = (args) => {
  const result = spawnSync(process.execPath, [entry, ...args, '--json'], { encoding: 'utf8', timeout: 60000 });
  return { ...result, report: result.stdout.trim().startsWith('{') ? JSON.parse(result.stdout) : null };
};

const GOOD = {
  name: 'sample-skill',
  description: 'Formats a release note. Use when asked to write release notes.',
  license: 'MIT',
  metadata: ["  version: '1.0.0'", "  tags: 'release, notes'"],
};

const withSkill = (overrides, work, files = {}) => {
  const scratch = fs.mkdtempSync(path.join(tempDir(), 'validate-skills-'));
  try {
    const spec = { ...GOOD, ...overrides };
    const dir = path.join(scratch, spec.directory ?? 'sample-skill');
    fs.mkdirSync(dir, { recursive: true });
    const lines = ['---', `name: ${spec.name}`, ...(spec.descriptionLines ?? [`description: ${spec.description}`])];
    if (spec.license) lines.push(`license: ${spec.license}`);
    if (spec.topLevel) lines.push(...spec.topLevel);
    if (spec.metadata) lines.push('metadata:', ...spec.metadata);
    lines.push('---', '', spec.body ?? '# Sample\n\nDo the thing.', '');
    fs.writeFileSync(path.join(dir, 'SKILL.md'), lines.join(spec.eol ?? '\n'));
    for (const [relative, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, ...relative.split('/'))), { recursive: true });
      fs.writeFileSync(path.join(dir, ...relative.split('/')), content);
    }
    return work(dir);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
};

const rules = (result) => result.report.results[0].issues.filter((entry) => entry.severity === 'error').map((entry) => entry.rule);

test('every skill in this pack passes strict validation', () => {
  const result = validate(['--strict']);

  assert.equal(result.status, 0, result.report ? JSON.stringify(result.report.results.filter((entry) => entry.issues.some((one) => one.severity === 'error')), null, 1) : result.stderr);
  assert.ok(result.report.skills >= 106, `only ${result.report.skills} skills were found`);
  assert.equal(result.report.errors, 0);
});

test('a conforming skill passes strict validation, with LF or CRLF endings', () => {
  for (const eol of ['\n', '\r\n']) {
    withSkill({ eol }, (dir) => {
      const result = validate(['--strict', dir]);

      assert.equal(result.status, 0, JSON.stringify(result.report));
      assert.deepEqual(rules(result), []);
    });
  }
});

test('strict mode rejects a top-level version, a missing licence and a list of tags', () => {
  withSkill({ license: null, topLevel: ["version: '1.0.0'"], metadata: ['  tags: [release, notes]'] }, (dir) => {
    const result = validate(['--strict', dir]);

    assert.equal(result.status, 1);
    assert.deepEqual(rules(result).sort(), ['license', 'metadata-tags', 'metadata-version', 'top-level-version']);
  });
});

test('without --strict the same skill only draws a warning for the licence', () => {
  withSkill({ license: null, topLevel: ["version: '1.0.0'"], metadata: null }, (dir) => {
    const result = validate([dir]);

    assert.equal(result.status, 0);
    assert.deepEqual(rules(result), []);
    assert.ok(result.report.results[0].issues.some((entry) => entry.rule === 'license' && entry.severity === 'warning'));
  });
});

test('a name that differs from its directory is an error', () => {
  withSkill({ directory: 'other-name' }, (dir) => {
    assert.deepEqual(rules(validate(['--strict', dir])), ['name-directory']);
  });
});

test('a description the packaged plugin cannot read is an error, and a folded one is accepted', () => {
  withSkill({ descriptionLines: ['description:', '  Formats a release note.', '  Use when asked to write release notes.'] }, (dir) => {
    assert.deepEqual(rules(validate(['--strict', dir])), ['description-style']);
  });
  withSkill({ descriptionLines: ['description: >', '  Formats a release note.', '  Use when asked to write release notes.'] }, (dir) => {
    assert.deepEqual(rules(validate(['--strict', dir])), []);
  });
});

test('a shell script inside a skill is an error', () => {
  withSkill({}, (dir) => {
    assert.deepEqual(rules(validate(['--strict', dir])), ['non-node-script']);
  }, { [['scripts/setup', 'sh'].join('.')]: 'echo hi\n' });
});

test('an unknown option exits 64 and validates nothing', () => {
  const result = spawnSync(process.execPath, [entry, '--strcit'], { encoding: 'utf8', timeout: 60000 });

  assert.equal(result.status, 64);
  assert.match(result.stderr, /unknown option --strcit/);
});
