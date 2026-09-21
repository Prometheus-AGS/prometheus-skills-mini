#!/usr/bin/env node
// model-routing.mjs
//
// Reads `.kbd-orchestrator/project.json → model_policy` and produces per-phase
// routing decisions. Endpoint health is probed lazily and cached for 30s.
//
// Exports:
//   resolvePhase(phaseKey, opts?) → Decision
//   resolveAllPhases(opts?)        → Decision[]
//   clearHealthCache()             → void
//
// Decision shape:
//   {
//     phase: string,
//     tier: "small" | "medium" | "frontier",
//     endpoint: string,
//     model: string | null,
//     endpointConfig: object | null,
//     healthy: boolean,
//     reason: string,
//   }
//
// `host_harness` is always healthy by definition (it's whatever harness is
// running us; if we're executing, it's reachable). Only `openai_proxy`-style
// endpoints run an actual probe.

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const PROJECT_JSON = resolve(REPO_ROOT, ".kbd-orchestrator/project.json");
const HEALTH_PROBE_SCRIPT = resolve(REPO_ROOT, "scripts/check-openai-proxy-health.sh");

const HEALTH_CACHE = new Map(); // probe_url -> { healthy: bool, reason: string, at: ms }
const HEALTH_TTL_MS = 30_000;

function loadPolicy() {
  if (!existsSync(PROJECT_JSON)) return null;
  try {
    const data = JSON.parse(readFileSync(PROJECT_JSON, "utf8"));
    return data.model_policy ?? null;
  } catch {
    return null;
  }
}

function probeEndpoint(endpointId, endpointConfig) {
  if (endpointId === "host_harness") {
    return { healthy: true, reason: "host_harness_always_healthy" };
  }
  const probeUrl = endpointConfig?.health_probe;
  if (!probeUrl) {
    return { healthy: false, reason: "no_health_probe_configured" };
  }
  // Cache check
  const cached = HEALTH_CACHE.get(probeUrl);
  if (cached && Date.now() - cached.at < HEALTH_TTL_MS) {
    return { healthy: cached.healthy, reason: cached.reason + "_cached" };
  }
  // Invoke the probe script
  if (!existsSync(HEALTH_PROBE_SCRIPT)) {
    const result = { healthy: false, reason: "probe_script_missing" };
    HEALTH_CACHE.set(probeUrl, { ...result, at: Date.now() });
    return result;
  }
  try {
    const env = { ...process.env, OPENAI_PROXY_HEALTH_URL: probeUrl };
    execSync(`bash "${HEALTH_PROBE_SCRIPT}"`, { env, stdio: "pipe", timeout: 5000 });
    const result = { healthy: true, reason: "probe_ok" };
    HEALTH_CACHE.set(probeUrl, { ...result, at: Date.now() });
    return result;
  } catch (err) {
    const result = { healthy: false, reason: `probe_failed:${err.status ?? "unknown"}` };
    HEALTH_CACHE.set(probeUrl, { ...result, at: Date.now() });
    return result;
  }
}

export function clearHealthCache() {
  HEALTH_CACHE.clear();
}

export function resolvePhase(phaseKey, _opts = {}) {
  const policy = loadPolicy();
  if (!policy) {
    return {
      phase: phaseKey,
      tier: "frontier",
      endpoint: "host_harness",
      model: null,
      endpointConfig: null,
      healthy: true,
      reason: "no_project_json_or_model_policy",
    };
  }

  const phaseEntry = policy.phases?.[phaseKey];
  if (!phaseEntry) {
    return {
      phase: phaseKey,
      tier: "frontier",
      endpoint: policy.default_endpoint ?? "host_harness",
      model: null,
      endpointConfig: policy.endpoints?.[policy.default_endpoint] ?? null,
      healthy: true,
      reason: `phase_not_in_policy_fallback_to_default`,
    };
  }

  const preferEndpoint = phaseEntry.prefer_endpoint ?? policy.default_endpoint;
  const preferModel = phaseEntry.prefer_model ?? null;
  const endpointConfig = policy.endpoints?.[preferEndpoint] ?? null;

  // Probe the preferred endpoint
  const probe = probeEndpoint(preferEndpoint, endpointConfig);

  if (probe.healthy) {
    return {
      phase: phaseKey,
      tier: phaseEntry.tier,
      endpoint: preferEndpoint,
      model: preferModel,
      endpointConfig,
      healthy: true,
      reason: probe.reason === "host_harness_always_healthy"
        ? "host_harness"
        : "prefer_endpoint_healthy",
    };
  }

  // Fallback: default_endpoint
  const fallback = policy.default_endpoint ?? "host_harness";
  if (fallback === preferEndpoint) {
    // No alternative — emit fallback row anyway so callers see the unhealthy state
    return {
      phase: phaseKey,
      tier: phaseEntry.tier,
      endpoint: fallback,
      model: null,
      endpointConfig: policy.endpoints?.[fallback] ?? null,
      healthy: false,
      reason: `${preferEndpoint}_unhealthy_no_alternative`,
    };
  }

  const fallbackConfig = policy.endpoints?.[fallback] ?? null;
  const fallbackProbe = probeEndpoint(fallback, fallbackConfig);
  return {
    phase: phaseKey,
    tier: phaseEntry.tier,
    endpoint: fallback,
    model: null, // tier-default; the harness picks
    endpointConfig: fallbackConfig,
    healthy: fallbackProbe.healthy,
    reason: `${preferEndpoint}_unhealthy_fallback_to_${fallback}`,
  };
}

export function resolveAllPhases(opts = {}) {
  const policy = loadPolicy();
  if (!policy?.phases) return [];
  return Object.keys(policy.phases).map((key) => resolvePhase(key, opts));
}

// --- Self-test ---
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("--- model-routing.mjs self-test ---");
  const decisions = resolveAllPhases();
  if (decisions.length === 0) {
    console.log("(no model_policy.phases configured)");
  } else {
    for (const d of decisions) {
      console.log(`  ${d.phase.padEnd(22)} tier=${d.tier.padEnd(8)} endpoint=${d.endpoint.padEnd(14)} model=${(d.model ?? "-").padEnd(18)} healthy=${d.healthy ? "yes" : "no"}  reason=${d.reason}`);
    }
  }
}
