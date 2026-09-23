// Port of the diff-mode assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleDiff } from './diff-assembler.mjs';

function fakeGit({ diffOutput = '', showOutput = '' } = {}) {
  return (args) => {
    if (args.includes('diff')) return { status: 0, stdout: diffOutput };
    if (args.includes('show')) return { status: 0, stdout: showOutput };
    return { status: 1, stdout: '' };
  };
}

test('assembleDiff scopes the diff to the change files.txt list when present', () => {
  const calls = [];
  const git = (args) => {
    calls.push(args);
    return { status: 0, stdout: '--- a/x\n+++ b/x\n' };
  };
  const result = assembleDiff({
    files: ['src/x.rs'],
    reviewExcludePath: '.kbd-orchestrator/phases/p/review/c1',
    git,
  });
  assert.match(result.diff, /--- a\/x/);
  assert.ok(calls[0].includes('diff'));
  assert.ok(calls[0].includes('src/x.rs'));
  assert.ok(calls[0].some((a) => String(a).includes('review/c1')));
});

test('assembleDiff falls back to `git show HEAD` when `git diff HEAD` is empty', () => {
  const git = fakeGit({ diffOutput: '', showOutput: '--- a/y\n+++ b/y\n' });
  const result = assembleDiff({ files: [], reviewExcludePath: 'x', git });
  assert.match(result.diff, /--- a\/y/);
});

test('assembleDiff throws when no diff content is resolvable at all', () => {
  const git = fakeGit({ diffOutput: '', showOutput: '' });
  assert.throws(() => assembleDiff({ files: [], reviewExcludePath: 'x', git }), /no diff content resolvable/);
});

test('assembleDiff throws when a recursive review receipt leaks into the diff', () => {
  const reviewPath = '.kbd-orchestrator/phases/p/review/c1';
  const git = fakeGit({ diffOutput: `diff --git a/${reviewPath}/findings.json b/${reviewPath}/findings.json\n` });
  assert.throws(
    () => assembleDiff({ files: [], reviewExcludePath: reviewPath, git }),
    /recursive review receipt leaked/,
  );
});

test('assembleDiff collects acceptance criteria from tasks.md, spec.md, proposal.md, verification.md in order', () => {
  const git = fakeGit({ diffOutput: '--- a/x\n' });
  const result = assembleDiff({
    files: [],
    reviewExcludePath: 'x',
    git,
    changeFiles: { 'tasks.md': '# Tasks\n', 'proposal.md': '# Proposal\n' },
  });
  assert.match(result.acceptanceCriteria, /# Tasks/);
  assert.match(result.acceptanceCriteria, /# Proposal/);
  assert.ok(result.acceptanceCriteria.indexOf('# Tasks') < result.acceptanceCriteria.indexOf('# Proposal'));
});

test('assembleDiff records a warning when no acceptance criteria files are found', () => {
  const git = fakeGit({ diffOutput: '--- a/x\n' });
  const result = assembleDiff({ files: [], reviewExcludePath: 'x', git, changeFiles: {} });
  assert.equal(result.acceptanceCriteria, null);
  assert.ok(result.warnings.some((w) => /no acceptance criteria found/.test(w)));
});
