// Validate this pack's skills.
//
//   node scripts/validate-skills.mjs [--strict] [--json] [<skill-dir> ...]
//
// With no directory, every skill under skills/ is checked. Exit 0 when there is
// no error, 1 when there is one, 64 on a bad argument. The rules live in
// lib/skills/validate.mjs; this file only reads arguments and prints.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { skillDirectories, validateSkills } from '../lib/skills/validate.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const flags = new Set(argv.filter(argument => argument.startsWith('--')));
const targets = argv.filter(argument => !argument.startsWith('--'));

for (const flag of flags) {
  if (flag !== '--strict' && flag !== '--json') {
    console.error(`validate-skills: unknown option ${flag}`);
    process.exit(64);
  }
}

const directories = targets.length
  ? targets.map(target => path.resolve(target))
  : skillDirectories(path.join(repoRoot, 'skills'));

for (const directory of directories) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    console.error(`validate-skills: not a directory: ${directory}`);
    process.exit(64);
  }
}

const report = validateSkills(directories, { strict: flags.has('--strict') });

if (flags.has('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const { skill, issues } of report.results) {
    for (const entry of issues) console.log(`${entry.severity === 'error' ? 'ERROR' : 'warn '} ${skill}: ${entry.message}`);
  }
  console.log(`${report.skills} skills, ${report.errors} errors, ${report.warnings} warnings${flags.has('--strict') ? ' (strict)' : ''}`);
}

process.exit(report.errors === 0 ? 0 : 1);
