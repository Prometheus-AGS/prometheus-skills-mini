import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { readText } from '../platform/text.mjs';
import { markdownRecord, appendSessionLog, SESSION_LOG_LOCK_SUFFIX } from './session-log.mjs';

const golden = JSON.parse(readText(new URL('./fixtures/golden-receipt.json', import.meta.url))).event;

const withRoot = (run) => {
  const root = mkdtempSync(path.join(tempDir(), 'session-log-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const logPath = (root) => path.join(root, '.prometheus', 'session-log.md');

test('the record has the marker, the heading, and every field in the shape the source pack writes', () => {
  const event = {
    ...golden,
    touchedFiles: ['a.mjs', 'b.mjs'],
    verification: [{ command: 'node --test', exitCode: 0, summary: 'ok' }],
    blocker: null,
    changeId: 'change-1',
    taskId: '1.1',
  };

  const record = markdownRecord(event, { elapsedHoursToken: '0.0' });

  assert.match(record, /^\n<!-- karpathy-progress-event:kpm-d6f1c4a3b56523b3673b20a41c84abe3 -->\n/);
  assert.match(record, /^## Progress boundary — 2026-09-21T18:02:59\.291251\+00:00\n\n/m);
  assert.match(record, /- Event: `kpm-d6f1c4a3b56523b3673b20a41c84abe3`\n/);
  assert.match(record, /- Boundary: `task` \/ `complete`\n/);
  assert.match(record, /- Position: `karpathy-logs-node` \/ `change-1` \/ `1\.1`\n/);
  assert.match(record, /- Class and elapsed time: `product` \/ `0\.0` hours\n/);
  assert.match(record, /- Files: `a\.mjs`, `b\.mjs`\n/);
  assert.match(record, /- Verification:\n {2}- `node --test` → exit 0: ok\n/);
});

test('the elapsed-time token matches what the token carried from the source, not the JS number', () => {
  // 1 and 1.0 are the same JS number, but Python renders them differently, and the
  // rendered record must match whichever the recorder actually received.
  const asInt = markdownRecord({ ...golden, elapsedHours: 1 }, { elapsedHoursToken: '1' });
  const asFloat = markdownRecord({ ...golden, elapsedHours: 1 }, { elapsedHoursToken: '1.0' });

  assert.match(asInt, /\/ `1` hours/);
  assert.match(asFloat, /\/ `1\.0` hours/);
});

test('a boundary with no files, no verification, no blocker, no changeId/taskId renders the source pack defaults', () => {
  const record = markdownRecord(
    { ...golden, touchedFiles: [], verification: [], blocker: null, changeId: null, taskId: null, commitSha: null, exactNextWork: null },
    { elapsedHoursToken: '0.0' },
  );

  assert.match(record, /- Position: `karpathy-logs-node` \/ `-` \/ `-`\n/);
  assert.match(record, /- Commit: `uncommitted`\n/);
  assert.match(record, /- Files: none\n/);
  assert.match(record, /- Blocker: none\n/);
  assert.match(record, /- Exact next work: none recorded\n/);
  assert.match(record, /- Verification:\n {2}- none recorded\n/);
});

test('a new event is appended and the marker is present', () => {
  withRoot((root) => {
    const record = markdownRecord(golden, { elapsedHoursToken: '0.0' });

    const appended = appendSessionLog(root, golden.eventId, record);

    assert.equal(appended, true);
    const content = readFileSync(logPath(root), 'utf8');
    assert.ok(content.includes(`<!-- karpathy-progress-event:${golden.eventId} -->`));
  });
});

test('a replayed event is skipped, not appended twice', () => {
  withRoot((root) => {
    const record = markdownRecord(golden, { elapsedHoursToken: '0.0' });
    appendSessionLog(root, golden.eventId, record);
    const before = readFileSync(logPath(root), 'utf8');

    const appended = appendSessionLog(root, golden.eventId, record);

    assert.equal(appended, false);
    assert.equal(readFileSync(logPath(root), 'utf8'), before);
    assert.equal((before.match(new RegExp(golden.eventId, 'g')) || []).length, 2); // marker + body reference
  });
});

test('existing content is never rewritten: the previous bytes are an exact prefix after an append', () => {
  withRoot((root) => {
    mkdirSync(path.join(root, '.prometheus'), { recursive: true });
    writeFileSync(logPath(root), '# Session Log\n\nsome prior content\n');
    const before = readFileSync(logPath(root), 'utf8');

    appendSessionLog(root, golden.eventId, markdownRecord(golden, { elapsedHoursToken: '0.0' }));

    const after = readFileSync(logPath(root), 'utf8');
    assert.ok(after.startsWith(before), 'previous bytes must be an unmodified prefix');
    assert.ok(after.length > before.length);
  });
});

test('a CRLF log still finds its marker and is appended to with LF', () => {
  withRoot((root) => {
    mkdirSync(path.join(root, '.prometheus'), { recursive: true });
    const existingRecord = markdownRecord(golden, { elapsedHoursToken: '0.0' }).replace(/\n/g, '\r\n');
    writeFileSync(logPath(root), `# Session Log\r\n${existingRecord}`);

    const appended = appendSessionLog(root, golden.eventId, markdownRecord(golden, { elapsedHoursToken: '0.0' }));

    assert.equal(appended, false, 'the marker in the CRLF log must still be found');

    const other = { ...golden, eventId: 'kpm-different-event-000000000000' };
    const otherAppended = appendSessionLog(root, other.eventId, markdownRecord(other, { elapsedHoursToken: '0.0' }));
    assert.equal(otherAppended, true);
    const finalContent = readFileSync(logPath(root), 'utf8');
    const newPart = finalContent.slice(finalContent.indexOf(other.eventId) - 40);
    assert.ok(!newPart.includes('\r\n'), 'the new append must use LF, not CRLF');
  });
});

test('the lock is the source pack name: session-log.md.karpathy-progress.lock', () => {
  assert.equal(SESSION_LOG_LOCK_SUFFIX, '.karpathy-progress.lock');
  withRoot((root) => {
    appendSessionLog(root, golden.eventId, markdownRecord(golden, { elapsedHoursToken: '0.0' }));
    // The lock file must not survive a successful append.
    assert.equal(existsSync(`${logPath(root)}${SESSION_LOG_LOCK_SUFFIX}`), false);
  });
});

test('the lock is released even when the append throws', () => {
  withRoot((root) => {
    mkdirSync(path.join(root, '.prometheus'), { recursive: true });
    // A directory where the log file should be forces the write to fail.
    mkdirSync(logPath(root), { recursive: true });

    assert.throws(() => appendSessionLog(root, golden.eventId, markdownRecord(golden, { elapsedHoursToken: '0.0' })));

    assert.equal(existsSync(`${logPath(root)}${SESSION_LOG_LOCK_SUFFIX}`), false);
  });
});

test('the append does not import lib/refiner', () => {
  const source = readText(new URL('./session-log.mjs', import.meta.url));
  assert.doesNotMatch(source, /refiner/);
});
