import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readText } from '../platform/text.mjs';
import { eventFromHook, hookEventId, parseHookSubject, readInputEvent, touchedFilesFrom } from './event.mjs';

const receipt = JSON.parse(readText(new URL('./fixtures/golden-receipt.json', import.meta.url)));
const golden = receipt.event;

const STATE = Object.freeze({
  source: 'cli',
  projectId: '78f44ea7-639e-4a07-a792-01eeb9d2a48a',
  runId: golden.runId,
  activePath: { phaseId: golden.phaseId, changeId: 'change-1', taskId: '1.1' },
  exactNextWork: golden.exactNextWork,
});

// git output, as the recorder sees it: stdout is NUL-separated because of -z.
const gitOf = (answers) => (program, args) => {
  const key = args.slice(0, 2).join(' ');
  const answer = answers[key];
  if (!answer) return { status: 128, stdout: '', stderr: 'fatal' };
  return { status: 0, stdout: answer, stderr: '' };
};
const GIT = gitOf({
  'rev-parse HEAD': 'abc1234def\n',
  'diff --name-only': 'src/b.mjs\0.prometheus/session-log.md\0.prometheus/progress-memory-receipts/x.json\0',
  'ls-files --others': 'src/a.mjs\0.prometheus/memory-outbox/y.json\0src/b.mjs\0',
});

const build = (overrides = {}) =>
  eventFromHook({ boundary: 'phase', state: STATE, env: {}, git: GIT, now: () => new Date('2026-09-21T12:00:00.000Z'), ...overrides });

test('the recorded event id is reproduced from the same identity', () => {
  const id = hookEventId({
    projectId: STATE.projectId, runId: golden.runId, boundary: golden.boundary,
    phaseId: golden.phaseId, changeId: golden.changeId, taskId: golden.taskId,
  });

  assert.equal(id, golden.eventId);
  assert.equal(id, 'kpm-d6f1c4a3b56523b3673b20a41c84abe3');
});

test('the wrong project id gives a different event id', () => {
  const id = hookEventId({ projectId: 'prometheus-skills-mini', runId: golden.runId, boundary: golden.boundary, phaseId: golden.phaseId, changeId: null, taskId: null });

  assert.notEqual(id, golden.eventId);
});

test('an absent part hashes as the empty string, joined by NUL, as the source pack derives it', () => {
  const identity = ['p', 'r', 'phase', 'ph', '', '', 'complete'].join('\0');
  const expected = 'kpm-' + createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 32);

  assert.equal(hookEventId({ projectId: 'p', runId: 'r', boundary: 'phase', phaseId: 'ph', changeId: null, taskId: undefined }), expected);
});

test('a hook event has the shape the source pack builds', () => {
  const event = build();

  assert.deepEqual(Object.keys(event).sort(), Object.keys(golden).sort());
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.status, 'complete');
  assert.equal(event.observedAt, '2026-09-21T12:00:00.000Z');
  assert.equal(event.runId, golden.runId);
  assert.equal(event.phaseId, golden.phaseId);
  assert.equal(event.commitSha, 'abc1234def');
  assert.equal(event.blocker, null);
  assert.equal(event.exactNextWork, golden.exactNextWork);
  assert.deepEqual(event.verification, []);
});

test('taskClass comes from KBD_TASK_CLASS lower-cased, default product', () => {
  assert.equal(build().taskClass, 'product');
  assert.equal(build({ env: { KBD_TASK_CLASS: 'Research' } }).taskClass, 'research');
});

test('elapsedHours comes from KBD_TASK_ELAPSED_HOURS as a number, default 0', () => {
  assert.equal(build().elapsedHours, 0);
  assert.equal(build({ env: { KBD_TASK_ELAPSED_HOURS: '1.5' } }).elapsedHours, 1.5);
  assert.throws(() => build({ env: { KBD_TASK_ELAPSED_HOURS: 'soon' } }), /KBD_TASK_ELAPSED_HOURS must be numeric/);
});

test('the subject of a boundary comes from KBD_HOOK_NAME, else the active path', () => {
  const active = STATE.activePath;
  assert.deepEqual(parseHookSubject('task', '', active), { changeId: 'change-1', taskId: '1.1' });
  assert.deepEqual(parseHookSubject('task', 'change-9/2.2', active), { changeId: 'change-9', taskId: '2.2' });
  assert.deepEqual(parseHookSubject('task', 'change-9:2.2', active), { changeId: 'change-9', taskId: '2.2' });
  assert.deepEqual(parseHookSubject('task', 'change-9', active), { changeId: 'change-9', taskId: '1.1' });
  assert.deepEqual(parseHookSubject('change', 'change-9/2.2', active), { changeId: 'change-9', taskId: null });
  assert.deepEqual(parseHookSubject('change', '', active), { changeId: 'change-1', taskId: null });
  assert.deepEqual(parseHookSubject('phase', 'change-9/2.2', active), { changeId: null, taskId: null });
});

test('an unsupported boundary is refused before anything is built', () => {
  assert.throws(() => build({ boundary: 'session' }), /unsupported hook boundary/);
});

test('touched files are the changed and untracked paths, sorted, without the recorder\'s own files', () => {
  const files = touchedFilesFrom(GIT, '/repo');

  assert.deepEqual(files, ['src/a.mjs', 'src/b.mjs']);
});

test('touched files are capped at 500 after sorting', () => {
  const many = Array.from({ length: 600 }, (_, i) => `f${String(i).padStart(3, '0')}.mjs`).join('\0') + '\0';
  const git = gitOf({ 'rev-parse HEAD': 'abc1234\n', 'diff --name-only': many, 'ls-files --others': '' });

  const files = touchedFilesFrom(git, '/repo');

  assert.equal(files.length, 500);
  assert.equal(files[0], 'f000.mjs');
  assert.equal(files[499], 'f499.mjs');
});

test('git output is NUL-separated, so a path with a newline survives', () => {
  const git = gitOf({ 'rev-parse HEAD': 'abc1234\n', 'diff --name-only': 'odd\nname.txt\0plain.txt\0', 'ls-files --others': '' });

  assert.deepEqual(touchedFilesFrom(git, '/repo'), ['odd\nname.txt', 'plain.txt']);
});

test('a repository with no commits yields a null commitSha and no touched files, not an error', () => {
  const event = build({ git: () => ({ status: 128, stdout: '', stderr: 'fatal: bad revision' }) });

  assert.equal(event.commitSha, null);
  assert.deepEqual(event.touchedFiles, []);
});

test('git is never asked to do anything but read', () => {
  const calls = [];
  build({ git: (program, args, options) => { calls.push({ program, args, options }); return GIT(program, args); } });

  for (const call of calls) {
    assert.equal(call.program, 'git');
    assert.ok(['rev-parse', 'diff', 'ls-files'].includes(call.args[0]), call.args.join(' '));
    assert.notEqual(call.options?.shell, true);
  }
  assert.equal(calls.length, 3);
});

test('an --input event is read from text, keeping the elapsedHours token', () => {
  const text = readText(new URL('./fixtures/golden-receipt.json', import.meta.url));
  const eventText = text.slice(text.indexOf('{', text.indexOf('"event"')), text.indexOf('"sessionLogAppended"')).trim().replace(/,$/, '');

  const { event, elapsedHoursToken } = readInputEvent(eventText);

  assert.equal(event.eventId, golden.eventId);
  assert.equal(elapsedHoursToken, '0.0');
});

test('CRLF input parses', () => {
  const { event } = readInputEvent('{\r\n  "eventId": "x",\r\n  "elapsedHours": 2\r\n}\r\n');

  assert.equal(event.eventId, 'x');
});

test('input that is not a JSON object is refused with the reason', () => {
  assert.throws(() => readInputEvent('{ not json'), /invalid JSON/);
  assert.throws(() => readInputEvent('[1, 2]'), /must be a JSON object/);
});
