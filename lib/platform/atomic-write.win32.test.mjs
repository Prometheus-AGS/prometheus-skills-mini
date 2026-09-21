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

// The child prints "open" on stdout only AFTER the handle exists, so the test never guesses.
const holdOpen = (file, forMs) =>
  spawn(
    process.execPath,
    ['-e', `const fs=require('node:fs');const h=fs.openSync(${JSON.stringify(file)},'r');process.stdout.write('open');setTimeout(()=>fs.closeSync(h),${forMs});`],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

const waitForOpen = (child) =>
  new Promise((resolve, reject) => {
    let seen = '';
    child.stdout.on('data', (chunk) => {
      seen += chunk;
      if (seen.includes('open')) resolve();
    });
    child.on('exit', (code) => reject(new Error(`holder exited (${code}) before opening the file`)));
    child.on('error', reject);
    setTimeout(() => reject(new Error('holder never signalled that it opened the file')), 10_000);
  });

test('a destination held open by another process is still replaced', windowsOnly, async () => {
  const dir = mkdtempSync(path.join(tempDir(), 'win32-atomic-'));
  try {
    const target = path.join(dir, 'held.json');
    writeFileSync(target, 'original');

    // Wait for the child to SAY it has the handle; a fixed sleep could let the test pass
    // without the destination ever being held, which would prove nothing.
    const holder = holdOpen(target, 400);
    await waitForOpen(holder);

    atomicWrite(target, 'replacement');

    assert.equal(readFileSync(target, 'utf8'), 'replacement');
    holder.kill();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
