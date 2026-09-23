// Port of adversarial-review/scripts/validate-decision-artifact.sh (prometheus-skill-pack, 98 lines).
//
// Enforces that a decision was judged by a model that did not produce it.
//
// WHY DECISION MODE IS STRICTER THAN THE OTHERS
// For diff/artifact/skill/agent, `same-model-collision` and
// `unverified-producer-unknown` are honest records: a reviewer may
// legitimately not know the producer. A decision is different — it is the
// artifact a human commits to, so an honest record of a failed guarantee is
// itself a rejection, not a footnote. Preserved verbatim from the source.

/**
 * @param {object|null} findings the parsed findings.json document (or null / a
 *   non-object for an unreadable file — the caller is responsible for JSON
 *   parsing and passes null on failure so "unreadable" is distinguishable
 *   from "a valid document missing this field")
 * @returns {{ accepted: boolean, reason: string }}
 */
export function validateDecisionArtifact(findings) {
  if (!findings || typeof findings !== 'object') {
    return { accepted: false, reason: 'parse-error' };
  }

  const mode = findings.mode;
  if (mode !== 'decision') {
    return { accepted: true, reason: 'skip-not-decision' };
  }

  const crossModel = findings.cross_model_check;
  switch (crossModel) {
    case 'verified-distinct':
      return { accepted: true, reason: 'verified-distinct' };
    case undefined:
    case null:
      return { accepted: false, reason: 'missing' };
    case 'same-model-collision':
      return { accepted: false, reason: 'same-model-collision' };
    case 'unverified-producer-unknown':
      return { accepted: false, reason: 'unverified-producer-unknown' };
    default:
      return { accepted: false, reason: 'unrecognised' };
  }
}
