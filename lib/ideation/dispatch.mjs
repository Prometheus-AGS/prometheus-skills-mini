// Port of record-dispatch.sh (prometheus-skill-pack, 96 lines).
//
// WHY THIS EXISTS (from the source header, preserved verbatim in spirit):
// "Generate independently" is a claim about what each dispatch RECEIVED. Prose
// cannot carry that claim — a skill can say "do not share context" and a model
// can share it anyway, and nothing downstream would know. This module writes
// down the input each dispatch actually got, so independence.mjs can check the
// property structurally instead of trusting the instruction.
//
// THE PROPERTY: every set's input contains the topic and NOTHING drawn from
// another set. Chen et al. (2026) found multi-agent LLM ideation collapses
// toward agreement despite architectural attempts to diversify, so the only
// defence is structural — never hand set N the output of set N-1. Fail at
// RECORD time, not only at assert time: refusing here means a contaminated
// set never enters the pool at all, the cheapest possible place to catch it.
//
// Pure-ish functions: filesystem I/O at the edge, the contamination check is
// a pure function of two strings (substantiveLines / isContaminatedBy).

import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';
import { readText } from '../platform/text.mjs';

const SUBSTANTIVE_MIN_LENGTH = 24;

/** Lines worth comparing for contamination: short/boilerplate lines collide by chance. */
export function substantiveLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > SUBSTANTIVE_MIN_LENGTH);
}

/** Whether `inputText` verbatim-contains any substantive line of `priorOutputText`. */
export function isContaminatedBy(inputText, priorOutputText) {
  return substantiveLines(priorOutputText).some((line) => inputText.includes(line));
}

function ensureSetsDir(session) {
  const dir = path.join(session, 'sets');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function assertNumeric(value, label) {
  if (!/^\d+$/.test(String(value ?? ''))) throw new TypeError(`${label} must be a number`);
}

/**
 * Record the OUTPUT of one dispatch. Mirrors `record-dispatch.sh --output`: copies the file's
 * bytes into `sets/set-<n>.output`.
 */
export function recordOutput({ session, set, outputFile }) {
  assertNumeric(set, '--set');
  if (!fs.existsSync(outputFile)) throw new Error(`--output file not found: ${outputFile}`);
  const setsDir = ensureSetsDir(session);
  atomicWrite(path.join(setsDir, `set-${set}.output`), readText(outputFile));
}

/**
 * Record the INPUT of one dispatch, refusing (and leaving nothing behind) if it already
 * contains verbatim content from another set's recorded output.
 *
 * Mirrors `record-dispatch.sh`'s three input sources, in priority order:
 *   - `inputText`  — content already in memory (test-only convenience; the source has no
 *     equivalent flag, it always goes through a file or the topic default)
 *   - `inputFile`  — `--input <file>`, copied verbatim
 *   - default      — the topic alone, which is the whole point: a dispatch that receives only
 *     the topic cannot have been contaminated
 *
 * Also writes `topic.txt`, as the source does on every successful record, so
 * independence.mjs can anchor its topic-reference check.
 */
export function recordInput({ session, set, topic, inputFile, inputText }) {
  assertNumeric(set, '--set');
  if (!topic) throw new Error('--topic is required');

  let content;
  if (typeof inputText === 'string') {
    content = inputText;
  } else if (inputFile) {
    if (!fs.existsSync(inputFile)) throw new Error(`--input file not found: ${inputFile}`);
    content = readText(inputFile);
  } else {
    content = `${topic}\n`;
  }

  const setsDir = ensureSetsDir(session);
  const inputPath = path.join(setsDir, `set-${set}.input`);
  const ownOutputPath = path.join(setsDir, `set-${set}.output`);

  const priorOutputs = fs
    .readdirSync(setsDir)
    .filter((name) => name.endsWith('.output') && path.join(setsDir, name) !== ownOutputPath);

  for (const name of priorOutputs) {
    const priorOutputText = readText(path.join(setsDir, name));
    if (isContaminatedBy(content, priorOutputText)) {
      throw new Error(
        `[dispatch] REFUSED: the input for set ${set} contains content from ${name}.\n` +
          '[dispatch]   Independent generation means each dispatch receives the TOPIC ONLY.\n' +
          '[dispatch]   Feeding one set\'s output into the next is the diversity-collapse\n' +
          '[dispatch]   failure mode this gate exists to prevent (arXiv 2604.18005).',
      );
    }
  }

  atomicWrite(inputPath, content);
  atomicWrite(path.join(session, 'topic.txt'), `${topic}\n`);
}
