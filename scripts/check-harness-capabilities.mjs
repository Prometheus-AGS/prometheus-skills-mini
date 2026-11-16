// Evidence gate for config/harnesses/capabilities.json (VLBV CR-23, R4 T5).
//
//   node scripts/check-harness-capabilities.mjs                       check the committed profiles
//   node scripts/check-harness-capabilities.mjs --capabilities <file> check another file (e.g. a
//                                                                     candidate written by
//                                                                     evals/vlbv-protocol/apply-capabilities.mjs)
//
// Exit 0 when every "supported" field is evidenced, 1 on a failure, 2 on a usage error.
// Entry points parse arguments, call lib/, print and exit. No logic lives here.

import path from 'node:path';
import { loadCapabilities, PACK_ROOT } from '../lib/platform/harness-profiles/profiles.mjs';
import { checkProfileEvidence } from '../lib/platform/harness-profiles/evidence-gate.mjs';

function parseArgs(argv) {
  const args = { capabilities: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--capabilities') {
      const value = argv[++index];
      if (!value) throw new Error('--capabilities requires a file');
      args.capabilities = path.resolve(value);
    } else throw new Error(`unknown argument: ${argv[index]}`);
  }
  return args;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const capabilities = loadCapabilities(args.capabilities);
  const { failures, supported } = checkProfileEvidence(capabilities, PACK_ROOT);
  const label = path.relative(PACK_ROOT, capabilities.file).split(path.sep).join('/');
  if (failures.length) {
    for (const failure of failures) console.error(`check-harness-capabilities: ✗ ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`check-harness-capabilities: ✓ ${label} — ${supported.length} supported field(s), each evidenced`);
  }
} catch (error) {
  console.error(`check-harness-capabilities: ${error.message}`);
  process.exitCode = 2;
}
