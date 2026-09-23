// Port of shared/lib/hooks.sh (prometheus-skill-pack, 419 lines).
//
// The KBD hooks dispatcher. `hooksFire(kind, edge, name, index, total, ctx)` fires
// `<kind>:<edge>` lifecycle events, loading matching entries from three layers (builtin, user,
// project — project wins on override, last-within-layer wins), running each matched command,
// and recording a JSONL log + a rolling hooks-status.json summary.
//
// Judgment call: the source runs each hook's `command` through `bash -c "$command"` with a
// `timeout(1)` wrapper (degrading gracefully where `timeout` is absent, e.g. macOS by default).
// This repo forbids shell-string execution outright (`node-scripts.md`: "spawn/spawnSync with
// shell:false and an args array. Never build a command string"), so this port never invokes a
// shell at all — `ctx.runCommand(command, env)` is an injected function the caller supplies to
// actually execute a hook's configured command (e.g. by parsing it into a program + args array
// and calling `spawnExecutable`), and this module owns only dispatch, resolution, logging and
// status bookkeeping around that call. This is a real behavioural divergence, named here per the
// task's instruction: hook-command strings that rely on shell features (globbing, pipes,
// `&&`) will not work unchanged and must be ported to explicit argv by whoever configures them.
//
// Judgment call: hooks.mjs does NOT import waypoint.mjs. The source sources waypoint.sh for
// `chain_separator`/`waypoint_chain`/`waypoint_load` to build the `phase_path` context string,
// but guards every call with `command -v ... >/dev/null` so hooks still fire when those
// functions are unavailable. This port takes the already-resolved `phasePath`/`childPath`
// directly on `ctx` (the caller, e.g. a future skill entry point, builds it via waypoint.mjs
// when it has one) rather than hard-importing waypoint.mjs from hooks.mjs — matching
// progress.mjs's `hooksFire` optional-callback pattern of keeping these modules decoupled.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { hooksFire, normalizeEvent } from './hooks.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'hooks-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};

// ---------------------------------------------------------------------------
// normalizeEvent
// ---------------------------------------------------------------------------

test('normalizeEvent maps legacy event names to canonical <kind>:<edge>', () => {
  assert.equal(normalizeEvent('on_phase_complete'), 'phase:after');
  assert.equal(normalizeEvent('on_plan_complete'), 'plan:after');
  assert.equal(normalizeEvent('on_reflection_complete'), 'reflect:after');
  assert.equal(normalizeEvent('on_assessment_complete'), 'assess:after');
});

test('normalizeEvent maps *:begin / *:end to before/after', () => {
  assert.equal(normalizeEvent('task:begin'), 'task:before');
  assert.equal(normalizeEvent('task:end'), 'task:after');
});

test('normalizeEvent passes through situational events unchanged', () => {
  assert.equal(normalizeEvent('on_blocker_detected'), 'on_blocker_detected');
  assert.equal(normalizeEvent('on_cross_tool_handoff'), 'on_cross_tool_handoff');
  assert.equal(normalizeEvent('on_change_complete'), 'on_change_complete');
});

test('normalizeEvent passes through an already-canonical event unchanged', () => {
  assert.equal(normalizeEvent('phase:before'), 'phase:before');
});

// ---------------------------------------------------------------------------
// hooksFire — collection, matching, dispatch
// ---------------------------------------------------------------------------

test('hooksFire runs a builtin hook whose event matches exactly', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'report-progress', event: 'phase:before', action: { command: 'echo hi' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('phase', 'before', 'karpathy-logs-node', 1, 1, {
      orchestratorRoot: s.root,
      cwd: s.root,
      runCommand,
    });

    assert.deepEqual(runs, ['echo hi']);
  } finally {
    s.dispose();
  }
});

test('hooksFire matches wildcard kind (*:edge) and wildcard edge (kind:*)', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [
        { id: 'any-kind', event: '*:after', action: { command: 'echo any-kind' } },
        { id: 'any-edge', event: 'task:*', action: { command: 'echo any-edge' } },
        { id: 'no-match', event: 'change:before', action: { command: 'echo no-match' } },
      ],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('task', 'after', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs.sort(), ['echo any-edge', 'echo any-kind']);
  } finally {
    s.dispose();
  }
});

test('hooksFire skips a disabled entry', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'off', event: 'phase:before', enabled: false, action: { command: 'echo off' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs, []);
  } finally {
    s.dispose();
  }
});

test('hooksFire is a no-op with no hooks.json anywhere', async () => {
  const s = scratch();
  try {
    const runCommand = async () => ({ status: 0, stdout: '', stderr: '' });
    // Should not throw.
    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// hooksFire — layered override resolution
// ---------------------------------------------------------------------------

test('hooksFire: a project-layer override wins over a builtin override; loser is suppressed', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'default-reporter', event: 'phase:before', mode: 'override', action: { command: 'echo builtin' } }],
    });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'hooks-config.json'), {
      hooks: [{ id: 'project-reporter', event: 'phase:before', mode: 'override', action: { command: 'echo project' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs, ['echo project']);
  } finally {
    s.dispose();
  }
});

test('hooksFire: an augment (non-override) always fires alongside the resolved override', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [
        { id: 'default-reporter', event: 'phase:before', mode: 'override', action: { command: 'echo builtin' } },
        { id: 'extra-logger', event: 'phase:before', mode: 'augment', action: { command: 'echo augment' } },
      ],
    });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'hooks-config.json'), {
      hooks: [{ id: 'project-reporter', event: 'phase:before', mode: 'override', action: { command: 'echo project' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs.sort(), ['echo augment', 'echo project']);
  } finally {
    s.dispose();
  }
});

test('hooksFire suppresses the builtin/report-progress default reporter augment when an override wins', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'report-progress', event: 'phase:before', action: { command: 'echo default-reporter' } }],
    });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'hooks-config.json'), {
      hooks: [{ id: 'project-reporter', event: 'phase:before', mode: 'override', action: { command: 'echo project' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs, ['echo project']);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// hooksFire — logging and status bookkeeping
// ---------------------------------------------------------------------------

test('hooksFire appends a JSONL entry to the active phase hooks.log.jsonl', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'reporter', event: 'phase:before', action: { command: 'echo x' } }],
    });
    mkdirSync(path.join(s.root, '.kbd-orchestrator', 'phases', 'p0'), { recursive: true });
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { phase: 'p0' });

    const runCommand = async () => ({ status: 0, stdout: '', stderr: '' });
    await hooksFire('phase', 'before', 'p0', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    const logFile = path.join(s.root, '.kbd-orchestrator', 'phases', 'p0', 'hooks.log.jsonl');
    assert.equal(existsSync(logFile), true);
    const lines = readFileSync(logFile, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.kind, 'phase');
    assert.equal(entry.edge, 'before');
    assert.equal(entry.hookId, 'reporter');
    assert.equal(entry.status, 0);
  } finally {
    s.dispose();
  }
});

test('hooksFire falls back to .kbd-orchestrator/hooks.log.jsonl when no phase is active', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'reporter', event: 'phase:before', action: { command: 'echo x' } }],
    });

    const runCommand = async () => ({ status: 0, stdout: '', stderr: '' });
    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    const logFile = path.join(s.root, '.kbd-orchestrator', 'hooks.log.jsonl');
    assert.equal(existsSync(logFile), true);
  } finally {
    s.dispose();
  }
});

test('hooksFire updates hooks-status.json totals and lastRun', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'reporter', event: 'phase:before', action: { command: 'echo x' } }],
    });

    const runCommand = async () => ({ status: 0, stdout: '', stderr: '' });
    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    const status = JSON.parse(readFileSync(path.join(s.root, '.kbd-orchestrator', 'hooks-status.json'), 'utf8'));
    assert.equal(status.totalRuns, 1);
    assert.equal(status.failedRuns, 0);
    assert.equal(status.lastRun.hookId, 'reporter');
    assert.equal(status.lastFailure, null);
  } finally {
    s.dispose();
  }
});

test('hooksFire records a failed run in failedRuns and lastFailure', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'reporter', event: 'phase:before', action: { command: 'exit 1', on_failure: 'warn' } }],
    });

    const runCommand = async () => ({ status: 1, stdout: '', stderr: 'boom' });
    await hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    const status = JSON.parse(readFileSync(path.join(s.root, '.kbd-orchestrator', 'hooks-status.json'), 'utf8'));
    assert.equal(status.totalRuns, 1);
    assert.equal(status.failedRuns, 1);
    assert.equal(status.lastFailure.hookId, 'reporter');
    assert.match(status.lastFailure.stderrSnippet, /boom/);
  } finally {
    s.dispose();
  }
});

test('hooksFire rejects (surfaces) when on_failure is "error"', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'reporter', event: 'phase:before', action: { command: 'exit 1', on_failure: 'error' } }],
    });

    const runCommand = async () => ({ status: 1, stdout: '', stderr: 'critical' });

    await assert.rejects(
      () => hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand }),
      /reporter/
    );
  } finally {
    s.dispose();
  }
});

test('hooksFire swallows a failure entirely when on_failure is "ignore"', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'reporter', event: 'phase:before', action: { command: 'exit 1', on_failure: 'ignore' } }],
    });

    const runCommand = async () => ({ status: 1, stdout: '', stderr: 'ignored' });

    await assert.doesNotReject(() =>
      hooksFire('phase', 'before', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand })
    );
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// hooksFire — on_change_complete alias (D5 runtime conditional)
// ---------------------------------------------------------------------------

test('hooksFire also fires on_change_complete-mapped entries when task:after fires with index === total', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'change-complete-hook', event: 'on_change_complete', action: { command: 'echo change-done' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('task', 'after', 'x', 3, 3, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs, ['echo change-done']);
  } finally {
    s.dispose();
  }
});

test('hooksFire does NOT fire on_change_complete-mapped entries when index !== total', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'change-complete-hook', event: 'on_change_complete', action: { command: 'echo change-done' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('task', 'after', 'x', 2, 3, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs, []);
  } finally {
    s.dispose();
  }
});

test('hooksFire does NOT fire on_change_complete-mapped entries for a non-task:after edge', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'change-complete-hook', event: 'on_change_complete', action: { command: 'echo change-done' } }],
    });

    const runs = [];
    const runCommand = async (command) => {
      runs.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('phase', 'after', 'x', 1, 1, { orchestratorRoot: s.root, cwd: s.root, runCommand });

    assert.deepEqual(runs, []);
  } finally {
    s.dispose();
  }
});

// ---------------------------------------------------------------------------
// hooksFire — env passed to the command
// ---------------------------------------------------------------------------

test('hooksFire passes KBD_HOOK_* context fields to runCommand', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, 'hooks', 'hooks.json'), {
      hooks: [{ id: 'reporter', event: 'phase:before', action: { command: 'echo x', timeout: 5 } }],
    });

    let capturedEnv;
    const runCommand = async (command, env) => {
      capturedEnv = env;
      return { status: 0, stdout: '', stderr: '' };
    };

    await hooksFire('phase', 'before', 'my-phase', 2, 5, {
      orchestratorRoot: s.root,
      cwd: s.root,
      runCommand,
      phasePath: 'the-boss-shipping-and-settings > my-phase',
      sourceTool: 'claude-code',
    });

    assert.equal(capturedEnv.KBD_HOOK_KIND, 'phase');
    assert.equal(capturedEnv.KBD_HOOK_EDGE, 'before');
    assert.equal(capturedEnv.KBD_HOOK_NAME, 'my-phase');
    assert.equal(capturedEnv.KBD_HOOK_INDEX, '2');
    assert.equal(capturedEnv.KBD_HOOK_TOTAL, '5');
    assert.equal(capturedEnv.KBD_HOOK_PHASE_PATH, 'the-boss-shipping-and-settings > my-phase');
    assert.equal(capturedEnv.KBD_HOOK_SOURCE_TOOL, 'claude-code');
    assert.ok(capturedEnv.KBD_HOOK_STARTED_AT);
  } finally {
    s.dispose();
  }
});
