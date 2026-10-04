// Parity with the skill-pack's canonical writer (shared/scripts/lib/learning_write.py
// at prometheus-skill-system origin/main d1dabe9). Every expected value below was
// produced by running that Python implementation (content_hash, TRAILER and
// json.dumps(sort_keys=True, separators=(',', ':'))) — they are not derived from
// this port, so a drift in either side fails here.
//
// The production failure this catches: the same lesson hashing differently in mini
// and the pack, so de-duplication misses it, or a recall reader failing to find the
// `<!-- prometheus-envelope {json} -->` trailer on a mini-written record.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentHashOf, storedContent } from './envelope.mjs';
import { withEnvelope } from '../karpathy/record.mjs';

const PYTHON_HASHES = [
  ['plain', 'Use the real path.', '5c8b8d2d0b19e69f8215a354acf3970344ea50bbbb6959adcd36603e1c11af6c'],
  ['NFC composed', 'café', '850f7dc43910ff890f8879c0ed26fe697c93a067ad93a7d50f466a7028a9bf4e'],
  ['NFD decomposed hashes as NFC', 'café', '850f7dc43910ff890f8879c0ed26fe697c93a067ad93a7d50f466a7028a9bf4e'],
  ['extra internal whitespace', '  a   b\t\tc \n d  ', 'f82ce1b653e30b1ceb5711bbf75965dd24513011d7daa48bbd8610550154a1fd'],
  ['leading and trailing newlines', '\n\n  lesson text\n\n', 'e6d18a6eddb2aa3a1a59284071adaeb463ce9a5a81bc01ce9c3a19b0ccc9ebd7'],
  ['CRLF line endings', 'line1\r\nline2\r\n', '1f5c080ae39f741cb927bef27d0a79de3eb78187a13f04d17f43963dc3eb7684'],
  ['U+001C/U+001F are whitespace in Python', 'a\u001fb\u001cc', '0e9f64031fcb2bc708b531c2a20441580425d151a38503f38592a7dd36019d3b'],
  ['NBSP, ideographic and em space', 'a b　c d', 'f82ce1b653e30b1ceb5711bbf75965dd24513011d7daa48bbd8610550154a1fd'],
  ['U+FEFF is not whitespace in Python', '﻿a', '1951c7860e968e742658b3af34e60741eb4aaf2a8d2ecc3993727016b12e81e8'],
  ['astral character', 'emoji \u{1F600} ok', '21f070bfc29420afdc03d39927d748b1e66a414beb70ec41de7ce0932794dfb3'],
  ['empty', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
];

for (const [name, text, expected] of PYTHON_HASHES) {
  test(`contentHash matches learning_write.py: ${name}`, () => {
    assert.equal(contentHashOf(text), expected);
  });
}

const ENVELOPE = {
  ts: '2026-01-01T00:00:00Z',
  schemaVersion: 1,
  projectId: 'p',
  visibility: 'project',
  kind: 'progress',
  author: { harness: 'other', agentType: 'café \u{1F600}' },
  contentHash: 'x',
  paths: ['a>b', 'z'],
};

// f"{text.strip()}\n\n{TRAILER}{json.dumps(envelope, sort_keys=True, separators=(',', ':'))} -->"
const PYTHON_STORED =
  'hello\n\nworld\n\n<!-- prometheus-envelope {"author":{"agentType":"caf\\u00e9 \\ud83d\\ude00","harness":"other"},' +
  '"contentHash":"x","kind":"progress","paths":["a>b","z"],"projectId":"p","schemaVersion":1,' +
  '"ts":"2026-01-01T00:00:00Z","visibility":"project"} -->';

test('stored content is byte-identical to learning_write.py (sorted keys, ASCII-escaped, blank line, trailer)', () => {
  assert.equal(storedContent('  hello\n\nworld \n', ENVELOPE), PYTHON_STORED);
});

test('the Karpathy record is delivered in the canonical stored form', () => {
  assert.equal(withEnvelope('  hello\n\nworld \n', ENVELOPE), PYTHON_STORED);
});

test('a "-->" inside a value cannot close the trailer comment, and the JSON value is unchanged', () => {
  const stored = storedContent('t', { ...ENVELOPE, paths: ['x --> y'] });
  assert.equal(stored.split('-->').length, 2, 'the only "-->" is the closing one');
  const json = stored.slice(stored.indexOf('{'), stored.lastIndexOf(' -->'));
  assert.deepEqual(JSON.parse(json).paths, ['x --> y']);
});
