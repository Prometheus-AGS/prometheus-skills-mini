#!/usr/bin/env node
// kbd-phase-readiness-check.mjs — deterministic Plan→Execute readiness gate (mini #60).
// Read-only against canonical state; never writes success evidence, never fabricates PASS.
// Port of shared/scripts/kbd-phase-readiness-check.sh.
//
// Usage:
//   node scripts/kbd-phase-readiness-check.mjs --phase <phase-id>
//       [--phase-dir <dir>]      fixture override (scratch trees)
//       [--status-file <f>]      fixture override for `prometheus kbd status --json`
//       [--contract <f>]         fixture override for the contract path
//
// Exit codes: 0 READY; 1 usage/io; 2 BLOCKED (minimal missing list on stdout);
//             3 REJECT-IDENTITY; 4 REJECT-STALE; 5 contract malformed.

import { phaseReadiness } from '../lib/kbd/phase-readiness.mjs';

function parseArgs(argv) {
  const args = { phase: null, phaseDir: null, statusFile: null, contractPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--phase') args.phase = argv[++i] ?? null;
    else if (arg === '--phase-dir') args.phaseDir = argv[++i] ?? null;
    else if (arg === '--status-file') args.statusFile = argv[++i] ?? null;
    else if (arg === '--contract') args.contractPath = argv[++i] ?? null;
    else if (arg === '-h' || arg === '--help') {
      process.stdout.write('usage: node scripts/kbd-phase-readiness-check.mjs --phase <id> [--phase-dir <dir>] [--status-file <f>] [--contract <f>]\n');
      process.exit(0);
    } else {
      process.stderr.write(`kbd-phase-readiness-check: unknown argument ${arg}\n`);
      process.exit(1);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const result = phaseReadiness(args);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status);
