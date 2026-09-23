// Port of the manifest-level enforcement block inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack,
// 919 lines) — "manifest-level, never full source" is a contract the judge
// relies on for skill/agent (creation) modes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkManifestLevel } from './manifest-guard.mjs';

test('checkManifestLevel is clean for a packet with only descriptive metadata', () => {
  const packet = { mode: 'skill', script_inventory: 'scripts/x.sh\t120 bytes\texecutable=yes', skill_md: '# hi' };
  const result = checkManifestLevel(packet);
  assert.equal(result.ok, true);
});

test('checkManifestLevel flags a leaked shell function definition in a non-exempt field', () => {
  const packet = { mode: 'skill', script_inventory: 'do_thing() { echo hi; }' };
  const result = checkManifestLevel(packet);
  assert.equal(result.ok, false);
  assert.match(result.leaks[0], /shell function definition/);
});

test('checkManifestLevel flags leaked Rust fn/use/impl syntax', () => {
  const packet = { mode: 'agent', workspace_members: 'pub fn handle(x: u32) -> bool {' };
  assert.equal(checkManifestLevel(packet).ok, false);

  const packet2 = { mode: 'agent', mcp_servers: 'use std::collections::HashMap;' };
  assert.equal(checkManifestLevel(packet2).ok, false);

  const packet3 = { mode: 'agent', cargo_check: 'impl Foo for Bar {' };
  assert.equal(checkManifestLevel(packet3).ok, false);
});

test('checkManifestLevel exempts skill_md, system_prompt, agent_toml, validator_output, original_intent, file_tree, constraints, decision_document, prior_decisions', () => {
  const packet = {
    mode: 'skill',
    skill_md: 'do_thing() { echo hi; }', // the declared contract itself; content, not a leak
    system_prompt: 'fn behave() {',
    agent_toml: 'fn also fine() {',
  };
  assert.equal(checkManifestLevel(packet).ok, true);
});

test('checkManifestLevel is a no-op for diff/artifact/decision modes — only skill/agent are manifest-level', () => {
  const packet = { mode: 'diff', diff: 'do_thing() { echo hi; }' };
  assert.equal(checkManifestLevel(packet).ok, true);
});
