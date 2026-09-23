// Port of skill-mode manifest assembly inside
// adversarial-review/scripts/build-review-packet.sh (prometheus-skill-pack, 919 lines):
// frontmatter parsing, script inventory, cross-reference map.
//
// All manifest-level, by design: script bodies are never included (see
// manifest-guard.mjs, which enforces this structurally).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Parse a SKILL.md's YAML-ish frontmatter into a flat object. Deliberately a
 * minimal line-oriented parser (not a YAML library) matching the source's
 * own regex-based extraction — the frontmatter shape here is always
 * `key: value` or `key:\n- item\n- item`, never nested mappings.
 *
 * @param {string} text full SKILL.md content
 * @returns {Record<string, string|string[]>}
 */
export function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return {};

  const fm = {};
  let currentKey = null;
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const kv = /^(\s*)([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (kv) {
      currentKey = kv[2];
      fm[currentKey] = kv[3].trim() || {};
      continue;
    }
    if (/^\s*-/.test(line) && currentKey) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(line.trim().slice(1).trim());
    }
  }
  // A key with no scalar value and no list items collected stays `{}` in the
  // source's Python; here that would only happen for a malformed block, so
  // normalize the placeholder away to keep the JS shape simple.
  for (const key of Object.keys(fm)) {
    if (fm[key] && typeof fm[key] === 'object' && !Array.isArray(fm[key]) && Object.keys(fm[key]).length === 0) {
      delete fm[key];
    }
  }
  return fm;
}

/**
 * @param {string} skillDir
 * @returns {string[]} one tab-delimited line per script: path, size, executable, shebang, purpose
 */
export function buildScriptInventory(skillDir) {
  const scriptsDir = path.join(skillDir, 'scripts');
  if (!existsSync(scriptsDir)) return [];

  const lines = [];
  for (const name of readdirSync(scriptsDir).sort()) {
    const filePath = path.join(scriptsDir, name);
    const stat = statSync(filePath);
    if (!stat.isFile()) continue;

    const executable = process.platform === 'win32' ? 'yes' : (stat.mode & 0o111) !== 0 ? 'yes' : 'no';
    const content = readFileSync(filePath, 'utf8');
    const firstLine = content.split('\n')[0] ?? '';
    const shebang = firstLine.startsWith('#!') ? firstLine : '(none)';
    // Purpose: the first '#'-prefixed line among lines 2-6, stripped of the leading '#'.
    const purposeLine = content
      .split('\n')
      .slice(1, 6)
      .find((l) => l.trimStart().startsWith('#'));
    const purpose = purposeLine ? purposeLine.replace(/^\s*#\s?/, '').trim() : '';

    lines.push(`scripts/${name}\t${stat.size} bytes\texecutable=${executable}\t${shebang}\t${purpose || '(no stated purpose)'}`);
  }
  return lines;
}

/**
 * @param {string} skillDir
 * @returns {string[]} one line per relative link in SKILL.md, "OK"/"BROKEN" + target + label
 */
export function buildCrossReferenceMap(skillDir) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) return [];
  const text = readFileSync(skillMdPath, 'utf8');

  const seen = new Set();
  const out = [];
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(text))) {
    const [, label, href] = m;
    if (/^(https?:\/\/|#|mailto:)/.test(href)) continue;
    const target = href.split('#')[0];
    if (!target || seen.has(target)) continue;
    seen.add(target);
    const ok = existsSync(path.join(skillDir, target));
    out.push(`${ok ? 'OK' : 'BROKEN'}       ${target}  (${label})`);
  }
  return out.sort();
}
