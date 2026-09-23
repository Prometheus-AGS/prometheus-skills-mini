import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runContextBootstrap } from '../lib/context-bootstrap/bootstrap.mjs';

const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const options = { projectRoot: '.', packRoot: PACK_ROOT, stacks: [], check: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--path') {
      options.projectRoot = argv[++index];
      if (!options.projectRoot) throw new Error('--path requires a directory');
    } else if (arg === '--stacks') {
      const value = argv[++index];
      if (!value) throw new Error('--stacks requires a comma-separated value');
      options.stacks = value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    else if (arg === '--check') options.check = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (options.check && options.dryRun) throw new Error('--check and --dry-run are mutually exclusive');
  return options;
}

function usage() {
  console.log('Usage: node scripts/prometheus-context-bootstrap.mjs [--path <project>] [--stacks rust,typescript] [--dry-run|--check]');
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
  } else {
    const result = runContextBootstrap(options);
    for (const item of result.plan) console.log(`${item.kind.padEnd(9)} ${item.path}`);
    if (options.check && result.drift.length) {
      console.error(`Context drift: ${result.drift.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log(`${options.check ? 'Verified' : options.dryRun ? 'Planned' : 'Completed'} prometheus-context-bootstrap — ${result.root} (${result.stacks.join(', ') || 'no stacks'}; ${result.changed} change(s))`);
    }
  }
} catch (error) {
  console.error(`prometheus-context-bootstrap: ${error.message}`);
  process.exitCode = 2;
}
