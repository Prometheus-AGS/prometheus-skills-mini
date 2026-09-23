// Port of shared/lib/memory-log.sh (prometheus-skill-pack, 83 lines).
//
// Wrapper invoked by the kbd-memory-log hook: mirrors each hook fire into surreal-memory as a
// structured entity. Memory failures never fail the lifecycle hook (soft-fail, same posture as
// memory.mjs's own probe). Depends on memory.mjs's createMemoryProbe, per the task's explicit
// instruction not to reimplement availability detection here.
//
// Judgment call: the source POSTs via `curl`; this port uses Node's built-in `fetch` (Node >=22
// ships it), matching this repo's "no curl" constitution and progress.mjs/memory.mjs's existing
// precedent of an injected `fetchImpl`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { mirrorHookEvent } from './memory-log.mjs';

const scratch = () => {
  const root = mkdtempSync(path.join(tempDir(), 'memory-log-'));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
};

const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};

const event = (overrides = {}) => ({
  kind: 'phase',
  edge: 'before',
  name: 'karpathy-logs-node',
  index: 1,
  total: 1,
  phasePath: 'the-boss-shipping-and-settings > karpathy-logs-node',
  sourceTool: 'claude-code',
  startedAt: '2026-09-22T00:00:00Z',
  ...overrides,
});

test('mirrorHookEvent POSTs a kbd_lifecycle_event entity to <restBase>/api/v1/entities', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, '.kbd-orchestrator', 'project.json'), { project: 'prometheus-skills-mini' });

    let captured;
    const fetchImpl = async (url, init) => {
      captured = { url, init };
      return { ok: true };
    };
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await mirrorHookEvent(event(), { root: s.root, probe, fetchImpl });

    assert.equal(captured.url, 'http://127.0.0.1:23001/api/v1/entities');
    assert.equal(captured.init.method, 'POST');
    assert.equal(captured.init.headers['content-type'], 'application/json');

    const body = JSON.parse(captured.init.body);
    assert.equal(body.entity_type, 'kbd_lifecycle_event');
    assert.equal(body.name, 'prometheus-skills-mini/the-boss-shipping-and-settings/phase/before/1/2026-09-22T00:00:00Z');
    const observation = JSON.parse(body.observations[0]);
    assert.equal(observation.kind, 'phase');
    assert.equal(observation.edge, 'before');
    assert.equal(observation.project, 'prometheus-skills-mini');
    assert.equal(observation.phase, 'the-boss-shipping-and-settings');
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent reads project from project.json first, waypoint as fallback', async () => {
  const s = scratch();
  try {
    writeJson(path.join(s.root, '.kbd-orchestrator', 'current-waypoint.json'), { project: 'from-waypoint' });

    let captured;
    const fetchImpl = async (url, init) => {
      captured = init;
      return { ok: true };
    };
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await mirrorHookEvent(event(), { root: s.root, probe, fetchImpl });

    const body = JSON.parse(captured.body);
    assert.equal(body.name.startsWith('from-waypoint/'), true);
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent defaults project to "unknown" when neither file exists', async () => {
  const s = scratch();
  try {
    let captured;
    const fetchImpl = async (url, init) => {
      captured = init;
      return { ok: true };
    };
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await mirrorHookEvent(event(), { root: s.root, probe, fetchImpl });

    const body = JSON.parse(captured.body);
    assert.equal(body.name.startsWith('unknown/'), true);
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent uses "unknown" as the phase segment when phasePath is empty', async () => {
  const s = scratch();
  try {
    let captured;
    const fetchImpl = async (url, init) => {
      captured = init;
      return { ok: true };
    };
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await mirrorHookEvent(event({ phasePath: '' }), { root: s.root, probe, fetchImpl });

    const body = JSON.parse(captured.body);
    assert.equal(body.name.split('/')[1], 'unknown');
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent coerces a non-numeric index/total to 1, matching the source', async () => {
  const s = scratch();
  try {
    let captured;
    const fetchImpl = async (url, init) => {
      captured = init;
      return { ok: true };
    };
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await mirrorHookEvent(event({ index: undefined, total: 'not-a-number' }), { root: s.root, probe, fetchImpl });

    const observation = JSON.parse(JSON.parse(captured.body).observations[0]);
    assert.equal(observation.index, 1);
    assert.equal(observation.total, 1);
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent is a no-op (never fetches) when memory is unavailable', async () => {
  const s = scratch();
  try {
    let fetchCalled = false;
    const fetchImpl = async () => {
      fetchCalled = true;
      return { ok: true };
    };
    const probe = { available: async () => false, url: () => '' };

    await mirrorHookEvent(event(), { root: s.root, probe, fetchImpl });

    assert.equal(fetchCalled, false);
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent is a no-op when memory is available but has no REST URL (MCP-only mode)', async () => {
  const s = scratch();
  try {
    let fetchCalled = false;
    const fetchImpl = async () => {
      fetchCalled = true;
      return { ok: true };
    };
    const probe = { available: async () => true, url: () => '' };

    await mirrorHookEvent(event(), { root: s.root, probe, fetchImpl });

    assert.equal(fetchCalled, false);
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent never throws when the fetch itself fails; lifecycle continues', async () => {
  const s = scratch();
  try {
    const fetchImpl = async () => {
      throw new Error('ECONNREFUSED');
    };
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await assert.doesNotReject(() => mirrorHookEvent(event(), { root: s.root, probe, fetchImpl }));
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent never throws when the endpoint responds with a non-ok status', async () => {
  const s = scratch();
  try {
    const fetchImpl = async () => ({ ok: false, status: 500 });
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await assert.doesNotReject(() => mirrorHookEvent(event(), { root: s.root, probe, fetchImpl }));
  } finally {
    s.dispose();
  }
});

test('mirrorHookEvent never throws when project.json is unparsable JSON', async () => {
  const s = scratch();
  try {
    mkdirSync(path.join(s.root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(path.join(s.root, '.kbd-orchestrator', 'project.json'), '{ not valid json');

    let captured;
    const fetchImpl = async (url, init) => {
      captured = init;
      return { ok: true };
    };
    const probe = { available: async () => true, url: () => 'http://127.0.0.1:23001' };

    await mirrorHookEvent(event(), { root: s.root, probe, fetchImpl });

    const body = JSON.parse(captured.body);
    assert.equal(body.name.startsWith('unknown/'), true);
  } finally {
    s.dispose();
  }
});
