// Port of the extract/normalize block inside adversarial-review/scripts/dispatch-judge.sh
// (prometheus-skill-pack, 379 lines).
//
// This is the SAFETY-CRITICAL half of the judge dispatch: it computes
// cross_model_check, which is the artifact's own record of whether the
// judge!=producer guarantee actually held (see decision-validate.mjs, which
// enforces it for decision mode). A bug here silently turns a same-model
// self-grade into a report that LOOKS like a genuine cross-model review.

const VALID_SEVERITIES = new Set(['CRITICAL', 'WARNING', 'SUGGESTION']);

/**
 * Extract a JSON object from a raw LLM completion: try a direct parse, then
 * a ```json fenced block, then the first-{-to-last-} span. Returns null if
 * nothing parses — the caller decides what "unusable" means.
 */
export function extractJsonFromCompletion(text) {
  if (typeof text !== 'string') return null;

  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  const fenced = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/.exec(text);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * Whether the judge was proven distinct from the producer.
 * 'unknown' producer makes the comparison pass trivially — recorded honestly
 * as unverified rather than as a clean pass (see the source's PRODUCER_UNKNOWN warning).
 */
export function crossModelCheck(judgeIdentity, producerIdentity) {
  const key = (identity) => {
    if (!identity?.providerConnectionId || !identity?.providerId || !identity?.modelId) return null;
    return JSON.stringify([identity.providerConnectionId, identity.providerId, identity.modelId]);
  };
  const judgeKey = key(judgeIdentity);
  const producerKey = key(producerIdentity);
  if (!judgeKey || !producerKey) return 'unverified-producer-unknown';
  return judgeKey === producerKey ? 'same-model-collision' : 'verified-distinct';
}

/**
 * Normalize a raw parsed judge completion into the findings.json shape.
 * Throws if the completion is not shape-valid findings JSON (an object with
 * a `findings` field) — the caller (dispatch-judge.mjs) maps that to exit 2,
 * matching the source's `|| { ... ; exit 2; }`.
 *
 * @param {unknown} data the object returned by extractJsonFromCompletion
 * @param {object} ctx
 * @param {string} ctx.mode
 * @param {string} ctx.judgeModel
 * @param {object|null} ctx.judgeIdentity
 * @param {string} ctx.producer
 * @param {object|null} ctx.producerIdentity
 * @param {string} ctx.endpoint
 * @returns {object} the findings.json document
 */
export function normalizeFindings(data, { mode, judgeModel, judgeIdentity, producer, producerIdentity, endpoint }) {
  if (!data || typeof data !== 'object' || !('findings' in data)) {
    throw new Error('judge output is not shape-valid findings JSON');
  }

  const findings = (Array.isArray(data.findings) ? data.findings : [])
    .filter((f) => f && typeof f === 'object')
    .filter((f) => VALID_SEVERITIES.has(f.severity))
    .filter((f) => f.claim && f.evidence);

  const out = {
    mode,
    verdict: findings.some((f) => f.severity === 'CRITICAL') ? 'BLOCK' : 'PASS',
    judge_model: judgeModel,
    ...(judgeIdentity ? { judge_identity: judgeIdentity } : {}),
    producer_model: producer,
    ...(producerIdentity ? { producer_identity: producerIdentity } : {}),
    isolation_mode: endpoint ? `rest-gateway:${endpoint}` : 'rest-gateway',
    cross_model_check: crossModelCheck(judgeIdentity, producerIdentity),
    findings,
  };

  // A zero-finding report must carry its due-diligence trail; the anti-theater
  // gate rejects empty findings without checked_classes.
  if (Array.isArray(data.checked_classes)) {
    out.checked_classes = data.checked_classes.filter(Boolean).map(String);
  }

  return out;
}
