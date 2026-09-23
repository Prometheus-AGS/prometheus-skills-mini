// Port of adversarial-review/scripts/check-findings-sycophancy.sh
// (prometheus-skill-pack, 277 lines) and the syco_score / syco_critical /
// syco_should_reject functions it sources from shared/scripts/lib/sycophancy.sh.
//
// The anti-theater gate for the judge's OWN findings report: catches the
// failure mode where the reviewer softens itself back toward agreement
// (hedged praise, "no real issues", empty findings on substantial input).
// This is mutation-check candidate #2 in the port task — a silently
// weakened decision rule here lets exactly the theater this gate exists to
// catch sail through.

const REJECT_CAP_CEILING = 5;
const REJECT_CAP_DEFAULT = 2;
const SCORE_THRESHOLD_DEFAULT = 0.4;
const CRITICAL_FLOOR_DEFAULT = 0.3;
const ALWAYS_REJECT_DEFAULT = ['S-08'];

/**
 * PROMETHEUS_ADV_REJECT_CAP resolution. Bounded, not open: a value above the
 * ceiling of 5 is an ERROR rather than clamped, because a silently-lowered
 * cap would leave the operator believing a bound is in force that is not.
 *
 * @param {object} env
 * @returns {{ cap: number, overridden: boolean }}
 * @throws {Error} when the value is non-numeric, <1, or >5
 */
export function resolveRejectCap(env = process.env) {
  const raw = env.PROMETHEUS_ADV_REJECT_CAP;
  if (raw === undefined || raw === '') return { cap: REJECT_CAP_DEFAULT, overridden: false };

  if (!/^[0-9]+$/.test(raw)) {
    throw new Error(`PROMETHEUS_ADV_REJECT_CAP must be a positive integer, got '${raw}'.`);
  }
  const cap = Number(raw);
  if (cap > REJECT_CAP_CEILING) {
    throw new Error(
      `PROMETHEUS_ADV_REJECT_CAP=${cap} exceeds the hard ceiling of ${REJECT_CAP_CEILING}. Refusing rather than clamping.`,
    );
  }
  if (cap < 1) {
    throw new Error('PROMETHEUS_ADV_REJECT_CAP must be at least 1 (got 0). A cap of 0 would accept every report without screening it.');
  }
  return { cap, overridden: cap !== REJECT_CAP_DEFAULT };
}

/**
 * The mandate requires zero-finding reports to enumerate checked_classes.
 * A terse empty report can score 0.0 on the language-pattern detector while
 * still being pure rubber-stamp, so this deterministic check is enforced
 * separately from the score.
 */
export function hasEmptyFindingsTrail(findings) {
  const hasFindings = Array.isArray(findings?.findings) && findings.findings.length > 0;
  const hasTrail = Array.isArray(findings?.checked_classes) && findings.checked_classes.length > 0;
  return !hasFindings && !hasTrail;
}

/** Render the findings report as prose for the sycophancy pattern analyzer. */
export function renderReportText(findings) {
  const lines = [
    `Adversarial review report (mode=${findings.mode}, verdict=${findings.verdict})`,
    `Finding count: ${(findings.findings ?? []).length}`,
  ];
  for (const f of findings.findings ?? []) {
    let line = `${f.severity} ${f.file ?? '?'}:${f.line ?? '?'} — ${f.claim ?? ''}. Evidence: ${f.evidence ?? ''}`;
    if (f.suggested_fix) line += ` Suggested fix: ${f.suggested_fix}`;
    if (f.resolution) line += ` Resolution: ${f.resolution}`;
    lines.push(line);
  }
  if (!(findings.findings ?? []).length) {
    lines.push(`No findings were reported. Checked classes: ${(findings.checked_classes ?? []).join('; ')}`);
  }
  return lines.join('\n');
}

/** Parse a sycophancy_score out of one or more MCP JSON-RPC response lines. */
export function extractScore(rawResponse) {
  for (const line of String(rawResponse ?? '').split('\n')) {
    try {
      const obj = JSON.parse(line);
      const content = obj?.result?.content;
      if (Array.isArray(content) && content.length) {
        const data = JSON.parse(content[0].text ?? '{}');
        const score = data.sycophancy_score;
        if (typeof score === 'number' && score >= 0) return score;
      }
    } catch {
      // best-effort parse across lines, matching the source's try/except-per-line
    }
  }
  return null;
}

/** Parse "id:severity" tokens for every high/critical classification. */
export function extractCritical(rawResponse) {
  for (const line of String(rawResponse ?? '').split('\n')) {
    try {
      const obj = JSON.parse(line);
      const content = obj?.result?.content;
      if (Array.isArray(content) && content.length) {
        const data = JSON.parse(content[0].text ?? '{}');
        const classes = Array.isArray(data.classifications) ? data.classifications : [];
        const hc = classes
          .filter((c) => ['high', 'critical'].includes(c.severity))
          .map((c) => `${c.pattern_id ?? '?'}:${c.severity ?? '?'}`);
        if (hc.length) return hc;
      }
    } catch {
      // best-effort
    }
  }
  return [];
}

/**
 * S-03 (Caveat Collapse) exemption for substantive reports: a report that
 * enumerates >=1 concrete finding is structurally the opposite of caveat
 * collapse, yet terse technical claims often miss S-03's word lists. Drop
 * S-03 from the critical set only when findings are present.
 */
export function dropS03WhenFindingsPresent(critical, nFindings) {
  if (nFindings < 1) return critical;
  return critical.filter((tok) => !tok.startsWith('S-03:'));
}

/**
 * The shared decision rule (score threshold + critical floor + always-reject
 * patterns), matching shared/scripts/lib/sycophancy.sh's syco_should_reject.
 *
 * @param {object} args
 * @param {number|null} args.score
 * @param {string[]} args.critical "id:severity" tokens
 * @param {number} args.nFindings
 * @param {object} [args.tuning] optional overrides for the PROMETHEUS_SYCO_* env knobs
 * @returns {{ reject: boolean, reason: string }}
 */
export function shouldReject({ score, critical, nFindings, tuning = {} }) {
  const threshold = tuning.scoreThreshold ?? SCORE_THRESHOLD_DEFAULT;
  const floor = tuning.criticalFloor ?? CRITICAL_FLOOR_DEFAULT;
  const alwaysReject = tuning.alwaysReject ?? ALWAYS_REJECT_DEFAULT;
  // Zero-finding reports keep the legacy any-critical mode: with no substance
  // on the table, a lone high/critical language hit is exactly the theater
  // this gate exists to catch.
  const criticalAlways = tuning.criticalAlways ?? nFindings === 0;

  const presentIds = new Set(critical.map((tok) => tok.split(':')[0]));
  const reasons = [];
  let reject = false;

  if (score !== null && score !== undefined && score >= threshold) {
    reject = true;
    reasons.push(`sycophancy_score=${score} (>= threshold ${threshold})`);
  }

  const hitAlways = alwaysReject.filter((id) => presentIds.has(id));
  if (hitAlways.length) {
    reject = true;
    reasons.push(`always-reject pattern(s) present: ${hitAlways.join(', ')}`);
  }

  if (critical.length) {
    if (criticalAlways || (score !== null && score !== undefined && score >= floor)) {
      reject = true;
      const why = criticalAlways ? 'any-critical mode' : `score ${score} >= critical-floor ${floor}`;
      reasons.push(`high/critical [${critical.join(' ')}] with ${why}`);
    }
  }

  return { reject, reason: reasons.join('; ') };
}
