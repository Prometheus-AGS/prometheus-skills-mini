#!/usr/bin/env node
// Generates the Claude and Codex plugin packages plus both marketplace.json files from
// skill-system.json. Usage:
//   node scripts/generate-skill-system-distribution.mjs           (writes dist/ and the marketplaces)
//   node scripts/generate-skill-system-distribution.mjs --check   (verifies, exits non-zero on drift)

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkillSystem } from '../lib/distribution/skill-system.mjs';
import { generateDistribution } from '../lib/distribution/package-builder.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

try {
  const contract = readSkillSystem(sourceRoot);
  const { skills, drift } = generateDistribution(sourceRoot, contract, { check });
  if (check) {
    if (drift.length > 0) {
      console.error(`Generated output is stale:\n${drift.map((entry) => `  - ${entry}`).join('\n')}`);
      process.exitCode = 1;
    } else {
      console.log(`OK: ${skills.length} skill(s), no drift.`);
    }
  } else {
    console.log(`Generated ${skills.length} skill(s) for Claude and Codex.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
