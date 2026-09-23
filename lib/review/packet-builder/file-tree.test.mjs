// Port of the file_tree assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../../platform/paths.mjs';
import { buildFileTree } from './file-tree.mjs';

test('buildFileTree lists depth 1 and depth 2 entries, sorted, prefixed with ./', () => {
  const root = mkdtempSync(path.join(tempDir(), 'file-tree-'));
  try {
    mkdirSync(path.join(root, 'skills', 'x'), { recursive: true });
    writeFileSync(path.join(root, 'README.md'), 'hi');
    writeFileSync(path.join(root, 'skills', 'x', 'SKILL.md'), 'hi');
    const tree = buildFileTree(root);
    const lines = tree.split('\n');
    assert.ok(lines.includes('./README.md'));
    assert.ok(lines.includes('./skills'));
    assert.ok(lines.includes('./skills/x'));
    assert.deepEqual(lines, [...lines].sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('buildFileTree prunes bulk directories (node_modules, .git, target, dist, .refiner)', () => {
  const root = mkdtempSync(path.join(tempDir(), 'file-tree-'));
  try {
    mkdirSync(path.join(root, 'node_modules'), { recursive: true });
    mkdirSync(path.join(root, 'target'), { recursive: true });
    const tree = buildFileTree(root);
    assert.ok(!tree.includes('node_modules'));
    assert.ok(!tree.includes('target'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('buildFileTree does not descend past depth 2', () => {
  const root = mkdtempSync(path.join(tempDir(), 'file-tree-'));
  try {
    mkdirSync(path.join(root, 'a', 'b', 'c'), { recursive: true });
    writeFileSync(path.join(root, 'a', 'b', 'c', 'deep.txt'), 'x');
    const tree = buildFileTree(root);
    assert.ok(!tree.includes('deep.txt'));
    assert.ok(tree.includes('./a/b'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
