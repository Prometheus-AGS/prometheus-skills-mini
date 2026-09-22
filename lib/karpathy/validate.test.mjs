import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readText } from '../platform/text.mjs';
import { canonicalJson, PYTHON_DEFAULT_SEPARATORS } from './hash.mjs';
import { ALLOWED_FIELDS, SECRET_ALTERNATIVES, secretPattern, validateEvent } from './validate.mjs';

const golden = JSON.parse(readText(new URL('./fixtures/golden-receipt.json', import.meta.url))).event;
const event = (overrides = {}) => ({ ...golden, ...overrides });
const taskEvent = (overrides = {}) =>
  event({ boundary: 'task', changeId: 'change-1', taskId: '1.1', ...overrides });
const reasons = (candidate, options) => validateEvent(candidate, options);
const refused = (candidate, pattern) => {
  const found = reasons(candidate);
  assert.ok(found.length > 0, 'expected a refusal');
  if (pattern) assert.match(found.join('\n'), pattern);
};
const accepted = (candidate, options) => assert.deepEqual(reasons(candidate, options), []);

test('the event the source pack recorded is accepted', () => {
  accepted(golden, { elapsedHoursToken: '0.0' });
});

test('the field set is closed', () => {
  refused(event({ extra: 1 }), /unknown.*extra/);
});

test('an unknown key is named without letting it carry text into the message', () => {
  const found = reasons(event({ ['pass' + 'word = hunter2example']: 1 })).join('\n');

  assert.match(found, /unknown/);
  assert.doesNotMatch(found, /hunter2example/);
});

test('schemaVersion is 1', () => {
  refused(event({ schemaVersion: 2 }), /schemaVersion/);
  refused(event({ schemaVersion: '1' }), /schemaVersion/);
});

test('eventId has the source pack format and limit', () => {
  accepted(event({ eventId: 'a'.repeat(128) }));
  refused(event({ eventId: 'a'.repeat(129) }), /eventId/);
  refused(event({ eventId: 'short' }), /eventId/);
  refused(event({ eventId: 'has space in it' }), /eventId/);
});

test('observedAt is judged by shape, not by what Date.parse tolerates', () => {
  for (const ok of ['2026-09-21T18:02:59.291123Z', '2026-09-21T18:02:59.291Z', '2026-09-21T18:02:59Z', '2026-09-21T23:30:00-05:00', '2024-02-29T00:00:00Z']) {
    accepted(event({ observedAt: ok }));
  }
  for (const bad of ['Sep 21 2026', '2026-09-21', '2026-02-30T00:00:00Z', '2025-02-29T00:00:00Z', '2026-13-01T00:00:00Z', '2026-09-21T24:00:00Z', '']) {
    refused(event({ observedAt: bad }), /observedAt/);
  }
});

test('each string field has the limit the source pack gives it, not one blanket limit', () => {
  const at = (key, limit, base = {}) => {
    accepted(event({ ...base, [key]: 'x'.repeat(limit) }));
    refused(event({ ...base, [key]: 'x'.repeat(limit + 1) }), new RegExp(key));
  };
  at('runId', 200);
  at('phaseId', 160);
  at('changeId', 200, { boundary: 'change' });
  at('taskId', 200, { boundary: 'task', changeId: 'change-1' });
  at('blocker', 4000);
  at('exactNextWork', 4000);
});

test('a required string may not be empty, but blocker and exactNextWork may', () => {
  refused(event({ runId: '' }), /runId/);
  refused(event({ phaseId: '' }), /phaseId/);
  refused(taskEvent({ changeId: '' }), /changeId/);
  accepted(event({ blocker: '', exactNextWork: '' }));
  accepted(event({ blocker: null, exactNextWork: null }));
});

test('length is counted in code points, as the source pack counts it', () => {
  // Python len() counts code points; String.length counts UTF-16 units, so 4000
  // emoji would measure 8000 and be refused here while the source pack accepts.
  accepted(event({ exactNextWork: '🙂'.repeat(4000) }));
  refused(event({ exactNextWork: '🙂'.repeat(4001) }), /exactNextWork/);
});

test('boundary, status and taskClass are closed sets', () => {
  refused(event({ boundary: 'session' }), /boundary/);
  refused(event({ status: 'done' }), /status/);
  refused(event({ taskClass: 'misc' }), /taskClass/);
  for (const status of ['in_progress', 'complete', 'blocked', 'cancelled']) accepted(event({ status }));
  for (const taskClass of ['product', 'research', 'evidence', 'integration', 'release']) accepted(event({ taskClass }));
});

test('a boundary carries its subject', () => {
  refused(event({ boundary: 'change', changeId: null }), /changeId/);
  refused(event({ boundary: 'task', changeId: 'c', taskId: null }), /taskId/);
  refused(event({ boundary: 'task', changeId: null, taskId: 't' }), /changeId/);
  accepted(event({ boundary: 'phase', changeId: null, taskId: null }));
});

test('elapsedHours is a number from 0 to 1000 whose token ports', () => {
  for (const bad of [-1, 1000.5, true, '1', null, 0.00001]) refused(event({ elapsedHours: bad }), /elapsedHours/);
  accepted(event({ elapsedHours: 0 }));
  accepted(event({ elapsedHours: 1000 }));
  accepted(event({ elapsedHours: 0.0001 }));
  assert.match(reasons(event({ elapsedHours: 0.00001 })).join('\n'), /port/);
});

test('touchedFiles is a bounded list of unique, relative, safe paths', () => {
  accepted(event({ touchedFiles: Array.from({ length: 500 }, (_, i) => `src/f${i}.mjs`) }));
  refused(event({ touchedFiles: Array.from({ length: 501 }, (_, i) => `src/f${i}.mjs`) }), /touchedFiles/);
  refused(event({ touchedFiles: ['a.mjs', 'a.mjs'] }), /touchedFiles/);
  refused(event({ touchedFiles: 'a.mjs' }), /touchedFiles/);
  refused(event({ touchedFiles: [''] }), /touchedFiles/);
  refused(event({ touchedFiles: [7] }), /touchedFiles/);
  accepted(event({ touchedFiles: ['x'.repeat(1000)] }));
  refused(event({ touchedFiles: ['x'.repeat(1001)] }), /touchedFiles/);
});

test('an unsafe touched file is refused under both path conventions, on every OS', () => {
  for (const unsafe of ['/etc/passwd', 'C:\\Windows\\x', 'c:/Windows/x', '\\\\server\\share\\x', '../x', '..\\x', 'a/../b', 'a\\..\\b']) {
    refused(event({ touchedFiles: ['ok.mjs', unsafe] }), /touchedFiles/);
  }
  accepted(event({ touchedFiles: ['a/b.mjs', 'dots..in.name', '.hidden/file', 'a..b/c'] }));
});

test('an unsafe touched file is named by position, never by value', () => {
  const credential = ['pass', 'word'].join('') + ' = hunter2example';
  const found = reasons(event({ touchedFiles: ['a.mjs', 'b.mjs', `/abs/${credential}`] })).join('\n');

  assert.match(found, /touchedFiles\[2\]/);
  assert.doesNotMatch(found, /abs|hunter2example/);
});

test('verification records have exactly three keys, each bounded', () => {
  const record = (overrides = {}) => ({ command: 'node --test', exitCode: 0, summary: 'ok', ...overrides });
  accepted(event({ verification: [record()] }));
  accepted(event({ verification: [record({ summary: '', exitCode: 255 })] }));
  accepted(event({ verification: Array.from({ length: 100 }, () => record()) }));
  refused(event({ verification: Array.from({ length: 101 }, () => record()) }), /verification/);
  refused(event({ verification: [{ command: 'x', exitCode: 0 }] }), /verification/);
  refused(event({ verification: [record({ extra: 1 })] }), /verification/);
  refused(event({ verification: [record({ command: '' })] }), /verification/);
  refused(event({ verification: [record({ command: 'x'.repeat(2001) })] }), /verification/);
  refused(event({ verification: [record({ exitCode: 256 })] }), /verification/);
  refused(event({ verification: [record({ exitCode: 1.5 })] }), /verification/);
  refused(event({ verification: [record({ summary: 'x'.repeat(4001) })] }), /verification/);
  refused(event({ verification: 'none' }), /verification/);
});

test('commitSha is null or a hexadecimal object id', () => {
  accepted(event({ commitSha: null }));
  accepted(event({ commitSha: 'abcdef1' }));
  accepted(event({ commitSha: 'A'.repeat(64) }));
  refused(event({ commitSha: 'abc' }), /commitSha/);
  refused(event({ commitSha: 'g'.repeat(7) }), /commitSha/);
});

// Upstream measures len(json.dumps(event, ensure_ascii=False, sort_keys=True)
// .encode()): sorted keys, ", " and ": " separators, and Python's float token.
// Its message says "256 KiB"; its check is 256_000. The test builds an event of
// EXACTLY that size by that rule, so the wrong separators or the wrong token —
// each a byte or two — moves the boundary and fails it.
const upstreamBytes = (candidate) =>
  Buffer.byteLength(
    canonicalJson(candidate, { separators: PYTHON_DEFAULT_SEPARATORS, tokens: { elapsedHours: '0.0' } }),
    'utf8',
  );
const eventOfExactly = (bytes) => {
  const records = (lengths) => lengths.map((n, i) => ({ command: `c${i}`, exitCode: 0, summary: 'y'.repeat(n) }));
  const lengths = Array.from({ length: 100 }, () => 0);
  let remaining = bytes - upstreamBytes(event({ verification: records(lengths) }));
  for (let i = 0; i < lengths.length && remaining > 0; i += 1) {
    lengths[i] = Math.min(4000, remaining);
    remaining -= lengths[i];
  }
  assert.equal(remaining, 0, 'the fixture can be padded to the requested size');
  return event({ verification: records(lengths) });
};

test('the size bound is the 256 000 bytes the source pack enforces, measured as it measures', () => {
  const atTheBound = eventOfExactly(256_000);
  const oneOver = eventOfExactly(256_001);

  assert.equal(upstreamBytes(atTheBound), 256_000);
  accepted(atTheBound, { elapsedHoursToken: '0.0' });
  refused(oneOver, /256000 bytes/);
});

test('with no token given, the size is measured with the float form the hook path writes', () => {
  accepted(eventOfExactly(256_000));
  refused(eventOfExactly(256_001), /256000 bytes/);
});

// One value per top-level alternative of the source pack's pattern, ASSEMBLED AT
// RUN TIME: this repository is public, and a token-shaped literal in a test file
// is exactly what push protection exists to reject.
const SECRET_VALUES = {
  'credential assignment': ['pass', 'word'].join('') + ' = hunter2example',
  'bearer token': ['bear', 'er '].join('') + 'A'.repeat(20),
  'PEM private key': ['-----BEGIN RSA ', 'PRIVATE KEY-----'].join(''),
  'GitHub token': ['gh', 'p_'].join('') + 'a'.repeat(24),
  'Slack token': ['xox', 'b-'].join('') + '1'.repeat(12),
  'AWS key id': ['AKI', 'A'].join('') + 'B'.repeat(16),
  'sk- key': ['s', 'k-'].join('') + 'c'.repeat(20),
};

test('the pattern has the seven alternatives of the source pack, and a value for each', () => {
  assert.deepEqual(SECRET_ALTERNATIVES.map((a) => a.name), Object.keys(SECRET_VALUES));
});

test('each alternative of the secret pattern is refused, in any string field', () => {
  for (const [name, value] of Object.entries(SECRET_VALUES)) {
    refused(event({ exactNextWork: `next: ${value}` }), /secret/);
    refused(event({ verification: [{ command: 'run', exitCode: 0, summary: value }] }), /secret/);
    assert.ok(secretPattern().test(value), name);
  }
});

test('every alternative is case-insensitive, as the (?i) of the source pack makes it', () => {
  for (const value of Object.values(SECRET_VALUES)) {
    assert.ok(secretPattern().test(value.toLowerCase()), value.slice(0, 6));
    assert.ok(secretPattern().test(value.toUpperCase()), value.slice(0, 6));
  }
});

test('removing any one alternative lets exactly its value through', () => {
  for (const removed of SECRET_ALTERNATIVES) {
    const weakened = secretPattern(SECRET_ALTERNATIVES.filter((a) => a !== removed));
    for (const [name, value] of Object.entries(SECRET_VALUES)) {
      assert.equal(weakened.test(value), name !== removed.name, `without "${removed.name}", "${name}"`);
    }
  }
});

test('a refusal for a secret never contains the matched text', () => {
  for (const value of Object.values(SECRET_VALUES)) {
    const found = reasons(event({ exactNextWork: value })).join('\n');

    assert.match(found, /secret/);
    assert.ok(!found.includes(value) && !found.includes(value.slice(-10)), found);
  }
});

test('no file of this capability carries a token-shaped literal', () => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  for (const file of ['validate.mjs', 'validate.test.mjs']) {
    assert.doesNotMatch(readFileSync(`${here}${file}`, 'utf8'), secretPattern(), file);
  }
});

// The carried skill document cites this schema as the contract for --input
// events. If the two field sets ever drift, an event the schema accepts could
// be one this validator's unknownFields() check refuses, or vice versa.
test("the carried skill's progress-event schema properties agree with this validator's closed field set", () => {
  const schemaPath = fileURLToPath(new URL('../../references/schemas/progress-event.schema.json', import.meta.url));
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const schemaFields = Object.keys(schema.properties).sort();
  const validatorFields = [...ALLOWED_FIELDS].sort();

  assert.deepEqual(schemaFields, validatorFields);
  assert.equal(schema.additionalProperties, false, 'the schema must close the field set the same way the validator does');
});
