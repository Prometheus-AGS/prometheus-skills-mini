// generate-contract-templates.mjs — derive the contract field lists in the KBD authoring
// templates from the adopted-contract v2 schema (VLBV CR-20), so the templates and the schema
// cannot disagree about which fields exist. Port of the full pack's
// scripts/generate-contract-templates.mjs (1.15.0).
//
//   node scripts/generate-contract-templates.mjs           rewrite the generated blocks
//   node scripts/generate-contract-templates.mjs --check   exit 1 if a block is stale
//
// The generated block is written with LF; templates read with CRLF are compared after
// normalizing line endings, so a Windows checkout does not report a false drift.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refs = path.join(root, 'skills', 'kbd-process-orchestrator', 'references');
const TEMPLATES = [
  path.join('templates', 'acceptance.template.md'),
  path.join('templates', 'adopted-contract.template.md'),
];
const BLOCK = /<!-- generated:contract-fields:start[\s\S]*?<!-- generated:contract-fields:end -->/;

const describe = (props, key) => (props[key]?.description ?? '').replace(/\s+/g, ' ').replace(/\|/g, '/');

function shape(value) {
  if (value?.type === 'object') return `object (${(value.required ?? []).join(', ')})`;
  if (value?.type === 'array') return 'array';
  if (value?.const !== undefined) return `\`${JSON.stringify(value.const)}\``;
  return value?.type ?? (value?.enum ? value.enum.join(' / ') : 'any');
}

/** The generated Markdown block for `schema` (pure). */
export function contractFieldsBlock(schema) {
  const scenario = schema.properties.scenarioMatrix.items;
  const lines = [
    '<!-- generated:contract-fields:start — scripts/generate-contract-templates.mjs; do not edit by hand -->',
    `Scenario ID pattern: \`${scenario.properties.id.pattern}\` (for example \`SCN-AUTH-001\`).`,
    '',
    `Contract (v${schema.properties.contractVersion.const}) required top-level fields: ${schema.required.map((k) => `\`${k}\``).join(', ')}.`,
    '',
    '| Scenario field | Required | Shape | Meaning |',
    '|---|---|---|---|',
  ];
  for (const [key, value] of Object.entries(scenario.properties)) {
    const required = (scenario.required ?? []).includes(key) ? 'yes' : 'no';
    lines.push(`| \`${key}\` | ${required} | ${shape(value)} | ${describe(scenario.properties, key)} |`);
  }
  const kinds = schema.properties.boundaryPacket.properties.commands.items.properties.kind.enum;
  lines.push(
    '',
    `Status vocabulary: ${schema.properties.statusVocabulary.const.map((v) => `\`${v}\``).join(' / ')}.`,
    `Boundary packet command kinds: ${kinds.map((v) => `\`${v}\``).join(', ')}.`,
    '<!-- generated:contract-fields:end -->',
  );
  return lines.join('\n');
}

function main(argv) {
  const check = argv.includes('--check');
  const schema = JSON.parse(readFileSync(path.join(refs, 'schemas', 'adopted-contract.v2.schema.json'), 'utf8'));
  const generated = contractFieldsBlock(schema);
  let stale = 0;
  for (const name of TEMPLATES) {
    const file = path.join(refs, name);
    const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    if (!BLOCK.test(text)) {
      process.stderr.write(`${name}: missing generated:contract-fields block\n`);
      stale += 1;
      continue;
    }
    const next = text.replace(BLOCK, () => generated);
    if (next === text) continue;
    if (check) {
      process.stderr.write(`${name}: contract field list is stale; run node scripts/generate-contract-templates.mjs\n`);
      stale += 1;
    } else {
      atomicWrite(file, next);
    }
  }
  if (check && stale > 0) return 1;
  process.stdout.write(check
    ? 'contract templates: in sync with adopted-contract.v2.schema.json\n'
    : 'contract templates: regenerated\n');
  return 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exitCode = main(process.argv.slice(2));
