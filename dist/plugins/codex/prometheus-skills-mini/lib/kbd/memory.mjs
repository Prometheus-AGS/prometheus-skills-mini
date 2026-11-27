// Port of shared/lib/memory.sh (prometheus-skill-pack, 78 lines).
// See memory.test.mjs for the memoization/injected-ctx note.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_URL = 'http://127.0.0.1:23001';

/**
 * Normalize any surreal-memory endpoint (a REST base, or an MCP transport path such as
 * `/mcp/sse` or `/mcp/http`) down to its service origin. REST routes are always hosted at the
 * origin regardless of which transport path discovery found. Returns `null` for a non-http(s)
 * endpoint, matching the source's silent-failure-to-empty behaviour.
 */
export function normalizeRestBase(endpoint) {
  if (typeof endpoint !== 'string') return null;
  const trimmed = endpoint.replace(/\/$/, '');
  if (!/^https?:\/\//.test(trimmed)) return null;
  const match = trimmed.match(/^(https?:\/\/[^/]+)/);
  return match ? match[1] : null;
}

/**
 * Build a memory-availability probe. The result is memoized on the returned object — one probe
 * per `createMemoryProbe()` call, matching the source's per-shell-session memoization — so a
 * caller that checks availability many times pays the health-check cost once.
 *
 * Resolution order, identical to the source: `UAR_MEMORY_MCP_URL` env override, then
 * `KBD_MEMORY_MCP_URL`, then `.kbd-orchestrator/memory.config.json`'s `restEndpoint` (falling
 * back to the legacy `mcpEndpoint` key), then the canonical local default. If none of those
 * probes reachable, an in-process `create_entity` tool (surfaced via `KBD_AVAILABLE_TOOLS`)
 * still satisfies availability — but shell/script callers get an empty REST URL in that mode,
 * because there is no REST endpoint to give them.
 */
export function createMemoryProbe({ root = '.', env = process.env, fetchImpl = fetch } = {}) {
  let probed = false;
  let ok = false;
  let url = '';

  function readProjectEndpoint() {
    const configPath = path.join(root, '.kbd-orchestrator', 'memory.config.json');
    if (!existsSync(configPath)) return '';
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
      return parsed.restEndpoint ?? parsed.mcpEndpoint ?? '';
    } catch {
      return '';
    }
  }

  async function probe() {
    if (probed) return;
    probed = true;

    const endpoint = env.UAR_MEMORY_MCP_URL || env.KBD_MEMORY_MCP_URL || readProjectEndpoint() || DEFAULT_URL;
    const restBase = normalizeRestBase(endpoint);

    if (restBase) {
      try {
        const response = await fetchImpl(`${restBase}/health`, { signal: AbortSignal.timeout(2000) });
        if (response?.ok) {
          ok = true;
          url = restBase;
          return;
        }
      } catch {
        // Soft-fail by design: an unreachable service is "unavailable", never a thrown error.
      }
    }

    if (String(env.KBD_AVAILABLE_TOOLS ?? '').includes('create_entity')) {
      ok = true;
      // url stays '' — no REST endpoint exists in this mode.
      return;
    }

    ok = false;
  }

  return {
    async available() {
      await probe();
      return ok;
    },
    url() {
      return url;
    },
  };
}
