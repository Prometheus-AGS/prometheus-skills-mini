// The registered plugin marketplace source must keep existing, and should not be a
// topic-branch checkout.
//
// A Claude Code marketplace registered as a `directory` is read IN PLACE. If that directory is a
// git worktree on a feature branch, it lives only as long as the branch: when the branch merges
// and the worktree is removed, the plugin directory disappears underneath running sessions and the
// harness refuses to run ANY hook of the plugin, before the hook's own code can say why. No
// hook-level fix can help, so this check is the only place it can be seen coming.
//
// Read-only on purpose: git probes use --no-optional-locks (a plain `git status` refreshes and
// WRITES the index), and nothing here writes anywhere. Claude Code's registration only: Codex
// registrations live in config.toml, which this check does not parse, and the summary says so.
//
// Registry files are untrusted input; every field is validated before use and anything
// unreadable or unexpected is reported, never read as "fine" or as "missing".

import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../platform/spawn.mjs';
import { homeDir } from '../platform/paths.mjs';

export const MARKETPLACE = 'prometheus-skills-mini';
const CODEX_NOTE = 'Only the Claude Code registration is inspected; Codex registrations are not.';

/** A branch a durable plugin source may track. A detached HEAD (a tag checkout) is fine. */
export const isReleaseLineBranch = (branch) =>
  !branch || /^(main|master)$/.test(branch) || /(^|\/)main$/.test(branch) || /^release\//.test(branch);

const readRegistry = (home) => {
  const file = path.join(home, '.claude', 'plugins', 'known_marketplaces.json');
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    return error?.code === 'ENOENT' ? { state: 'absent' } : { state: 'unreadable', file, why: error?.code ?? 'read error' };
  }
  try {
    return { state: 'ok', file, value: JSON.parse(text) };
  } catch {
    return { state: 'unreadable', file, why: 'malformed JSON' };
  }
};

const git = (spawn, dir, args) => {
  const result = spawn('git', ['--no-optional-locks', '-C', dir, ...args]);
  return { status: result?.status ?? null, stdout: String(result?.stdout ?? '').trim(), stderr: String(result?.stderr ?? '').trim() };
};

const canonical = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};

export const checks = [
  {
    id: 'mini-plugin-source',
    title: 'Plugin marketplace source',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      const home = ctx.home ?? homeDir();
      const spawn = ctx.spawn ?? spawnExecutable;
      const registry = readRegistry(home);

      if (registry.state === 'absent') return { status: 'skip', summary: `no Claude Code marketplace registrations. ${CODEX_NOTE}` };
      if (registry.state === 'unreadable') {
        return { status: 'warn', summary: `${registry.file} could not be read (${registry.why}), so the marketplace source cannot be checked` };
      }

      const entry = registry.value && typeof registry.value === 'object' ? registry.value[MARKETPLACE] : undefined;
      if (entry === undefined) return { status: 'skip', summary: `${MARKETPLACE} is not registered with Claude Code. ${CODEX_NOTE}` };
      const source = entry && typeof entry === 'object' ? entry.source : undefined;
      if (!source || typeof source !== 'object' || source.source !== 'directory') {
        return { status: 'skip', summary: `${MARKETPLACE} is not registered from a local directory, so there is no checkout to verify. ${CODEX_NOTE}` };
      }
      const dir = source.path;
      if (typeof dir !== 'string' || dir.trim() === '') {
        return { status: 'warn', summary: `the ${MARKETPLACE} registration has no usable directory path, so it cannot be checked` };
      }

      // Only "it is not there" is a missing source. A path that cannot be examined (EACCES, ELOOP…)
      // is advisory: the source may well exist.
      try {
        statSync(dir);
      } catch (error) {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
          return {
            status: 'fail',
            summary: `the registered ${MARKETPLACE} source ${dir} does not exist`,
            detail: 'Every hook of this plugin fails until it is restored. Point the marketplace at a durable release-line checkout, then reload plugins or restart the session: a running session keeps the path it loaded.',
          };
        }
        return { status: 'warn', summary: `the registered ${MARKETPLACE} source ${dir} could not be examined (${error?.code ?? 'error'})` };
      }

      const inside = git(spawn, dir, ['rev-parse', '--git-dir']);
      if (inside.status !== 0) {
        if (/not a git repository/i.test(inside.stderr)) {
          return { status: 'warn', summary: `the registered source ${dir} is not a git checkout, so its version cannot be verified` };
        }
        return { status: 'warn', summary: `the registered source ${dir} could not be inspected with git${inside.stderr ? `: ${inside.stderr.split('\n')[0]}` : ''}` };
      }
      // symbolic-ref --quiet exits 1 with no output on a detached HEAD (expected); anything else is an error.
      const head = git(spawn, dir, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
      if (head.status !== 0 && head.status !== 1) {
        return { status: 'warn', summary: `the branch of the registered source ${dir} could not be determined` };
      }
      const branch = head.status === 0 ? head.stdout : null;
      if (!isReleaseLineBranch(branch)) {
        return {
          status: 'warn',
          summary: `the registered ${MARKETPLACE} source ${dir} is on topic branch '${branch}'`,
          detail: 'If that branch or worktree is removed, every hook of this plugin fails. Register a durable release-line checkout instead (for example the main checkout on main).',
        };
      }
      return { status: 'pass', summary: `${MARKETPLACE} is registered from ${canonical(dir)} (${branch ?? 'detached HEAD'}). ${CODEX_NOTE}` };
    },
  },
];
