// Runtime checks: the Node floor, the version authority, and the submodule checkouts.
// Nothing here touches the network or a service, so this group runs everywhere and is
// the first thing a terminal reader sees.
//
// Every effect arrives through `ctx` so the tests run against fixtures rather than this
// machine. The defaults are the real readers.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnExecutable } from '../platform/spawn.mjs';

const NODE_FLOOR = 22;

// Loaded on demand, not statically. A static import of a module that has not landed
// aborts the WHOLE registry at load time, so every check would vanish instead of the one
// dependent check skipping — the opposite of "runnable before its dependencies land".
// `review-housekeeping` created this one, so it is present today; the shape is what keeps
// the contract true for the next dependency as well.
const loadVersionsToml = async () => {
  try {
    return await import('../../rules/lib/versions-toml.mjs');
  } catch {
    return null;
  }
};

const repoRootDefault = () => fileURLToPath(new URL('../../', import.meta.url));

/** The gitlink commit at `p` in HEAD, or null; throws when git itself cannot be read. */
const lsTreeDefault = (repoRoot) => (p) => {
  const result = spawnExecutable('git', ['ls-tree', 'HEAD', '--', p], { cwd: repoRoot });
  if (result.status !== 0) throw new Error(`git ls-tree failed: ${(result.stderr ?? '').trim()}`);
  const match = /^160000 commit ([0-9a-f]{40})\t/.exec((result.stdout ?? '').trim());
  return match ? match[1] : null;
};

/** Every gitlink path in HEAD; throws when git cannot be read, never reports an empty tree. */
const listGitlinksDefault = (repoRoot) => () => {
  const result = spawnExecutable('git', ['ls-tree', '-r', 'HEAD'], { cwd: repoRoot });
  if (result.status !== 0) throw new Error(`git ls-tree failed: ${(result.stderr ?? '').trim()}`);
  return (result.stdout ?? '')
    .split('\n')
    .map((line) => /^160000 commit [0-9a-f]{40}\t(.+)$/.exec(line))
    .filter(Boolean)
    .map((match) => match[1]);
};

export const checks = [
  {
    id: 'mini-node-version',
    title: 'Node.js version',
    offers: [],
    fixes: {},
    async run({ nodeVersion = process.versions.node } = {}) {
      // Numeric: '9.0.0' sorts above '22.0.0' as a string, so a lexical compare would
      // pass a runtime four majors too old.
      const major = Number.parseInt(String(nodeVersion).split('.')[0], 10);

      if (!Number.isFinite(major)) {
        return { status: 'fail', summary: `Could not read the Node version from ${JSON.stringify(nodeVersion)}` };
      }
      if (major < NODE_FLOOR) {
        return {
          status: 'fail',
          summary: `Node ${nodeVersion} is below the floor of ${NODE_FLOOR}`,
          detail: `This pack targets Node LTS >= ${NODE_FLOOR}. Install a supported runtime and re-run.`,
        };
      }
      return { status: 'pass', summary: `Node ${nodeVersion}` };
    },
  },

  {
    id: 'mini-versions-toml',
    title: 'Version authority',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      const repoRoot = ctx.repoRoot ?? repoRootDefault();
      const versionsToml = path.join(repoRoot, 'versions.toml');

      if (!existsSync(versionsToml)) {
        return {
          status: 'skip',
          summary: 'versions.toml has not been authored yet',
          detail: `Expected at ${versionsToml}. The operator writes it; agents never do. See docs/versions-toml.md.`,
        };
      }

      // `in`, not `??`: an explicitly injected `null` means "absent", and `??` would
      // fall through to the real loader and quietly test nothing.
      const versions = 'versionsToml' in ctx ? ctx.versionsToml : await loadVersionsToml();
      if (!versions?.parseVersionsToml || !versions?.compareToTree) {
        return {
          status: 'skip',
          summary: 'The versions comparison is not available',
          detail: 'rules/lib/versions-toml.mjs could not be loaded; this check runs once it is present.',
        };
      }
      const { parseVersionsToml, compareToTree } = versions;

      let disagreements;
      try {
        const parsed = parseVersionsToml(readFileSync(versionsToml, 'utf8'));
        const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
        disagreements = compareToTree(parsed, {
          lsTree: ctx.lsTree ?? lsTreeDefault(repoRoot),
          listGitlinks: ctx.listGitlinks ?? listGitlinksDefault(repoRoot),
          packageJson,
        });
      } catch (error) {
        // A file the operator wrote that will not parse is a finding about the file,
        // not a crash of the doctor.
        return {
          status: 'fail',
          summary: 'versions.toml could not be read',
          detail: String(error?.message ?? error),
        };
      }

      if (disagreements.length > 0) {
        return {
          status: 'fail',
          summary: `versions.toml disagrees with the tree in ${disagreements.length} place(s)`,
          detail: disagreements.join('\n'),
        };
      }
      return { status: 'pass', summary: 'versions.toml agrees with the tree' };
    },
  },

  {
    id: 'mini-submodules',
    title: 'Submodule checkouts',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      const repoRoot = ctx.repoRoot ?? repoRootDefault();

      let gitlinks;
      try {
        gitlinks = (ctx.listGitlinks ?? listGitlinksDefault(repoRoot))();
      } catch (error) {
        // Reporting "no submodules" here would be a pass over an unread tree.
        return {
          status: 'skip',
          summary: 'git could not be read, so submodules were not checked',
          detail: String(error?.message ?? error),
        };
      }

      const exists = ctx.exists ?? existsSync;

      const empty = gitlinks.filter((p) => {
        const dir = path.join(repoRoot, p);
        try {
          return readdirSync(dir).length === 0;
        } catch {
          return true; // absent entirely
        }
      });

      if (empty.length > 0) {
        return {
          status: 'fail',
          summary: `${empty.length} of ${gitlinks.length} submodule(s) are not checked out`,
          detail: `${empty.join('\n')}\n\nRun: git submodule update --init --recursive`,
        };
      }

      // Checked out is not the same as usable. A submodule whose build output is missing
      // is a directory full of source that nothing can run — reporting it as healthy
      // would be a pass over something never verified. Only paths that ARE pinned are
      // examined, so this says nothing about submodules this tree does not have.
      // Each vendored submodule must be BUILT, not merely checked out: a submodule is
      // vendored precisely so this tree uses its own copy. `mini-pk` asks a different
      // question — whether some pk resolves and runs — and a pk on PATH may belong to
      // another install entirely (on this machine it is the full pack's
      // ~/.local/bin/pk). A mini tree whose vendored pk was never built is not set up,
      // however healthy that other binary is. Same rule the sycophancy resolver uses:
      // `tools/<name>/target/release/` is the developer-checkout location.
      const BUILT = [
        { submodule: 'tools/openspec', artifact: 'dist', build: 'npm --prefix tools/openspec run build' },
        {
          submodule: 'tools/prometheus-knowledge',
          artifact: path.join('target', 'release', process.platform === 'win32' ? 'pk.exe' : 'pk'),
          build: 'cargo build --release --manifest-path tools/prometheus-knowledge/Cargo.toml -p pk-cli',
        },
      ];
      const unbuilt = BUILT.filter(
        ({ submodule, artifact }) =>
          gitlinks.includes(submodule) && !exists(path.join(repoRoot, submodule, artifact)),
      );

      // WARN, not fail. An unbuilt vendored artifact means this tree is incompletely set
      // up, which is worth saying — but a usable binary may be on PATH from another
      // install, so the machine is not broken. `mini-pk` reports whether one resolves.
      // A missing CHECKOUT above stays a failure: there is nothing there to build.
      if (unbuilt.length > 0) {
        return {
          status: 'warn',
          summary: `${unbuilt.length} submodule(s) are checked out but not built`,
          detail: unbuilt.map((u) => `${u.submodule}: ${u.artifact} is missing — run: ${u.build}`).join('\n'),
        };
      }

      return {
        status: 'pass',
        summary:
          gitlinks.length === 0
            ? 'No submodules are pinned'
            : `${gitlinks.length} submodule(s) are checked out and built`,
      };
    },
  },
];
