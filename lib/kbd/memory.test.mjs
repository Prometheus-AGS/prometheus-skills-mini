// Port of shared/lib/memory.sh (prometheus-skill-pack, 78 lines).
//
// Detection helper for the optional surreal-memory mirror. Soft-fails by design — every probe
// treats failure as "memory unavailable" rather than throwing, matching CLAUDE.md's rule that
// the KBD loop must survive both resident services being down. The source memoizes its probe in
// shell globals (`_KBD_MEMORY_PROBED`); this port makes that explicit via a returned `probe()`
// closure rather than a bare module-level cache, so tests never leak state into each other.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { createMemoryProbe, normalizeRestBase } from './memory.mjs';

test('normalizeRestBase strips any path down to the service origin', () => {
  assert.equal(normalizeRestBase('http://localhost:23001/mcp/sse'), 'http://localhost:23001');
  assert.equal(normalizeRestBase('https://example.com:9/mcp/http'), 'https://example.com:9');
  assert.equal(normalizeRestBase('http://127.0.0.1:23001'), 'http://127.0.0.1:23001');
  assert.equal(normalizeRestBase('http://127.0.0.1:23001/'), 'http://127.0.0.1:23001');
});

test('normalizeRestBase rejects a non-http(s) endpoint', () => {
  assert.equal(normalizeRestBase('not-a-url'), null);
  assert.equal(normalizeRestBase(''), null);
});

test('an explicit env override wins over project config and the default', async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, 'http://override.example:1/health');
    return { ok: true };
  };
  const probe = createMemoryProbe({
    env: { KBD_MEMORY_MCP_URL: 'http://override.example:1/mcp/sse' },
    fetchImpl,
  });

  assert.equal(await probe.available(), true);
  assert.equal(probe.url(), 'http://override.example:1');
});

test('UAR_MEMORY_MCP_URL takes priority over KBD_MEMORY_MCP_URL, matching the source order', async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, 'http://uar-wins.example/health');
    return { ok: true };
  };
  const probe = createMemoryProbe({
    env: { UAR_MEMORY_MCP_URL: 'http://uar-wins.example', KBD_MEMORY_MCP_URL: 'http://ignored.example' },
    fetchImpl,
  });

  assert.equal(await probe.available(), true);
});

test('project config supplies the endpoint when no env override exists', async () => {
  const root = mkdtempSync(path.join(tempDir(), 'memory-config-'));
  try {
    mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(
      path.join(root, '.kbd-orchestrator', 'memory.config.json'),
      JSON.stringify({ restEndpoint: 'http://project.example:23001/mcp/sse' })
    );
    const fetchImpl = async (url) => {
      assert.equal(url, 'http://project.example:23001/health');
      return { ok: true };
    };
    const probe = createMemoryProbe({ root, env: {}, fetchImpl });

    assert.equal(await probe.available(), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('project config falls back to legacy mcpEndpoint when restEndpoint is absent', async () => {
  const root = mkdtempSync(path.join(tempDir(), 'memory-config-'));
  try {
    mkdirSync(path.join(root, '.kbd-orchestrator'), { recursive: true });
    writeFileSync(
      path.join(root, '.kbd-orchestrator', 'memory.config.json'),
      JSON.stringify({ mcpEndpoint: 'http://legacy.example:23001/mcp/http' })
    );
    const fetchImpl = async (url) => {
      assert.equal(url, 'http://legacy.example:23001/health');
      return { ok: true };
    };
    const probe = createMemoryProbe({ root, env: {}, fetchImpl });

    assert.equal(await probe.available(), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('falls back to the canonical local default when nothing else is configured', async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, 'http://127.0.0.1:23001/health');
    return { ok: true };
  };
  const probe = createMemoryProbe({ env: {}, fetchImpl });

  assert.equal(await probe.available(), true);
  assert.equal(probe.url(), 'http://127.0.0.1:23001');
});

test('a failed health probe is unavailable, not thrown', async () => {
  const fetchImpl = async () => {
    throw new Error('ECONNREFUSED');
  };
  const probe = createMemoryProbe({ env: {}, fetchImpl });

  assert.equal(await probe.available(), false);
  assert.equal(probe.url(), '');
});

test('a non-ok health response is unavailable', async () => {
  const fetchImpl = async () => ({ ok: false });
  const probe = createMemoryProbe({ env: {}, fetchImpl });

  assert.equal(await probe.available(), false);
});

test('an in-process create_entity tool satisfies availability even with no REST endpoint', async () => {
  const fetchImpl = async () => {
    throw new Error('ECONNREFUSED');
  };
  const probe = createMemoryProbe({
    env: { KBD_AVAILABLE_TOOLS: 'read_entity,create_entity,update_entity' },
    fetchImpl,
  });

  assert.equal(await probe.available(), true);
  // Source: "shell callers intentionally receive an empty REST URL in this mode."
  assert.equal(probe.url(), '');
});

test('the probe result is memoized across repeated calls', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true };
  };
  const probe = createMemoryProbe({ env: {}, fetchImpl });

  await probe.available();
  await probe.available();
  await probe.available();

  assert.equal(calls, 1);
});
