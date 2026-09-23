// Port of the decision-mode field parser inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// Parses a decision document into decision / assumptions / falsifier and
// records missing_fields. A decision with no falsifier cannot be wrong about
// anything — the packet surfaces that structurally, without spending a
// judge call, so absence is recorded rather than treated as a parse error.

function section(text, ...names) {
  for (const name of names) {
    // Python: re.search(r"^#{1,6}\s*%s\s*$\n(.*?)(?=^#{1,6}\s|\Z)", text, re.M | re.I | re.S)
    const re = new RegExp(`^#{1,6}\\s*${name}\\s*$\\n([\\s\\S]*?)(?=^#{1,6}\\s|$(?![\\s\\S]))`, 'im');
    const m = re.exec(text);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

function items(body) {
  if (!body) return [];
  const lines = body.split('\n').filter((l) => /^\s*[-*+]\s+/.test(l));
  if (!lines.length) return [];
  return lines.map((l) => l.replace(/^\s*[-*+]\s*/, '').trim());
}

/**
 * @param {string} text the decision document's full text
 * @returns {{ decision: string|null, assumptions: string[], falsifier: string|null, missing_fields: string[] }}
 */
export function parseDecisionFields(text) {
  const assumptionsBody = section(text, 'assumptions?', 'what this rests on');
  const falsifier = section(
    text,
    'falsifier',
    'what would falsify (?:this|it)',
    'what would prove (?:this|me) wrong',
    'disconfirming evidence',
  );
  const decision = section(text, 'decision', 'the decision', 'what i am deciding');

  const parsedAssumptions = items(assumptionsBody);
  const assumptions = parsedAssumptions.length ? parsedAssumptions : assumptionsBody ? [assumptionsBody] : [];

  const missing = [];
  if (!decision) missing.push('decision');
  if (!assumptionsBody) missing.push('assumptions');
  if (!falsifier) missing.push('falsifier');

  return { decision, assumptions, falsifier, missing_fields: missing };
}
