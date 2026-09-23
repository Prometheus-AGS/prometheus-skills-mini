// Port of syco_find_bin / syco_map_strictness / syco_analyze from
// shared/scripts/lib/sycophancy.sh (prometheus-skill-pack).
//
// The mini has no plugin-cache concept, so the CLAUDE_PLUGIN_ROOT/PLUGIN_ROOT
// fallback candidate path from the source is dropped — only a PATH lookup is
// attempted (a documented judgment call, not a silent omission).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapStrictness, buildJsonRpcRequests, findSycophancyBinary } from './sycophancy-binary.mjs';

test('mapStrictness maps adversarial -> strict and loose -> permissive', () => {
  assert.equal(mapStrictness('adversarial'), 'strict');
  assert.equal(mapStrictness('loose'), 'permissive');
});

test('mapStrictness passes through any other value unchanged', () => {
  assert.equal(mapStrictness('standard'), 'standard');
  assert.equal(mapStrictness(undefined), 'strict');
});

test('buildJsonRpcRequests produces initialize, initialized, and tools/call in order', () => {
  const requests = buildJsonRpcRequests('some text', 'strict');
  assert.equal(requests.length, 3);
  assert.equal(JSON.parse(requests[0]).method, 'initialize');
  assert.equal(JSON.parse(requests[1]).method, 'notifications/initialized');
  const call = JSON.parse(requests[2]);
  assert.equal(call.method, 'tools/call');
  assert.equal(call.params.name, 'detect_sycophancy');
  assert.equal(call.params.arguments.content, 'some text');
  assert.equal(call.params.arguments.strictness, 'strict');
});

test('findSycophancyBinary returns the resolved path when the lookup succeeds', () => {
  const result = findSycophancyBinary({ lookupOnPath: () => '/usr/local/bin/sycophancy-correction' });
  assert.equal(result, '/usr/local/bin/sycophancy-correction');
});

test('findSycophancyBinary returns null when nothing is found on PATH', () => {
  const result = findSycophancyBinary({ lookupOnPath: () => null });
  assert.equal(result, null);
});
