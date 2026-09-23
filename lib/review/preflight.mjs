// Port of adversarial-review/scripts/preflight-models.sh (prometheus-skill-pack, 286 lines).
//
// Verifies liter-llm is installed and configured with enough distinct models
// for cross-model judging (judge != producer). NEVER writes config.toml and
// NEVER touches API keys — config generation is /liter-llm-bridge configure's
// job; keys stay in the environment. Advisory only: preflight must never
// block the pipeline, so every exported function here is pure and the CLI
// entry point (scripts/adversarial-review/preflight-models.mjs) is
// responsible for catching everything and always exiting 0.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Canonical provider -> env var -> class coverage table (liter-llm-bridge
// references/provider-env-vars.md is the canonical source; inlined here as
// the source script does for its own fallback path).
const PROVIDER_TABLE = [
  ['anthropic', 'ANTHROPIC_API_KEY', ['frontier', 'medium']],
  ['openai', 'OPENAI_API_KEY', ['frontier', 'medium', 'small']],
  ['google', 'GOOGLE_API_KEY', ['frontier', 'medium']],
  ['gemini', 'GEMINI_API_KEY', ['frontier', 'medium']],
  ['groq', 'GROQ_API_KEY', ['small', 'medium']],
  ['together', 'TOGETHER_API_KEY', ['small', 'medium']],
  ['mistral', 'MISTRAL_API_KEY', ['small', 'medium', 'frontier']],
  ['cohere', 'COHERE_API_KEY', ['small', 'medium']],
  ['fireworks', 'FIREWORKS_API_KEY', ['small', 'medium']],
  ['openrouter', 'OPENROUTER_API_KEY', ['small', 'medium', 'frontier']],
  ['ollama', 'OLLAMA_HOST', ['small']],
  ['vllm', 'VLLM_BASE_URL', ['small', 'medium']],
  ['lmstudio', 'LMSTUDIO_BASE_URL', ['small']],
  ['llamacpp', 'LLAMA_CPP_SERVER', ['small']],
];

/**
 * @param {object} env
 * @returns {{ providers: Record<string,{key_var:string,present:boolean,classes:string[]}>, coverage: {small:string[],medium:string[],frontier:string[]} }}
 */
export function detectProviders(env = process.env) {
  const providers = {};
  const coverage = { small: [], medium: [], frontier: [] };
  for (const [id, envVar, classes] of PROVIDER_TABLE) {
    const present = Boolean(env[envVar]);
    providers[id] = { key_var: envVar, present, classes };
    if (present) {
      for (const c of classes) coverage[c].push(id);
    }
  }
  return { providers, coverage };
}

/**
 * The two omissions that made the shipped config answer 401 to everything
 * and refuse loopback (references/model-configuration.md, contracts #1-2).
 *
 * @param {string} configText raw liter-llm-proxy.toml text (empty string if the file does not exist)
 * @returns {string[]} human-readable defect descriptions, empty when clean
 */
export function detectConfigDefects(configText) {
  const defects = [];
  const text = String(configText ?? '');
  const hasMasterKey = /^\s*master_key\s*=/m.test(text);
  const hasKeysTable = /^\[\[keys\]\]/m.test(text);
  if (!hasMasterKey && !hasKeysTable) {
    defects.push('missing [general] master_key — every /v1/* route will 401');
  }
  const hasLocalBaseUrl = /^\s*base_url\s*=.*(localhost|127\.0\.0\.1)/m.test(text);
  const hasOutboundPolicy = /^\s*outbound_policy\s*=/m.test(text);
  if (hasLocalBaseUrl && !hasOutboundPolicy) {
    defects.push('localhost base_url without [security] outbound_policy — deny_private blocks loopback');
  }
  return defects;
}

/**
 * @param {object} args
 * @param {boolean} args.binaryPresent
 * @param {string} args.gateway resolved gateway base URL, or '' if none reachable
 * @param {string[]} args.configDefects
 * @param {string} args.judgeModel resolved judge role model, or '' if unresolved
 * @param {number} args.distinctModels count of distinct dispatchable models (judge + critic)
 * @returns {"ok"|"degraded"|"needs_configure"|"config_broken"|"no_gateway"|"unavailable"}
 */
export function computeStatus({ binaryPresent, gateway, configDefects, judgeModel, distinctModels }) {
  if (!binaryPresent) return 'unavailable';
  if (!gateway) return 'no_gateway';
  if (configDefects.length > 0) return 'config_broken';
  if (!judgeModel) return 'needs_configure';
  if (distinctModels < 2) return 'degraded';
  return 'ok';
}

/**
 * Cache freshness: fresh iff younger than 24h AND the config file (when it
 * exists) is not newer than the cache.
 *
 * @param {object} args
 * @param {number} args.cacheMtimeMs
 * @param {number|null} args.configMtimeMs null when the config file does not exist
 * @param {number} args.nowMs
 */
export function isCacheFresh({ cacheMtimeMs, configMtimeMs, nowMs }) {
  if (nowMs - cacheMtimeMs > CACHE_TTL_MS) return false;
  if (configMtimeMs !== null && configMtimeMs > cacheMtimeMs) return false;
  return true;
}
