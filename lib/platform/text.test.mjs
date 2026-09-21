import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from './paths.mjs';
import { readText } from './text.mjs';

const withFile = (contents, run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'text-'));
  try {
    const file = path.join(dir, 'sample.md');
    writeFileSync(file, contents);
    return run(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('readText converts CRLF to LF', () => {
  const actual = withFile('a\r\nb\r\n', readText);

  assert.equal(actual, 'a\nb\n');
});

test('readText leaves LF content unchanged', () => {
  const actual = withFile('a\nb\n', readText);

  assert.equal(actual, 'a\nb\n');
});

test('readText leaves a lone carriage return alone, because CR-only files are not a case we handle', () => {
  const actual = withFile('a\rb', readText);

  assert.equal(actual, 'a\rb');
});
