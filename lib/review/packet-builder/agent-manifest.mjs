// Port of agent-mode manifest assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines):
// workspace members (Cargo.toml) and MCP server inventory (agent.toml).
//
// A generated workspace is several crates of Rust that would not fit a
// judge's context and would bury the signal if it did — this records the
// CONFIGURED SURFACE (member list with purpose, MCP wiring) never crate
// source. See manifest-guard.mjs for the structural enforcement of that rule.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function findMembers(cargoTomlText) {
  const m = /members\s*=\s*\[(.*?)\]/s.exec(cargoTomlText);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((mm) => mm[1]);
}

function crateDescription(root, memberPath) {
  const cargoToml = path.join(root, memberPath, 'Cargo.toml');
  if (existsSync(cargoToml)) {
    const text = readFileSync(cargoToml, 'utf8');
    const d = /^\s*description\s*=\s*"([^"]*)"/m.exec(text);
    if (d && d[1]) return d[1];
  }
  for (const entry of ['src/lib.rs', 'src/main.rs']) {
    const filePath = path.join(root, memberPath, entry);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, 'utf8').split('\n')) {
      if (line.startsWith('//!')) return line.slice(3).trim();
    }
  }
  return '';
}

/**
 * @param {string} agentDir workspace root containing Cargo.toml
 * @returns {string[]} one line per workspace member: "<path>  <purpose|(no stated purpose)>"
 */
export function buildWorkspaceMembers(agentDir) {
  const cargoTomlPath = path.join(agentDir, 'Cargo.toml');
  if (!existsSync(cargoTomlPath)) return [];

  const patterns = findMembers(readFileSync(cargoTomlPath, 'utf8'));
  const out = [];
  for (const pattern of patterns) {
    let entries;
    if (pattern.endsWith('/*')) {
      const base = path.join(agentDir, pattern.slice(0, -2));
      entries = existsSync(base)
        ? readdirSync(base)
            .sort()
            .map((e) => path.join(pattern.slice(0, -2), e))
        : [];
    } else {
      entries = [pattern];
    }
    for (const memberPath of entries) {
      const purpose = crateDescription(agentDir, memberPath);
      out.push(`${memberPath.padEnd(28)} ${purpose || '(no stated purpose)'}`);
    }
  }
  return out;
}

/**
 * @param {string} agentTomlText contents of agent.toml
 * @returns {string[]} one line per [[mcp_servers]] block
 */
export function buildMcpServerList(agentTomlText) {
  const blocks = [...agentTomlText.matchAll(/\[\[mcp_servers\]\]([\s\S]*?)(?=\n\[|\Z|$(?![\s\S]))/g)].map((m) => m[1]);
  const out = [];
  for (const block of blocks) {
    const fields = {};
    for (const key of ['name', 'url', 'transport', 'enabled']) {
      const m = new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n]+)"?`, 'm').exec(block);
      if (m) fields[key] = m[1].trim();
    }
    if (Object.keys(fields).length) {
      out.push(
        `${(fields.name ?? '(unnamed)').padEnd(22)} ${(fields.url ?? '(no url)').padEnd(34)} transport=${(fields.transport ?? '?').padEnd(6)} enabled=${fields.enabled ?? '?'}`,
      );
    }
  }
  return out;
}
