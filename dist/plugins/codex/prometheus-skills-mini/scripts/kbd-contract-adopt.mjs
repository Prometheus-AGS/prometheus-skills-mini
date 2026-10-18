#!/usr/bin/env node
// kbd-contract-adopt.mjs — adopt a phase's completion contract through the existing canonical
// writer (prometheus kbd decision record). Canonical writer only: never hand-writes journals,
// waypoints, or signatures. Port of shared/scripts/kbd-contract-adopt.sh (mini #60).
//
// Usage:
//   node scripts/kbd-contract-adopt.mjs <contract.json> [--supersedes <decision-id>]
//       [--command-id <id>] [--status-file <f>] [--decision-sink <f>]
//
// Exit codes: 0 adopted/already-adopted; 1 usage/io; 2 invalid contract;
//             3 identity mismatch; 4 amendment without --supersedes.

import { adoptContract } from '../lib/kbd/contract-adopt.mjs';

function parseArgs(argv) {
  const args = { contract: null, supersedes: null, commandId: null, statusFile: null, decisionSink: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--supersedes') args.supersedes = argv[++i] ?? null;
    else if (arg === '--command-id') args.commandId = argv[++i] ?? null;
    else if (arg === '--status-file') args.statusFile = argv[++i] ?? null;
    else if (arg === '--decision-sink') args.decisionSink = argv[++i] ?? null;
    else if (arg === '-h' || arg === '--help') {
      process.stdout.write('usage: node scripts/kbd-contract-adopt.mjs <contract.json> [--supersedes <id>] [--command-id <id>] [--status-file <f>] [--decision-sink <f>]\n');
      process.exit(0);
    } else if (arg.startsWith('-')) {
      process.stderr.write(`kbd-contract-adopt: unknown flag: ${arg}\n`);
      process.exit(1);
    } else if (args.contract === null) args.contract = arg;
    else {
      process.stderr.write(`kbd-contract-adopt: unexpected argument: ${arg}\n`);
      process.exit(1);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.contract) {
  process.stderr.write('usage: node scripts/kbd-contract-adopt.mjs <contract.json> [--supersedes <id>]\n');
  process.exit(1);
}

const result = adoptContract(args.contract, {
  supersedes: args.supersedes,
  commandId: args.commandId,
  statusFile: args.statusFile,
  decisionSink: args.decisionSink,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status);
