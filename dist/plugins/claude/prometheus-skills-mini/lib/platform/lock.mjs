// A single-writer lock built on exclusive create: `fs.open(path, 'wx')` succeeds only if the
// file does not exist, and that check-and-create is atomic on every platform this project
// targets. No dependency, no daemon, no polling.
//
// What it deliberately does NOT do: wait, retry, or detect a stale lock. A lock left behind by
// a crashed process stays until a human removes it. Automatic takeover needs liveness detection
// (is that pid still running? is it the same process?), which is a different problem with real
// failure modes of its own, and nothing here has needed it. The error names the file so a human
// can clear it in one step — and the file records who held it, so they can tell whether the
// holder is genuinely gone.

import fs from 'node:fs';
import { randomBytes } from 'node:crypto';

export function acquireLock(file) {
  let handle;
  try {
    handle = fs.openSync(file, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(
        `lock held: ${file}\n` +
          'Another writer is running. If you are certain none is, delete that file and retry — ' +
          'it records the process that created it.',
      );
    }
    throw error;
  }

  // A token unique to THIS acquisition. Release removes the file only if the token is still
  // there, so if a human clears a lock believed stale and another writer takes it, this
  // release cannot delete the new holder's lock. Review raised exactly that sequence.
  const token = randomBytes(8).toString('hex');
  fs.writeSync(handle, `pid ${process.pid}\nsince ${new Date().toISOString()}\ntoken ${token}\n`);
  fs.closeSync(handle);

  let released = false;
  return function release() {
    // Idempotent: a `finally` that releases twice must never mask the error that caused it.
    if (released) return;
    released = true;
    try {
      if (!fs.readFileSync(file, 'utf8').includes(token)) return; // someone else's lock now
    } catch {
      return; // already gone
    }
    fs.rmSync(file, { force: true });
  };
}
