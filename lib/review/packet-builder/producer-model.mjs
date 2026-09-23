// Port of the producer-model resolution block inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// Best-effort record of which model produced the work under review, for the
// judge!=producer collision check (see judge-findings.mjs's crossModelCheck).
// "unknown" is NOT a harmless default: it makes that comparison pass
// TRIVIALLY, so this warns loudly rather than staying silent.

/**
 * @param {object} args
 * @param {{producer_model?: string}|null} [args.progressJson] parsed phase progress.json, if any
 * @param {object} [args.env]
 * @returns {{ producer: string, warning: string|null }}
 */
export function resolveProducerModel({ progressJson, env = process.env }) {
  const producer =
    progressJson?.producer_model ||
    env.KBD_PRODUCER_MODEL ||
    env.ANTHROPIC_MODEL ||
    env.CLAUDE_MODEL ||
    env.CLAUDE_CODE_MODEL ||
    env.CLAUDECODE_MODEL ||
    '';

  if (producer) return { producer, warning: null };

  return {
    producer: 'unknown',
    warning:
      'PRODUCER_UNKNOWN — cannot determine which model produced this work, so the judge!=producer ' +
      'guarantee cannot be enforced. Set KBD_PRODUCER_MODEL (e.g. export KBD_PRODUCER_MODEL=claude-opus-5) ' +
      'to restore the cross-model check.',
  };
}
