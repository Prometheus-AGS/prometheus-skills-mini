// Port of adversarial-review/scripts/commit-before-reveal.sh (prometheus-skill-pack, 140 lines).
//
// Withholds analysis until the user commits their own judgement first.
// Ordering, not content, is the intervention: showing analysis before asking
// what someone thinks produces agreement, not judgement (see the source's
// header for the cited evidence — Microsoft Research 2025, PubMed 41076923).
// Preserved verbatim: this gate REFUSES rather than warns, because a warning
// is advice a model can route around.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';

const MIN_JUDGEMENT_CHARS = 20;

function nonWhitespaceLength(text) {
  return text.replace(/\s+/g, '').length;
}

/**
 * @param {string} sessionDir directory the judgement record lives in
 * @param {string} judgementText the user's judgement, already read from file/stdin by the caller
 * @param {object} [opts]
 * @param {number} [opts.confidence] integer 0-100
 * @param {Function} [opts.now] () => Date, injectable for tests
 * @returns {{ accepted: boolean, reason?: string }}
 */
export function recordJudgement(sessionDir, judgementText, { confidence, now = () => new Date() } = {}) {
  const text = String(judgementText ?? '');
  if (nonWhitespaceLength(text) < MIN_JUDGEMENT_CHARS) {
    return { accepted: false, reason: 'too-short' };
  }

  if (confidence !== undefined && confidence !== null) {
    if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
      throw new RangeError('--confidence must be an integer 0-100');
    }
  }

  mkdirSync(sessionDir, { recursive: true });
  const record = {
    recorded_at: now().toISOString().replace(/\.\d+Z$/, 'Z'),
    judgement: text,
    confidence: confidence === undefined ? null : confidence,
    // The whole point: this was written BEFORE any analysis was shown.
    recorded_before_analysis: true,
  };
  atomicWrite(path.join(sessionDir, 'user-judgement.json'), JSON.stringify(record, null, 2));
  return { accepted: true };
}

/**
 * @param {string} sessionDir
 * @returns {{ accepted: boolean, reason?: string }}
 */
export function checkJudgementRecorded(sessionDir) {
  const file = path.join(sessionDir, 'user-judgement.json');
  if (!existsSync(file)) {
    return { accepted: false, reason: 'no-record' };
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { accepted: false, reason: 'invalid' };
  }

  const valid =
    parsed &&
    typeof parsed === 'object' &&
    typeof parsed.judgement === 'string' &&
    nonWhitespaceLength(parsed.judgement) >= MIN_JUDGEMENT_CHARS &&
    parsed.recorded_before_analysis === true;

  return valid ? { accepted: true } : { accepted: false, reason: 'invalid' };
}
