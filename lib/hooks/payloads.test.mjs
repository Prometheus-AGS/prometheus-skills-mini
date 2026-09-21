import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';

import * as sessionStart from './sessionstart-kbd-control.mjs';
import * as detectContext from './sessionstart-detect-project-context.mjs';
import * as positionReminder from './posttool-write-position-reminder.mjs';
import * as fallbackCheckpoint from './subagent-fallback-checkpoint.mjs';
import * as taskReceipt from './taskcompleted-kbd-receipt.mjs';
import * as preCompact from './precompact-kbd-control.mjs';

const ALL = [
  ['sessionstart-kbd-control', sessionStart],
  ['sessionstart-detect-project-context', detectContext],
  ['posttool-write-position-reminder', positionReminder],
  ['subagent-fallback-checkpoint', fallbackCheckpoint],
  ['taskcompleted-kbd-receipt', taskReceipt],
  ['precompact-kbd-control', preCompact],
];

// A project root is found by walking up for .prometheus/project.json, exactly as
// the upstream payloads do — but in Node, so it works from cmd.exe and PowerShell.
const withProject = (run, { pause = false, withProjectJson = true } = {}) => {
  const dir = mkdtempSync(path.join(tempDir(), 'payload-'));
  try {
    if (withProjectJson) {
      mkdirSync(path.join(dir, '.prometheus'), { recursive: true });
      writeFileSync(
        path.join(dir, '.prometheus', 'project.json'),
        JSON.stringify({ projectId: 'test-project' }),
      );
    }
    mkdirSync(path.join(dir, '.kbd-orchestrator'), { recursive: true });
    if (pause) writeFileSync(path.join(dir, '.kbd-orchestrator', 'PAUSE'), 'paused\n');
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const payload = (overrides = {}) => ({
  hookId: 'test',
  harness: 'claude-code',
  input: {},
  ...overrides,
});

// ── The degradation contract ────────────────────────────────────────────────
// A hook signals; it does not gate. This is the rule that keeps both services
// optional: if a hook failed when a service were absent, the service would be
// mandatory in practice.

for (const [id, mod] of ALL) {
  test(`${id} exports a run function`, () => {
    assert.equal(typeof mod.run, 'function');
  });

  test(`${id} resolves when no project root exists`, async () => {
    await withProject(
      async (cwd) => {
        await assert.doesNotReject(() => mod.run(payload({ input: { cwd } })));
      },
      { withProjectJson: false },
    );
  });

  test(`${id} resolves when both services are unreachable`, async () => {
    await withProject(async (cwd) => {
      // Nothing is listening on these ports in the test environment, which is
      // the "both services down" case the project requires to keep working.
      await assert.doesNotReject(() =>
        mod.run(payload({ input: { cwd }, services: { memory: null, gateway: null } })),
      );
    });
  });

  test(`${id} resolves on malformed input rather than throwing`, async () => {
    await assert.doesNotReject(() => mod.run(payload({ input: { cwd: 12345 } })));
  });

  test(`${id} returns a result naming its own hook id`, async () => {
    const result = await withProject((cwd) => mod.run(payload({ hookId: id, input: { cwd } })));

    assert.equal(result.hookId, id);
  });
}

// ── Behaviour specific to individual payloads ───────────────────────────────

test('sessionstart-kbd-control reports the PAUSE advisory when one is set', async () => {
  const result = await withProject((cwd) => sessionStart.run(payload({ input: { cwd } })), {
    pause: true,
  });

  assert.equal(result.paused, true);
});

test('sessionstart-kbd-control reports no pause when none is set', async () => {
  const result = await withProject((cwd) => sessionStart.run(payload({ input: { cwd } })));

  assert.equal(result.paused, false);
});

test('precompact-kbd-control reports the PAUSE advisory across a compaction', async () => {
  const result = await withProject((cwd) => preCompact.run(payload({ input: { cwd } })), {
    pause: true,
  });

  assert.equal(result.paused, true);
});

test('detect-project-context reports this project, not GitOps skills', async () => {
  const result = await withProject((cwd) => detectContext.run(payload({ input: { cwd } })));

  // Deliberate behaviour change from upstream, recorded in .prometheus/decisions.md:
  // the upstream payload advertises four devops skills this project does not ship.
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /gitops-bootstrap|argocd-multicloud|kustomize-overlay/);
  assert.equal(typeof result.node, 'string');
});

test('subagent-fallback-checkpoint names the agent it checkpointed', async () => {
  const result = await withProject((cwd) =>
    fallbackCheckpoint.run(payload({ input: { cwd, subagent_name: 'assessor' } })),
  );

  assert.equal(result.agent, 'assessor');
});

test('subagent-fallback-checkpoint falls back to unknown when no agent is named', async () => {
  const result = await withProject((cwd) => fallbackCheckpoint.run(payload({ input: { cwd } })));

  assert.equal(result.agent, 'unknown');
});

test('taskcompleted-kbd-receipt records the task id it was given', async () => {
  const result = await withProject((cwd) =>
    taskReceipt.run(payload({ input: { cwd, task_id: 'change-1/task-4.2' } })),
  );

  assert.equal(result.taskId, 'change-1/task-4.2');
});

test('posttool-write-position-reminder writes the reminder atomically', async () => {
  const result = await withProject((cwd) => {
    return positionReminder.run(payload({ input: { cwd } })).then(() => ({
      cwd,
      written: existsSync(path.join(cwd, '.kbd-orchestrator', 'position-reminder.txt')),
      body: existsSync(path.join(cwd, '.kbd-orchestrator', 'position-reminder.txt'))
        ? readFileSync(path.join(cwd, '.kbd-orchestrator', 'position-reminder.txt'), 'utf8')
        : '',
    }));
  });

  assert.equal(result.written, true);
  assert.match(result.body, /POSITION REMINDER/);
});

test('posttool-write-position-reminder leaves no temporary file behind', async () => {
  const leftovers = await withProject(async (cwd) => {
    await positionReminder.run(payload({ input: { cwd } }));
    const { readdirSync } = await import('node:fs');
    return readdirSync(path.join(cwd, '.kbd-orchestrator')).filter((f) => f.includes('.tmp'));
  });

  assert.deepEqual(leftovers, []);
});
