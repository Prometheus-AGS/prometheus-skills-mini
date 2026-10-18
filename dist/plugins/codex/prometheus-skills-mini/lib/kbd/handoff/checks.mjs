// Readiness checks for a handoff: the repository's clean/pushed state and whether the target
// harness can resume (native role definitions for the project's agent team, and installed
// `kbd-*` skills that resolve). Read-only: inspects files and runs read-only git commands.

import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../../platform/spawn.mjs';
import { agentFileName } from './harnesses.mjs';

const GIT_TIMEOUT_MS = 15000;
// The skills the start prompt tells the receiving harness to use.
export const REQUIRED_SKILLS = Object.freeze(['kbd-apply', 'kbd-status']);

function git(root, args) {
  try {
    const result = spawnExecutable('git', ['-C', root, ...args], {
      timeout: GIT_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error || result.status !== 0) return null;
    return result.stdout.trim();
  } catch {
    return null;
  }
}

/** Branch, commit, dirty files and push state of the repository holding `root`. */
export function repoState(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (top === null) return { root, isRepo: false };
  const porcelain = git(root, ['status', '--porcelain']) ?? '';
  const dirty = porcelain.split(/\r?\n/).filter(Boolean);
  const upstream = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const counts = upstream ? git(root, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`]) : null;
  const [behind, ahead] = (counts ?? '').split(/\s+/).map((value) => Number.parseInt(value, 10));
  return {
    root: top,
    isRepo: true,
    branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    commit: git(root, ['rev-parse', '--short', 'HEAD']),
    dirty,
    upstream,
    ahead: Number.isFinite(ahead) ? ahead : null,
    behind: Number.isFinite(behind) ? behind : null,
  };
}

/** Warnings for a dirty or unpushed repository. Never a refusal. */
export function repoWarnings(repo) {
  if (!repo.isRepo) return [`${repo.root} is not inside a git repository; clean/pushed state unknown`];
  const warnings = [];
  if (repo.dirty.length) warnings.push(`worktree ${repo.root} has ${repo.dirty.length} uncommitted change(s)`);
  if (!repo.upstream) warnings.push(`branch ${repo.branch} has no upstream; commits are not pushed`);
  else if (repo.ahead) warnings.push(`branch ${repo.branch} is ${repo.ahead} commit(s) ahead of ${repo.upstream} (unpushed)`);
  return warnings;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** The project's agent team manifest: from project-routing.json, else the only team dir. */
function teamManifest(root) {
  const teamRoot = path.join(root, '.agent-team');
  if (!existsSync(teamRoot)) return null;
  const routing = readJson(path.join(teamRoot, 'project-routing.json'));
  if (typeof routing?.manifest === 'string') {
    const file = path.join(root, routing.manifest);
    return { file, team: readJson(file) };
  }
  const candidates = readdirSync(teamRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(teamRoot, entry.name, 'team.json')));
  if (candidates.length !== 1) return null;
  const file = path.join(teamRoot, candidates[0].name, 'team.json');
  return { file, team: readJson(file) };
}

/** Which team roles lack a native definition in the target harness's agents directory. */
export function nativeRoleCheck(root, harness) {
  const manifest = teamManifest(root);
  if (!manifest) return { hasTeam: false };
  const roles = Array.isArray(manifest.team?.roles)
    ? manifest.team.roles.map((role) => role?.id).filter((id) => typeof id === 'string' && id)
    : [];
  const agentsDir = path.join(root, ...harness.agentsDir.split('/'));
  const missing = roles.filter((id) => !existsSync(path.join(agentsDir, agentFileName(harness, id))));
  return {
    hasTeam: true,
    manifest: path.relative(root, manifest.file).split(path.sep).join('/'),
    agentsDir: harness.agentsDir,
    roles,
    missing,
  };
}

function inspectSkillEntry(dir, name) {
  const entry = path.join(dir, name);
  const link = lstatSync(entry, { throwIfNoEntry: false });
  if (!link) return null;
  let target;
  try {
    target = statSync(entry);
  } catch {
    return { name, path: entry, state: 'broken', detail: link.isSymbolicLink() ? 'symlink target missing' : 'unreadable' };
  }
  if (!target.isDirectory()) return { name, path: entry, state: 'broken', detail: 'not a directory' };
  if (!existsSync(path.join(entry, 'SKILL.md'))) return { name, path: entry, state: 'broken', detail: 'no SKILL.md' };
  return { name, path: entry, state: 'ok', detail: link.isSymbolicLink() ? 'symlink' : 'directory' };
}

/**
 * Installed `kbd-*` skills for the target harness under the user home and the project. Each
 * entry is resolved through any link; a dangling link, a non-directory or a directory without
 * SKILL.md is reported as broken by path.
 */
export function skillCheck(harness, { home, root }) {
  const bases = [...new Set([home, root].filter(Boolean))];
  const roots = bases.flatMap((base) => harness.skillRoots.map((relative) => path.join(base, ...relative.split('/'))));
  const present = roots.filter((dir) => existsSync(dir));
  const entries = present.flatMap((dir) => readdirSync(dir)
    .filter((name) => name.startsWith('kbd-'))
    .sort()
    .map((name) => inspectSkillEntry(dir, name))
    .filter(Boolean));
  const resolved = new Set(entries.filter((entry) => entry.state === 'ok').map((entry) => entry.name));
  return {
    checkedRoots: roots,
    presentRoots: present,
    resolved: [...resolved].sort(),
    broken: entries.filter((entry) => entry.state === 'broken'),
    missingRequired: REQUIRED_SKILLS.filter((name) => !resolved.has(name)),
  };
}
