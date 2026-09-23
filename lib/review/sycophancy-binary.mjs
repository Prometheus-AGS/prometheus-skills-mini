// Port of syco_find_bin / syco_map_strictness / syco_analyze from
// shared/scripts/lib/sycophancy.sh (prometheus-skill-pack, sourced by
// adversarial-review/scripts/check-findings-sycophancy.sh).
//
// JUDGMENT CALL: the source also falls back to
// ${CLAUDE_PLUGIN_ROOT}/skills/imported/sycophancy-correction/target/release/
// sycophancy-correction when the binary is not on PATH — a plugin-cache
// layout the mini does not have (it has no plugin cache; see
// openspec/config.yaml). Only the PATH lookup is ported; a binary that is
// not on PATH is reported as absent, and the CLI degrades gracefully
// (exit 0, warning), matching the source's own "gate unavailable" behaviour.

import fs from 'node:fs';
import path from 'node:path';

/** case-insensitive per source; adversarial|loose pass through the mapping, else unchanged. */
export function mapStrictness(strictness) {
  const s = strictness ?? 'strict';
  if (s === 'adversarial') return 'strict';
  if (s === 'loose') return 'permissive';
  return s;
}

function defaultLookupOnPath(name, env = process.env) {
  const extensions = process.platform === 'win32' ? (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean) : [''];
  for (const dir of (env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const ext of extensions) {
      const candidate = path.join(dir, name + ext);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * @param {object} [opts]
 * @param {(name: string) => string|null} [opts.lookupOnPath]
 * @returns {string|null} absolute path to the sycophancy-correction binary, or null if absent
 */
export function findSycophancyBinary({ lookupOnPath = defaultLookupOnPath } = {}) {
  return lookupOnPath('sycophancy-correction');
}

let nextId = 1;

/**
 * The three newline-delimited JSON-RPC 2.0 messages the source pipes to the
 * binary's stdin over an MCP stdio session: initialize, notifications/initialized,
 * tools/call(detect_sycophancy).
 *
 * @param {string} content the report text to analyze
 * @param {string} mcpStrictness already mapped via mapStrictness()
 * @returns {string[]} three JSON strings, one per line to write
 */
export function buildJsonRpcRequests(content, mcpStrictness) {
  const initId = nextId++;
  const callId = nextId++;
  return [
    JSON.stringify({
      jsonrpc: '2.0',
      id: initId,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'sycophancy-lib', version: '0.1.0' } },
    }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    JSON.stringify({
      jsonrpc: '2.0',
      id: callId,
      method: 'tools/call',
      params: { name: 'detect_sycophancy', arguments: { content, target: 'completion', strictness: mcpStrictness } },
    }),
  ];
}
