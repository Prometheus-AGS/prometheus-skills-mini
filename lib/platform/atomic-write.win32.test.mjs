import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tempDir } from './paths.mjs';
import { atomicWrite } from './atomic-write.mjs';

// Fault injection proves the retry LOOP. It cannot prove that Windows actually raises EPERM
// when something holds the destination open — only a real handle on a real Windows filesystem
// does that, and CI's windows-latest legs are where this earns its keep. It is skipped
// elsewhere rather than faked.
//
// The holder MUST be a separate process. A first version used setTimeout to close the handle,
// which can never fire: atomicWrite is synchronous, so it blocks the event loop for the whole
// retry window and the timer only runs after the write has already failed. CI caught that as a
// genuine EPERM exhaustion — the test was wrong, not the retry.
const windowsOnly = {
  skip: process.platform !== 'win32' ? 'win32 only: needs real Windows file-sharing semantics' : false,
};

const holdOpen = (file, forMs) =>
  spawn(
    process.execPath,
    ['-e', `const fs=require('node:fs');const h=fs.openSync(${JSON.stringify(file)},'r');setTimeout(()=>fs.closeSync(h),${forMs});`],
    { stdio: 'ignore' },
  );

test('a destination held open by another process is still replaced', windowsOnly, async () => {
  const dir = mkdtempSync(path.join(tempDir(), 'win32-atomic-'));
  try {
    const target = path.join(dir, 'held.json');
    writeFileSync(target, 'original');

    // The child opens immediately and holds for 400 ms from ITS start. We wait 100 ms for the
    // open to land, so the handle is still held when atomicWrite begins and is released ~300 ms
    // later — inside the retry window below, which is widened for exactly this reason.
    const holder = holdOpen(target, 400);
    await new Promise((resolve) => setTimeout(resolve, 100));

    atomicWrite(target, 'replacement');

    assert.equal(readFileSync(target, 'utf8'), 'replacement');
    holder.kill();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
