// Entry point only: parse arguments, call lib/refiner, print, exit.
// This is what the carried agents/artifact-validator.md invokes in place of the
// two python3 heredocs it shipped with, and what the KBD QA gate calls as
// /refine-validate.
import { validateManifest, validateConstraints } from '../lib/refiner/validate.mjs';
import { readText } from '../lib/platform/text.mjs';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const loadSchema = (rel) => {
  const file = path.join(root, rel);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
};

const results = [
  ['manifest', validateManifest({ root, schema: loadSchema('references/schemas/artifact-manifest.schema.json') })],
  ['constraints', validateConstraints({ root, schema: loadSchema('references/schemas/constraints.schema.json') })],
];

let failed = false;
for (const [label, result] of results) {
  if (result.status === 'skipped') {
    process.stdout.write(`SKIP: ${label} — ${result.reason}\n`);
    continue;
  }
  for (const warning of result.warnings) process.stdout.write(`WARN: ${label}: ${warning}\n`);
  if (result.ok) {
    process.stdout.write(`PASS: ${label}\n`);
  } else {
    failed = true;
    for (const error of result.errors) process.stderr.write(`FAIL: ${label}: ${error}\n`);
  }
}

process.exitCode = failed ? 2 : 0;
