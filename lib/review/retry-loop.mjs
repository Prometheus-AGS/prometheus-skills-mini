// Port of adversarial-review/scripts/review-retry-loop.sh (prometheus-skill-pack, 129 lines).
//
// Bounded CRITICAL retry loop shared by both creators (skill/agent). The cap
// (PROMETHEUS_ADV_RETRY_ROUNDS, default 2) is deliberately a DIFFERENT knob
// than the sycophancy screen's rejection cap (see sycophancy-gate.mjs): this
// one bounds how many times an ARTIFACT is re-reviewed after CRITICAL
// findings; that one bounds how many times an evasive JUDGE REPORT is sent
// back. Conflating them would let a lenient screen setting silently extend
// how long a broken artifact keeps being retried.
//
// Pure functions: data in (a parsed findings document, a round number), data
// out (a state token or a rendered markdown section). No filesystem access —
// the CLI entry point in scripts/adversarial-review/review-retry-loop.mjs
// owns reading/writing files.

/** @typedef {"PROCEED"|"RETRY"|"CAPPED"} RetryState */

const DEFAULT_MAX_ROUNDS = 2;

/**
 * Parse PROMETHEUS_ADV_RETRY_ROUNDS the same way the source script does: any
 * non-positive-integer value silently falls back to the default (2), rather
 * than erroring. This mirrors the source's `case in ''|*[!0-9]*) MAX_ROUNDS=2`
 * — a judgment call preserved from the bash, not introduced here.
 */
export function resolveMaxRounds(env = process.env) {
  const raw = env.PROMETHEUS_ADV_RETRY_ROUNDS;
  if (raw === undefined || raw === '') return DEFAULT_MAX_ROUNDS;
  if (!/^[0-9]+$/.test(raw)) return DEFAULT_MAX_ROUNDS;
  const n = Number(raw);
  return n >= 1 ? n : DEFAULT_MAX_ROUNDS;
}

/** Count CRITICAL findings in a findings document. -1 if the shape is unreadable. */
export function countCritical(findings) {
  if (!findings || typeof findings !== 'object' || !Array.isArray(findings.findings)) return -1;
  return findings.findings.filter(
    (f) => f && typeof f === 'object' && String(f.severity ?? '').toUpperCase() === 'CRITICAL',
  ).length;
}

/**
 * Decide PROCEED / RETRY / CAPPED for the given round.
 *
 * @param {object} findings parsed findings.json (or null/invalid for an unreadable file)
 * @param {number} round the round just completed (1-based, matching the source's usage)
 * @param {object} [opts]
 * @param {object} [opts.env]
 * @returns {{ state: RetryState, criticalCount: number, maxRounds: number }}
 */
export function evaluateRetryState(findings, round, { env = process.env } = {}) {
  const maxRounds = resolveMaxRounds(env);
  const criticalCount = countCritical(findings);

  // An unreadable findings file is NOT "no criticals" — reporting PROCEED on a
  // parse failure is exactly how a broken pipeline reports false success.
  if (criticalCount < 0) return { state: 'CAPPED', criticalCount, maxRounds };
  if (criticalCount === 0) return { state: 'PROCEED', criticalCount, maxRounds };
  if (round < maxRounds) return { state: 'RETRY', criticalCount, maxRounds };
  return { state: 'CAPPED', criticalCount, maxRounds };
}

/**
 * Render the "## Unresolved review findings" section a CAPPED result must
 * carry, verbatim in structure to the source's Python heredoc.
 */
export function renderUnresolvedSection(findings, round, maxRounds) {
  const critical = Array.isArray(findings?.findings)
    ? findings.findings.filter((f) => f && String(f.severity ?? '').toUpperCase() === 'CRITICAL')
    : [];

  const lines = ['## Unresolved review findings', ''];
  lines.push(
    `${critical.length} CRITICAL finding(s) survived the ${maxRounds}-round adversarial retry cap ` +
      `(stopped after round ${round}). This artifact is **not clean** — the cap bounds ` +
      'how long the loop runs, it does not resolve what the judge found.',
  );
  lines.push('');

  const crossModel = findings?.cross_model_check;
  if (crossModel && crossModel !== 'verified-distinct') {
    lines.push(
      `> \`cross_model_check: ${crossModel}\` — the judge was not provably distinct ` +
        'from the producer, so these findings are additionally unverified.',
    );
    lines.push('');
  }

  critical.forEach((c, i) => {
    let loc = c.file || '(unspecified)';
    if (c.line) loc = `${loc}:${c.line}`;
    lines.push(`${i + 1}. **${loc}** — ${c.claim || '(no claim recorded)'}`);
    if (c.evidence) lines.push(`   - Evidence: ${c.evidence}`);
    if (c.suggested_fix) lines.push(`   - Suggested fix: ${c.suggested_fix}`);
    lines.push('');
  });

  return lines.join('\n').replace(/\n+$/, '') + '\n';
}
