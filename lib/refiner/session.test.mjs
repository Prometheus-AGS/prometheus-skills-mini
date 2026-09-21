import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { initState } from './state.mjs';
import { dispatchEvent, postExecuteCheck, finalizeSession, logReflectionCheck } from './session.mjs';

const withRoot = (run) => {
  const root = mkdtempSync(path.join(tempDir(), 'session-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const write = (root, rel, contents) => {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents));
};

const logFile = (root, name) =>
  path.join(root, '.refiner', 'artifacts', name, 'workflow.log');

// ── Dispatch ────────────────────────────────────────────────────────────────

test('dispatch on an artifact with no state warns and does not throw', () => {
  const result = withRoot((root) => dispatchEvent({ root, artifactName: 'ghost', eventType: 'phase_complete' }));

  assert.equal(result.status, 'skipped');
  assert.match(result.reason, /no state/i);
});

test('dispatch appends an event carrying the refinement id from state', () => {
  const result = withRoot((root) => {
    const state = initState({ root, artifactName: 'acme' });
    const event = dispatchEvent({ root, artifactName: 'acme', eventType: 'phase_complete', phase: 'execute' });
    return { event, refinementId: state.refinement_id };
  });

  assert.equal(result.event.status, 'dispatched');
  assert.equal(result.event.event.refinement_id, result.refinementId);
  assert.equal(result.event.event.event_type, 'phase_complete');
  assert.equal(result.event.event.phase, 'execute');
});

test('dispatch writes one JSON line per event, appending rather than replacing', () => {
  const lines = withRoot((root) => {
    initState({ root, artifactName: 'acme' });
    dispatchEvent({ root, artifactName: 'acme', eventType: 'first' });
    dispatchEvent({ root, artifactName: 'acme', eventType: 'second' });
    return readFileSync(logFile(root, 'acme'), 'utf8').trim().split('\n');
  });

  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).event_type, 'first');
  assert.equal(JSON.parse(lines[1]).event_type, 'second');
});

test('an existing workflow log is never truncated by a new event', () => {
  const survived = withRoot((root) => {
    initState({ root, artifactName: 'acme' });
    dispatchEvent({ root, artifactName: 'acme', eventType: 'first' });
    const before = readFileSync(logFile(root, 'acme'), 'utf8');
    dispatchEvent({ root, artifactName: 'acme', eventType: 'second' });
    return readFileSync(logFile(root, 'acme'), 'utf8').startsWith(before);
  });

  assert.equal(survived, true);
});

// ── Advisory checks ─────────────────────────────────────────────────────────
// All three upstream scripts warn and exit 0 unconditionally. They are session
// hygiene, not gates: failing here would block a session on a missing log file.

test('postExecuteCheck reports missing artefacts as warnings and still passes', () => {
  const result = withRoot((root) => postExecuteCheck({ root }));

  assert.equal(result.ok, true);
  const joined = result.warnings.join(' ');
  assert.match(joined, /artifact_manifest\.json/);
  assert.match(joined, /dist/);
  assert.match(joined, /refinement_log\.md/);
});

test('postExecuteCheck warns when dist exists but is empty', () => {
  const result = withRoot((root) => {
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    return postExecuteCheck({ root });
  });

  assert.match(result.warnings.join(' '), /dist/);
  assert.equal(result.ok, true);
});

test('postExecuteCheck is quiet when everything is present', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', { artifact_name: 'a', artifact_type: 'content' });
    write(root, 'dist/logo.svg', '<svg/>');
    write(root, 'refinement_log.md', '# log\n');
    return postExecuteCheck({ root });
  });

  assert.deepEqual(result.warnings, []);
  assert.equal(result.ok, true);
});

test('finalizeSession reports a corrupt state file but still passes', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', '{ corrupt');
    return finalizeSession({ root });
  });

  assert.equal(result.ok, true);
  assert.match(result.warnings.join(' '), /artifact_manifest\.json/);
});

test('finalizeSession checks constraints.json as well as the manifest', () => {
  const result = withRoot((root) => {
    write(root, 'constraints.json', 'also corrupt{');
    return finalizeSession({ root });
  });

  assert.match(result.warnings.join(' '), /constraints\.json/);
});

test('finalizeSession is clean when both files parse', () => {
  const result = withRoot((root) => {
    write(root, 'artifact_manifest.json', { artifact_name: 'a' });
    write(root, 'constraints.json', { constraints: [] });
    return finalizeSession({ root });
  });

  assert.deepEqual(result.warnings, []);
});

test('logReflectionCheck warns when the reflection artefacts are absent', () => {
  const result = withRoot((root) => logReflectionCheck({ root }));

  assert.equal(result.ok, true);
  const joined = result.warnings.join(' ');
  assert.match(joined, /refinement_log\.md/);
  assert.match(joined, /decisions\.md/);
});

test('logReflectionCheck is quiet when both are present', () => {
  const result = withRoot((root) => {
    write(root, 'refinement_log.md', '# log\n');
    write(root, 'decisions.md', '# decisions\n');
    return logReflectionCheck({ root });
  });

  assert.deepEqual(result.warnings, []);
});

// ── Degradation ─────────────────────────────────────────────────────────────

test('every session function exits cleanly when both services are unreachable', () => {
  // Nothing here touches surreal-memory or the gateway, which is the point: the
  // refiner must work with both down, so none of this may reach for them.
  const source = readFileSync(new URL('./session.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /fetch\(|http:\/\/|https:\/\//);
});

test('session.mjs shells out to nothing', () => {
  const source = readFileSync(new URL('./session.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /child_process|execSync|spawnSync/);
});
