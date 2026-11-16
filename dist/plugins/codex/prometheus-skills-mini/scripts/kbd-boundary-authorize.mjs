// kbd-boundary-authorize.mjs — record the owner's boundary authorization event for a KBD value
// phase (VLBV CR-33), once, before the first B4 attempt (or a B5 repair). Port of
// shared/scripts/kbd-boundary-authorize.mjs.
//
// Usage:
//   node "<package-root>/scripts/kbd-boundary-authorize.mjs" --phase <id> --authorizer <who>
//       [--boundary B4|B5] [--reason <text>] [--project <dir>] [--disposition-file <f>]
//
// --disposition-file substitutes a fixture for `prometheus kbd phase disposition --json`
// (disclosed scratch-isolation seam, as in the other KBD entry points).
//
// Exit codes: 0 recorded or ALREADY-AUTHORIZED; 1 usage/io; 2 phase not bound; 3 ordering violated.

import { authorizeBoundary } from '../lib/kbd/boundary-authorize.mjs';

const VALUE_FLAGS = {
  '--phase': 'phase', '--authorizer': 'authorizer', '--boundary': 'boundary',
  '--reason': 'reason', '--project': 'project', '--disposition-file': 'dispositionFile',
};

const options = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = VALUE_FLAGS[argv[i]];
  if (!key || argv[i + 1] === undefined) {
    process.stderr.write(`kbd-boundary-authorize: unknown or incomplete argument ${argv[i]}\n`);
    process.exit(1);
  }
  options[key] = argv[++i];
}
const result = authorizeBoundary(options);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status);
