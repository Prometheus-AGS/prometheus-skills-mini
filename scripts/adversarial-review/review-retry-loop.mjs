#!/usr/bin/env node
// Port of adversarial-review/scripts/review-retry-loop.sh (prometheus-skill-pack, 129 lines).
//
// Usage:
//   node review-retry-loop.mjs state      --findings <json> --round <n>
//   node review-retry-loop.mjs unresolved --findings <json> --round <n> [--out <md>]
//
// Exit codes: 0 PROCEED · 3 RETRY · 4 CAPPED · 1 usage.
//
// This file holds no logic of its own — see lib/review/retry-loop.mjs.

import { readFileSync, realpathSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { evaluateRetryState, renderUnresolvedSection } from '../../lib/review/retry-loop.mjs';

function parseArgs(argv) {
  const cmd = argv[0];
  const args = { findings: '', round: '', out: '' };
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === '--findings') args.findings = argv[++i];
    else if (argv[i] === '--round') args.round = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new Error(`usage: review-retry-loop.mjs state|unresolved --findings <json> --round <n> [--out <md>]`);
  }
  if (cmd !== 'state' && cmd !== 'unresolved') {
    throw new Error('usage: review-retry-loop.mjs state|unresolved ...');
  }
  if (!args.findings) throw new Error('--findings is required');
  if (!/^[0-9]+$/.test(args.round)) throw new Error('--round must be a number');
  return { cmd, ...args, round: Number(args.round) };
}

function readFindings(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function run(argv) {
  const { cmd, findings: findingsPath, round, out } = parseArgs(argv);
  const findings = readFindings(findingsPath);

  if (cmd === 'state') {
    const { state, criticalCount, maxRounds } = evaluateRetryState(findings, round, {});
    process.stdout.write(`${state}\n`);
    if (state === 'RETRY') {
      process.stderr.write(`[retry] ${criticalCount} CRITICAL finding(s) after round ${round} of ${maxRounds} — fix and re-review.\n`);
      return 3;
    }
    if (state === 'CAPPED') {
      process.stderr.write(`[retry] ${criticalCount} CRITICAL finding(s) still present at the ${maxRounds}-round cap.\n`);
      process.stderr.write('[retry] The artifact is NOT clean. Append the Unresolved section and say so.\n');
      return 4;
    }
    return 0;
  }

  // unresolved
  if (!findings) throw new Error(`could not read findings from ${findingsPath}`);
  const { maxRounds } = evaluateRetryState(findings, round, {});
  const section = renderUnresolvedSection(findings, round, maxRounds);
  if (out) {
    mkdirSync(path.dirname(out), { recursive: true });
    appendFileSync(out, `\n${section}\n`);
    process.stderr.write(`[retry] appended Unresolved review findings to ${out}\n`);
  } else {
    process.stdout.write(`${section}\n`);
  }
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
    process.stderr.write(`[retry] ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
