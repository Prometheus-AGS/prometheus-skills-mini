// Resolve the agent behind a hook payload to (projectId, teamId, roleId).
//
// A Node port of the skill-pack's two Python resolvers,
// shared/scripts/lib/project_id.py and shared/scripts/lib/agent_identity.py,
// with the same precedence and the same output keys. Design:
// docs/design/team-aware-learning-memory.md §1 (skill-pack).
//
// Project id, first non-empty wins:
//   1. PROMETHEUS_PROJECT_ID
//   2. .prometheus/project.json -> projectId   (searched upward)
//   3. the runtime-registered project UUID (`prometheus kbd status --json`, 2 s),
//      skipped when PROMETHEUS_PROJECT_ID_SKIP_RUNTIME=1
//   4. project:<sha256(realpath(git common dir))>, so all worktrees share one id
//
// Role: strip a `<plugin>:` prefix and map Codex `_` back to `-`; a role id in the
// active team manifest wins, else the longest `owns` glob over the touched paths,
// else `unresolved`. Team: `.agent-team/project-routing.json` activeTeam, else the
// sole team, else `@solo`.
//
// Never throws to a hook: every unreadable input degrades to the next level, and
// total failure yields `project:unknown` and an `unresolved` role.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { homeDir } from '../platform/paths.mjs';
import { spawnExecutable } from '../platform/spawn.mjs';
import { readText } from '../platform/text.mjs';

export const RUNTIME_TIMEOUT_MS = 2000;
const GIT_TIMEOUT_MS = 2000;
export const SOLO_TEAM = '@solo';
export const UNRESOLVED = 'unresolved';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const nonEmpty = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');
const isDirectory = (candidate) => {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
};
const readJson = (file) => JSON.parse(readText(file));

// (start, *start.parents) — the walk both Python resolvers use.
function* upward(start) {
  let cursor = path.resolve(start);
  for (;;) {
    yield cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) return;
    cursor = parent;
  }
}

function fromProjectJson(start) {
  for (const directory of upward(start)) {
    const candidate = path.join(directory, '.prometheus', 'project.json');
    if (!existsSync(candidate)) continue;
    // The first project.json found decides, even when it is unreadable: the
    // reference stops here rather than searching further up.
    try {
      return nonEmpty(readJson(candidate)?.projectId);
    } catch {
      return '';
    }
  }
  return '';
}

// `{ stdout }` on exit 0, `{ missing: true }` when the program is not there,
// `{}` for any other failure (non-zero exit, timeout, refused script).
const execute = (program, args, { cwd, env, timeout }) => {
  try {
    const result = spawnExecutable(program, args, { cwd, env, timeout });
    if (result.error) return result.error.code === 'ENOENT' ? { missing: true } : {};
    return result.status === 0 ? { stdout: result.stdout ?? '' } : {};
  } catch {
    return {};
  }
};
const run = (program, args, options) => execute(program, args, options).stdout ?? null;

function idFromStatus(status) {
  if (!status || typeof status !== 'object' || Array.isArray(status)) return '';
  for (const key of ['projectId', 'project_id']) {
    const value = nonEmpty(status[key]);
    if (value) return value;
  }
  const project = status.project;
  if (project && typeof project === 'object') return nonEmpty(project.id || project.projectId);
  return '';
}

// `shutil.which("prometheus") or ~/.local/bin/prometheus`: the fallback is tried
// only when PATH has no prometheus at all, never after one that failed.
function fromRuntime(cwd, { env, home }) {
  const args = ['kbd', 'status', '--json'];
  const options = { cwd, env, timeout: RUNTIME_TIMEOUT_MS };
  let outcome = execute('prometheus', args, options);
  const fallback = path.join(home, '.local', 'bin', 'prometheus');
  if (outcome.missing && existsSync(fallback)) outcome = execute(fallback, args, options);
  if (outcome.stdout === undefined) return '';
  try {
    return idFromStatus(JSON.parse(outcome.stdout));
  } catch {
    return '';
  }
}

const git = (cwd, args, env) => (run('git', args, { cwd, env, timeout: GIT_TIMEOUT_MS }) ?? '').trim();

function fromGit(cwd, env) {
  const common = git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'], env);
  if (!common) return '';
  let real = common;
  try {
    real = realpathSync(common);
  } catch {
    // os.path.realpath never fails; keep the path as git reported it.
  }
  return `project:${sha256(real)}`;
}

/**
 * `{ projectId, source }`. `runtimeProjectId`, when given, is an id the caller
 * already holds from the runtime (canonical KBD state); it stands in for level 3
 * without spawning, and levels 1-2 still take precedence over it.
 */
export function resolveProject(cwd, { env = process.env, home = homeDir(), runtimeProjectId } = {}) {
  const fromEnv = nonEmpty(env.PROMETHEUS_PROJECT_ID);
  if (fromEnv) return { projectId: fromEnv, source: 'env' };
  const fromJson = fromProjectJson(cwd);
  if (fromJson) return { projectId: fromJson, source: 'project.json' };
  if (env.PROMETHEUS_PROJECT_ID_SKIP_RUNTIME !== '1') {
    const fromRun = nonEmpty(runtimeProjectId) || fromRuntime(cwd, { env, home });
    if (fromRun) return { projectId: fromRun, source: 'runtime' };
  }
  const fromRepo = fromGit(cwd, env);
  if (fromRepo) return { projectId: fromRepo, source: 'git' };
  return { projectId: 'project:unknown', source: 'none' };
}

/** PROMETHEUS_USER_ID, else user:<sha256(lowercased global git user.email)[:16]>. */
export function resolveUserScope(cwd, { env = process.env } = {}) {
  const value = nonEmpty(env.PROMETHEUS_USER_ID);
  if (value) return value.startsWith('@user:') || value.startsWith('user:') ? value : `user:${value}`;
  const email = git(cwd, ['config', '--global', 'user.email'], env);
  if (!email) return 'user:unknown';
  return `user:${sha256(email.toLowerCase()).slice(0, 16)}`;
}

export function normaliseAgentType(agentType) {
  let name = typeof agentType === 'string' ? agentType.trim() : '';
  if (name.includes(':')) name = name.slice(name.lastIndexOf(':') + 1);
  return name.replaceAll('_', '-').toLowerCase();
}

export function findTeamRoot(start) {
  for (const directory of upward(start)) {
    if (isDirectory(path.join(directory, '.agent-team'))) return directory;
  }
  return null;
}

/** Team manifests in sorted path order, keyed by `id` (else the directory name). */
export function loadTeams(root) {
  const base = path.join(root, '.agent-team');
  const teams = new Map();
  let names = [];
  try {
    names = readdirSync(base).sort();
  } catch {
    return teams;
  }
  for (const name of names) {
    const manifest = path.join(base, name, 'team.json');
    if (!existsSync(manifest)) continue;
    let data;
    try {
      data = readJson(manifest);
    } catch {
      continue;
    }
    if (data && typeof data === 'object' && Array.isArray(data.roles)) {
      teams.set(typeof data.id === 'string' ? data.id : name, data);
    }
  }
  return teams;
}

export function activeTeam(root, teams) {
  const routing = path.join(root, '.agent-team', 'project-routing.json');
  if (existsSync(routing)) {
    let selected = null;
    try {
      selected = readJson(routing)?.activeTeam;
    } catch {
      selected = null;
    }
    if (typeof selected === 'string' && teams.has(selected)) return { teamId: selected, team: teams.get(selected) };
  }
  if (teams.size === 1) {
    const [[teamId, team]] = teams;
    return { teamId, team };
  }
  return { teamId: SOLO_TEAM, team: null };
}

const validRoles = (team) =>
  (team?.roles ?? []).filter((role) => role && typeof role === 'object' && typeof role.id === 'string');

export const roleIds = (team) => validRoles(team).map((role) => role.id);

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/** Python fnmatch.translate: `*` and `?` cross `/`, `[!x]` negates, an unclosed `[` is literal. */
export function globToRegExp(glob) {
  let out = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i++];
    if (c === '*') {
      out += '.*';
      while (glob[i] === '*') i += 1;
    } else if (c === '?') {
      out += '.';
    } else if (c === '[') {
      let j = i;
      if (glob[j] === '!') j += 1;
      if (glob[j] === ']') j += 1;
      while (j < glob.length && glob[j] !== ']') j += 1;
      if (j >= glob.length) {
        out += '\\[';
      } else {
        let set = glob.slice(i, j).replaceAll('\\', '\\\\');
        i = j + 1;
        if (set.startsWith('!')) set = `^${set.slice(1)}`;
        else if (set.startsWith('^')) set = `\\${set}`;
        out += `[${set}]`;
      }
    } else {
      out += escapeRegExp(c);
    }
  }
  return new RegExp(`^(?:${out})$`, 's');
}

/** Longest matching `owns` glob wins, ties by manifest order; `{ roleId, ambiguous }`. */
export function matchOwns(team, paths) {
  if (!team || !paths?.length) return { roleId: '', ambiguous: false };
  const hits = [];
  validRoles(team).forEach((role, order) => {
    for (const glob of role.owns ?? []) {
      if (typeof glob !== 'string') continue;
      const pattern = globToRegExp(glob);
      if (paths.some((candidate) => pattern.test(candidate))) hits.push({ length: glob.length, order, roleId: role.id });
    }
  });
  if (!hits.length) return { roleId: '', ambiguous: false };
  // Python sorts (len, -order, id) descending; the same total order here.
  hits.sort((a, b) => b.length - a.length || a.order - b.order || (a.roleId < b.roleId ? 1 : a.roleId > b.roleId ? -1 : 0));
  const [top, next] = hits;
  return { roleId: top.roleId, ambiguous: Boolean(next && next.length === top.length && next.roleId !== top.roleId) };
}

// Path.resolve(strict=False): resolve symlinks through the longest existing
// ancestor, keep the non-existent tail as written.
function resolveLoose(candidate) {
  const absolute = path.resolve(candidate);
  const tail = [];
  let cursor = absolute;
  for (;;) {
    try {
      return path.join(realpathSync(cursor), ...tail.reverse());
    } catch {
      const parent = path.dirname(cursor);
      if (parent === cursor) return absolute;
      tail.push(path.basename(cursor));
      cursor = parent;
    }
  }
}

export function touchedPaths(payload, root) {
  const input = payload?.tool_input;
  const paths = [];
  if (input && typeof input === 'object') {
    for (const key of ['file_path', 'path', 'notebook_path']) {
      if (typeof input[key] === 'string' && input[key]) paths.push(input[key]);
    }
  }
  return paths.map((candidate) => {
    if (root && path.isAbsolute(candidate)) {
      const relative = path.relative(resolveLoose(root), resolveLoose(candidate));
      if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return relative.split(path.sep).join('/');
    }
    return candidate.split(path.sep).join('/');
  });
}

export function harnessOf(payload, env = process.env) {
  const explicit = nonEmpty(env.PROMETHEUS_HARNESS);
  if (explicit) return explicit;
  if (payload && Object.hasOwn(payload, 'turn_id')) return 'codex';
  return payload && Object.keys(payload).length ? 'claude-code' : 'other';
}

/** The payload's own `cwd` when it names a directory, else the caller's. */
export const baseDirOf = (payload, cwd) =>
  typeof payload?.cwd === 'string' && isDirectory(payload.cwd) ? payload.cwd : cwd;

const stringOrNull = (value) => (typeof value === 'string' ? value : null);

/** The identity JSON of agent_identity.py, key for key. */
export function resolveIdentity(payload, cwd, extraPaths = [], options = {}) {
  const input = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const base = baseDirOf(input, cwd);
  const { projectId, source } = resolveProject(base, options);
  const root = findTeamRoot(base);
  const { teamId, team } = root ? activeTeam(root, loadTeams(root)) : { teamId: SOLO_TEAM, team: null };
  const agentType = typeof input.agent_type === 'string' ? input.agent_type : '';
  const name = normaliseAgentType(agentType);
  let roleId = UNRESOLVED;
  let roleSource = 'none';
  let ambiguous = false;
  if (name && roleIds(team).includes(name)) {
    roleId = name;
    roleSource = 'agent_type';
  } else {
    const owner = matchOwns(team, extraPaths.length ? extraPaths : touchedPaths(input, root));
    ambiguous = owner.ambiguous;
    if (owner.roleId) {
      roleId = owner.roleId;
      roleSource = 'owns';
    }
  }
  return {
    projectId,
    projectIdSource: source,
    teamId,
    roleId,
    roleSource,
    ambiguous,
    agentType: agentType || null,
    agentId: stringOrNull(input.agent_id),
    sessionId: stringOrNull(input.session_id),
    harness: harnessOf(input, options.env ?? process.env),
  };
}

/** `--is-team-role`: true when the name resolves to a role of an active team. */
export function isTeamRole(agentType, cwd) {
  const root = findTeamRoot(cwd);
  if (!root) return false;
  const { team } = activeTeam(root, loadTeams(root));
  return team !== null && roleIds(team).includes(normaliseAgentType(agentType));
}
