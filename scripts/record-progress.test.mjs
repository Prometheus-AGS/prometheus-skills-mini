import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../lib/platform/paths.mjs';

const entry = path.join(fileURLToPath(new URL('..', import.meta.url)), 'scripts', 'record-progress.mjs');

// A real project root: current-waypoint.json (the projection this pack falls
// back to when the prometheus CLI is absent) plus .prometheus/project.json,
// the marker findProjectRoot walks up for.
const withProjectRoot = (run) => {
  const root = mkdtempSync(path.join(tempDir(), 'record-cli-'));
  try {
    mkdirSync(path.join(root, '.prometheus'), { recursive: true });
    mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(root, '.prometheus', 'project.json'), JSON.stringify({ projectId: 'cli-test-project' }));
    writeFileSync(
      path.join(root, '.kbd-orchestrator', 'current-waypoint.json'),
      JSON.stringify({
        projectId: 'cli-test-project',
        runId: 'run-1',
        activePhaseId: 'phase-a',
        change: 'change-1',
        currentTask: '1.1',
        exactNextCommand: '/kbd-apply change-1',
      }),
    );
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const inputEvent = (overrides = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    eventId: 'kpm-cli12345678901234567890123456',
    observedAt: '2026-09-22T00:00:00.000Z',
    runId: 'run-1',
    boundary: 'task',
    status: 'complete',
    phaseId: 'phase-a',
    changeId: 'change-1',
    taskId: '1.1',
    taskClass: 'product',
    elapsedHours: 0,
    touchedFiles: [],
    verification: [],
    commitSha: null,
    blocker: null,
    exactNextWork: '/kbd-apply change-1',
    ...overrides,
  });

// PATH is emptied so `pk` genuinely resolves to nothing, regardless of what is
// on the developer's real PATH — "degraded because pk is absent" must be
// reproducible anywhere this suite runs, including a machine with pk installed.
const runCli = (root, args, { input, env = {} } = {}) =>
  spawnSync(process.execPath, [entry, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    input,
    env: { ...process.env, PATH: '', PK_BIN: '', ...env },
  });

// `spawnSync({ input })` connects the child's fd 0 to an internal socket, not
// a FIFO or a regular file — `fstatSync(0).isSocket()` is true. That is a real
// difference from how the harness actually invokes this CLI (a real pipe), and
// this project's own scripts/hook-entry.mjs guards fd 0 the same strict way
// (isFIFO || isFile only). So these end-to-end tests use `--input <file>`,
// the equally-documented, equally-real alternative to `-`, which sidesteps
// the fd-0-plumbing difference entirely rather than papering over it.
const withInputFile = (root, event, run) => {
  const file = path.join(root, 'event.json');
  writeFileSync(file, event);
  return run(file);
};

test('exit 0 with no pk on PATH: the result is degraded, never a failure', () => {
  withProjectRoot((root) => {
    withInputFile(root, inputEvent(), (file) => {
      const proc = runCli(root, ['--project-root', root, '--input', file]);

      assert.equal(proc.status, 0, proc.stderr);
      const output = JSON.parse(proc.stdout.trim());
      assert.equal(output.status, 'degraded');
    });
  });
});

test('stdout is exactly one JSON line', () => {
  withProjectRoot((root) => {
    withInputFile(root, inputEvent(), (file) => {
      const proc = runCli(root, ['--project-root', root, '--input', file]);

      const lines = proc.stdout.split('\n').filter((line) => line.trim() !== '');
      assert.equal(lines.length, 1);
      assert.doesNotThrow(() => JSON.parse(lines[0]));
    });
  });
});

test('exit 2 for a secret, and the tree is unchanged', () => {
  withProjectRoot((root) => {
    const secret = ['pass', 'word'].join('') + ' = hunter2example';
    const before = readFileSync(path.join(root, '.prometheus', 'project.json'), 'utf8');

    withInputFile(root, inputEvent({ exactNextWork: secret }), (file) => {
      const proc = runCli(root, ['--project-root', root, '--input', file]);

      assert.equal(proc.status, 2);
      assert.doesNotMatch(proc.stderr, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.equal(readFileSync(path.join(root, '.prometheus', 'project.json'), 'utf8'), before);
      assert.equal(existsSync(path.join(root, '.prometheus', 'progress-memory-receipts')), false);
    });
  });
});

test('the crash seams exit 74 and 75', () => {
  withProjectRoot((root) => {
    withInputFile(root, inputEvent({ eventId: 'kpm-crashseam1234567890123456' }), (file) => {
      const before = runCli(root, ['--project-root', root, '--input', file], {
        env: { KPM_TEST_CRASH_BEFORE_MEMORY: '1' },
      });
      assert.equal(before.status, 74);
    });

    withInputFile(root, inputEvent({ eventId: 'kpm-crashseam2234567890123456' }), (file) => {
      const after = runCli(root, ['--project-root', root, '--input', file], {
        env: { KPM_TEST_CRASH_AFTER_PK: '1' },
      });
      assert.equal(after.status, 75);
    });
  });
});

test("the self-invocation guard uses realpathSync, matching scripts/hook-entry.mjs's pattern", () => {
  const source = readFileSync(entry, 'utf8');
  assert.match(source, /realpathSync\(fileURLToPath\(import\.meta\.url\)\)\s*===\s*realpathSync\(process\.argv\[1\]\)/);
  // The actual defect (a self-invocation guard built by string concatenation) is
  // scanned for across every .mjs by scripts/carried-mjs.test.mjs, which excludes
  // comment lines. This file's own doc comment explains the defect and therefore
  // quotes the literal pattern in prose (as scripts/hook-entry.mjs's own comment
  // does too) — checking for a concatenated file URL in CODE only, never a comment.
  const codeLines = source.split('\n').filter((line) => !/^\s*\/\//.test(line));
  assert.doesNotMatch(codeLines.join('\n'), /file:\/\/\$\{/);
});

test('the entry point holds no logic of its own: it imports lib/karpathy and calls into it', () => {
  const source = readFileSync(entry, 'utf8');
  assert.match(source, /from ['"]\.\.\/lib\/karpathy\//);
  // No inline hash/validate/receipt logic re-implemented here.
  assert.doesNotMatch(source, /createHash\(/);
});

test('--flush-degraded runs through the CLI and reports zeros with nothing to flush', () => {
  withProjectRoot((root) => {
    const proc = runCli(root, ['--project-root', root, '--flush-degraded']);

    assert.equal(proc.status, 0, proc.stderr);
    const output = JSON.parse(proc.stdout.trim());
    assert.equal(output.delivered, 0);
  });
});

test('a project root that cannot be found is a clean exit 2, not a crash', () => {
  const root = mkdtempSync(path.join(tempDir(), 'record-noproj-'));
  try {
    writeFileSync(path.join(root, 'event.json'), inputEvent());
    const proc = runCli(root, ['--project-root', root, '--input', path.join(root, 'event.json')]);

    assert.equal(proc.status, 2);
    assert.match(proc.stderr, /project root/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--from-hook without --boundary is refused before anything runs', () => {
  withProjectRoot((root) => {
    const proc = runCli(root, ['--project-root', root, '--from-hook']);

    assert.equal(proc.status, 2);
    assert.match(proc.stderr, /--boundary/);
  });
});
