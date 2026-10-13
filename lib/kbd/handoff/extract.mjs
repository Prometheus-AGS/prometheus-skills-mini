// Pure extraction from project documents: the never-do list from AGENTS.md and the operator
// gate / decision sections from a phase plan. Both are summaries with a pointer back to the
// source; the source documents remain authoritative.

const MAX_NEVER_DO = 30;
const MAX_ITEM_CHARS = 220;
const MAX_GATE_LINES = 25;
const PROHIBITION = /\b(never|do not|don't|must not|forbidden|refuse)\b/i;
const GATE_HEADING = /\b(operator gates?|gates?|decisions?)\b/i;

const plain = (line) => line
  .replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')
  .replace(/\*\*|__|`/g, '')
  .trim();

const truncate = (value) => (value.length > MAX_ITEM_CHARS ? `${value.slice(0, MAX_ITEM_CHARS - 1).trimEnd()}…` : value);

/** The sentence that states the prohibition, else the first sentence. */
function keySentence(value) {
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.find((sentence) => PROHIBITION.test(sentence)) ?? sentences[0] ?? value;
}

/**
 * Bullets from AGENTS.md that state a prohibition, or that sit under a heading which does
 * (for example "Do not modify or touch:" lists). Each item is the sentence carrying the prohibition.
 */
export function neverDoFromAgents(markdown) {
  if (typeof markdown !== 'string') return [];
  const items = [];
  let headingProhibits = false;
  let leadIn = null;
  for (const raw of markdown.split(/\r?\n/)) {
    if (/^#{1,6}\s/.test(raw)) {
      headingProhibits = PROHIBITION.test(raw) || /\bsafety\b|\bmust not break\b/i.test(raw);
      leadIn = null;
      continue;
    }
    const isBullet = /^\s*(?:[-*+]|\d+\.)\s+/.test(raw);
    if (!isBullet) {
      if (raw.trim()) leadIn = PROHIBITION.test(raw) && /:\s*$/.test(raw.trim()) ? plain(raw) : null;
      continue;
    }
    const value = plain(raw);
    if (!value) continue;
    if (PROHIBITION.test(value) || headingProhibits || leadIn) {
      const item = truncate(leadIn && !PROHIBITION.test(value) ? `${leadIn} ${value}` : keySentence(value));
      if (!items.includes(item)) items.push(item);
    }
    if (items.length >= MAX_NEVER_DO) break;
  }
  return items;
}

/** Sections of plan.md whose heading names operator gates or decisions, with capped bodies. */
export function gateSections(markdown) {
  if (typeof markdown !== 'string') return [];
  const sections = [];
  let current = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      if (current && heading[1].length <= current.level) current = null;
      if (GATE_HEADING.test(heading[2])) {
        current = { level: heading[1].length, heading: heading[2].trim(), lines: [], truncated: false };
        sections.push(current);
      }
      continue;
    }
    if (!current || !raw.trim() || /^\s*(?:---|\|\s*-)/.test(raw)) continue;
    if (current.lines.length < MAX_GATE_LINES) current.lines.push(raw.trimEnd());
    else current.truncated = true;
  }
  return sections;
}
