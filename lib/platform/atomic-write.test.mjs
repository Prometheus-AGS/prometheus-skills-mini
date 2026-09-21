import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from './paths.mjs';
import { createAtomicWrite, atomicWrite, RETRY_CODES, MAX_ATTEMPTS } from './atomic-write.mjs';

const workspace = (run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'atomic-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const failing = (times, code) => {
  let calls = 0;
  const rename = (from, to) => {
    calls += 1;
    if (calls <= times) {
      const error = new Error(`simulated ${code}`);
      error.code = code;
      throw error;
    }
    return undefined;
  };
  return { rename, attempts: () => calls };
};

test('the file holds exactly the content and no temporary file is left behind', () => {
  workspace((dir) => {
    const target = path.join(dir, 'state.json');

    atomicWrite(target, '{"a":1}');

    assert.equal(readFileSync(target, 'utf8'), '{"a":1}');
    assert.deepEqual(readdirSync(dir), ['state.json']);
  });
});

test('missing parent directories are created', () => {
  workspace((dir) => {
    const target = path.join(dir, 'a', 'b', 'deep.txt');

    atomicWrite(target, 'nested');

    assert.equal(readFileSync(target, 'utf8'), 'nested');
    assert.deepEqual(readdirSync(path.join(dir, 'a', 'b')), ['deep.txt']);
  });
});

test('a failed rename leaves the original intact and removes the temporary file', () => {
  workspace((dir) => {
    const target = path.join(dir, 'state.json');
    writeFileSync(target, 'original');
    const write = createAtomicWrite({
      platform: 'linux',
      rename: () => {
        const error = new Error('simulated ENOSPC');
        error.code = 'ENOSPC';
        throw error;
      },
    });

    assert.throws(() => write(target, 'replacement'), /ENOSPC/);

    assert.equal(readFileSync(target, 'utf8'), 'original');
    assert.deepEqual(readdirSync(dir), ['state.json']);
  });
});

test('on win32 a transient sharing violation is retried until it succeeds', () => {
  workspace((dir) => {
    const target = path.join(dir, 'state.json');
    const { rename, attempts } = failing(2, 'EBUSY');
    const write = createAtomicWrite({ platform: 'win32', rename, sleep: () => {} });

    write(target, 'written');

    assert.equal(attempts(), 3);
  });
});

test('on win32 the retry is bounded and the last error is rethrown', () => {
  workspace((dir) => {
    const target = path.join(dir, 'state.json');
    const { rename, attempts } = failing(Number.MAX_SAFE_INTEGER, 'EPERM');
    const write = createAtomicWrite({ platform: 'win32', rename, sleep: () => {} });

    assert.throws(() => write(target, 'written'), /EPERM/);

    assert.equal(attempts(), MAX_ATTEMPTS);
    assert.deepEqual(readdirSync(dir), []);
  });
});

test('every retryable code is retried on win32', () => {
  for (const code of RETRY_CODES) {
    workspace((dir) => {
      const target = path.join(dir, `${code}.json`);
      const { rename, attempts } = failing(1, code);
      const write = createAtomicWrite({ platform: 'win32', rename, sleep: () => {} });

      write(target, 'written');

      assert.equal(attempts(), 2, `${code} should have been retried`);
    });
  }
});

test('no retry happens on platforms other than win32', () => {
  for (const platform of ['linux', 'darwin']) {
    workspace((dir) => {
      const target = path.join(dir, 'state.json');
      const { rename, attempts } = failing(1, 'EBUSY');
      const write = createAtomicWrite({ platform, rename, sleep: () => {} });

      assert.throws(() => write(target, 'written'), /EBUSY/);

      assert.equal(attempts(), 1, `${platform} must not retry`);
    });
  }
});

test('an error that is not a sharing violation is never retried, even on win32', () => {
  workspace((dir) => {
    const target = path.join(dir, 'state.json');
    const { rename, attempts } = failing(1, 'ENOSPC');
    const write = createAtomicWrite({ platform: 'win32', rename, sleep: () => {} });

    assert.throws(() => write(target, 'written'), /ENOSPC/);

    assert.equal(attempts(), 1);
  });
});

test('the delay grows between attempts so a slow holder has time to release', () => {
  workspace((dir) => {
    const delays = [];
    const { rename } = failing(Number.MAX_SAFE_INTEGER, 'EBUSY');
    const write = createAtomicWrite({ platform: 'win32', rename, sleep: (ms) => delays.push(ms) });

    assert.throws(() => write(path.join(dir, 'state.json'), 'written'));

    assert.equal(delays.length, MAX_ATTEMPTS - 1);
    assert.deepEqual([...delays].sort((a, b) => a - b), delays);
    assert.ok(delays[delays.length - 1] > delays[0]);
  });
});
