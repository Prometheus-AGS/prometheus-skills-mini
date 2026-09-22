import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { agreementReasons, CanonicalStateError, readCanonicalState } from './canonical-state.mjs';

const WAYPOINT = Object.freeze({
  projectId: 'waypoint-project',
  runId: 'run-from-waypoint',
  activePhaseId: 'phase-a',
  change: 'change-1',
  currentTask: '1.1',
  exactNextCommand: '/kbd-apply change-1',
});

const cliState = (overrides = {}) => ({
  projectId: 'cli-project',
  runId: 'run-from-cli',
  exactNextWork: 'do the next thing',
  activePath: { phaseId: 'phase-a', changeId: 'change-1', taskId: '1.1' },
  phases: {
    'phase-a': {
      status: 'complete',
      changes: {
        'change-1': { status: 'in_progress', implementationStatus: 'complete', tasks: { '1.1': { status: 'complete' } } },
      },
    },
  },
  ...overrides,
});

// A project root with a waypoint, and a .kbd-orchestrator/project.json whose
// projectId is DIFFERENT - as it is in the real repository, where reading that
// file would fork every event id.
const withRoot = (run, { waypoint = WAYPOINT } = {}) => {
  const root = mkdtempSync(path.join(tempDir(), 'canonical-'));
  try {
    mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(root, '.kbd-orchestrator', 'project.json'), JSON.stringify({ projectId: 'the-wrong-id' }));
    if (waypoint !== null) {
      writeFileSync(
        path.join(root, '.kbd-orchestrator', 'current-waypoint.json'),
        typeof waypoint === 'string' ? waypoint : JSON.stringify(waypoint),
      );
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const cli = (result) => {
  const calls = [];
  const spawn = (program, args, options) => {
    calls.push({ program, args, options });
    return typeof result === 'function' ? result() : result;
  };
  return { spawn, calls };
};
const ok = (state) => ({ status: 0, stdout: JSON.stringify(state), stderr: '' });
const absent = () => ({ status: null, error: Object.assign(new Error('spawn prometheus ENOENT'), { code: 'ENOENT' }) });

test('with a working CLI, state comes from the CLI', () => {
  const { spawn, calls } = cli(ok(cliState()));

  const state = withRoot((root) => readCanonicalState({ root, env: {}, spawn }));

  assert.equal(state.source, 'cli');
  assert.equal(state.projectId, 'cli-project');
  assert.equal(state.runId, 'run-from-cli');
  assert.deepEqual(state.activePath, { phaseId: 'phase-a', changeId: 'change-1', taskId: '1.1' });
  assert.equal(state.exactNextWork, 'do the next thing');
  assert.equal(calls[0].program, 'prometheus');
  assert.deepEqual(calls[0].args.slice(0, 2), ['kbd', '--path']);
  assert.deepEqual(calls[0].args.slice(3), ['status', '--json']);
});

test('PROMETHEUS_BIN names the executable, as it does in the source pack', () => {
  const { spawn, calls } = cli(ok(cliState()));

  withRoot((root) => readCanonicalState({ root, env: { PROMETHEUS_BIN: '/opt/tools/prometheus' }, spawn }));

  assert.equal(calls[0].program, '/opt/tools/prometheus');
});

test('the status call is bounded and never goes through a shell', () => {
  const { spawn, calls } = cli(ok(cliState()));

  withRoot((root) => readCanonicalState({ root, env: {}, spawn }));

  assert.ok(calls[0].options.timeout > 0);
  assert.notEqual(calls[0].options.shell, true);
});

test('with no CLI, state comes from the waypoint projection', () => {
  const { spawn } = cli(absent);

  const state = withRoot((root) => readCanonicalState({ root, env: {}, spawn }));

  assert.equal(state.source, 'projection');
  assert.equal(state.projectId, 'waypoint-project');
  assert.equal(state.runId, 'run-from-waypoint');
  assert.deepEqual(state.activePath, { phaseId: 'phase-a', changeId: 'change-1', taskId: '1.1' });
  assert.equal(state.exactNextWork, '/kbd-apply change-1');
});

test('projectId is never read from .kbd-orchestrator/project.json', () => {
  const { spawn } = cli(absent);

  const state = withRoot((root) => readCanonicalState({ root, env: {}, spawn }));

  assert.notEqual(state.projectId, 'the-wrong-id');
});

test('a CLI that resolves but fails is treated as absent', () => {
  const failures = {
    'non-zero exit': { status: 1, stdout: '', stderr: 'boom' },
    // The exit code decides, not the output: a CLI that fails while printing
    // well-formed state must not be believed.
    'non-zero exit with well-formed JSON': { status: 1, stdout: JSON.stringify(cliState()), stderr: 'boom' },
    'not JSON': { status: 0, stdout: 'Usage: prometheus', stderr: '' },
    'JSON but not an object': { status: 0, stdout: '[1,2]', stderr: '' },
    'timed out': { status: null, signal: 'SIGTERM', error: Object.assign(new Error('spawnSync ETIMEDOUT'), { code: 'ETIMEDOUT' }), stdout: '' },
    'the spawn itself threw': () => { throw new TypeError('"prometheus" resolves to a script'); },
  };
  for (const [name, result] of Object.entries(failures)) {
    const { spawn } = cli(result);

    const state = withRoot((root) => readCanonicalState({ root, env: {}, spawn }));

    assert.equal(state.source, 'projection', name);
    assert.equal(state.runId, 'run-from-waypoint', name);
  }
});

test('a CLI answer with no identity falls back to the projection', () => {
  const { spawn } = cli(ok(cliState({ runId: '' })));

  const state = withRoot((root) => readCanonicalState({ root, env: {}, spawn }));

  assert.equal(state.source, 'projection');
});

test('no identity from either source is a refusal that names what is missing', () => {
  const cases = {
    'no waypoint file': null,
    'a waypoint that is not JSON': '{ not json',
    'a waypoint with no runId': { ...WAYPOINT, runId: undefined },
    'a waypoint with no active phase': { ...WAYPOINT, activePhaseId: undefined },
  };
  for (const [name, waypoint] of Object.entries(cases)) {
    const { spawn } = cli(absent);

    assert.throws(
      () => withRoot((root) => readCanonicalState({ root, env: {}, spawn }), { waypoint }),
      (error) => error instanceof CanonicalStateError && /projectId|runId|active phase/.test(error.message),
      name,
    );
  }
});

test('a waypoint written with CRLF still parses', () => {
  const { spawn } = cli(absent);
  const crlf = JSON.stringify(WAYPOINT, null, 2).replace(/\n/g, '\r\n');

  const state = withRoot((root) => readCanonicalState({ root, env: {}, spawn }), { waypoint: crlf });

  assert.equal(state.runId, 'run-from-waypoint');
});

// canonical_validate (record-progress.py:283-313): five ways an event can
// disagree with canonical state, each a refusal.
const hookEvent = (overrides = {}) => ({
  runId: 'run-from-cli', phaseId: 'phase-a', boundary: 'task', status: 'complete',
  changeId: 'change-1', taskId: '1.1', ...overrides,
});
const fromCli = (overrides) => ({ source: 'cli', ...cliState(overrides) });

test('an event that agrees with the CLI state has no reasons', () => {
  assert.deepEqual(agreementReasons(hookEvent(), fromCli()), []);
  assert.deepEqual(agreementReasons(hookEvent({ boundary: 'change', taskId: null }), fromCli()), []);
  assert.deepEqual(agreementReasons(hookEvent({ boundary: 'phase', changeId: null, taskId: null }), fromCli()), []);
});

test('each of the five disagreements is a reason', () => {
  assert.match(agreementReasons(hookEvent({ runId: 'another-run' }), fromCli()).join(), /run/);
  assert.match(agreementReasons(hookEvent({ phaseId: 'phase-z' }), fromCli()).join(), /phase/);
  assert.match(agreementReasons(hookEvent({ changeId: 'change-z' }), fromCli()).join(), /change/);
  assert.match(agreementReasons(hookEvent({ taskId: '9.9' }), fromCli()).join(), /task/);
  assert.match(agreementReasons(hookEvent({ status: 'blocked' }), fromCli()).join(), /status/);
});

test('a change boundary is judged by implementationStatus before status', () => {
  const event = hookEvent({ boundary: 'change', taskId: null, status: 'complete' });

  assert.deepEqual(agreementReasons(event, fromCli()), []);
  const onlyStatus = fromCli();
  delete onlyStatus.phases['phase-a'].changes['change-1'].implementationStatus;
  assert.match(agreementReasons(event, onlyStatus).join(), /status/);
});

test('in projection mode nothing can be checked, so nothing is refused', () => {
  const projection = { source: 'projection', projectId: 'p', runId: 'another-run', activePath: {} };

  assert.deepEqual(agreementReasons(hookEvent(), projection), []);
});
