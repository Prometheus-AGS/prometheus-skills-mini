#!/usr/bin/env node
// Port of adversarial-review/scripts/decision-log.sh (prometheus-skill-pack, 236 lines).
//
// Usage:
//   node decision-log.mjs record  --decision <file> [--wiki <dir>] [--id <slug>]
//   node decision-log.mjs outcome --id <slug> --result <text|-> [--wiki <dir>]
//   node decision-log.mjs revisit --topic <text> [--wiki <dir>]
//
// Exit: 0 ok · 1 usage · 2 refused.
//
// This file holds no logic of its own — see lib/review/decision-log.mjs.

import { existsSync, readFileSync, fstatSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { homeDir } from '../../lib/platform/paths.mjs';
import { recordDecision, recordOutcome, revisitDecisions } from '../../lib/review/decision-log.mjs';

function parseArgs(argv) {
  const cmd = argv[0];
  const args = { decision: '', wiki: '', id: '', result: '', topic: '' };
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === '--decision') args.decision = argv[++i];
    else if (argv[i] === '--wiki') args.wiki = argv[++i];
    else if (argv[i] === '--id') args.id = argv[++i];
    else if (argv[i] === '--result') args.result = argv[++i];
    else if (argv[i] === '--topic') args.topic = argv[++i];
    else throw new Error('usage: decision-log.mjs record|outcome|revisit ...');
  }
  if (!['record', 'outcome', 'revisit'].includes(cmd)) throw new Error('usage: decision-log.mjs record|outcome|revisit ...');
  return { cmd, ...args };
}

function defaultWiki() {
  const projectWiki = path.join('.prometheus', 'knowledge', 'wiki');
  if (existsSync(projectWiki)) return projectWiki;
  const sharedWiki = path.join(homeDir(), '.prometheus', 'knowledge', 'shared', 'wiki');
  if (existsSync(sharedWiki)) return sharedWiki;
  return '';
}

function readResultText(spec) {
  if (spec === '-') {
    const stat = fstatSync(0);
    if (!stat.isFIFO() && !stat.isFile()) throw new Error('--result - requires piped or redirected stdin, not a terminal');
    return readFileSync(0, 'utf8');
  }
  return spec;
}

function run(argv) {
  const { cmd, decision, wiki: wikiArg, id, result, topic } = parseArgs(argv);
  const wiki = wikiArg || defaultWiki();
  if (!wiki) throw new Error('no wiki directory found; pass --wiki');

  if (cmd === 'record') {
    if (!decision) throw new Error('--decision <file> is required');
    if (!existsSync(decision)) throw new Error(`decision file not found: ${decision}`);
    const rec = recordDecision({ decisionFile: decision, wiki, id: id || undefined });
    if (!rec.accepted) {
      process.stderr.write(
        `[decision-log] REFUSED: a decision entry already exists: ${rec.entryPath}\n` +
          '[decision-log]   Re-recording would duplicate it. To record what happened,\n' +
          `[decision-log]   use:  decision-log.mjs outcome --id ${rec.id} --result -\n`,
      );
      return 2;
    }
    process.stderr.write(`[decision-log] recorded ${rec.entryPath} (outcome_status: pending)\n`);
    return 0;
  }

  if (cmd === 'outcome') {
    if (!id) throw new Error('--id is required');
    if (!result) throw new Error('--result <text|-> is required');
    const text = readResultText(result);
    const rec = recordOutcome({ id, result: text, wiki });
    if (!rec.accepted) {
      if (rec.reason === 'no-decision') {
        process.stderr.write(
          `[decision-log] REFUSED: no decision entry with id '${id}' in ${wiki}.\n` +
            '[decision-log]   An outcome with no decision to attach to is not a record.\n',
        );
      } else {
        process.stderr.write('[decision-log] REFUSED: the outcome text is empty or too short.\n');
      }
      return 2;
    }
    process.stderr.write(`[decision-log] outcome recorded for ${id}\n`);
    return 0;
  }

  // revisit
  if (!topic) throw new Error('--topic is required');
  const rows = revisitDecisions({ topic, wiki });
  if (!rows.length) {
    process.stdout.write(`No prior decisions found for: ${topic}\n`);
    return 0;
  }
  process.stdout.write(`Prior decisions on '${topic}':\n\n`);
  for (const r of rows) {
    process.stdout.write(`- ${r.title}  [${r.status}]  decided ${r.decidedAt}\n`);
    process.stdout.write(`  id: ${r.id}\n`);
    if (r.outcome) {
      process.stdout.write(`  outcome: ${r.outcome.split(/\s+/).join(' ').slice(0, 300)}\n`);
    } else {
      process.stdout.write('  outcome: PENDING — this decision has never been checked against reality.\n');
    }
    process.stdout.write('\n');
  }
  return 0;
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`[decision-log] ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
