// Regression coverage: kbd-apply must reuse runtime tasks that /kbd-plan already registered for a
// change instead of registering a duplicate under the backend ordinal. Before the fix, apply
// registered task "1" beside a planned "<change>-t1"; the planned tasks stayed pending, the change
// could never complete, and position signals counted both sets ("task 9 out of 10" for a 5-task
// change). Observed in know-me-decision, 2026-09-30. Mirrors the full pack's
// runtime_task_identity.bats.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRuntimeTaskId } from './task-identity.mjs';

const planned = {
  'c1-t1': { sequence: 1, title: 'Set up scaffolding' },
  'c1-t2': { sequence: 2, title: 'Wire up config loader' },
  'c1-t3': { sequence: 3, title: 'Write tests' },
};

test('exact registered ID is used as-is', () => {
  assert.deepEqual(resolveRuntimeTaskId(planned, 'c1-t2', 2, '1.2 Wire up config loader'), { id: 'c1-t2', mapped: false });
});

test('backend ordinal maps to the planned task with the same title', () => {
  assert.deepEqual(resolveRuntimeTaskId(planned, '2', 2, '1.2 Wire up config loader'), { id: 'c1-t2', mapped: true });
});

test('title match wins over sequence when tasks were reordered', () => {
  assert.equal(resolveRuntimeTaskId(planned, '1', 1, '1.3 Write tests').id, 'c1-t3');
});

test('unique sequence match is used when titles differ', () => {
  assert.equal(resolveRuntimeTaskId(planned, '3', 3, '1.3 Write the integration tests').id, 'c1-t3');
});

test('no registered tasks: the backend ID is new', () => {
  assert.deepEqual(resolveRuntimeTaskId({}, '1', 1, '1.1 Set up scaffolding'), { id: '1', mapped: false });
  assert.deepEqual(resolveRuntimeTaskId(undefined, '1', 1, 'x'), { id: '1', mapped: false });
});

test('registered tasks but no title or sequence match: refuse, never duplicate', () => {
  assert.throws(() => resolveRuntimeTaskId(planned, '9', 9, '1.9 Something unplanned'), /refusing to register a duplicate/);
});

test('ambiguous sequence with no title match is refused', () => {
  const dup = { a: { sequence: 1, title: 'x' }, b: { sequence: 1, title: 'y' } };
  assert.throws(() => resolveRuntimeTaskId(dup, '1', 1, 'z'), /refusing to register a duplicate/);
});
