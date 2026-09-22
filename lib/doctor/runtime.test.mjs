import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { outcomeConformance } from './contract.mjs';
import { checks } from './runtime.mjs';

const byId = (id) => {
  const check = checks.find((c) => c.id === id);
  assert.ok(check, `no check ${id}`);
  return check;
};

/** Asserts the shape as well as the verdict: an outcome off-contract is a defect even when its status is right. */
const run = async (check, ctx) => {
  const outcome = await check.run(ctx);
  assert.deepEqual(outcomeConformance(outcome, check.id), [], JSON.stringify(outcome));
  return outcome;
};

const repo = (build) => {
  const root = mkdtempSync(path.join(tempDir(), 'doctor-runtime-'));
  try {
    build?.(root);
    return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
};

test('mini-node-version passes on a supported runtime and names the version', async () => {
  const outcome = await run(byId('mini-node-version'), { nodeVersion: '24.16.0' });

  assert.equal(outcome.status, 'pass');
  assert.match(outcome.summary, /24\.16\.0/);
});

test('mini-node-version fails below the floor, naming both versions', async () => {
  const outcome = await run(byId('mini-node-version'), { nodeVersion: '20.0.0' });

  assert.equal(outcome.status, 'fail');
  assert.match(outcome.summary, /20\.0\.0/);
  assert.match(outcome.summary, /22/);
});

test('mini-node-version compares numerically, not lexically', async () => {
  // '9.0.0' > '22.0.0' as strings; the floor is a number comparison or it is wrong.
  assert.equal((await run(byId('mini-node-version'), { nodeVersion: '9.0.0' })).status, 'fail');
  assert.equal((await run(byId('mini-node-version'), { nodeVersion: '22.0.0' })).status, 'pass');
  assert.equal((await run(byId('mini-node-version'), { nodeVersion: '100.0.0' })).status, 'pass');
});

test('mini-versions-toml skips with a reason when the file is absent', async () => {
  const { root, dispose } = repo();
  try {
    const outcome = await run(byId('mini-versions-toml'), { repoRoot: root });

    assert.equal(outcome.status, 'skip');
    assert.match(outcome.summary, /versions\.toml/);
  } finally {
    dispose();
  }
});

// Round 1 of the diff review: the versions module was a STATIC import, so if it had not
// landed the whole registry would fail to load and every check would vanish — rather than
// this one check skipping. It is loaded on demand now, and the absence is a `skip`.
// (It is present today, so the injected null is how the branch is exercised at all.)
test('mini-versions-toml skips when the versions comparison cannot be loaded', async () => {
  const { root, dispose } = repo((r) => {
    writeFileSync(path.join(r, 'versions.toml'), '[node]\nminimum = ">=22"\n');
    writeFileSync(path.join(r, 'package.json'), JSON.stringify({ engines: { node: '>=22' } }));
  });
  try {
    const outcome = await run(byId('mini-versions-toml'), { repoRoot: root, versionsToml: null });

    assert.equal(outcome.status, 'skip');
    assert.match(outcome.summary + outcome.detail, /versions-toml\.mjs|not available/i);
  } finally {
    dispose();
  }
});

test('mini-versions-toml passes when the file agrees with the tree', async () => {
  const { root, dispose } = repo((r) => {
    writeFileSync(path.join(r, 'versions.toml'), '[node]\nminimum = ">=22"\n');
    writeFileSync(path.join(r, 'package.json'), JSON.stringify({ engines: { node: '>=22' } }));
  });
  try {
    const outcome = await run(byId('mini-versions-toml'), {
      repoRoot: root,
      lsTree: () => null,
      listGitlinks: () => [],
    });

    assert.equal(outcome.status, 'pass');
  } finally {
    dispose();
  }
});

test('mini-versions-toml fails naming each disagreement', async () => {
  const { root, dispose } = repo((r) => {
    writeFileSync(path.join(r, 'versions.toml'), '[node]\nminimum = ">=22"\n[submodules]\n"tools/x" = "aaaaaaa"\n');
    writeFileSync(path.join(r, 'package.json'), JSON.stringify({ engines: { node: '>=24' } }));
  });
  try {
    const outcome = await run(byId('mini-versions-toml'), {
      repoRoot: root,
      lsTree: () => null,
      listGitlinks: () => [],
    });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.detail, /tools\/x/);
    assert.match(outcome.detail, /engines\.node|>=24/);
  } finally {
    dispose();
  }
});

// A parse error is a real finding about a file the operator wrote, not a crash.
test('mini-versions-toml reports an unparseable file as fail, not an exception', async () => {
  const { root, dispose } = repo((r) => {
    writeFileSync(path.join(r, 'versions.toml'), '[submodule]\n"tools/x" = "aaaaaaa"\n');
    writeFileSync(path.join(r, 'package.json'), JSON.stringify({ engines: { node: '>=22' } }));
  });
  try {
    const outcome = await run(byId('mini-versions-toml'), {
      repoRoot: root,
      lsTree: () => null,
      listGitlinks: () => [],
    });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.summary + outcome.detail, /unknown table|parse/i);
  } finally {
    dispose();
  }
});

test('mini-submodules passes when every gitlink is checked out', async () => {
  const { root, dispose } = repo((r) => {
    mkdirSync(path.join(r, 'tools', 'prometheus-knowledge'), { recursive: true });
    writeFileSync(path.join(r, 'tools', 'prometheus-knowledge', 'Cargo.toml'), '');
  });
  try {
    const outcome = await run(byId('mini-submodules'), {
      repoRoot: root,
      listGitlinks: () => ['tools/prometheus-knowledge'],
      exists: () => true,
    });

    assert.equal(outcome.status, 'pass');
  } finally {
    dispose();
  }
});

// An uninitialised submodule is an empty directory — the single most common broken clone.
test('mini-submodules fails naming an uninitialised submodule', async () => {
  const { root, dispose } = repo((r) => {
    mkdirSync(path.join(r, 'tools', 'prometheus-knowledge'), { recursive: true });
  });
  try {
    const outcome = await run(byId('mini-submodules'), {
      repoRoot: root,
      listGitlinks: () => ['tools/prometheus-knowledge'],
    });

    assert.equal(outcome.status, 'fail');
    assert.match(outcome.summary + outcome.detail, /prometheus-knowledge/);
    assert.match(outcome.summary + outcome.detail, /submodule update|init/i);
  } finally {
    dispose();
  }
});

// Round 2 of the diff review: the check only asked whether the directory was non-empty,
// so a submodule checked out but never built reported healthy. The spec requires
// "present AND built where applicable". Checked out is not the same as usable — but a
// usable binary may be installed elsewhere, so this WARNS (operator decision) while a
// missing checkout, which cannot be built at all, still fails.
test('mini-submodules warns when a submodule is checked out but not built', async () => {
  const { root, dispose } = repo((r) => {
    mkdirSync(path.join(r, 'tools', 'openspec'), { recursive: true });
    writeFileSync(path.join(r, 'tools', 'openspec', 'package.json'), '{}');
  });
  try {
    const outcome = await run(byId('mini-submodules'), {
      repoRoot: root,
      listGitlinks: () => ['tools/openspec'],
      exists: () => false,
    });

    assert.equal(outcome.status, 'warn');
    assert.match(outcome.detail, /dist/);
    assert.match(outcome.detail, /tools\/openspec/);
  } finally {
    dispose();
  }
});

// Round 3 of the diff review. A submodule is vendored so this tree uses ITS copy, so an
// unbuilt vendored pk means the tree is not set up — even when another pk is on PATH
// (on the development machine that is the FULL pack's ~/.local/bin/pk, a different
// install). mini-pk answers the other question: does some pk resolve and run.
test('mini-submodules warns when the vendored pk is not built', async () => {
  const { root, dispose } = repo((r) => {
    mkdirSync(path.join(r, 'tools', 'prometheus-knowledge'), { recursive: true });
    writeFileSync(path.join(r, 'tools', 'prometheus-knowledge', 'Cargo.toml'), '');
  });
  try {
    const outcome = await run(byId('mini-submodules'), {
      repoRoot: root,
      listGitlinks: () => ['tools/prometheus-knowledge'],
      exists: () => false,
    });

    assert.equal(outcome.status, 'warn');
    assert.match(outcome.detail, /prometheus-knowledge/);
    assert.match(outcome.detail, /cargo build/);
  } finally {
    dispose();
  }
});

test('mini-submodules says nothing about a built artifact for a submodule this tree lacks', async () => {
  const { root, dispose } = repo((r) => {
    mkdirSync(path.join(r, 'tools', 'unrelated'), { recursive: true });
    writeFileSync(path.join(r, 'tools', 'unrelated', 'file.txt'), 'x');
  });
  try {
    const outcome = await run(byId('mini-submodules'), {
      repoRoot: root,
      listGitlinks: () => ['tools/unrelated'],
      exists: () => false,
    });

    assert.equal(outcome.status, 'pass');
  } finally {
    dispose();
  }
});

test('mini-submodules skips when git cannot be read, rather than claiming none', async () => {
  const { root, dispose } = repo();
  try {
    const outcome = await run(byId('mini-submodules'), {
      repoRoot: root,
      listGitlinks: () => {
        throw new Error('git ls-tree failed');
      },
    });

    assert.equal(outcome.status, 'skip');
    assert.match(outcome.summary, /git/i);
  } finally {
    dispose();
  }
});

test('every check in this group satisfies the contract statically', async () => {
  const { checkConformance } = await import('./contract.mjs');
  for (const check of checks) {
    assert.deepEqual(checkConformance(check), [], check.id);
  }
});
