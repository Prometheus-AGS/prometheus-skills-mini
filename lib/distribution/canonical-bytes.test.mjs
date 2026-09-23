import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { canonicalBytes } from './canonical-bytes.mjs';

const workspace = (run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'canonical-bytes-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('a file with no carriage return is returned exactly as written, without consulting git', () => {
  workspace((dir) => {
    const file = path.join(dir, 'plain.txt');
    writeFileSync(file, 'no cr here\nsecond line\n');

    const bytes = canonicalBytes(file);

    assert.equal(bytes.toString('utf8'), 'no cr here\nsecond line\n');
  });
});

test('a file outside any git repository is returned as-is even when it contains CRLF', () => {
  workspace((dir) => {
    const file = path.join(dir, 'crlf.txt');
    writeFileSync(file, 'line one\r\nline two\r\n');

    const bytes = canonicalBytes(file);

    assert.equal(bytes.toString('utf8'), 'line one\r\nline two\r\n');
  });
});
