#!/usr/bin/env node
// Port of adversarial-review/scripts/commit-before-reveal.sh (prometheus-skill-pack, 140 lines).
//
// Usage:
//   node commit-before-reveal.mjs record --session <dir> --judgement <file|-> [--confidence N]
//   node commit-before-reveal.mjs check  --session <dir>
//
// Exit: 0 recorded/PASS · 1 usage · 2 REFUSED.
//
// This file holds no logic of its own — see lib/review/commit-gate.mjs.

import { readFileSync, fstatSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recordJudgement, checkJudgementRecorded } from '../../lib/review/commit-gate.mjs';

function parseArgs(argv) {
  const cmd = argv[0];
  const args = { session: '', judgement: '', confidence: '' };
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === '--session') args.session = argv[++i];
    else if (argv[i] === '--judgement') args.judgement = argv[++i];
    else if (argv[i] === '--confidence') args.confidence = argv[++i];
    else throw new Error('usage: commit-before-reveal.mjs record|check --session <dir> [--judgement <file|->] [--confidence N]');
  }
  if (cmd !== 'record' && cmd !== 'check') throw new Error('usage: commit-before-reveal.mjs record|check ...');
  if (!args.session) throw new Error('--session is required');
  return { cmd, ...args };
}

function readJudgementText(spec) {
  if (spec === '-') {
    const stat = fstatSync(0);
    if (!stat.isFIFO() && !stat.isFile()) throw new Error('--judgement - requires piped or redirected stdin, not a terminal');
    return readFileSync(0, 'utf8');
  }
  return readFileSync(spec, 'utf8');
}

function run(argv) {
  const { cmd, session, judgement, confidence } = parseArgs(argv);

  if (cmd === 'record') {
    if (!judgement) throw new Error('--judgement <file|-> is required');
    const text = readJudgementText(judgement);
    let confNum;
    if (confidence !== '') {
      if (!/^[0-9]+$/.test(confidence)) throw new Error('--confidence must be an integer 0-100');
      confNum = Number(confidence);
      if (confNum > 100) throw new Error('--confidence must be 0-100');
    }
    const result = recordJudgement(session, text, { confidence: confNum });
    if (!result.accepted) {
      process.stderr.write(
        '[commit-gate] REFUSED: the recorded judgement is empty or too short to be one.\n' +
          '[commit-gate]   State what you currently believe and why, before seeing the\n' +
          '[commit-gate]   analysis. A placeholder satisfies the gate while defeating it.\n',
      );
      return 2;
    }
    process.stderr.write('[commit-gate] recorded — analysis may now be revealed.\n');
    return 0;
  }

  // check
  const result = checkJudgementRecorded(session);
  if (!result.accepted) {
    if (result.reason === 'no-record') {
      process.stderr.write(
        '[commit-gate] REFUSED: no user judgement recorded for this session.\n' +
          '[commit-gate]   Analysis is withheld until you commit your own view first.\n' +
          '[commit-gate]   Seeing the answer first replaces your judgement with agreement:\n' +
          '[commit-gate]   confidence in AI predicts whether users scrutinise it at all.\n' +
          `[commit-gate]   Record it:  commit-before-reveal.mjs record --session ${session} --judgement -\n`,
      );
    } else {
      process.stderr.write(
        '[commit-gate] REFUSED: the judgement record is missing, malformed, or too short.\n' +
          '[commit-gate]   A record that cannot be read is not a recorded judgement.\n',
      );
    }
    return 2;
  }
  process.stderr.write('[commit-gate] PASS: a prior judgement is on record — reveal permitted.\n');
  return 0;
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`[commit-gate] ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
