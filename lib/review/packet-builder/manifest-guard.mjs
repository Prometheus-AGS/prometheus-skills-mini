// Port of the manifest-level enforcement block inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines).
//
// "Manifest-level, never full source" is a contract the judge relies on for
// skill/agent (creation) modes: it sizes its attention to a summary. Enforced
// structurally, not merely intended — descriptive fields are line-oriented
// summaries, so a body leak shows up as unmistakable syntax (a shell function
// definition, a Rust fn/use/impl) inside them. Deliberately UNANCHORED
// patterns: descriptive fields are tab-delimited records where leaked source
// lands mid-line, after metadata columns — an anchored `^` pattern would
// silently match nothing on exactly the fields most at risk.

const MANIFEST_LEVEL_MODES = new Set(['skill', 'agent']);

const VERBATIM_OK = new Set([
  'skill_md',
  'system_prompt',
  'agent_toml',
  'validator_output',
  'original_intent',
  'file_tree',
  'constraints',
  'decision_document',
  'prior_decisions',
]);

const SOURCE_SIGNATURES = [
  ['shell function definition', /[A-Za-z_][A-Za-z0-9_]*\s*\(\)\s*\{/],
  ['rust fn', /\b(pub\s+)?(async\s+)?fn\s+\w+\s*\(/],
  ['rust use', /\buse\s+[\w:]+\s*;/],
  ['rust impl', /\bimpl\s+\w+\s*(<|\{|for\b)/],
];

/**
 * @param {object} packet a fully-assembled packet (before or after truncation — both are checked)
 * @returns {{ ok: boolean, leaks: string[] }}
 */
export function checkManifestLevel(packet) {
  if (!MANIFEST_LEVEL_MODES.has(packet.mode)) return { ok: true, leaks: [] };

  const leaks = [];
  for (const [key, value] of Object.entries(packet)) {
    if (VERBATIM_OK.has(key) || typeof value !== 'string') continue;
    for (const [label, pattern] of SOURCE_SIGNATURES) {
      if (pattern.test(value)) {
        leaks.push(`${key} contains ${label}`);
        break;
      }
    }
  }

  return { ok: leaks.length === 0, leaks };
}
