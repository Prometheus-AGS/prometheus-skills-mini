// Port of the cited_paths resolver inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// Resolves every backtick-quoted, source-extension path the artifact CITES,
// stamping each EXISTS / MISSING / EXTERNAL — bounded by what the artifact
// cites, not by repo size, so a real citation is never reported MISSING just
// because it lives past the file_tree's maxdepth.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../../platform/paths.mjs';
import { resolveCitedPaths } from './cited-paths.mjs';

function withTempRepo(build) {
  const root = mkdtempSync(path.join(tempDir(), 'cited-paths-'));
  try {
    return build(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('resolveCitedPaths marks a repo-relative citation that exists as EXISTS', () => {
  withTempRepo((root) => {
    mkdirSync(path.join(root, 'skills', 'x'), { recursive: true });
    writeFileSync(path.join(root, 'skills', 'x', 'SKILL.md'), 'hi');
    const text = 'See `skills/x/SKILL.md` for details.';
    const rows = resolveCitedPaths(text, root);
    assert.equal(rows.length, 1);
    assert.match(rows[0], /^EXISTS\s+skills\/x\/SKILL\.md$/);
  });
});

test('resolveCitedPaths resolves a bare filename by basename when unambiguous', () => {
  withTempRepo((root) => {
    mkdirSync(path.join(root, 'skills', 'x', 'scripts'), { recursive: true });
    writeFileSync(path.join(root, 'skills', 'x', 'scripts', 'dispatch-judge.sh'), 'hi');
    const text = 'Calls `dispatch-judge.sh` to send the packet.';
    const rows = resolveCitedPaths(text, root);
    assert.match(rows[0], /^EXISTS\s+dispatch-judge\.sh\s+->\s+skills\/x\/scripts\/dispatch-judge\.sh$/);
  });
});

test('resolveCitedPaths reports every match when a bare filename is ambiguous', () => {
  withTempRepo((root) => {
    mkdirSync(path.join(root, 'a'), { recursive: true });
    mkdirSync(path.join(root, 'b'), { recursive: true });
    writeFileSync(path.join(root, 'a', 'shared.md'), 'x');
    writeFileSync(path.join(root, 'b', 'shared.md'), 'x');
    const text = 'See `shared.md`.';
    const rows = resolveCitedPaths(text, root);
    assert.match(rows[0], /^EXISTS\s+shared\.md\s+->\s+2 matches/);
  });
});

test('resolveCitedPaths marks a truly absent path MISSING', () => {
  withTempRepo((root) => {
    mkdirSync(path.join(root, 'skills'), { recursive: true });
    const text = 'See `skills/nope.md`.';
    const rows = resolveCitedPaths(text, root);
    assert.match(rows[0], /^MISSING\s+skills\/nope\.md$/);
  });
});

// NOTE: the source's citation regex requires the FIRST character to be
// alphanumeric/underscore, so a leading '/' is never captured — an absolute
// path citation like `` `/Users/x/f.rs` `` simply never matches, and the
// EXTERNAL branch (kept for fidelity — see cited-paths.mjs) is unreachable
// through this regex. Not testable without changing capture behavior the
// source itself does not have (A-2: no unobserved fix).

test('resolveCitedPaths de-duplicates repeated citations', () => {
  withTempRepo((root) => {
    const text = '`missing.md` and again `missing.md`';
    const rows = resolveCitedPaths(text, root);
    assert.equal(rows.length, 1);
  });
});

test('resolveCitedPaths returns [] when no source-extension paths are cited', () => {
  withTempRepo((root) => {
    const rows = resolveCitedPaths('just prose, no citations here', root);
    assert.deepEqual(rows, []);
  });
});
