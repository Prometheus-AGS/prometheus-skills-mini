// Port of shared/scripts/lib/kbd-model-resolve.sh's role/gateway resolution
// (prometheus-skill-pack). Consumed by dispatch-judge.mjs and
// preflight-models.mjs.
//
// Two files, one gateway (references/model-configuration.md):
//   ~/.prometheus/kbd/models.toml              KBD owns:       role -> model NAME
//   ~/.config/liter-llm/liter-llm-proxy.toml   liter-llm owns: NAME -> provider + base_url + ${KEY}
//
// This module reads only the first file (role/gateway names); it never reads
// or writes the liter-llm proxy config, and never touches API keys.
//
// PARSING JUDGMENT CALL: models.toml in the wild is a small, hand-authored
// file with three flat tables ([gateway], [roles], and [role_identities]) and
// heavy '#' comments. Rather than pull in a TOML dependency for these shapes,
// this hand-parses just those constructs and
// is defensive: any parse failure (malformed input, a table this parser does
// not understand) returns the empty shape rather than throwing — a missing
// or malformed config must degrade to "not configured", never crash the
// judge dispatch (see the port task's "read defensively" instruction).

const DEFAULT_GATEWAY_CANDIDATES = Object.freeze(['http://localhost:4000/v1', 'http://localhost:8181/v1']);

function stripComment(line) {
  // '#' only starts a comment outside a quoted string. models.toml has no
  // '#' inside any value we care about (URLs, role names), so a simple
  // outside-quotes scan is sufficient and never over-strips.
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') inQuotes = !inQuotes;
    else if (line[i] === '#' && !inQuotes) return line.slice(0, i);
  }
  return line;
}

/**
 * Minimal, defensive parse of models.toml's [gateway] and [roles] tables.
 * Never throws — any input that cannot be understood yields the empty shape.
 *
 * @param {string|undefined} text
 * @returns {{ roles: Record<string,string>, roleIdentities: Record<string, {providerId:string, providerConnectionId:string, modelId:string}>, gateway: { candidates: string[] } }}
 */
export function parseModelsToml(text) {
  const empty = { roles: {}, roleIdentities: {}, gateway: { candidates: [] } };
  if (typeof text !== 'string' || text.trim() === '') return empty;

  try {
    const roles = {};
    const identityFields = {};
    let candidates = [];
    let section = null;

    for (const rawLine of text.split('\n')) {
      const line = stripComment(rawLine).trim();
      if (!line) continue;

      const sectionMatch = /^\[([A-Za-z0-9_.-]+)\]$/.exec(line);
      if (sectionMatch) {
        section = sectionMatch[1];
        continue;
      }

      if (section === 'roles') {
        const kv = /^([A-Za-z0-9_.-]+)\s*=\s*"([^"]*)"$/.exec(line);
        if (kv) roles[kv[1]] = kv[2];
        continue;
      }

      if (section === 'role_identities') {
        const kv = /^([A-Za-z0-9_.-]+)\s*=\s*"([^"]*)"$/.exec(line);
        if (kv) identityFields[kv[1]] = kv[2];
        continue;
      }

      if (section === 'gateway') {
        const arr = /^candidates\s*=\s*\[(.*)\]$/.exec(line);
        if (arr) {
          candidates = [...arr[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
        }
      }
    }

    const roleIdentities = {};
    for (const role of ['critic', 'judge', 'backup']) {
      const providerId = identityFields[`${role}_provider_id`];
      const providerConnectionId = identityFields[`${role}_provider_connection_id`];
      const modelId = identityFields[`${role}_model_id`];
      if (providerId && providerConnectionId && modelId)
        roleIdentities[role] = { providerId, providerConnectionId, modelId };
    }
    return { roles, roleIdentities, gateway: { candidates } };
  } catch {
    return empty;
  }
}

/**
 * Resolve a role (judge | critic | backup | generator) by the documented precedence:
 * explicit argument > PROMETHEUS_KBD_<ROLE>_MODEL > models.toml [roles] > built-in default.
 *
 * There is deliberately no project.json model_policy fallback layer here —
 * the source lists it fourth (before the built-in default), but the mini has
 * no adversarial-review-specific project.json field for this, and inventing
 * one would be speculative config surface with no observed caller. Recorded
 * as a judgment call, not a silent omission.
 *
 * @param {"judge"|"critic"|"backup"|"generator"} role
 * @param {object} [opts]
 * @param {string} [opts.explicit]
 * @param {object} [opts.env]
 * @param {{roles: Record<string,string>}} [opts.modelsToml]
 * @returns {{ model: string, source: "explicit"|"env"|"models.toml"|"built-in-default"|"unconfigured" }}
 */
export function resolveRole(role, { explicit, env = process.env, modelsToml = { roles: {} } } = {}) {
  if (explicit) return { model: explicit, source: 'explicit' };

  const envVar = `PROMETHEUS_KBD_${role.toUpperCase()}_MODEL`;
  if (env[envVar]) return { model: env[envVar], source: 'env' };

  const tomlModel = modelsToml.roles?.[role];
  if (tomlModel) return { model: tomlModel, source: 'models.toml' };

  if (role === 'backup') return { model: '', source: 'unconfigured' };
  return { model: `kbd-${role}`, source: 'built-in-default' };
}

function environmentIdentity(role, env) {
  const prefix = `PROMETHEUS_KBD_${role.toUpperCase()}_`;
  const providerId = env[`${prefix}PROVIDER_ID`];
  const providerConnectionId = env[`${prefix}PROVIDER_CONNECTION_ID`];
  const modelId = env[`${prefix}MODEL_ID`];
  return providerId && providerConnectionId && modelId ? { providerId, providerConnectionId, modelId } : null;
}

export function resolvedModelIdentityKey(identity) {
  if (!identity?.providerId || !identity?.providerConnectionId || !identity?.modelId) return null;
  return JSON.stringify([identity.providerConnectionId, identity.providerId, identity.modelId]);
}

export function resolveRoleAssignment(
  role,
  { explicit, env = process.env, modelsToml = { roles: {}, roleIdentities: {} } } = {},
) {
  const resolved = resolveRole(role, { explicit: explicit?.alias, env, modelsToml });
  let identity = explicit?.identity ?? null;
  if (!identity && resolved.source === 'env') identity = environmentIdentity(role, env);
  if (!identity && resolved.source === 'models.toml') identity = modelsToml.roleIdentities?.[role] ?? null;
  return { alias: resolved.model, identity, source: resolved.source };
}

/**
 * Select the model that can independently review the critic and current producer.
 * Canonical resolved identities are the only collision keys; served aliases are
 * transport names and never evidence that two assignments are distinct.
 */
export function selectIndependentReviewer({ assignments, producerIdentity, availableAliases }) {
  const criticKey = resolvedModelIdentityKey(assignments.critic?.identity);
  const producerKey = resolvedModelIdentityKey(producerIdentity);
  const isAvailable = (assignment) =>
    Boolean(assignment?.alias) && (!availableAliases || availableAliases.has(assignment.alias));
  const collides = (assignment) => {
    const key = resolvedModelIdentityKey(assignment?.identity);
    return Boolean(key && (key === criticKey || key === producerKey));
  };
  const statusFor = (assignment) => {
    const key = resolvedModelIdentityKey(assignment?.identity);
    if (!key) return null;
    if (!criticKey) return { status: 'degraded', reason: 'critic-identity-unknown' };
    if (!producerKey) return { status: 'degraded', reason: 'producer-identity-unknown' };
    return { status: 'independent', reason: 'reviewer-distinct' };
  };

  const judge = assignments.judge;
  const judgeStatus = statusFor(judge);
  if (isAvailable(judge) && judgeStatus && !collides(judge)) {
    return {
      assignment: judge,
      selectedRole: 'judge',
      ...judgeStatus,
    };
  }

  const backup = assignments.backup;
  const backupStatus = statusFor(backup);
  if (isAvailable(backup) && backupStatus && !collides(backup)) {
    return {
      assignment: backup,
      selectedRole: 'backup',
      ...backupStatus,
      reason:
        backupStatus.status === 'independent'
          ? 'judge-unavailable-or-collision-used-backup'
          : `${backupStatus.reason}-used-backup`,
    };
  }

  return {
    assignment: null,
    selectedRole: null,
    status: 'pending',
    reason: isAvailable(judge) ? 'no-distinct-backup' : 'judge-unavailable-no-distinct-backup',
  };
}

/**
 * Resolve the gateway base URL: LITER_LLM_BASE_URL override, else the first
 * candidate (models.toml, else the canonical defaults) that answers the probe.
 *
 * @param {object} opts
 * @param {object} [opts.env]
 * @param {{gateway: {candidates: string[]}}} [opts.modelsToml]
 * @param {(url: string) => Promise<boolean>} opts.probe
 * @returns {Promise<string|null>}
 */
export async function resolveGateway({ env = process.env, modelsToml = { gateway: { candidates: [] } }, probe }) {
  if (env.LITER_LLM_BASE_URL) return env.LITER_LLM_BASE_URL;

  const candidates =
    modelsToml.gateway?.candidates?.length > 0 ? modelsToml.gateway.candidates : DEFAULT_GATEWAY_CANDIDATES;

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop -- candidates are checked in
    // documented priority order; the first reachable one wins, so this must
    // be sequential, not parallel.
    if (await probe(candidate)) return candidate;
  }
  return null;
}

/** Loose comparison: a candidate may be a bare id or provider/model. */
export function sameModel(a, b) {
  if (!a || !b) return false;
  const base = (s) => s.split('/').pop();
  return base(a) === base(b);
}
