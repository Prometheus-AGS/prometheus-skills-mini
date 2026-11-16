// kbd-spec-delta-digest.mjs — print the SHA-256 over a phase's OpenSpec change deltas (VLBV
// CR-04). Port of shared/scripts/kbd-spec-delta-digest.sh. Authors stamp the value into the v2
// contract as method.specDeltaDigest before adoption; kbd-phase-readiness-check.mjs recomputes it
// and returns REJECT-STALE when a bound requirement was edited.
//
// Usage:
//   node "<package-root>/scripts/kbd-spec-delta-digest.mjs" --phase <id> [--root <repo>] [--status-file <f>]
//
// Exit codes: 0 digest printed; 1 usage; 2 canonical status unavailable; 3 no OpenSpec deltas.

import path from 'node:path';
import { findKbdRoot, readCanonicalStatus } from '../lib/kbd/contract-adopt.mjs';
import { specDeltaDigest } from '../lib/kbd/spec-delta-digest.mjs';

function parseArgs(argv) {
  const args = { phase: null, root: null, statusFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--phase') args.phase = argv[++i] ?? null;
    else if (arg === '--root') args.root = argv[++i] ?? null;
    else if (arg === '--status-file') args.statusFile = argv[++i] ?? null;
    else return { error: `unknown argument ${arg}` };
  }
  return args.phase ? { args } : { error: 'usage: kbd-spec-delta-digest.mjs --phase <id> [--root <repo>] [--status-file <f>]' };
}

const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  process.stderr.write(`kbd-spec-delta-digest: ${parsed.error}\n`);
  process.exit(1);
}
const { args } = parsed;
const root = path.resolve(args.root ?? findKbdRoot(process.cwd()) ?? process.cwd());
const status = readCanonicalStatus({ root, statusFile: args.statusFile });
if (status.status !== 0) {
  process.stderr.write(`kbd-spec-delta-digest: ${status.stderr}\n`);
  process.exit(2);
}
const digest = specDeltaDigest({ root, phase: args.phase, status: status.json });
if (!digest) process.exit(3);
process.stdout.write(`${digest}\n`);
