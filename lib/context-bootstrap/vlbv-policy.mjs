// VLBV conformance of generated governing files (port of the full pack's
// scripts/lib/vlbv-policy-check.sh, BS-04).
//
// A generated governing file must state VLBV in the marked policy block, carry no
// retired compiler exception or opt-in VLBV wording, and emit no /opsx:* command
// (removed in OpenSpec 2.0). Retired wording inside the bootstrap's managed region
// is an error; the same wording in operator prose outside it is reported as stale
// prose for manual cleanup, because the bootstrap never rewrites operator text.

const POLICY_BEGIN = '<!-- kbd-policy:begin -->';
const POLICY_END = '<!-- kbd-policy:end -->';
const VERIFICATION_LINE = /^- verification: VLBV\r?$/m;
const RETIRED_WORDING =
  /narrow(ly targeted)?( package)? (compiler|type) (check|invocation)|narrow compiler or type check|compiler checks? (needed|required) to unblock|for (a )?selected VLBV|when VLBV is selected|outside a selected VLBV phase/i;
const OPSX_COMMAND = /(^|[^a-z])\/opsx:/m;

const count = (text, needle) => text.split(needle).length - 1;

function splitRegion(content, start, end) {
  const from = content.indexOf(start);
  const to = from < 0 ? -1 : content.indexOf(end, from);
  if (from < 0 || to < 0) return { managed: '', outside: content };
  return { managed: content.slice(from, to + end.length), outside: content.slice(0, from) + content.slice(to + end.length) };
}

/**
 * @param {string} label   path shown in findings
 * @param {string} content file content
 * @param {{start: string, end: string, requirePolicy: boolean}} markers
 * @returns {{errors: string[], stale: string[]}}
 */
export function checkVlbvPolicy(label, content, { start, end, requirePolicy }) {
  const errors = [];
  const stale = [];
  const { managed, outside } = splitRegion(content, start, end);
  if (requirePolicy) {
    const blocks = count(managed, POLICY_BEGIN);
    const policy = blocks === 1 ? managed.slice(managed.indexOf(POLICY_BEGIN), managed.indexOf(POLICY_END) + POLICY_END.length) : '';
    if (blocks !== 1 || count(managed, POLICY_END) !== 1 || !VERIFICATION_LINE.test(policy)) {
      errors.push(`${label}: missing a single ${POLICY_BEGIN} block with 'verification: VLBV' — re-run the bootstrap`);
    }
    if (count(outside, POLICY_BEGIN) > 0) errors.push(`${label}: a second kbd-policy block exists outside the managed region`);
  }
  if (RETIRED_WORDING.test(managed)) errors.push(`${label}: retired compiler exception or opt-in VLBV wording in the managed region`);
  if (OPSX_COMMAND.test(managed)) errors.push(`${label}: managed region emits /opsx:* commands, removed in OpenSpec 2.0`);
  if (RETIRED_WORDING.test(outside)) stale.push(`${label}: operator prose carries retired compiler-exception or opt-in VLBV wording`);
  if (OPSX_COMMAND.test(outside)) stale.push(`${label}: operator prose names /opsx:* commands, removed in OpenSpec 2.0`);
  return { errors, stale };
}
