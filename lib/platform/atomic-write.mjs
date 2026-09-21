// Write a file so no reader ever sees it half-written: write a temporary file in the SAME
// directory (a rename across filesystems is not atomic), then rename it over the target.
//
// The Windows retry is the one platform-specific behaviour here. Antivirus scanners and the
// search indexer open a file briefly after it is created, and a rename onto a handle they hold
// fails with EPERM, EBUSY or EACCES. The failure is transient — the holder releases in
// milliseconds — so a small bounded retry converts a spurious crash into a short wait.
//
// It is deliberately narrow. Only win32, only those three codes, only a fixed number of
// attempts. Every other error is rethrown on the first failure: retrying ENOSPC or EROFS just
// delays a real problem. The filesystem calls are injected so the loop is asserted on every OS.

import fs from 'node:fs';
import path from 'node:path';

/** Transient sharing violations on Windows. Anything else is a real error. */
export const RETRY_CODES = Object.freeze(['EPERM', 'EBUSY', 'EACCES']);

/** Attempts in total, not retries: 1 immediate try plus MAX_ATTEMPTS-1 retries. */
export const MAX_ATTEMPTS = 5;

const BASE_DELAY_MS = 10;

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function createAtomicWrite({
  platform = process.platform,
  rename = fs.renameSync,
  writeFile = fs.writeFileSync,
  mkdir = fs.mkdirSync,
  remove = fs.rmSync,
  sleep = sleepSync,
} = {}) {
  const shouldRetry = (error) => platform === 'win32' && RETRY_CODES.includes(error.code);

  return function atomicWrite(file, content) {
    const directory = path.dirname(file);
    mkdir(directory, { recursive: true });

    // Same directory as the target, and unique per process so two writers cannot collide.
    const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.tmp`);
    writeFile(temporary, content, 'utf8');

    for (let attempt = 1; ; attempt += 1) {
      try {
        rename(temporary, file);
        return;
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS || !shouldRetry(error)) {
          remove(temporary, { force: true });
          throw error;
        }
        sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  };
}

export const atomicWrite = createAtomicWrite();
