// Harness capability profiles as KBD reads them (VLBV CR-25 rule files, CR-27 receiver check).
// A thin adapter over the pack's one profiles reader (lib/harness-profiles/profiles.mjs, data in
// config/harnesses/capabilities.json); it adds only the tolerance KBD needs: a missing or
// malformed profiles file is a normal "unavailable" state, never a failure of the caller.
// A capability counts as available only when its status is exactly "supported".

import { DEFAULT_CAPABILITIES, loadCapabilities, resolveProfile } from '../platform/harness-profiles/profiles.mjs';

function capabilitiesOrNull(env) {
  try {
    return loadCapabilities(env.PROMETHEUS_HARNESS_PROFILES || DEFAULT_CAPABILITIES);
  } catch {
    return null;
  }
}

/**
 * One harness profile by id or alias. Returns { harness, profile, availability } where
 * availability is 'found', 'not-found' (profiles exist but not this harness) or 'unavailable'
 * (no readable profiles file).
 */
export function harnessProfile(harness, env = process.env) {
  const capabilities = capabilitiesOrNull(env);
  if (!capabilities) return { harness: harness ?? null, profile: null, availability: 'unavailable' };
  const resolved = resolveProfile(capabilities, harness);
  if (!resolved) return { harness: harness ?? null, profile: null, availability: 'not-found' };
  return { harness: resolved.id, profile: resolved.profile, availability: 'found' };
}
