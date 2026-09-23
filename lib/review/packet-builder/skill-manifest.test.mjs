// Port of skill-mode manifest assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines):
// frontmatter parsing, script inventory, and cross-reference map.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../../platform/paths.mjs';
import { parseFrontmatter, buildScriptInventory, buildCrossReferenceMap } from './skill-manifest.mjs';

function withTempSkill(build) {
  const root = mkdtempSync(path.join(tempDir(), 'skill-manifest-'));
  try {
    return build(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('parseFrontmatter extracts simple scalar keys', () => {
  const md = '---\nname: my-skill\nversion: "1.0.0"\nlicense: MIT\n---\n\n# Body\n';
  assert.deepEqual(parseFrontmatter(md), { name: 'my-skill', version: '"1.0.0"', license: 'MIT' });
});

test('parseFrontmatter extracts a list value under a key', () => {
  const md = '---\ntags:\n- process\n- review\n---\n';
  assert.deepEqual(parseFrontmatter(md), { tags: ['process', 'review'] });
});

test('parseFrontmatter returns an empty object when there is no frontmatter block', () => {
  assert.deepEqual(parseFrontmatter('# just a heading\n'), {});
});

test('buildScriptInventory lists each script with size, executable bit, shebang and stated purpose', () => {
  withTempSkill((root) => {
    const scriptsDir = path.join(root, 'scripts');
    mkdirSync(scriptsDir);
    writeFileSync(path.join(scriptsDir, 'run.sh'), '#!/usr/bin/env bash\n# Runs the thing.\necho hi\n');
    chmodSync(path.join(scriptsDir, 'run.sh'), 0o755);
    const lines = buildScriptInventory(root);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^scripts\/run\.sh\t\d+ bytes\texecutable=yes\t#!\/usr\/bin\/env bash\tRuns the thing\.$/);
  });
});

test('buildScriptInventory reports "(no scripts/ directory)" when scripts/ is absent', () => {
  withTempSkill((root) => {
    assert.deepEqual(buildScriptInventory(root), []);
  });
});

test('buildCrossReferenceMap marks a relative link OK when the target exists', () => {
  withTempSkill((root) => {
    writeFileSync(path.join(root, 'ref.md'), 'content');
    writeFileSync(path.join(root, 'SKILL.md'), 'See [the ref](ref.md) for details.\n');
    const rows = buildCrossReferenceMap(root);
    assert.equal(rows.length, 1);
    assert.match(rows[0], /^OK\s+ref\.md\s+\(the ref\)$/);
  });
});

test('buildCrossReferenceMap marks a relative link BROKEN when the target is missing', () => {
  withTempSkill((root) => {
    writeFileSync(path.join(root, 'SKILL.md'), 'See [missing](nope.md) for details.\n');
    const rows = buildCrossReferenceMap(root);
    assert.match(rows[0], /^BROKEN\s+nope\.md/);
  });
});

test('buildCrossReferenceMap skips external links (http, anchors, mailto)', () => {
  withTempSkill((root) => {
    writeFileSync(root + '/SKILL.md', '[ext](https://example.com) [anchor](#top) [mail](mailto:x@y.com)\n');
    assert.deepEqual(buildCrossReferenceMap(root), []);
  });
});
