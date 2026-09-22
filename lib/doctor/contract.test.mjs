import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConformance, registryConformance } from './contract.mjs';
import { allChecks } from './registry.mjs';

// The conformance function is the contract in code. `lib/doctor/contract.md` is the
// contract in prose, including the divergence table against the-boss's shape and the
// adapter mapping — a mini check cannot be registered in the-boss's closed
// DoctorCheckRegistry, so this is our own contract, not a mirror of one.

const ok = () => ({
  id: 'mini-example',
  title: 'Example',
  async run() {
    return { status: 'pass', summary: 'fine' };
  },
});

test('a well-formed check conforms', () => {
  assert.deepEqual(checkConformance(ok()), []);
});

test('a check must have a mini- id of lowercase letters, digits and hyphens', () => {
  for (const id of ['', 'example', 'boss-example', 'mini_example', 'mini-Example', 'mini.example', 42]) {
    const found = checkConformance({ ...ok(), id });
    assert.ok(
      found.some((f) => /\bid\b/.test(f)),
      `${JSON.stringify(id)} should be rejected, got ${JSON.stringify(found)}`,
    );
  }
});

test('a check must have a non-empty title', () => {
  for (const title of ['', '   ', undefined, 7]) {
    const found = checkConformance({ ...ok(), title });
    assert.ok(
      found.some((f) => /\btitle\b/.test(f)),
      `${JSON.stringify(title)} should be rejected`,
    );
  }
});

test('a check must have a run function', () => {
  const found = checkConformance({ id: 'mini-example', title: 'Example' });
  assert.ok(found.some((f) => /\brun\b/.test(f)), JSON.stringify(found));
});

// The outcome rules. These are checked against a RESULT, because run() is async and the
// registry is validated statically; scripts/doctor.mjs validates each outcome as it comes.
test('an outcome must carry one of the four statuses and a non-empty summary', async () => {
  const { outcomeConformance } = await import('./contract.mjs');

  assert.deepEqual(outcomeConformance({ status: 'pass', summary: 'fine' }), []);

  for (const status of ['ok', 'PASS', 'error', '', undefined, null]) {
    const found = outcomeConformance({ status, summary: 'x' });
    assert.ok(
      found.some((f) => /\bstatus\b/.test(f)),
      `${JSON.stringify(status)} should be rejected`,
    );
  }

  for (const summary of ['', '  ', undefined, 3]) {
    const found = outcomeConformance({ status: 'pass', summary });
    assert.ok(
      found.some((f) => /\bsummary\b/.test(f)),
      `${JSON.stringify(summary)} should be rejected`,
    );
  }
});

// A status is never coerced to a default: an unknown status must surface as a conformance
// failure. Silently treating it as 'pass' would be the vacuous-pass class — a doctor that
// reports health it never established.
test('an unknown status is a failure, never coerced to pass', async () => {
  const { outcomeConformance } = await import('./contract.mjs');
  const found = outcomeConformance({ status: 'healthy', summary: 'all good' });

  assert.ok(found.length > 0);
  assert.match(found[0], /healthy/);
});

test('a declared fix action must name an implemented fix', () => {
  const declaredNotImplemented = {
    ...ok(),
    async run() {
      return { status: 'fail', summary: 'broken', actions: [{ kind: 'fix', fixId: 'repair' }] };
    },
    fixes: {},
  };
  // Static validation cannot see inside run(), so the registry check pairs the two by
  // asking each check to declare its offerable fix ids.
  const found = checkConformance({ ...declaredNotImplemented, offers: ['repair'] });
  assert.ok(found.some((f) => /repair/.test(f)), JSON.stringify(found));

  const implementedNotDeclared = {
    ...ok(),
    offers: [],
    fixes: { repair: async () => ({ status: 'fixed', summary: 'done' }) },
  };
  const found2 = checkConformance(implementedNotDeclared);
  assert.ok(found2.some((f) => /repair/.test(f)), JSON.stringify(found2));
});

test('a fix outcome must carry one of the three statuses and a summary', async () => {
  const { fixOutcomeConformance } = await import('./contract.mjs');

  for (const status of ['fixed', 'requires_relaunch', 'refused']) {
    assert.deepEqual(fixOutcomeConformance({ status, summary: 'x' }), []);
  }
  // 'failed' is the-boss's status, not ours — the adapter maps our 'refused' onto it.
  // Accepting it here would blur the two contracts the contract document separates.
  for (const status of ['failed', 'ok', '', undefined]) {
    const found = fixOutcomeConformance({ status, summary: 'x' });
    assert.ok(found.some((f) => /\bstatus\b/.test(f)), `${JSON.stringify(status)} should be rejected`);
  }
});

// The registry is the real subject: these assertions are what make the contract binding on
// the shipped check set rather than on a fixture.
test('every registered check conforms', () => {
  const found = registryConformance(allChecks());
  assert.deepEqual(found, [], `registered checks violate the contract:\n${found.join('\n')}`);
});

test('registered ids are unique', () => {
  const ids = allChecks().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, JSON.stringify(ids));
});

test('exactly one registered check offers a fix, and it is copy-skills', () => {
  const offering = allChecks().filter((c) => (c.offers ?? []).length > 0);

  assert.deepEqual(
    offering.map((c) => c.id),
    ['mini-skill-copies'],
  );
  assert.deepEqual(offering[0].offers, ['copy-skills']);
  assert.equal(typeof offering[0].fixes['copy-skills'], 'function');
});

test('a duplicate id in the registry is reported', () => {
  const found = registryConformance([ok(), ok()]);
  assert.ok(found.some((f) => /duplicate|mini-example/.test(f)), JSON.stringify(found));
});
