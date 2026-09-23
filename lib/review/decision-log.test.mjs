// Port of adversarial-review/scripts/decision-log.sh (prometheus-skill-pack, 236 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { slugify, recordDecision, recordOutcome, revisitDecisions } from './decision-log.mjs';

function withTempWiki(fn) {
  const root = mkdtempSync(path.join(tempDir(), 'decision-log-'));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('slugify lowercases, collapses non-alphanumerics to hyphens, and caps at 72 chars', () => {
  assert.equal(slugify('Use Postgres for the KB!'), 'use-postgres-for-the-kb');
  assert.equal(slugify('  leading and trailing  '), 'leading-and-trailing');
  assert.equal(slugify('a'.repeat(100)).length, 72);
});

test('recordDecision writes a wiki entry with outcome_status pending', () => {
  withTempWiki((wiki) => {
    const decisionFile = path.join(wiki, 'src.md');
    writeFileSync(
      decisionFile,
      '# Use Postgres\n\n## Decision\n\nUse Postgres.\n\n## Assumptions\n\n- it scales\n\n## Falsifier\n\nLatency exceeds 200ms.\n',
    );
    const result = recordDecision({ decisionFile, wiki });
    assert.equal(result.accepted, true);
    const entryPath = path.join(wiki, 'use-postgres.md');
    const text = readFileSync(entryPath, 'utf8');
    assert.match(text, /type: Decision/);
    assert.match(text, /outcome_status: pending/);
    assert.match(text, /Use Postgres\./);
    assert.match(text, /Latency exceeds 200ms\./);
  });
});

test('recordDecision REFUSES to overwrite an existing entry — use outcome instead', () => {
  withTempWiki((wiki) => {
    const decisionFile = path.join(wiki, 'src.md');
    writeFileSync(decisionFile, '# Dup\n\n## Decision\n\nX\n');
    recordDecision({ decisionFile, wiki });
    const second = recordDecision({ decisionFile, wiki });
    assert.equal(second.accepted, false);
    assert.equal(second.reason, 'duplicate');
  });
});

test('recordDecision quotes a title containing a colon so YAML does not misparse it', () => {
  withTempWiki((wiki) => {
    const decisionFile = path.join(wiki, 'src.md');
    writeFileSync(decisionFile, '# Choice: Postgres vs Surreal\n\n## Decision\n\nX\n');
    const result = recordDecision({ decisionFile, wiki });
    assert.equal(result.accepted, true);
    const text = readFileSync(path.join(wiki, result.id + '.md'), 'utf8');
    assert.match(text, /title: "Choice: Postgres vs Surreal"/);
  });
});

test('recordOutcome REFUSES when no matching decision id exists', () => {
  withTempWiki((wiki) => {
    const result = recordOutcome({ id: 'missing-id', result: 'it worked', wiki });
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'no-decision');
  });
});

test('recordOutcome REFUSES an empty or too-short outcome', () => {
  withTempWiki((wiki) => {
    const decisionFile = path.join(wiki, 'src.md');
    writeFileSync(decisionFile, '# X\n\n## Decision\n\nY\n');
    const rec = recordDecision({ decisionFile, wiki });
    const result = recordOutcome({ id: rec.id, result: 'no', wiki });
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'too-short');
  });
});

test('recordOutcome flips outcome_status to recorded and replaces the Outcome section', () => {
  withTempWiki((wiki) => {
    const decisionFile = path.join(wiki, 'src.md');
    writeFileSync(decisionFile, '# X\n\n## Decision\n\nY\n');
    const rec = recordDecision({ decisionFile, wiki });
    const result = recordOutcome({ id: rec.id, result: 'It worked out as expected, latency stayed low.', wiki });
    assert.equal(result.accepted, true);
    const text = readFileSync(path.join(wiki, rec.id + '.md'), 'utf8');
    assert.match(text, /outcome_status: recorded/);
    assert.match(text, /- outcome-recorded/);
    assert.match(text, /\*\*Status: recorded\*\*/);
    assert.match(text, /It worked out as expected/);
    assert.doesNotMatch(text, /Nothing has been recorded yet\./);
  });
});

test('revisitDecisions finds prior decisions matching keywords in the topic', () => {
  withTempWiki((wiki) => {
    mkdirSync(wiki, { recursive: true });
    const decisionFile = path.join(wiki, 'src.md');
    writeFileSync(decisionFile, '# Use Postgres for storage\n\n## Decision\n\nUse Postgres.\n');
    const rec = recordDecision({ decisionFile, wiki });
    recordOutcome({ id: rec.id, result: 'Worked fine in production for six months.', wiki });

    const rows = revisitDecisions({ topic: 'postgres storage', wiki });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, rec.id);
    assert.match(rows[0].outcome, /Worked fine in production/);
  });
});

test('revisitDecisions returns an empty list when nothing matches', () => {
  withTempWiki((wiki) => {
    mkdirSync(wiki, { recursive: true });
    const rows = revisitDecisions({ topic: 'nonexistent topic', wiki });
    assert.deepEqual(rows, []);
  });
});
