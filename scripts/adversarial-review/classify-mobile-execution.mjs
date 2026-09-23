#!/usr/bin/env node
// Port of adversarial-review/scripts/classify-mobile-execution.sh (prometheus-skill-pack, 196 lines).
//
// Usage: node classify-mobile-execution.mjs [--out <json>] [--check]
// Exit: 0 ok/check passed · 1 usage · 2 check FAILED.
//
// This file holds no logic of its own — see lib/review/mobile-classify.mjs.

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { atomicWrite } from '../../lib/platform/atomic-write.mjs';
import { classifyTree, checkDrift } from '../../lib/review/mobile-classify.mjs';

const DEFAULT_OUT = path.join('.kbd-orchestrator', 'phases', 'mobile-skill-portability', 'mobile-classification.json');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--check') args.check = true;
    else throw new Error('usage: classify-mobile-execution.mjs [--out <json>] [--check]');
  }
  return args;
}

function run(argv) {
  const { out, check } = parseArgs(argv);
  const root = process.cwd();
  const doc = classifyTree(root);

  if (check) {
    let previous = null;
    try {
      previous = JSON.parse(readFileSync(out, 'utf8'));
    } catch {
      previous = null;
    }
    const result = checkDrift(previous, doc);
    if (!result.ok) {
      process.stderr.write(`[classify] CHECK FAILED: ${JSON.stringify(result)}\n`);
      return 2;
    }
    process.stdout.write(`[classify] CHECK PASSED: ${doc.script_bearing} script-bearing skills, all classified, no drift\n`);
    return 0;
  }

  atomicWrite(out, JSON.stringify(doc, null, 2) + '\n');
  process.stdout.write(`[classify] wrote ${out}\n`);
  process.stdout.write(`  total skills:   ${doc.total_skills}\n`);
  process.stdout.write(`  manifest-only:  ${doc.manifest_only} (portable today)\n`);
  process.stdout.write(`  script-bearing: ${doc.script_bearing}\n`);
  for (const v of ['E0', 'E1', 'E2', 'R']) {
    process.stdout.write(`    ${v.padEnd(3)} ${doc.counts[v] ?? 0}\n`);
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
    process.stderr.write(`[classify] ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
