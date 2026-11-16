// Harness capability profiles (VLBV CR-23, FR-H7): load, resolve and render.
//
// The data lives in config/harnesses/capabilities.json (ported from the full pack's
// shared/harnesses/capabilities.json). A capability is relied on only when its status is
// "supported"; every other status is reported as UNKNOWN/UNSUPPORTED so no skill
// assumes it. Pure functions plus one reader; no writes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DEFAULT_CAPABILITIES = path.join(PACK_ROOT, 'config', 'harnesses', 'capabilities.json');

/** Read and parse a capabilities file; throws with the path on a missing or malformed file. */
export function loadCapabilities(file = process.env.PROMETHEUS_HARNESS_PROFILES || DEFAULT_CAPABILITIES) {
  if (!fs.existsSync(file)) throw new Error(`capabilities file not found: ${file}`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`capabilities file is not JSON: ${file} (${error.message})`);
  }
  if (!parsed || typeof parsed.profiles !== 'object') throw new Error(`capabilities file has no profiles object: ${file}`);
  return { file, aliases: parsed.aliases ?? {}, profiles: parsed.profiles };
}

/** Profile ids, excluding `_contract` and other underscore keys. */
export const profileIds = (capabilities) => Object.keys(capabilities.profiles).filter((id) => !id.startsWith('_'));

/** The profile for an id or alias, or null. */
export function resolveProfile(capabilities, name) {
  if (typeof name !== 'string') return null;
  const key = name.trim().toLowerCase();
  const id = capabilities.aliases[key] ?? key;
  const profile = id.startsWith('_') ? null : capabilities.profiles[id];
  return profile ? { id, profile } : null;
}

/** Capability rows: every object field that carries a status. */
export function capabilityRows(profile) {
  return Object.entries(profile)
    .filter(([, value]) => value && typeof value === 'object' && 'status' in value)
    .map(([capability, value]) => ({ capability, status: value.status, source: value.source ?? value.documentedAs ?? null }));
}

/** The JSON view: profile plus the capabilities that must not be relied on. */
export function profileView(id, profile) {
  return { harness: id, profile, unknown: capabilityRows(profile).filter((row) => row.status !== 'supported') };
}

/** The human view, one string per line. */
export function renderProfile(id, profile) {
  const rules = profile.rulesFiles ?? {};
  const roots = profile.skillRoots ?? {};
  const verified = profile.verified ?? {};
  const lines = [
    `Harness profile: ${id}`,
    `  rule files: ${(rules.precedence ?? []).join(' > ')}${rules.firstMatchOnly ? ' (first match only)' : ''}${rules.overrideFile ? `; override ${rules.overrideFile}` : ''}`,
    `  skill roots: project ${(roots.project ?? []).join(', ')}; user ${(roots.user ?? []).join(', ')}`,
    `  invocation: ${profile.invocation?.explicit ?? 'unknown'}`,
    ...capabilityRows(profile).map((row) => `  ${row.status === 'supported' ? 'SUPPORTED' : String(row.status).toUpperCase()}  ${row.capability}${row.source ? `  (${row.source})` : ''}`),
    `  verified: ${verified.exercised ? `${verified.date} ${verified.version} — ${verified.evidence}` : 'not exercised on a pack machine'}`,
    `  suppress before B4: ${(profile.builtinsToSuppress ?? []).join('; ') || 'none'}`,
  ];
  return lines;
}
