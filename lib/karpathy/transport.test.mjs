import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deliverToPk, KPM_PK_TIMEOUT_SECONDS_DEFAULT } from './transport.mjs';

const spawnOf = (result) => {
  const calls = [];
  const spawn = (program, args, options) => {
    calls.push({ program, args, options });
    return typeof result === 'function' ? result({ program, args, options }) : result;
  };
  return { spawn, calls };
};

const ok = (stdout) => ({ status: 0, stdout, stderr: '', error: undefined, signal: null });
const nonZero = (status = 1) => ({ status, stdout: '', stderr: 'pk: something went wrong', error: undefined, signal: null });
const enoent = () => ({ status: null, stdout: '', stderr: '', error: Object.assign(new Error('spawn pk ENOENT'), { code: 'ENOENT' }), signal: null });
const timedOut = () => ({ status: null, stdout: '', stderr: '', error: Object.assign(new Error('spawnSync pk ETIMEDOUT'), { code: 'ETIMEDOUT' }), signal: 'SIGTERM' });

const deliver = (overrides = {}) =>
  deliverToPk({ eventId: 'kpm-abc12345', record: 'the markdown record\n', env: {}, spawn: spawnOf(ok('receipt-text')).spawn, ...overrides });

test('argv is exactly ingest --scope project --source karpathy-progress-memory:<eventId>', () => {
  const { spawn, calls } = spawnOf(ok(''));

  deliverToPk({ eventId: 'kpm-abc12345', record: 'x', env: {}, spawn });

  assert.deepEqual(calls[0].args, ['ingest', '--scope', 'project', '--source', 'karpathy-progress-memory:kpm-abc12345']);
});

test('the record is sent on stdin, and shell is always false', () => {
  const { spawn, calls } = spawnOf(ok(''));

  deliverToPk({ eventId: 'kpm-abc12345', record: 'the exact record text\n', env: {}, spawn });

  assert.equal(calls[0].options.input, 'the exact record text\n');
  assert.equal(calls[0].options.shell, false);
});

test('the program is pk by default, resolved on PATH by spawnExecutable itself', () => {
  const { spawn, calls } = spawnOf(ok(''));

  deliverToPk({ eventId: 'kpm-abc12345', record: 'x', env: {}, spawn });

  assert.equal(calls[0].program, 'pk');
});

test('PK_BIN replaces the program', () => {
  const { spawn, calls } = spawnOf(ok(''));

  deliverToPk({ eventId: 'kpm-abc12345', record: 'x', env: { PK_BIN: '/opt/tools/pk' }, spawn });

  assert.equal(calls[0].program, '/opt/tools/pk');
});

test('exit 0 is accepted, with receiptSha256 of the trimmed stdout', () => {
  const result = deliver({ spawn: spawnOf(ok('  the-receipt-text  \n')).spawn });

  assert.equal(result.transport, 'pk');
  assert.equal(result.status, 'accepted');
  assert.equal(result.receiptSha256, createHash('sha256').update('the-receipt-text', 'utf8').digest('hex'));
});

test('exit 0 with empty stdout accepts with a null receiptSha256', () => {
  const result = deliver({ spawn: spawnOf(ok('   \n')).spawn });

  assert.equal(result.status, 'accepted');
  assert.equal(result.receiptSha256, null);
});

test('a non-zero exit is degraded, with a reason, never a thrown error', () => {
  const result = deliver({ spawn: spawnOf(nonZero(3)).spawn });

  assert.equal(result.transport, 'pk');
  assert.equal(result.status, 'degraded');
  assert.match(result.reason, /exit(ed)? 3|status 3/);
});

test('ENOENT (pk not on PATH) is degraded with the friendly reason, not the raw error text', () => {
  const result = deliver({ spawn: spawnOf(enoent()).spawn });

  assert.equal(result.status, 'degraded');
  // Exact match: a regex containing "ENOENT" would also match the raw
  // Node error message ("spawn pk ENOENT") even if the special case that
  // produces the friendly wording were removed.
  assert.equal(result.reason, 'pk executable unavailable');
});

test('a timeout is degraded, not thrown', () => {
  const result = deliver({ spawn: spawnOf(timedOut()).spawn });

  assert.equal(result.status, 'degraded');
  assert.match(result.reason, /timeout|timed out/i);
});

test('the spawn itself throwing is degraded, not thrown out of deliverToPk', () => {
  const spawn = () => {
    throw new TypeError('"pk" resolves to a script');
  };

  const result = deliver({ spawn });

  assert.equal(result.status, 'degraded');
  assert.match(result.reason, /script|resolves/i);
});

test('KPM_PK_TIMEOUT_SECONDS is passed through to the spawn as the timeout', () => {
  const { spawn, calls } = spawnOf(ok(''));

  deliverToPk({ eventId: 'kpm-x', record: 'x', env: { KPM_PK_TIMEOUT_SECONDS: '2.5' }, spawn });

  assert.equal(calls[0].options.timeout, 2500);
});

test('the default timeout is 5 seconds when KPM_PK_TIMEOUT_SECONDS is unset', () => {
  const { spawn, calls } = spawnOf(ok(''));

  assert.equal(KPM_PK_TIMEOUT_SECONDS_DEFAULT, 5);
  deliverToPk({ eventId: 'kpm-x', record: 'x', env: {}, spawn });

  assert.equal(calls[0].options.timeout, 5000);
});

test('KPM_PK_TIMEOUT_SECONDS out of 0.1-10 is refused before anything is spawned', () => {
  const { spawn, calls } = spawnOf(ok(''));

  for (const bad of ['0.05', '11', '10.01', '0', '-1']) {
    assert.throws(
      () => deliverToPk({ eventId: 'kpm-x', record: 'x', env: { KPM_PK_TIMEOUT_SECONDS: bad }, spawn }),
      /KPM_PK_TIMEOUT_SECONDS must be between 0\.1 and 10/,
      bad,
    );
  }
  assert.deepEqual(calls, []);
});

test('KPM_PK_TIMEOUT_SECONDS at the boundary is accepted', () => {
  const { spawn, calls } = spawnOf(ok(''));

  deliverToPk({ eventId: 'kpm-x', record: 'x', env: { KPM_PK_TIMEOUT_SECONDS: '0.1' }, spawn });
  deliverToPk({ eventId: 'kpm-x', record: 'x', env: { KPM_PK_TIMEOUT_SECONDS: '10' }, spawn });

  assert.equal(calls[0].options.timeout, 100);
  assert.equal(calls[1].options.timeout, 10000);
});

test('a non-numeric KPM_PK_TIMEOUT_SECONDS is refused with its own message', () => {
  const { spawn } = spawnOf(ok(''));

  assert.throws(
    () => deliverToPk({ eventId: 'kpm-x', record: 'x', env: { KPM_PK_TIMEOUT_SECONDS: 'abc' }, spawn }),
    /KPM_PK_TIMEOUT_SECONDS must be numeric/,
  );
});

test('the transport never appears inside a shell string; args stay an array', () => {
  const { spawn, calls } = spawnOf(ok(''));

  deliverToPk({ eventId: 'kpm-abc12345', record: 'x', env: {}, spawn });

  assert.ok(Array.isArray(calls[0].args));
  for (const arg of calls[0].args) assert.equal(typeof arg, 'string');
});

// The only test in this file with NO injected spawn: it runs a REAL child
// process, through the real spawnExecutable, with no shell. PK_BIN is set to
// the Node executable itself, which — given "ingest --scope project
// --source ..." as its argv — is not a valid Node invocation and exits
// non-zero. That is enough to prove the whole real path (spawn, stdin, exit
// code, no shell) without depending on pk being installed on the machine
// running this suite.
test('a real, non-injected spawn: PK_BIN set to process.execPath degrades', () => {
  const result = deliverToPk({
    eventId: 'kpm-real12345',
    record: 'a real record on stdin\n',
    env: { PK_BIN: process.execPath },
  });

  assert.equal(result.transport, 'pk');
  assert.equal(result.status, 'degraded');
  assert.match(result.reason, /exit(ed)? \d|status \d/);
});
