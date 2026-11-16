// kbd-closure-packet.mjs — (re)generate the derived closure view for a KBD value phase (VLBV
// CR-21): closure.json + closure-packet.md. kbd-phase-close-eval.mjs writes it for every
// outcome; run this only to regenerate it after a reported failure. It never changes the
// canonical disposition. Port of shared/scripts/kbd-closure-packet.mjs.
//
// Usage:
//   node "<package-root>/scripts/kbd-closure-packet.mjs" --snapshot <contract.json>
//       --evidence <boundary-results.json> --out-dir <phase-dir>
//       --disposition <CLOSED|REFUSED_BLOCKED|REFUSED_FAIL> [--reason <text>] [--project-root <dir>]
//
// Exit codes: 0 written; 1 usage or write failure.

import path from 'node:path';
import { findKbdRoot } from '../lib/kbd/contract-adopt.mjs';
import { writeClosurePacket } from '../lib/kbd/closure-packet/index.mjs';

const VALUE_FLAGS = {
  '--snapshot': 'snapshotPath', '--evidence': 'evidencePath', '--out-dir': 'phaseDir',
  '--disposition': 'disposition', '--reason': 'reason', '--project-root': 'projectRoot',
};

const args = { disposition: 'UNKNOWN', reason: '' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = VALUE_FLAGS[argv[i]];
  if (!key || argv[i + 1] === undefined) {
    process.stderr.write(`kbd-closure-packet: unknown or incomplete argument ${argv[i]}\n`);
    process.exit(1);
  }
  args[key] = argv[++i];
}
if (!args.phaseDir) {
  process.stderr.write('kbd-closure-packet: --out-dir is required\n');
  process.exit(1);
}
const phaseDir = path.resolve(args.phaseDir);
try {
  writeClosurePacket({
    ...args,
    phaseDir,
    projectRoot: path.resolve(args.projectRoot ?? findKbdRoot(phaseDir) ?? process.cwd()),
  });
  process.stdout.write(`closure-packet: wrote ${path.join(phaseDir, 'closure-packet.md')}\n`);
} catch (error) {
  process.stderr.write(`kbd-closure-packet: ${error.message}\n`);
  process.exit(1);
}
