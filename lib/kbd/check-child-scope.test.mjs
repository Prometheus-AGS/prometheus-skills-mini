// Port of shared/lib/check-child-scope.sh (prometheus-skill-pack, 102 lines).
//
// PreToolUse(Write|Edit|MultiEdit) advisory enforcement of a child loop's scope.json. When the
// waypoint path[] is inside a child (depth > 1), writes outside that child's allowedWritePaths
// are flagged. Hook-level (advisory) isolation, not an OS sandbox.
//
// Judgment call: the source canonicalizes both root and file path via `cd && pwd -P` specifically
// to defeat a macOS /var-vs-/private/var symlink ambiguity, and matches globs with a python3
// fnmatch subprocess. This port uses `fs.realpathSync` (falling back to `path.resolve` when the
// path does not exist yet, e.g. a file about to be created) for canonicalization, and Node's own
// glob matching (no subprocess, no python3 dependency) for `allowedWritePaths` — this repo's
// constitution forbids new python/shell dependencies. Both are named explicitly per the task's
// instruction to flag every place a literal translation was not possible.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { checkChildScope, matchesAnyGlob } from './check-child-scope.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'check-child-scope-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
  return file;
};

const setupChild = (root, allowedWritePaths) => {
  writeJson(path.join(root, '.kbd-orchestrator', 'current-waypoint.json'), {
    path: ['p0', 'c1'],
  });
  writeJson(
    path.join(root, '.kbd-orchestrator', 'phases', 'p0', 'children', 'c1', 'scope.json'),
    { allowedWritePaths }
  );
};

// ---------------------------------------------------------------------------
// matchesAnyGlob — the fnmatch replacement
// ---------------------------------------------------------------------------

test('matchesAnyGlob matches a simple glob', () => {
  assert.equal(matchesAnyGlob('src/foo.ts', ['src/*.ts']), true);
});

test('matchesAnyGlob matches ** across directory boundaries', () => {
  assert.equal(matchesAnyGlob('src/a/b/foo.ts', ['src/**']), true);
});

test('matchesAnyGlob returns false when nothing matches', () => {
  assert.equal(matchesAnyGlob('other/foo.ts', ['src/**']), false);
});

test('matchesAnyGlob returns false for an empty glob list', () => {
  assert.equal(matchesAnyGlob('src/foo.ts', []), false);
});

// ---------------------------------------------------------------------------
// checkChildScope — degrade-to-allow conditions
// ---------------------------------------------------------------------------

test('checkChildScope allows (mode off) without inspecting anything', () => {
  const s = scratch();
  try {
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'anything.ts') } },
      { root: s.root, mode: 'off' }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope allows when there is no orchestrator root', () => {
  const detached = mkdtempSync(path.join(tempDir(), 'no-orchestrator-'));
  try {
    const result = checkChildScope(
      { tool_input: { file_path: path.join(detached, 'x.ts') } },
      { root: null }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    rmSync(detached, { recursive: true, force: true });
  }
});

test('checkChildScope allows when the waypoint is missing', () => {
  const s = scratch();
  try {
    mkdirSync(path.join(s.root, '.kbd-orchestrator'), { recursive: true });
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'x.ts') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope allows when there is no file_path in tool_input', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const result = checkChildScope({ tool_input: {} }, { root: s.root });
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope reads file_path from tool_input.path as a fallback', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const result = checkChildScope(
      { tool_input: { path: path.join(s.root, 'src', 'ok.ts') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope allows at depth 1 (top-level phase, not inside a child)', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { path: ['p0'] });
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'anywhere.ts') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope allows when the child has no scope.json', () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { path: ['p0', 'c1'] });
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'anywhere.ts') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope allows when allowedWritePaths is an empty array', () => {
  const s = scratch();
  try {
    setupChild(s.root, []);
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'anywhere.ts') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// checkChildScope — always-allowed paths
// ---------------------------------------------------------------------------

test('checkChildScope always allows writes under .kbd-orchestrator/', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, '.kbd-orchestrator', 'phases', 'p0', 'progress.json') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope always allows SCRATCHPAD.md', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'SCRATCHPAD.md') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope always allows writes inside the child node dir itself', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const nodeFile = path.join(
      s.root, '.kbd-orchestrator', 'phases', 'p0', 'children', 'c1', 'notes.md'
    );
    const result = checkChildScope({ tool_input: { file_path: nodeFile } }, { root: s.root });
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// checkChildScope — in-scope vs out-of-scope, by allowedWritePaths
// ---------------------------------------------------------------------------

test('checkChildScope allows a write that matches allowedWritePaths', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'src', 'feature', 'index.ts') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});

test('checkChildScope flags (warn mode, default) a write outside allowedWritePaths', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'other', 'index.ts') } },
      { root: s.root }
    );
    assert.equal(result.decision, 'warn');
    assert.match(result.message, /outside the declared scope/);
    assert.match(result.message, /p0 › c1/);
  } finally {
    s.dispose();
  }
});

test('checkChildScope asks (ask mode) for a write outside allowedWritePaths', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const result = checkChildScope(
      { tool_input: { file_path: path.join(s.root, 'other', 'index.ts') } },
      { root: s.root, mode: 'ask' }
    );
    assert.equal(result.decision, 'ask');
    assert.equal(result.hookOutput.hookSpecificOutput.permissionDecision, 'ask');
    assert.match(result.hookOutput.hookSpecificOutput.permissionDecisionReason, /other/);
  } finally {
    s.dispose();
  }
});

test('checkChildScope canonicalizes a not-yet-existing file path (falls back to path.resolve)', () => {
  const s = scratch();
  try {
    setupChild(s.root, ['src/**']);
    const notYetCreated = path.join(s.root, 'src', 'brand-new-file.ts');
    const result = checkChildScope({ tool_input: { file_path: notYetCreated } }, { root: s.root });
    assert.equal(result.decision, 'allow');
  } finally {
    s.dispose();
  }
});
