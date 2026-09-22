import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, existsSync, chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { readText } from '../platform/text.mjs';
import { receiptPath, readReceipt, writeReceipt } from './receipt.mjs';

const golden = JSON.parse(readText(new URL('./fixtures/golden-receipt.json', import.meta.url)));

const withRoot = (run) => {
  const root = mkdtempSync(path.join(tempDir(), 'receipt-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('the path is sha256(eventId).json under .prometheus/progress-memory-receipts', () => {
  withRoot((root) => {
    const target = receiptPath(root, golden.event.eventId);

    assert.equal(
      target,
      path.join(root, '.prometheus', 'progress-memory-receipts', 'dea375631f620b20970cb0d952d42dcb74503eceeaabc07482278b8f6a073676.json'),
    );
  });
});

test('the golden fixture file name equals the path this derives', () => {
  const target = receiptPath('/repo', golden.event.eventId);

  assert.equal(path.basename(target), 'dea375631f620b20970cb0d952d42dcb74503eceeaabc07482278b8f6a073676.json');
});

test('a written receipt round-trips and includes canonicalState', () => {
  withRoot((root) => {
    writeReceipt(root, {
      event: golden.event,
      elapsedHoursToken: '0.0',
      sessionLogAppended: true,
      memory: { transport: 'pk', status: 'accepted', receiptSha256: null },
      complete: true,
      canonicalState: 'cli',
    });

    const receipt = readReceipt(root, golden.event.eventId);

    assert.equal(receipt.schemaVersion, 1);
    assert.equal(receipt.eventId, golden.event.eventId);
    assert.equal(receipt.eventSha256, golden.eventSha256);
    assert.equal(receipt.eventIdentitySha256, golden.eventIdentitySha256);
    assert.deepEqual(receipt.event, golden.event);
    assert.equal(receipt.sessionLogAppended, true);
    assert.equal(receipt.complete, true);
    assert.equal(receipt.canonicalState, 'cli');
    assert.match(receipt.recordedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

test('the write is atomic: no partial file is ever visible under the target name', () => {
  withRoot((root) => {
    writeReceipt(root, {
      event: golden.event,
      elapsedHoursToken: '0.0',
      sessionLogAppended: false,
      memory: { transport: 'pk', status: 'degraded', receiptSha256: null },
      complete: false,
      canonicalState: 'projection',
    });

    const dir = path.join(root, '.prometheus', 'progress-memory-receipts');
    const entries = readdirSync(dir);
    // No leftover .tmp file from the atomic-write helper.
    assert.deepEqual(
      entries.filter((name) => name.endsWith('.tmp')),
      [],
    );
    assert.deepEqual(entries, ['dea375631f620b20970cb0d952d42dcb74503eceeaabc07482278b8f6a073676.json']);
  });
});

test('the 1.1 fixture — complete:true with memory.status queued — reads without error', () => {
  withRoot((root) => {
    const dir = path.join(root, '.prometheus', 'progress-memory-receipts');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, `${path.basename(receiptPath(root, golden.event.eventId))}`),
      JSON.stringify(golden, null, 2),
    );

    const receipt = readReceipt(root, golden.event.eventId);

    assert.equal(receipt.complete, true);
    assert.equal(receipt.memory.status, 'queued');
    assert.equal(receipt.memory.transport, 'outbox');
  });
});

test('a missing receipt reads as absent, not an error', () => {
  withRoot((root) => {
    assert.equal(readReceipt(root, 'kpm-no-such-event'), null);
  });
});

test('an unreadable receipt is a typed error, never treated as absent', () => {
  withRoot((root) => {
    writeReceipt(root, {
      event: golden.event,
      elapsedHoursToken: '0.0',
      sessionLogAppended: true,
      memory: { transport: 'pk', status: 'accepted', receiptSha256: null },
      complete: true,
      canonicalState: 'cli',
    });
    const target = receiptPath(root, golden.event.eventId);
    writeFileSync(target, '{ not json');

    assert.throws(() => readReceipt(root, golden.event.eventId), /unreadable/);
  });
});

test('a receipt whose directory cannot be created is a typed error', { skip: process.platform === 'win32' }, () => {
  withRoot((root) => {
    const parent = path.join(root, '.prometheus');
    mkdirSync(parent, { recursive: true });
    chmodSync(parent, 0o500);
    try {
      assert.throws(() =>
        writeReceipt(root, {
          event: golden.event,
          elapsedHoursToken: '0.0',
          sessionLogAppended: true,
          memory: { transport: 'pk', status: 'accepted', receiptSha256: null },
          complete: true,
          canonicalState: 'cli',
        }),
      );
    } finally {
      chmodSync(parent, 0o700);
    }
  });
});

test('writing twice replaces the receipt rather than appending', () => {
  withRoot((root) => {
    const write = (complete) =>
      writeReceipt(root, {
        event: golden.event,
        elapsedHoursToken: '0.0',
        sessionLogAppended: true,
        memory: { transport: 'pk', status: complete ? 'accepted' : 'degraded', receiptSha256: null },
        complete,
        canonicalState: 'cli',
      });

    write(false);
    write(true);

    const dir = path.join(root, '.prometheus', 'progress-memory-receipts');
    assert.equal(readdirSync(dir).length, 1);
    assert.equal(readReceipt(root, golden.event.eventId).complete, true);
  });
});

test('canonicalState is this pack extension; every key the source pack reads is still present', () => {
  withRoot((root) => {
    writeReceipt(root, {
      event: golden.event,
      elapsedHoursToken: '0.0',
      sessionLogAppended: true,
      memory: { transport: 'pk', status: 'accepted', receiptSha256: null },
      complete: true,
      canonicalState: 'projection',
    });

    const receipt = readReceipt(root, golden.event.eventId);
    for (const key of Object.keys(golden)) {
      assert.ok(key in receipt, `missing ${key}`);
    }
  });
});
