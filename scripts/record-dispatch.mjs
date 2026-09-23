// Port of record-dispatch.sh (prometheus-skill-pack, 96 lines).
//
// Entry point only: parse argv, call lib/ideation/dispatch.mjs. No logic here.
//
// Usage:
//   node scripts/record-dispatch.mjs --session <dir> --set <n> --topic <text> [--input <file>]
//   node scripts/record-dispatch.mjs --session <dir> --set <n> --topic <text> --output <file>
//
// Exit: 0 ok · 1 usage · 2 the recorded input would break independence

import { recordInput, recordOutput } from '../lib/ideation/dispatch.mjs';

function parseArgs(argv) {
  const opts = { session: '', set: '', topic: '', input: '', output: '' };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1] ?? '';
    switch (flag) {
      case '--session': opts.session = value; break;
      case '--set': opts.set = value; break;
      case '--topic': opts.topic = value; break;
      case '--input': opts.input = value; break;
      case '--output': opts.output = value; break;
      default:
        throw Object.assign(new Error(usage()), { usage: true });
    }
  }
  return opts;
}

function usage() {
  return 'usage: node scripts/record-dispatch.mjs --session <dir> --set <n> --topic <text> ' +
    '[--input <file>] [--output <file>]';
}

function die(message, code = 1) {
  process.stderr.write(`[dispatch] ERROR: ${message}\n`);
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
  if (!opts.set) die('--set is required');
  if (!opts.topic) die('--topic is required');
  if (!/^\d+$/.test(opts.set)) die('--set must be a number');

  if (opts.output) {
    try {
      recordOutput({ session: opts.session, set: opts.set, outputFile: opts.output });
    } catch (error) {
      die(error.message);
      return;
    }
    process.stderr.write(`[dispatch] recorded output for set ${opts.set}\n`);
    process.exit(0);
    return;
  }

  try {
    recordInput({ session: opts.session, set: opts.set, topic: opts.topic, inputFile: opts.input || undefined });
  } catch (error) {
    if (error.message.startsWith('[dispatch] REFUSED')) {
      process.stderr.write(`${error.message}\n`);
      process.exit(2);
      return;
    }
    die(error.message);
    return;
  }
  process.stderr.write(`[dispatch] recorded independent input for set ${opts.set}\n`);
  process.exit(0);
}

main(process.argv.slice(2));
