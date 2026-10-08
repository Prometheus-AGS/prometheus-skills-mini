// Integration scenarios for the identity resolver, mirroring the skill-pack's
// shared/scripts/tests/test-identity.sh case for case: real git repositories with
// two worktrees, a scratch HOME (so the global git config is the fixture's), and
// the payload shapes Claude Code and Codex actually deliver.
//
// The production failure each one catches: two worktrees of one repository
// recording lessons under different project ids (and so never seeing each
// other's), or a subagent's lessons attributed to the wrong role or team.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { spawnExecutable } from '../platform/spawn.mjs';
import { isTeamRole, resolveIdentity, resolveProject, resolveUserScope } from './identity.mjs';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const scratch = mkdtempSync(path.join(tempDir(), 'identity-'));
const home = path.join(scratch, 'home');
mkdirSync(home, { recursive: true });

// The environment every resolver call sees: scratch HOME, no inherited identity,
// runtime lookup off unless a level explicitly tests it.
const baseEnv = (() => {
  const env = { ...process.env, HOME: home, USERPROFILE: home, PROMETHEUS_PROJECT_ID_SKIP_RUNTIME: '1' };
  for (const key of ['PROMETHEUS_PROJECT_ID', 'PROMETHEUS_USER_ID', 'PROMETHEUS_HARNESS', 'GIT_DIR', 'GIT_WORK_TREE']) delete env[key];
  return env;
})();
const options = (extra = {}) => ({ env: { ...baseEnv, ...extra }, home });

const git = (cwd, ...args) => {
  const result = spawnExecutable('git', args, { cwd, env: baseEnv });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
};

git(home, 'config', '--global', 'user.email', 'fixture@example.invalid');
git(home, 'config', '--global', 'user.name', 'Fixture');
git(home, 'config', '--global', 'init.defaultBranch', 'main');

const repo = path.join(scratch, 'repo');
const worktree = path.join(scratch, 'wt2');
mkdirSync(repo, { recursive: true });
git(repo, 'init', '-q');
writeFileSync(path.join(repo, 'README'), 'seed\n');
git(repo, 'add', 'README');
git(repo, 'commit', '-q', '-m', 'seed');
git(repo, 'worktree', 'add', '-q', worktree, '-b', 'second');
const repoReal = realpathSync(repo);

test.after(() => rmSync(scratch, { recursive: true, force: true }));

test('level 4: two worktrees share project:<sha256(git common dir)>', () => {
  const a = resolveProject(repo, options());
  const b = resolveProject(worktree, options());

  assert.equal(a.projectId, `project:${sha256(path.join(repoReal, '.git'))}`);
  assert.equal(a.source, 'git');
  assert.equal(b.projectId, a.projectId);
});

test('level 3: runtime-registered project UUID wins over git', { skip: process.platform === 'win32' && 'the fake runtime is a POSIX executable' }, () => {
  const bin = path.join(scratch, 'bin');
  mkdirSync(bin, { recursive: true });
  const fake = path.join(bin, 'prometheus');
  writeFileSync(
    fake,
    "#!/usr/bin/env node\nif (process.argv.slice(2).join(' ') === 'kbd status --json') process.stdout.write(JSON.stringify({ projectId: '11111111-2222-3333-4444-555555555555' }) + \"\\n\");\n",
  );
  chmodSync(fake, 0o755);
  const env = { PATH: `${bin}${path.delimiter}${baseEnv.PATH}`, PROMETHEUS_PROJECT_ID_SKIP_RUNTIME: '0' };

  const resolved = resolveProject(repo, options(env));

  assert.deepEqual(resolved, { projectId: '11111111-2222-3333-4444-555555555555', source: 'runtime' });
});

test('level 2: .prometheus/project.json wins over runtime, found from a subdirectory', () => {
  mkdirSync(path.join(repo, '.prometheus'), { recursive: true });
  mkdirSync(path.join(repo, 'sub', 'dir'), { recursive: true });
  writeFileSync(path.join(repo, '.prometheus', 'project.json'), '{"projectId":"from-project-json"}\n');

  const resolved = resolveProject(path.join(repo, 'sub', 'dir'), {
    ...options({ PROMETHEUS_PROJECT_ID_SKIP_RUNTIME: '0' }),
    runtimeProjectId: 'from-runtime',
  });

  assert.deepEqual(resolved, { projectId: 'from-project-json', source: 'project.json' });
});

test('level 1: PROMETHEUS_PROJECT_ID wins over everything', () => {
  const resolved = resolveProject(path.join(repo, 'sub', 'dir'), options({ PROMETHEUS_PROJECT_ID: 'from-env' }));

  assert.deepEqual(resolved, { projectId: 'from-env', source: 'env' });
});

test('user scope is user:<sha256(global git email)[:16]>', () => {
  assert.equal(resolveUserScope(repo, options()), `user:${sha256('fixture@example.invalid').slice(0, 16)}`);
  assert.equal(resolveUserScope(repo, options({ PROMETHEUS_USER_ID: 'abc' })), 'user:abc');
});

const writeTeam = (dir, id, roles) => {
  mkdirSync(path.join(repo, '.agent-team', dir), { recursive: true });
  writeFileSync(
    path.join(repo, '.agent-team', dir, 'team.json'),
    JSON.stringify({ schemaVersion: 1, id, outcome: 'fixture', scope: 'project', harness: 'claude', roles }),
  );
};
const role = (id, owns) => ({ id, description: id, prompt: 'p', skills: [], owns, inputs: [], outputs: [], dependsOn: [] });
const identity = (payload) => resolveIdentity(payload, repo, [], options());

test('agent identity: plugin prefix, Codex underscores, owns globs, unresolved, malformed', async (t) => {
  writeTeam('tlm-fixture', 'tlm-fixture', [role('backend-dev', ['src/api/**']), role('ui-dev', ['src/ui/**', 'src/ui/forms/**'])]);

  await t.test('Claude plugin agent_type <plugin>:backend-dev -> role backend-dev in the sole team', () => {
    const r = identity({ agent_type: 'prometheus-skill-pack:backend-dev', agent_id: 'a1', session_id: 's1' });
    assert.equal(r.roleId, 'backend-dev');
    assert.equal(r.roleSource, 'agent_type');
    assert.equal(r.teamId, 'tlm-fixture');
    assert.equal(r.projectId, 'from-project-json');
    assert.equal(r.harness, 'claude-code');
    assert.equal(r.agentId, 'a1');
    assert.equal(r.sessionId, 's1');
  });

  await t.test('Codex agent_type backend_dev -> role backend-dev (underscore mapped back)', () => {
    const r = identity({ agent_type: 'backend_dev', agent_id: '01a1', turn_id: 't1' });
    assert.equal(r.roleId, 'backend-dev');
    assert.equal(r.harness, 'codex');
  });

  await t.test('unknown agent_type resolves by longest owns glob over the touched path', () => {
    const r = identity({ agent_type: 'general-purpose', tool_input: { file_path: path.join(repo, 'src', 'ui', 'forms', 'login.tsx') } });
    assert.equal(r.roleId, 'ui-dev');
    assert.equal(r.roleSource, 'owns');
  });

  await t.test('no name match and no touched path -> unresolved', () => {
    assert.equal(identity({ agent_type: 'general-purpose' }).roleId, 'unresolved');
  });

  await t.test('malformed payload resolves without throwing', () => {
    const r = resolveIdentity('not json', repo, [], options());
    assert.equal(r.roleId, 'unresolved');
    assert.equal(r.harness, 'other');
  });

  await t.test('--is-team-role matches team roles only', () => {
    assert.equal(isTeamRole('backend_dev', repo), true);
    assert.equal(isTeamRole('planner', repo), false);
  });
});

test('project-routing.json activeTeam selects the team; ambiguity without it is @solo', () => {
  writeTeam('other', 'other', [role('planner', ['src/api/**']), role('ui-dev', ['src/ui/**', 'src/ui/forms/**'])]);
  assert.equal(identity({ agent_type: 'backend-dev' }).teamId, '@solo');

  writeFileSync(path.join(repo, '.agent-team', 'project-routing.json'), '{"schemaVersion":1,"activeTeam":"other"}\n');
  const r = identity({ agent_type: 'planner' });

  assert.equal(r.teamId, 'other');
  assert.equal(r.roleId, 'planner');
});

test('no .agent-team -> @solo', () => {
  const noTeam = path.join(scratch, 'noteam');
  mkdirSync(noTeam, { recursive: true });

  const r = resolveIdentity({ agent_type: 'x' }, noTeam, [], options());

  assert.equal(r.teamId, '@solo');
  assert.equal(r.roleId, 'unresolved');
});
