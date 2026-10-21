#!/usr/bin/env node
// kbd-phase-close-eval.mjs — terminal evaluator at the phase close/continue boundary
// (mini #59/#60; port of shared/scripts/kbd-phase-close-eval.sh, amendment v4).
//
// Consumes the phase's adopted scenario RESULTS evidence (boundary-results.json) — never task
// counters, implementationComplete, or READY — and records a truthful canonical disposition
// through the typed canonical writer (`prometheus kbd phase close`). Refusals never mark
// success, never close, never create tasks or successor phases (mini #66 / full #192).
//
// Usage:
//   node scripts/kbd-phase-close-eval.mjs --phase <id>
//       [--evidence-file <f>]   default <phase-dir>/boundary-results.json
//       [--status-file <f>]     fixture override for `prometheus kbd status --json`
//       [--disposition-file <f>] fixture for `prometheus kbd phase disposition --json`
//       [--decision-sink <f>]   append the disposition that would be recorded to a file
//                               instead of the canonical writer (scratch isolation; disclosed seam)
//
// Exit codes: 0 closed/already-closed; 1 usage/io; 2 BLOCKED refusal; 3 FAIL refusal;
//             5 canonical writer failed (nothing claimed); 6 closed under a different identity.

import { phaseCloseEval } from '../lib/kbd/phase-close-eval.mjs';

function parseArgs(argv) {
  const args = { phase: null, evidenceFile: null, statusFile: null, dispositionFile: null, decisionSink: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--phase') args.phase = argv[++i] ?? null;
    else if (arg === '--evidence-file') args.evidenceFile = argv[++i] ?? null;
    else if (arg === '--status-file') args.statusFile = argv[++i] ?? null;
    else if (arg === '--disposition-file') args.dispositionFile = argv[++i] ?? null;
    else if (arg === '--decision-sink') args.decisionSink = argv[++i] ?? null;
    else if (arg === '-h' || arg === '--help') {
      process.stdout.write('usage: node scripts/kbd-phase-close-eval.mjs --phase <id> [--evidence-file <f>] [--status-file <f>] [--disposition-file <f>] [--decision-sink <f>]\n');
      process.exit(0);
    } else {
      process.stderr.write(`kbd-phase-close-eval: unknown argument ${arg}\n`);
      process.exit(1);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const result = phaseCloseEval(args.phase, args);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status);
