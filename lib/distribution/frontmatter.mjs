// Reads the `name` and `description` scalars out of a SKILL.md's YAML frontmatter, without a
// YAML dependency. The mini has none (js-yaml is not in package.json, and adding one for two
// scalar fields would be more surface than the problem needs).
//
// What this handles, because it is what the mini's own SKILL.md files actually use (confirmed by
// sampling every frontmatter block under skills/ before writing this):
//   - a plain inline scalar:      name: doctor
//   - a folded block scalar:      description: >
//                                    line one
//                                    line two
// Folded style (`>`) joins continuation lines with spaces, which is the only block style seen in
// this repo's skills. Literal style (`|`, which preserves newlines) is not used here and is not
// implemented — a skill written with it would fail loudly (frontmatter() returns null for its
// description) rather than being silently mis-joined.

import { readText } from '../platform/text.mjs';

/** Extracts the `---\n...\n---` block at the top of a SKILL.md, or null if there isn't one. */
function frontmatterBlock(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

/**
 * The value of one top-level scalar key in a frontmatter block, handling the two styles this
 * repo's SKILL.md files use. Returns null if the key is absent or uses an unsupported style.
 */
function scalarValue(block, key) {
  const lines = block.split('\n');
  const keyPattern = new RegExp(`^${key}:\\s*(.*)$`);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(keyPattern);
    if (!match) continue;
    const rest = match[1].trim();
    if (rest === '>' || rest === '>-' || rest === '>+') {
      const collected = [];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor];
        if (line === '' ) { collected.push(''); continue; }
        if (!/^\s/.test(line)) break; // dedent ends the block scalar
        collected.push(line.trim());
      }
      return collected.join(' ').replace(/\s+/g, ' ').trim();
    }
    // Inline scalar: strip a matching pair of quotes if present.
    const quoted = rest.match(/^(['"])(.*)\1$/);
    return quoted ? quoted[2] : rest;
  }
  return null;
}

/** Parses a SKILL.md's frontmatter into `{ name, description }`. Either field may be null. */
export function parseSkillFrontmatter(skillMdPath) {
  const content = readText(skillMdPath);
  const block = frontmatterBlock(content);
  if (block === null) return { name: null, description: null };
  return { name: scalarValue(block, 'name'), description: scalarValue(block, 'description') };
}
