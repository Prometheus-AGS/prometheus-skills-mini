// Entry point only: parse argv, discover (and optionally write) the derived method-context
// index, print, exit. All logic lives in lib/kbd/method-context/.
//
//   node <pack-root>/scripts/kbd-method-context.mjs [--project <root>] [--phase <id>] [--write] [--json] [--require-resolved]

import { runMethodContext } from '../lib/kbd/method-context/index.mjs';

const result = runMethodContext(process.argv.slice(2));
for (const line of result.out) process.stdout.write(`${line}\n`);
for (const line of result.err) process.stderr.write(`${line}\n`);
process.exitCode = result.exitCode;
