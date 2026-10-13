// Entry-level scenarios for scripts/kbd-handoff.mjs, spawned as the real entry point (no shell)
// in a scratch project with a scratch home, so it never reads this repo's KBD state or the
// operator's installed skills. PROMETHEUS_BIN points at a nonexistent file (projection path)
// or at a stub .mjs that prints a canonical status document (runtime path).
//
// Production failures these catch: a handoff that proceeds over an interrupted boundary close,
// a dry run that writes, a packet missing a section the receiving harness needs, a typo'd
// harness accepted silently, and a broken installed skill link that goes unreported.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';
import { spawnExecutable } from '../lib/platform/spawn.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = path.join(repoRoot, 'scripts', 'kbd-handoff.mjs');

function write(root, relative, content) {
  const file = path.join(root, ...relative.split('/'));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  return file;
}

function world() {
  const base = mkdtempSync(path.join(tempDir(), 'kbd-handoff-'));
  const root = path.join(base, 'project');
  const home = path.join(base, 'home');
  mkdirSync(home, { recursive: true });
  write(root, '.kbd-orchestrator/current-waypoint.json', {
    path: ['phase-1'], phase: 'phase-1', stageId: 'plan', stageStatus: 'COMPLETE',
    nextChange: 'change-a', nextTask: '1.1', exactNextCommand: '/kbd-assess phase-1',
  });
  write(root, '.kbd-orchestrator/position-reminder.txt', 'Position: phase-1\n');
  write(root, '.kbd-orchestrator/phases/phase-1/progress.json', {
    phase: 'phase-1', completion: { implementation: { completed: 2, total: 5, status: 'IN_PROGRESS' } },
  });
  write(root, '.kbd-orchestrator/phases/phase-1/plan.md',
    '# Plan\n\n## 1. Decisions assumed\n\n- D1 use the fork\n\n## 2. Operator gates, in time order\n\n| Gate | When |\n|---|---|\n| OG-1 | At dispatch |\n\n## 3. Changes\n\n- change-a\n');
  write(root, 'AGENTS.md', '# Rules\n\n## Scope and safety\n\n- Push, tag or publish without the operator.\n- Use timeouts. Always.\n\n## Style\n\n- Never read .env files.\n- Prefer small diffs.\n');
  write(root, '.agent-team/project-routing.json', { manifest: '.agent-team/team-x/team.json' });
  write(root, '.agent-team/team-x/team.json', { id: 'team-x', roles: [{ id: 'builder-one' }, { id: 'reviewer-two' }] });
  write(root, '.kimi-code/agents/builder-one.md', '# builder\n');
  return { base, root, home, dispose: () => rmSync(base, { recursive: true, force: true }) };
}

function run(w, args, extraEnv = {}) {
  const env = {
    ...process.env,
    HOME: w.home,
    USERPROFILE: w.home,
    PROMETHEUS_BIN: path.join(w.base, 'no-such-prometheus.mjs'),
    ...extraEnv,
  };
  return spawnExecutable(process.execPath, [script, ...args], { cwd: w.root, env });
}

function tree(dir) {
  return readdirSync(dir, { recursive: true }).map(String).sort();
}

test('unknown harness is rejected and nothing is written', () => {
  const w = world();
  try {
    const before = tree(w.root);
    const result = run(w, ['--to', 'emacs']);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown harness 'emacs'; supported: claude-code, codex, opencode, kimi-code/);
    assert.deepEqual(tree(w.root), before);
  } finally {
    w.dispose();
  }
});

function statusDocument(extraObligations = {}) {
  return {
    lifecycle: 'ready',
    activePath: { phasePath: ['phase-1'], phaseId: 'phase-1', stageId: 'execute', changeId: 'change-a', taskId: '1.2' },
    phases: {
      'phase-0': { status: 'pending', changes: { 'change-carry': { status: 'pending' } } },
      'phase-1': { status: 'in_progress', changes: { 'change-a': { status: 'in_progress' }, 'change-old': { status: 'complete' } } },
    },
    boundaryObligations: {
      'phase:phase-1': { key: 'phase:phase-1', boundary: 'phase', subject: 'phase-1', exactSignal: 'Starting phase 1 out of 1: phase-1' },
      'change:change-a': { key: 'change:change-a', boundary: 'change', subject: 'change-a' },
      'change:change-carry': { key: 'change:change-carry', boundary: 'change', subject: 'change-carry' },
      ...extraObligations,
    },
  };
}

function stubCli(w, status) {
  return write(w.base, 'fake-prometheus.mjs', `process.stdout.write(${JSON.stringify(JSON.stringify(status))});\n`);
}

test('refuses on an open boundary obligation and prints the repair command', () => {
  const w = world();
  try {
    const status = statusDocument({
      'change:change-old': { key: 'change:change-old', boundary: 'change', subject: 'change-old', exactSignal: 'Starting change 1 out of 2: change-old' },
      'task:change-a/1.1': { key: 'task:change-a/1.1', boundary: 'task', subject: 'change-a/1.1' },
    });
    const result = run(w, ['--to', 'kimi'], { PROMETHEUS_BIN: stubCli(w, status) });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /Starting kbd-handoff — phase-1 to kimi-code/);
    assert.match(result.stderr, /refused: 2 open boundary obligation/);
    assert.match(result.stderr, /change:change-old/);
    assert.match(result.stderr, /task:change-a\/1\.1: task begun and not ended/);
    assert.doesNotMatch(result.stderr, /change:change-a\b|phase:phase-1|change-carry/);
    assert.match(result.stderr, /prometheus kbd guard evaluate --boundary change --edge after --subject change-old --json --repair-projections/);
    assert.match(result.stderr, /--boundary task --edge after --subject change-a\/1\.1 /);
    assert.equal(existsSync(path.join(w.root, '.kbd-orchestrator/phases/phase-1/harness-handoffs')), false);
  } finally {
    w.dispose();
  }
});

test('carried obligations outside the active position warn but do not refuse', () => {
  const w = world();
  try {
    const result = run(w, ['--to', 'claude', '--dry-run'], { PROMETHEUS_BIN: stubCli(w, statusDocument()) });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Open change change-carry \(pending\) is started and not finished/);
    assert.match(result.stdout, /Source: `prometheus kbd status --json`/);
    assert.match(result.stdout, /Next: `change-a` task 1\.2/);
    assert.doesNotMatch(result.stdout, /Boundary obligations not checked/);
  } finally {
    w.dispose();
  }
});

test('refuses when the phase does not exist', () => {
  const w = world();
  try {
    const result = run(w, ['--to', 'codex', '--phase', 'phase-9']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /phase 'phase-9' not found/);
  } finally {
    w.dispose();
  }
});

test('dry run prints the packet and start prompt and writes nothing', () => {
  const w = world();
  try {
    const before = tree(w.root);
    const result = run(w, ['--to', 'codex', '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Dry run: nothing written/);
    assert.match(result.stdout, /## Start prompt/);
    assert.match(result.stdout, /You are Codex taking over KBD phase phase-1/);
    assert.match(result.stdout, /Completed kbd-handoff — phase-1 packet \(dry run\)/);
    assert.deepEqual(tree(w.root), before);
  } finally {
    w.dispose();
  }
});

test('writes one packet with every required section and a JSON sidecar', () => {
  const w = world();
  try {
    const result = run(w, ['--to', 'kimi-code']);
    assert.equal(result.status, 0, result.stderr);
    const dir = path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'harness-handoffs');
    const files = readdirSync(dir).sort();
    assert.equal(files.length, 2);
    assert.match(files[0], /^kimi-code-\d{8}T\d{6}Z\.json$/);
    assert.match(files[1], /^kimi-code-\d{8}T\d{6}Z\.md$/);
    assert.equal(existsSync(path.join(w.root, '.kbd-orchestrator', 'phases', 'phase-1', 'handoffs')), false);

    const packet = readFileSync(path.join(dir, files[1]), 'utf8');
    for (const heading of ['## Position', '## Repositories', '## Read in order', '## Operator gates and decisions',
      '## Task execution rules', '## Never do', '## Target harness', '## Open prerequisites', '## Start prompt']) {
      assert.ok(packet.includes(heading), `missing ${heading}`);
    }
    assert.match(packet, /Implementation: 2 of 5/);
    assert.match(packet, /Next: `change-a` task 1\.1/);
    assert.match(packet, /OG-1/);
    assert.match(packet, /Push, tag or publish without the operator\./);
    assert.match(packet, /Never read \.env files\./);
    assert.doesNotMatch(packet, /Prefer small diffs/);
    assert.match(packet, /Missing Kimi Code role definitions in `\.kimi-code\/agents`: `reviewer-two`/);
    assert.match(packet, /Boundary obligations not checked/);
    assert.match(packet, /1\. `AGENTS\.md`/);
    assert.match(packet, /begin-task/);

    const sidecar = JSON.parse(readFileSync(path.join(dir, files[0]), 'utf8'));
    assert.equal(sidecar.schema, 'prometheus-kbd-harness-handoff-v1');
    assert.equal(sidecar.harness, 'kimi-code');
    assert.deepEqual(sidecar.position.implementation, { completed: 2, total: 5 });
    assert.equal(sidecar.position.obligationsChecked, false);
    assert.match(result.stdout, /Start prompt:/);
    assert.match(result.stdout, new RegExp(`Completed kbd-handoff — phase-1 packet ${sidecar.packet.replace(/[.]/g, '\\.')}`));

    const waypoint = JSON.parse(readFileSync(path.join(w.root, '.kbd-orchestrator', 'current-waypoint.json'), 'utf8'));
    assert.equal(waypoint.nextTask, '1.1');
  } finally {
    w.dispose();
  }
});

test('reports a broken installed kbd skill symlink by path', (t) => {
  const w = world();
  try {
    const skills = path.join(w.home, '.kimi-code', 'skills');
    write(skills, 'kbd-apply/SKILL.md', '---\nname: kbd-apply\n---\n');
    write(skills, 'kbd-status/SKILL.md', '---\nname: kbd-status\n---\n');
    const broken = path.join(skills, 'kbd-handoff');
    try {
      symlinkSync(path.join(w.base, 'missing-skill-target'), broken, 'dir');
    } catch (error) {
      t.skip(`symlinks unavailable here: ${error.code}`);
      return;
    }
    const result = run(w, ['--to', 'kimi-code', '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stderr.includes(`Broken skill install: \`${broken}\` (symlink target missing)`), result.stderr);
    assert.ok(result.stdout.includes(`Broken skill install: \`${broken}\``));
    assert.match(result.stdout, /Installed `kbd-\*` skills resolved: `kbd-apply`, `kbd-status`/);
    assert.doesNotMatch(result.stdout, /Skills not resolvable/);
  } finally {
    w.dispose();
  }
});
