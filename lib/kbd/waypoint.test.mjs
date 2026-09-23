// Port of shared/lib/waypoint.sh (prometheus-skill-pack, 226 lines).
//
// Pure helpers for reading the KBD waypoint, rendering the phase chain, and resolving the
// on-disk node dir for an arbitrary-depth path[]. `isDescendant` replaces the source's
// `cd && pwd -P` canonicalization (a macOS /var-vs-/private/var defense that has no Windows
// analogue) with `fs.realpathSync`, falling back to `path.resolve` when a path does not exist
// yet — see waypoint.mjs's header comment for the full rationale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import {
  waypointLoad,
  chainSeparator,
  waypointChain,
  expandKbdPath,
  isDescendant,
  kbdNodeDir,
  kbdNodeChain,
  kbdExistingPathTokens,
  kbdCurrentNodeDir,
} from './waypoint.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'waypoint-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
  return file;
};

// ---------------------------------------------------------------------------
// waypointLoad
// ---------------------------------------------------------------------------

test('waypointLoad applies documented defaults for every absent field', () => {
  const s = scratch();
  try {
    const file = writeJson(path.join(s.root, 'wp.json'), {});
    const loaded = waypointLoad(file);
    assert.equal(loaded.phase, '');
    assert.equal(loaded.previousPhase, '');
    assert.equal(loaded.change, '');
    assert.equal(loaded.status, '');
    assert.equal(loaded.currentTask, '');
    assert.equal(loaded.childPhases, '');
    assert.equal(loaded.path, '');
    assert.equal(loaded.completionMetric, 'implementation');
    assert.equal(loaded.implementationCompleted, '0');
    assert.equal(loaded.implementationTotal, '0');
    assert.equal(loaded.certificationStatus, 'NOT_TRACKED');
    assert.equal(loaded.publicationStatus, 'NOT_TRACKED');
  } finally {
    s.dispose();
  }
});

test('waypointLoad reads explicit fields over defaults', () => {
  const s = scratch();
  try {
    const file = writeJson(path.join(s.root, 'wp.json'), {
      phase: 'karpathy-logs-node',
      parentPhase: 'the-boss-shipping-and-settings',
      childPointer: 'the-boss-compass-integration',
      childPhases: ['a', 'b'],
      implementationCompleted: 4,
      implementationTotal: 10,
      certificationStatus: 'IN_PROGRESS',
    });
    const loaded = waypointLoad(file);
    assert.equal(loaded.phase, 'karpathy-logs-node');
    assert.equal(loaded.parentPhase, 'the-boss-shipping-and-settings');
    assert.equal(loaded.childPointer, 'the-boss-compass-integration');
    assert.equal(loaded.childPhases, 'a,b');
    assert.equal(loaded.implementationCompleted, '4');
    assert.equal(loaded.implementationTotal, '10');
    assert.equal(loaded.certificationStatus, 'IN_PROGRESS');
  } finally {
    s.dispose();
  }
});

test('waypointLoad falls back to changesCompleted/changesTotal for the implementation counters', () => {
  const s = scratch();
  try {
    const file = writeJson(path.join(s.root, 'wp.json'), { changesCompleted: 2, changesTotal: 5 });
    const loaded = waypointLoad(file);
    assert.equal(loaded.implementationCompleted, '2');
    assert.equal(loaded.implementationTotal, '5');
  } finally {
    s.dispose();
  }
});

test('waypointLoad derives path from phase + childPointer when .path is absent', () => {
  const s = scratch();
  try {
    const file = writeJson(path.join(s.root, 'wp.json'), { phase: 'p0', childPointer: 'c1' });
    const loaded = waypointLoad(file);
    assert.equal(loaded.path, 'p0,c1');
  } finally {
    s.dispose();
  }
});

test('waypointLoad prefers an explicit non-empty .path array over the derived chain', () => {
  const s = scratch();
  try {
    const file = writeJson(path.join(s.root, 'wp.json'), {
      phase: 'p0',
      childPointer: 'c1',
      path: ['p0', 'c1', 'g2'],
    });
    const loaded = waypointLoad(file);
    assert.equal(loaded.path, 'p0,c1,g2');
  } finally {
    s.dispose();
  }
});

test('waypointLoad throws when the file is missing', () => {
  assert.throws(() => waypointLoad('/nonexistent/wp.json'), /missing file/);
});

// ---------------------------------------------------------------------------
// chainSeparator / waypointChain
// ---------------------------------------------------------------------------

test('chainSeparator falls back to " > " under a POSIX/C locale', () => {
  assert.equal(chainSeparator({ LC_ALL: 'POSIX' }), ' > ');
  assert.equal(chainSeparator({ LC_ALL: 'C' }), ' > ');
  assert.equal(chainSeparator({ LC_ALL: 'C.UTF-8' }), ' > ');
  assert.equal(chainSeparator({ LANG: 'POSIX' }), ' > ');
});

test('chainSeparator defaults to the U+203A arrow outside POSIX/C', () => {
  assert.equal(chainSeparator({ LC_ALL: 'en_US.UTF-8' }), '› ');
  assert.equal(chainSeparator({}), '› ');
});

test('waypointChain renders all three slots with the separator, empty slots elided', () => {
  assert.equal(
    waypointChain('the-boss-shipping-and-settings', 'karpathy-logs-node', 'child-x', { LC_ALL: 'POSIX' }),
    'the-boss-shipping-and-settings > karpathy-logs-node > child-x'
  );
});

test('waypointChain elides an empty parent', () => {
  assert.equal(waypointChain('', 'phase-only', '', { LC_ALL: 'POSIX' }), 'phase-only');
});

test('waypointChain elides an empty pointer', () => {
  assert.equal(waypointChain('parent', 'phase', '', { LC_ALL: 'POSIX' }), 'parent > phase');
});

test('waypointChain returns an empty string when every slot is empty', () => {
  assert.equal(waypointChain('', '', ''), '');
});

// ---------------------------------------------------------------------------
// expandKbdPath
// ---------------------------------------------------------------------------

test('expandKbdPath expands ${HOME} and ${USER} against the given env', () => {
  const env = { HOME: '/home/travis', USER: 'travis' };
  assert.equal(expandKbdPath('${HOME}/.kbd-orchestrator', env), '/home/travis/.kbd-orchestrator');
  assert.equal(expandKbdPath('$HOME/x/$USER', env), '/home/travis/x/travis');
});

test('expandKbdPath leaves an unrecognised token untouched', () => {
  assert.equal(expandKbdPath('${NOT_HANDLED}/x', { HOME: '/h' }), '${NOT_HANDLED}/x');
});

// ---------------------------------------------------------------------------
// isDescendant
// ---------------------------------------------------------------------------

test('isDescendant is true for a real child path', () => {
  const s = scratch();
  try {
    const child = path.join(s.root, 'child');
    mkdirSync(child, { recursive: true });
    assert.equal(isDescendant(child, s.root), true);
  } finally {
    s.dispose();
  }
});

test('isDescendant is false for the same path', () => {
  const s = scratch();
  try {
    assert.equal(isDescendant(s.root, s.root), false);
  } finally {
    s.dispose();
  }
});

test('isDescendant is false for a sibling path', () => {
  const s = scratch();
  try {
    const sibling = mkdtempSync(path.join(tempDir(), 'waypoint-sibling-'));
    try {
      assert.equal(isDescendant(sibling, s.root), false);
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  } finally {
    s.dispose();
  }
});

test('isDescendant works when the parent does not exist yet (falls back to path.resolve)', () => {
  const notYetCreatedParent = path.join(tempDir(), 'waypoint-not-yet-created-parent');
  const child = path.join(notYetCreatedParent, 'child');
  assert.equal(isDescendant(child, notYetCreatedParent), true);
});

test('isDescendant is true for a not-yet-existing nested child under a real (symlinked) root', () => {
  // Regression: an earlier version canonicalized an existing root via realpathSync (resolving
  // any symlink in its ancestry, e.g. macOS /var -> /private/var) but fell back to plain
  // path.resolve for a not-yet-existing child, so the two never agreed on a shared prefix and a
  // real descendant was reported as "not a descendant".
  const s = scratch();
  try {
    const notYetCreatedChild = path.join(s.root, 'not-yet', 'nested', 'child');
    assert.equal(isDescendant(notYetCreatedChild, s.root), true);
  } finally {
    s.dispose();
  }
});

test('isDescendant is false for empty inputs', () => {
  assert.equal(isDescendant('', '/somewhere'), false);
  assert.equal(isDescendant('/somewhere', ''), false);
});

// ---------------------------------------------------------------------------
// kbdNodeDir / kbdNodeChain
// ---------------------------------------------------------------------------

test('kbdNodeDir resolves a single top-level phase', () => {
  assert.equal(kbdNodeDir('p0'), '.kbd-orchestrator/phases/p0');
});

test('kbdNodeDir interleaves children/ for each nested segment', () => {
  assert.equal(
    kbdNodeDir('p0', 'c1', 'g2'),
    '.kbd-orchestrator/phases/p0/children/c1/children/g2'
  );
});

test('kbdNodeDir skips empty segments', () => {
  assert.equal(kbdNodeDir('p0', '', 'c1'), '.kbd-orchestrator/phases/p0/children/c1');
});

test('kbdNodeDir throws with no arguments', () => {
  assert.throws(() => kbdNodeDir());
});

test('kbdNodeChain renders the N-level breadcrumb with the active separator', () => {
  assert.equal(kbdNodeChain(['p0', 'c1', 'g2'], { LC_ALL: 'POSIX' }), 'p0 > c1 > g2');
});

test('kbdNodeChain with a single segment returns that segment', () => {
  assert.equal(kbdNodeChain(['p0'], { LC_ALL: 'POSIX' }), 'p0');
});

// ---------------------------------------------------------------------------
// kbdExistingPathTokens / kbdCurrentNodeDir
// ---------------------------------------------------------------------------

test('kbdExistingPathTokens trims a stale child pointer that does not exist on disk', () => {
  const s = scratch();
  try {
    mkdirSync(path.join(s.root, '.kbd-orchestrator', 'phases', 'p0'), { recursive: true });
    const wp = writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {
      phase: 'p0',
      childPointer: 'nonexistent-child',
    });
    assert.deepEqual(kbdExistingPathTokens(wp, s.root), ['p0']);
  } finally {
    s.dispose();
  }
});

test('kbdExistingPathTokens keeps the full chain when every segment exists', () => {
  const s = scratch();
  try {
    mkdirSync(path.join(s.root, '.kbd-orchestrator', 'phases', 'p0', 'children', 'c1'), { recursive: true });
    const wp = writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {
      path: ['p0', 'c1'],
    });
    assert.deepEqual(kbdExistingPathTokens(wp, s.root), ['p0', 'c1']);
  } finally {
    s.dispose();
  }
});

test('kbdExistingPathTokens returns [] when the top-level phase dir does not exist', () => {
  const s = scratch();
  try {
    const wp = writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { phase: 'ghost' });
    assert.deepEqual(kbdExistingPathTokens(wp, s.root), []);
  } finally {
    s.dispose();
  }
});

test('kbdExistingPathTokens returns [] when the waypoint has no chain at all', () => {
  const s = scratch();
  try {
    const wp = writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {});
    assert.deepEqual(kbdExistingPathTokens(wp, s.root), []);
  } finally {
    s.dispose();
  }
});

test('kbdCurrentNodeDir resolves the active node dir from the waypoint path', () => {
  const s = scratch();
  try {
    mkdirSync(path.join(s.root, '.kbd-orchestrator', 'phases', 'p0', 'children', 'c1'), { recursive: true });
    const wp = writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {
      path: ['p0', 'c1'],
    });
    assert.equal(kbdCurrentNodeDir(wp, s.root), '.kbd-orchestrator/phases/p0/children/c1');
  } finally {
    s.dispose();
  }
});

test('kbdCurrentNodeDir returns null when nothing resolves', () => {
  const s = scratch();
  try {
    const wp = writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), {});
    assert.equal(kbdCurrentNodeDir(wp, s.root), null);
  } finally {
    s.dispose();
  }
});
