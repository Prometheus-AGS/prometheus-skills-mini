import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from './paths.mjs';
import { atomicWrite } from './atomic-write.mjs';

// Fault injection proves the retry LOOP. It cannot prove that Windows actually raises EPERM or
// EBUSY when something holds the destination open — only a real handle on a real Windows
// filesystem does that. This test is therefore skipped everywhere else rather than faked, and
// CI's windows-latest legs are where it earns its keep.
const windowsOnly = { skip: process.platform !== 'win32' ? 'win32 only: needs real Windows file-sharing semantics' : false };

test('a destination held open by another handle is still replaced', windowsOnly, () => {
  const dir = mkdtempSync(path.join(tempDir(), 'win32-atomic-'));
  try {
    const target = path.join(dir, 'held.json');
    writeFileSync(target, 'original');

    // Open without FILE_SHARE_DELETE, which is what an antivirus scanner or the indexer does.
    const handle = openSync(target, 'r');
    const release = setTimeout(() => closeSync(handle), 30);

    atomicWrite(target, 'replacement');

    clearTimeout(release);
    try {
      closeSync(handle);
    } catch {
      // already closed by the timer
    }
    assert.equal(readFileSync(target, 'utf8'), 'replacement');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
