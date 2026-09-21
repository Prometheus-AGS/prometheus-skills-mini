import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from './paths.mjs';
import { acquireLock } from './lock.mjs';

const workspace = (run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'lock-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('the lock file exists while held and is gone after release', () => {
  workspace((dir) => {
    const lock = path.join(dir, 'build.lock');

    const release = acquireLock(lock);

    assert.ok(existsSync(lock));
    release();
    assert.ok(!existsSync(lock));
  });
});

test('a second acquisition fails immediately and names the lock file', () => {
  workspace((dir) => {
    const lock = path.join(dir, 'build.lock');
    const release = acquireLock(lock);

    assert.throws(() => acquireLock(lock), (error) => error.message.includes(lock));

    release();
  });
});

test('a stale lock is not recovered, and the message says which file to remove', () => {
  workspace((dir) => {
    const lock = path.join(dir, 'build.lock');
    writeFileSync(lock, 'left behind by a crashed process');

    assert.throws(() => acquireLock(lock), (error) => error.message.includes(lock));
  });
});

test('releasing twice is safe, so a finally block never masks the real error', () => {
  workspace((dir) => {
    const release = acquireLock(path.join(dir, 'build.lock'));

    release();

    assert.doesNotThrow(() => release());
  });
});

test('the lock file records the process that holds it, for a human clearing a stale one', () => {
  workspace((dir) => {
    const lock = path.join(dir, 'build.lock');

    const release = acquireLock(lock);

    assert.match(readFileSync(lock, 'utf8'), new RegExp(String(process.pid)));
    release();
  });
});

test('release does not delete a lock that another acquisition now holds', () => {
  workspace((dir) => {
    const lock = path.join(dir, 'build.lock');
    const releaseFirst = acquireLock(lock);

    // A human clears a lock they believe is stale, and a second writer takes it.
    rmSync(lock, { force: true });
    const releaseSecond = acquireLock(lock);
    const secondContents = readFileSync(lock, 'utf8');

    releaseFirst();

    assert.ok(existsSync(lock), 'the second holder\'s lock must survive');
    assert.equal(readFileSync(lock, 'utf8'), secondContents);
    releaseSecond();
  });
});
