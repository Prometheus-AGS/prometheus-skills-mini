// Port of assert-independent-dispatch.sh (prometheus-skill-pack, 126 lines).
//
// Entry point only: parse argv, call lib/ideation/independence.mjs, print the same
// [independence] prefixed lines the source printed on stderr. No logic here.
//
// Usage:
//   node scripts/assert-independent-dispatch.mjs --session <dir> [--min-sets N]
//
// Exit: 0 independence holds · 1 usage/environment error · 2 NOT independent

import { assertIndependentDispatch } from '../lib/ideation/independence.mjs';

const DEFAULT_MIN_SETS = 3;

function parseArgs(argv) {
  const opts = { session: '', minSets: String(DEFAULT_MIN_SETS) };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1] ?? '';
    switch (flag) {
      case '--session': opts.session = value; break;
      case '--min-sets': opts.minSets = value; break;
      default:
        throw new Error(usage());
    }
  }
  return opts;
}

function usage() {
  return 'usage: node scripts/assert-independent-dispatch.mjs --session <dir> [--min-sets N]';
}

function die(message, code = 1) {
  process.stderr.write(`[independence] ERROR: ${message}\n`);
  process.exit(code);
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch {
    die(usage());
    return;
  }

  if (!opts.session) die('--session is required');
  if (!/^\d+$/.test(opts.minSets)) die('--min-sets must be a number');
  const minSets = Number(opts.minSets);

  let result;
  try {
    result = assertIndependentDispatch({ session: opts.session, minSets });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
    return;
  }

  if (result.setCount >= minSets) {
    process.stderr.write(`[independence] ok: ${result.setCount} independent sets recorded\n`);
  }

  if (result.pass) {
    process.stderr.write('[independence] ok: no cross-contamination, all sets on-topic, outputs distinct\n');
    process.stderr.write('[independence] PASS: candidate sets were generated independently.\n');
    process.exit(0);
    return;
  }

  for (const problem of result.problems) {
    process.stderr.write(`[independence] FAIL: ${problem}\n`);
  }
  process.stderr.write('[independence] REJECTED: independence is not established, so pooling these\n');
  process.stderr.write('[independence]   sets would present correlated output as diverse.\n');
  process.exit(2);
}

main(process.argv.slice(2));
