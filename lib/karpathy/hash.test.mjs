import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readText } from '../platform/text.mjs';
import {
  canonicalJson,
  eventFromText,
  eventIdentitySha256,
  eventSha256,
  pythonFloatToken,
} from './hash.mjs';

const fixture = (name) => new URL(`./fixtures/${name}`, import.meta.url);

// The receipt the source pack's Python recorder wrote. Read as TEXT: its
// "elapsedHours": 0.0 does not survive JSON.parse.
const receiptText = readText(fixture('golden-receipt.json'));
const receipt = JSON.parse(receiptText);

// The event sits inside the receipt, so its own text is what carries the token.
const eventText = (() => {
  const start = receiptText.indexOf('"event"');
  const open = receiptText.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < receiptText.length; i += 1) {
    if (receiptText[i] === '{') depth += 1;
    if (receiptText[i] === '}') depth -= 1;
    if (depth === 0) return receiptText.slice(open, i + 1);
  }
  throw new Error('event object not found in the fixture');
})();

test('the hash the Python recorder wrote is reproduced from the event as text', () => {
  const { event, elapsedHoursToken } = eventFromText(eventText);

  assert.equal(elapsedHoursToken, '0.0');
  assert.equal(eventSha256(event, { elapsedHoursToken }), receipt.eventSha256);
});

test('the identity hash is reproduced with no special handling', () => {
  const { event } = eventFromText(eventText);

  assert.equal(eventIdentitySha256(event), receipt.eventIdentitySha256);
});

test('serialising elapsedHours the way JSON.stringify does gives a different hash', () => {
  // This is the bug the token exists to prevent; if this ever matched, the
  // token rule would be untested.
  const { event } = eventFromText(eventText);

  const naive = eventSha256(event, { elapsedHoursToken: JSON.stringify(event.elapsedHours) });

  assert.equal(naive, 'ca79e321903cc10e8bf23597e19e8ea8f241dafbf476b1fb6527b7878f3ca47e');
  assert.notEqual(naive, receipt.eventSha256);
});

test('the key order of the input does not change either hash', () => {
  const { event, elapsedHoursToken } = eventFromText(eventText);
  const reversed = Object.fromEntries(Object.entries(event).reverse());

  assert.equal(eventSha256(reversed, { elapsedHoursToken }), receipt.eventSha256);
  assert.equal(eventIdentitySha256(reversed), receipt.eventIdentitySha256);
});

test('observedAt is not part of the event hash, and is part of nothing else it should be', () => {
  const { event, elapsedHoursToken } = eventFromText(eventText);

  const later = { ...event, observedAt: '2030-01-01T00:00:00Z' };
  const different = { ...event, exactNextWork: 'something else' };

  assert.equal(eventSha256(later, { elapsedHoursToken }), receipt.eventSha256);
  assert.notEqual(eventSha256(different, { elapsedHoursToken }), receipt.eventSha256);
});

test('an absent identity field hashes as null, as the source pack hashes it', () => {
  const { event } = eventFromText(eventText);
  const { taskId, ...withoutTaskId } = event;

  assert.equal(taskId, null);
  assert.equal(eventIdentitySha256(withoutTaskId), receipt.eventIdentitySha256);
});

test('canonical JSON sorts keys, is compact, and leaves non-ASCII unescaped', () => {
  const text = canonicalJson({ b: 'café — ✓', a: [1, { d: null, c: true }] });

  assert.equal(text, '{"a":[1,{"c":true,"d":null}],"b":"café — ✓"}');
});

test('an event built here writes elapsedHours as Python writes a float', () => {
  assert.equal(pythonFloatToken(0), '0.0');
  assert.equal(pythonFloatToken(1000), '1000.0');
  assert.equal(pythonFloatToken(1.5), '1.5');
  assert.equal(pythonFloatToken(12.75), '12.75');
});

test('an integer and a float are different inputs and hash differently', () => {
  const asInt = eventFromText(eventText.replace('"elapsedHours": 0.0', '"elapsedHours": 1'));
  const asFloat = eventFromText(eventText.replace('"elapsedHours": 0.0', '"elapsedHours": 1.0'));

  assert.equal(asInt.elapsedHoursToken, '1');
  assert.equal(asFloat.elapsedHoursToken, '1.0');
  assert.equal(asInt.event.elapsedHours, asFloat.event.elapsedHours);
  assert.notEqual(
    eventSha256(asInt.event, { elapsedHoursToken: asInt.elapsedHoursToken }),
    eventSha256(asFloat.event, { elapsedHoursToken: asFloat.elapsedHoursToken }),
  );
});

test('a token that is not the number in the event is refused', () => {
  const { event } = eventFromText(eventText);

  assert.throws(() => eventSha256(event, { elapsedHoursToken: '7.0' }), /elapsedHours/);
  assert.throws(() => eventSha256(event, { elapsedHoursToken: '0.0, "x": 1' }), /elapsedHours/);
});

test('a string that merely mentions elapsedHours is not mistaken for the field', () => {
  const tricky = eventText.replace(
    '"exactNextWork": ',
    '"blocker": "set \\"elapsedHours\\": 9 later", "exactNextWork": ',
  ).replace(/"blocker": null,\s*/, '');

  assert.equal(eventFromText(tricky).elapsedHoursToken, '0.0');
});

const vectorsFile = fixture('python-hash-vectors.json');
test(
  'every Python vector is reproduced',
  { todo: existsSync(vectorsFile) ? false : 'operator-supplied vectors absent: task 1.2' },
  () => {
    const { vectors } = JSON.parse(readText(vectorsFile));
    assert.ok(vectors.length > 0);
    for (const { pythonLiteral, jsonToken, eventSha256: expected } of vectors) {
      const text = eventText.replace('"elapsedHours": 0.0', `"elapsedHours": ${jsonToken}`);
      const { event, elapsedHoursToken } = eventFromText(text);
      assert.equal(eventSha256(event, { elapsedHoursToken }), expected, `elapsedHours = ${pythonLiteral}`);
    }
  },
);

test('the fixture still carries the float token it exists to preserve', () => {
  assert.match(receiptText, /"elapsedHours": 0\.0\b/);
  assert.equal(createHash('sha256').update(receipt.event.eventId).digest('hex'),
    'dea375631f620b20970cb0d952d42dcb74503eceeaabc07482278b8f6a073676');
});
