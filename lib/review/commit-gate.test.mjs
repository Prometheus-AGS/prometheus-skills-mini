// Port of adversarial-review/scripts/commit-before-reveal.sh (prometheus-skill-pack, 140 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { recordJudgement, checkJudgementRecorded } from './commit-gate.mjs';

function withTempSession(fn) {
  const root = mkdtempSync(path.join(tempDir(), 'commit-gate-'));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('recordJudgement writes a judgement recorded_before_analysis: true', () => {
  withTempSession((session) => {
    const result = recordJudgement(session, 'I believe this plan is sound because the tests already pass.', {});
    assert.equal(result.accepted, true);
    const stored = JSON.parse(readFileSync(path.join(session, 'user-judgement.json'), 'utf8'));
    assert.equal(stored.recorded_before_analysis, true);
    assert.match(stored.judgement, /I believe this plan is sound/);
  });
});

test('recordJudgement REFUSES a judgement under 20 non-whitespace characters', () => {
  withTempSession((session) => {
    const result = recordJudgement(session, 'idk', {});
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'too-short');
  });
});

test('recordJudgement stores an integer confidence 0-100', () => {
  withTempSession((session) => {
    const result = recordJudgement(session, 'A sufficiently long judgement statement here.', { confidence: 72 });
    assert.equal(result.accepted, true);
    const stored = JSON.parse(readFileSync(path.join(session, 'user-judgement.json'), 'utf8'));
    assert.equal(stored.confidence, 72);
  });
});

test('recordJudgement rejects a confidence outside 0-100', () => {
  withTempSession((session) => {
    assert.throws(() => recordJudgement(session, 'A sufficiently long judgement statement here.', { confidence: 150 }));
  });
});

test('checkJudgementRecorded REFUSES when no judgement file exists', () => {
  withTempSession((session) => {
    const result = checkJudgementRecorded(session);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'no-record');
  });
});

test('checkJudgementRecorded PASSes once a valid judgement is on record', () => {
  withTempSession((session) => {
    recordJudgement(session, 'A sufficiently long judgement statement here.', {});
    const result = checkJudgementRecorded(session);
    assert.equal(result.accepted, true);
  });
});

test('checkJudgementRecorded REFUSES a malformed or too-short record file', () => {
  withTempSession((session) => {
    recordJudgement(session, 'A sufficiently long judgement statement here.', {});
    // Corrupt it after the fact.
    const file = path.join(session, 'user-judgement.json');
    writeFileSync(file, JSON.stringify({ judgement: 'short', recorded_before_analysis: true }));
    const result = checkJudgementRecorded(session);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'invalid');
  });
});
