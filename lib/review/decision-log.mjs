// Port of adversarial-review/scripts/decision-log.sh (prometheus-skill-pack, 236 lines).
//
// Persists decisions AND their outcomes in the pk wiki. The outcome half is
// the differentiator the source header cites: idea rankings are known to
// flip after execution (Si, Hashimoto & Yang 2025), so a score recorded at
// decision time is only meaningful once checked against what actually
// happened. Entries are OKF v0.1: a non-empty `type` is the only hard
// requirement, so `type: Decision` is purely additive to the existing wiki.

import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';

const MIN_OUTCOME_CHARS = 10;

/** Lowercase, collapse runs of non-alphanumerics to a single hyphen, trim, cap at 72 chars. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function section(text, ...names) {
  for (const name of names) {
    const re = new RegExp(`^#{1,6}\\s*${name}\\s*$\\n([\\s\\S]*?)(?=^#{1,6}\\s|$(?![\\s\\S]))`, 'im');
    const m = re.exec(text);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

function yamlQuote(title) {
  return '"' + String(title).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function isoNow(now) {
  return now().toISOString().replace(/\.\d+Z$/, 'Z');
}

/**
 * @param {object} args
 * @param {string} args.decisionFile path to the source decision markdown
 * @param {string} args.wiki wiki directory to write into
 * @param {string} [args.id] explicit slug; derived from the `# Title` line otherwise
 * @param {Function} [args.now]
 * @returns {{ accepted: boolean, id?: string, entryPath?: string, reason?: string }}
 */
export function recordDecision({ decisionFile, wiki, id, now = () => new Date() }) {
  const src = readFileSync(decisionFile, 'utf8');

  let eid = id;
  if (!eid) {
    const titleMatch = /^#\s+(.+)$/m.exec(src);
    const titleLine = titleMatch ? titleMatch[1].trim() : path.basename(decisionFile).replace(/\.[^.]+$/, '');
    eid = slugify(titleLine);
  }

  mkdirSync(wiki, { recursive: true });
  const entryPath = path.join(wiki, `${eid}.md`);
  if (existsSync(entryPath)) {
    return { accepted: false, id: eid, entryPath, reason: 'duplicate' };
  }

  const titleMatch = /^#\s+(.+)$/m.exec(src);
  const title = titleMatch ? titleMatch[1].trim() : eid;
  const decision = section(src, 'decision', 'the decision') || '(not stated)';
  const assumptions = section(src, 'assumptions?', 'what this rests on') || '(none stated)';
  const falsifier =
    section(src, 'falsifier', 'what would falsify (?:this|it)', 'what would prove (?:this|me) wrong') || '(none stated)';

  const body = `---
type: Decision
id: ${eid}
title: ${yamlQuote(title)}
tags:
- decision
- outcome-pending
outcome_status: pending
decided_at: ${isoNow(now)}
links: []
sources: []
---

# ${title}

## Decision

${decision}

## Assumptions

${assumptions}

## Falsifier

${falsifier}

## Outcome

**Status: pending.** Nothing has been recorded yet.

A decision without a recorded outcome cannot be checked against what actually
happened — and idea rankings are known to flip after execution, so the judgement
made here is exactly the thing that needs checking later.

Record it with:

\`\`\`
recordOutcome({ id: "${eid}", result: "..." })
\`\`\`
`;

  atomicWrite(entryPath, body);
  return { accepted: true, id: eid, entryPath };
}

/**
 * @param {object} args
 * @param {string} args.id
 * @param {string} args.result outcome text
 * @param {string} args.wiki
 * @param {Function} [args.now]
 * @returns {{ accepted: boolean, reason?: string }}
 */
export function recordOutcome({ id, result, wiki, now = () => new Date() }) {
  const entryPath = path.join(wiki, `${id}.md`);
  if (!existsSync(entryPath)) {
    return { accepted: false, reason: 'no-decision' };
  }

  const text = String(result ?? '').trim();
  if (text.replace(/\s+/g, '').length < MIN_OUTCOME_CHARS) {
    return { accepted: false, reason: 'too-short' };
  }

  let s = readFileSync(entryPath, 'utf8');
  const recordedAt = isoNow(now);
  s = s.replace('outcome_status: pending', 'outcome_status: recorded');
  s = s.replace('- outcome-pending', '- outcome-recorded');
  if (!s.includes('outcome_recorded_at:')) {
    s = s.replace('outcome_status: recorded', `outcome_status: recorded\noutcome_recorded_at: ${recordedAt}`);
  }
  s = s.replace(
    /^## Outcome\n[\s\S]*$/m,
    `## Outcome\n\n**Status: recorded** (${recordedAt})\n\n${text}\n`,
  );

  atomicWrite(entryPath, s);
  return { accepted: true };
}

/**
 * @param {object} args
 * @param {string} args.topic
 * @param {string} args.wiki
 * @returns {Array<{ id: string, title: string, status: string, decidedAt: string, outcome: string|null }>}
 */
export function revisitDecisions({ topic, wiki }) {
  if (!existsSync(wiki)) return [];
  const keys = (String(topic).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const rows = [];

  for (const name of readdirSync(wiki).filter((f) => f.endsWith('.md')).sort()) {
    const filePath = path.join(wiki, name);
    let s;
    try {
      s = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    if (!/^type:\s*Decision\s*$/m.test(s)) continue;
    const low = s.toLowerCase();
    if (keys.length && !keys.some((k) => low.includes(k))) continue;

    const eid = (/^id:\s*(.+)$/m.exec(s) || [null, name])[1].trim();
    const title = (/^title:\s*(.+)$/m.exec(s) || [null, eid])[1].trim();
    const status = (/^outcome_status:\s*(\S+)/m.exec(s) || [null, 'unknown'])[1];
    const decidedAt = (/^decided_at:\s*(\S+)/m.exec(s) || [null, '?'])[1];
    const outcomeMatch = /^## Outcome\n\n\*\*Status: recorded\*\*[^\n]*\n\n([\s\S]*?)(?=\n#|$)/m.exec(s);
    const outcome = outcomeMatch ? outcomeMatch[1].trim() : null;

    rows.push({ id: eid, title, status, decidedAt, outcome });
  }
  return rows;
}
