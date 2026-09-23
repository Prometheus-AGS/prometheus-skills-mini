// Port of assert-independent-dispatch.sh (prometheus-skill-pack, 126 lines).
//
// WHAT THIS CHECKS, AND WHY IT IS NOT A PROMPT REVIEW
// A skill can instruct "generate independently" and a model can ignore it,
// with nothing downstream the wiser. So this reads what each dispatch
// ACTUALLY RECEIVED — the recorded inputs written by dispatch.mjs — and
// asserts:
//
//   1. at least N sets exist                     (default 3)
//   2. no set's input contains another set's output
//   3. every set's input references the topic     (same question, not N questions)
//   4. outputs are not byte-identical              (a copied set is not a second sample)
//
// Reading the SKILL.md prose to confirm it says "independently" would be
// exactly the mistake this module exists to avoid: checking the instruction
// rather than the behaviour.
//
// Judgment call: the source shells out to a python3 heredoc for checks 2-4.
// Ported directly to JS — node:crypto for the digest, RegExp for topic-word
// extraction — no new dependency, matching the mini's "no python anywhere" rule.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readText } from '../platform/text.mjs';
import { isContaminatedBy } from './dispatch.mjs';

const DEFAULT_MIN_SETS = 3;
const SET_PATTERN = /^set-(\d+)\.input$/;
const TOPIC_WORD_PATTERN = /[A-Za-z]{4,}/g;
const TOPIC_WORDS_TO_CHECK = 3;

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** Load every recorded set under `session/sets/`, keyed by set number as a string. */
export function readSets(session) {
  const setsDir = path.join(session, 'sets');
  const sets = {};
  for (const name of fs.readdirSync(setsDir)) {
    const match = SET_PATTERN.exec(name);
    if (!match) continue;
    const n = match[1];
    const outputPath = path.join(setsDir, `set-${n}.output`);
    sets[n] = {
      input: readText(path.join(setsDir, name)),
      output: fs.existsSync(outputPath) ? readText(outputPath) : null,
    };
  }
  return sets;
}

function readTopic(session) {
  const topicPath = path.join(session, 'topic.txt');
  return fs.existsSync(topicPath) ? readText(topicPath).trim() : '';
}

/**
 * Run the four independence checks against a recorded session. Never throws for a failed
 * check — `result.pass` and `result.problems` carry that. Throws only for an unusable
 * session directory (no `sets/` at all), matching the source's usage-error exit 1.
 */
export function assertIndependentDispatch({ session, minSets = DEFAULT_MIN_SETS }) {
  const setsDir = path.join(session, 'sets');
  if (!fs.existsSync(setsDir)) throw new Error(`[independence] ERROR: no sets/ under ${session}`);

  const sets = readSets(session);
  const problems = [];

  // 1. Enough sets.
  const count = Object.keys(sets).length;
  if (count < minSets) {
    problems.push(
      `only ${count} recorded set(s); at least ${minSets} required. ` +
        'One pass is the single-sample case that diversity enforcement exists to replace.',
    );
  }

  // 2. No set's input may contain another set's output.
  for (const [a, da] of Object.entries(sets)) {
    for (const [b, db] of Object.entries(sets)) {
      if (a === b || !db.output) continue;
      if (isContaminatedBy(da.input, db.output)) {
        problems.push(`set ${a} input contains set ${b} output`);
      }
    }
  }

  // 3. Every input must reference the topic — otherwise these are N different questions,
  //    and pooling them is meaningless rather than diverse.
  const topic = readTopic(session);
  if (topic) {
    const keywords = [...topic.toLowerCase().matchAll(TOPIC_WORD_PATTERN)]
      .map((m) => m[0])
      .slice(0, TOPIC_WORDS_TO_CHECK);
    if (keywords.length > 0) {
      for (const [n, d] of Object.entries(sets)) {
        const low = d.input.toLowerCase();
        if (!keywords.some((word) => low.includes(word))) {
          problems.push(`set ${n} input does not reference the topic`);
        }
      }
    }
  }

  // 4. Byte-identical outputs are one sample recorded twice.
  const digests = {};
  for (const [n, d] of Object.entries(sets)) {
    if (!d.output) continue;
    const digest = sha256(d.output);
    if (Object.hasOwn(digests, digest)) {
      problems.push(`set ${n} output is byte-identical to set ${digests[digest]}`);
    } else {
      digests[digest] = n;
    }
  }

  return { pass: problems.length === 0, problems, setCount: count };
}
