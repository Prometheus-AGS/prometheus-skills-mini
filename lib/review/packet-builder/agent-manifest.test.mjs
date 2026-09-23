// Port of agent-mode manifest assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines):
// workspace members (from Cargo.toml) and MCP server inventory (from agent.toml).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../../platform/paths.mjs';
import { buildWorkspaceMembers, buildMcpServerList } from './agent-manifest.mjs';

function withTempAgent(build) {
  const root = mkdtempSync(path.join(tempDir(), 'agent-manifest-'));
  try {
    return build(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('buildWorkspaceMembers lists each literal member with its declared description', () => {
  withTempAgent((root) => {
    writeFileSync(path.join(root, 'Cargo.toml'), '[workspace]\nmembers = ["crate-a", "crate-b"]\n');
    mkdirSync(path.join(root, 'crate-a'), { recursive: true });
    writeFileSync(path.join(root, 'crate-a', 'Cargo.toml'), '[package]\ndescription = "does the thing"\n');
    mkdirSync(path.join(root, 'crate-b'), { recursive: true });
    const lines = buildWorkspaceMembers(root);
    assert.match(lines[0], /^crate-a\s+does the thing$/);
    assert.match(lines[1], /^crate-b\s+\(no stated purpose\)$/);
  });
});

test('buildWorkspaceMembers expands a "crates/*" glob member', () => {
  withTempAgent((root) => {
    writeFileSync(path.join(root, 'Cargo.toml'), '[workspace]\nmembers = ["crates/*"]\n');
    mkdirSync(path.join(root, 'crates', 'one'), { recursive: true });
    mkdirSync(path.join(root, 'crates', 'two'), { recursive: true });
    const lines = buildWorkspaceMembers(root);
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^crates\/one/);
  });
});

test('buildWorkspaceMembers falls back to a //! doc comment when no description is set', () => {
  withTempAgent((root) => {
    writeFileSync(path.join(root, 'Cargo.toml'), '[workspace]\nmembers = ["core"]\n');
    mkdirSync(path.join(root, 'core', 'src'), { recursive: true });
    writeFileSync(path.join(root, 'core', 'Cargo.toml'), '[package]\nname = "core"\n');
    writeFileSync(path.join(root, 'core', 'src', 'lib.rs'), '//! Core domain logic.\npub fn x() {}\n');
    const lines = buildWorkspaceMembers(root);
    assert.match(lines[0], /Core domain logic\./);
  });
});

test('buildWorkspaceMembers returns [] when Cargo.toml declares no members', () => {
  withTempAgent((root) => {
    writeFileSync(path.join(root, 'Cargo.toml'), '[package]\nname = "solo"\n');
    assert.deepEqual(buildWorkspaceMembers(root), []);
  });
});

test('buildMcpServerList extracts name/url/transport/enabled from [[mcp_servers]] blocks', () => {
  const toml = `
[[mcp_servers]]
name = "filesystem"
url = "stdio://fs"
transport = "stdio"
enabled = true

[[mcp_servers]]
name = "search"
url = "http://localhost:9/mcp"
transport = "http"
enabled = false
`;
  const rows = buildMcpServerList(toml);
  assert.equal(rows.length, 2);
  assert.match(rows[0], /filesystem.*stdio:\/\/fs.*transport=stdio.*enabled=true/);
  assert.match(rows[1], /search.*enabled=false/);
});

test('buildMcpServerList returns [] when no mcp_servers blocks are present', () => {
  assert.deepEqual(buildMcpServerList('[package]\nname = "x"\n'), []);
});
