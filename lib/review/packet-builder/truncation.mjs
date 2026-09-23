// Port of the per-field cap block inside adversarial-review/scripts/build-review-packet.sh
// (prometheus-skill-pack, 919 lines).
//
// A judge sizes its attention to what it receives. An unbounded packet field
// risks either blowing the context window or silently truncating at the
// transport layer, either of which lets the judge return a verdict on
// material it never saw. So: cap per FIELD (not per packet — one oversized
// field must not crowd out small, high-signal fields), and make the cap part
// of the packet the judge reads, always present even when nothing was cut.

const DEFAULT_CAP_BYTES = 40000;
const MIN_CAP_BYTES = 1000;

/**
 * @param {object} packet
 * @param {object} [opts]
 * @param {number} [opts.capBytes]
 * @returns {{ packet: object, warnings: string[] }} a NEW packet object (immutable input)
 */
export function applyFieldCap(packet, { capBytes = DEFAULT_CAP_BYTES } = {}) {
  const cap = Math.max(capBytes, MIN_CAP_BYTES);
  const next = { ...packet };
  const truncated = [];

  for (const key of Object.keys(next).sort()) {
    const value = next[key];
    if (typeof value !== 'string' || value.length <= cap) continue;

    const original = value.length;
    let clipped = value.slice(0, cap);
    const nl = clipped.lastIndexOf('\n');
    if (nl > cap / 2) clipped = clipped.slice(0, nl);

    next[key] =
      clipped +
      `\n\n[TRUNCATED by build-review-packet.sh: ${clipped.length} of ${original} bytes shown ` +
      `(cap ${cap}). The omitted remainder was NOT reviewed.]`;

    truncated.push({
      field: key,
      original_bytes: original,
      included_bytes: clipped.length,
      omitted_bytes: original - clipped.length,
    });
  }

  next.truncation = {
    cap_bytes_per_field: cap,
    any_truncated: truncated.length > 0,
    fields: truncated,
  };

  const warnings = truncated.length
    ? [
        `${truncated.length} field(s) exceeded the ${cap}-byte cap and were truncated:`,
        ...truncated.map((t) => `  - ${t.field}: ${t.included_bytes} of ${t.original_bytes} bytes included`),
        '  Recorded in packet.truncation so the judge can see it.',
      ]
    : [];

  return { packet: next, warnings };
}
