#!/usr/bin/env node
// Port of adversarial-review/scripts/validate-decision-artifact.sh (prometheus-skill-pack, 98 lines).
//
// Usage: node validate-decision-artifact.mjs --findings <findings.json>
// Exit: 0 accepted · 1 usage/unreadable · 2 REJECTED.
//
// This file holds no logic of its own — see lib/review/decision-validate.mjs.

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateDecisionArtifact } from '../../lib/review/decision-validate.mjs';

const MESSAGES = {
  'verified-distinct': () => '[decision-gate] PASS: judged by a model proven distinct from the producer.',
  'skip-not-decision': (mode) => `[decision-gate] SKIP: mode=${mode} is not 'decision' — no cross-model requirement applied.`,
  missing: () =>
    '[decision-gate] REJECTED: cross_model_check is absent.\n' +
    '[decision-gate]   A decision artifact must state whether the judge differed\n' +
    '[decision-gate]   from the producer. Silence is not evidence of separation.',
  'same-model-collision': () =>
    '[decision-gate] REJECTED: cross_model_check = same-model-collision.\n' +
    '[decision-gate]   The judge WAS the producer, so this review proves nothing\n' +
    '[decision-gate]   regardless of its verdict. Configure a second provider:\n' +
    '[decision-gate]     /liter-llm-bridge configure',
  'unverified-producer-unknown': () =>
    '[decision-gate] REJECTED: cross_model_check = unverified-producer-unknown.\n' +
    '[decision-gate]   The producer was not declared, so the judge != producer\n' +
    '[decision-gate]   comparison passed trivially. Export the real value:\n' +
    '[decision-gate]     export KBD_PRODUCER_MODEL="claude-opus-5"',
  unrecognised: () =>
    "[decision-gate] REJECTED: unrecognised cross_model_check value.\n" +
    '[decision-gate]   Refusing rather than guessing: an unknown value could be a\n' +
    '[decision-gate]   future state this gate does not yet understand.',
  'parse-error': (_mode, findingsPath) =>
    `[decision-gate] REJECTED: ${findingsPath} is not readable JSON object.\n` +
    '[decision-gate]   An unparseable review is not a passing review.',
};

function parseArgs(argv) {
  let findings = '';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--findings') findings = argv[++i];
    else throw new Error('usage: validate-decision-artifact.mjs --findings <findings.json>');
  }
  if (!findings) throw new Error('--findings is required');
  return findings;
}

function run(argv) {
  const findingsPath = parseArgs(argv);
  let doc;
  try {
    doc = JSON.parse(readFileSync(findingsPath, 'utf8'));
  } catch {
    doc = null;
  }

  const { accepted, reason } = validateDecisionArtifact(doc);
  process.stderr.write(`${MESSAGES[reason](doc?.mode, findingsPath)}\n`);
  return accepted ? 0 : 2;
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
    process.stderr.write(`[decision-gate] ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
