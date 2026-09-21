import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { degradeSafely } from './context.mjs';

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
// `await run(dir)`, not `return run(dir)`: the callbacks are async, and a
// non-awaiting helper deletes the temp directory the moment the promise is
// created rather than when it settles. That failed the two atomic-write tests
// here, and would have silently weakened every other async test in this file.
const withProject = async (run, { pause = false, withProjectJson = true } = {}) => {
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
    return await run(dir);
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

// The degradation guard must be exercised by something that ACTUALLY throws.
// Mutation revealed that the doesNotReject tests above pass even with the guard
// removed, because the payloads do not throw on the happy path — they could not
// fail, which is the defect class this project's last reflection recorded.
// degradeSafely is the guard every payload funnels through, so it is tested
// directly against a throwing unit of work.
test('degradeSafely converts a thrown error into a degraded result', async () => {
  const result = await degradeSafely('probe-hook', async () => {
    throw new Error('service unreachable');
  });

  assert.equal(result.status, 'degraded');
  assert.equal(result.hookId, 'probe-hook');
  assert.match(result.reason, /service unreachable/);
});

test('degradeSafely passes through a successful result', async () => {
  const result = await degradeSafely('probe-hook', async () => ({ value: 42 }));

  assert.equal(result.status, 'ok');
  assert.equal(result.value, 42);
});

// A payload whose project root is unreadable is the realistic failure: the file
// exists but its contents are not JSON. This must degrade, not throw.
test('a payload degrades rather than throwing when project.json is corrupt', async () => {
  const result = await withProject(async (cwd) => {
    writeFileSync(path.join(cwd, '.prometheus', 'project.json'), '{ not json');
    return sessionStart.run(payload({ hookId: 'sessionstart-kbd-control', input: { cwd } }));
  });

  // readProjectId swallows the parse error and yields null; the hook still reports.
  assert.equal(result.hookId, 'sessionstart-kbd-control');
  assert.equal(result.projectId, null);
});

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
