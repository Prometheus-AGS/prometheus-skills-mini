// Entry point only: parse argv, run the handoff in the current project, print, exit.
// All logic lives in lib/kbd/handoff/. Exit codes: 0 packet written (or dry run), 1 refused,
// 2 usage error.
//
//   node <pack-root>/scripts/kbd-handoff.mjs --to <harness> [--phase <name>] [--dry-run]

import { runHandoff } from '../lib/kbd/handoff/index.mjs';

const result = runHandoff(process.argv.slice(2));
for (const line of result.out) process.stdout.write(`${line}\n`);
for (const line of result.err) process.stderr.write(`${line}\n`);
process.exitCode = result.exitCode;
