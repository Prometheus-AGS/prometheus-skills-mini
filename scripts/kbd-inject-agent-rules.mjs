// Port of kbd-inject-agent-rules.sh (prometheus-skill-pack, 202 lines).
//
// Idempotently injects a fenced "Agent rules" (or "UI/UX routing") block into CLAUDE.md and/or
// AGENTS.md. Re-runnable: overwrites only the marked region, byte-preserves everything else.
//
// Judgment call: the source's marker splice is an `awk` state machine; this port does the same
// thing as a plain-text line-array splice (find the START_MARK/END_MARK indices, replace the
// slice between them). The source's --refresh probes each cache source URL with `curl`; this
// port uses the global `fetch` (Node >=22), matching this repo's "no curl" constitution and
// lib/kbd/memory-log.mjs's identical divergence. The source's --refresh also rewrites the cache
// file's "Last fetched:" line with `sed -i`; this port does the same via atomicWrite + a regex
// replace on the whole file text — no in-place stream editor.
//
// Judgment call: only the two REAL reference files (not the two source-file names that were
// legacy pre-pack fallbacks — `rules-cache.md`/`template.md`, byte-identical duplicates of
// `cache-agent-rules.md`/`template-agent-rules.md`) are ported per pack:
// `references/{cache,template}-agent-rules.md` and `references/{cache,template}-uiux-routing.md`.
// The mini has no legacy pre-pack installs to stay backward-compatible with, so the fallback
// lookup the source performs (`[[ -f "$TEMPLATE" ]] || TEMPLATE=... /template.md`) is dropped —
// this port resolves the pack's real file name directly.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_REFERENCES = path.join(HERE, '..', 'skills', 'kbd-inject-agent-rules', 'references');

function die(message) {
  process.stderr.write(`kbd-inject-agent-rules: ${message}\n`);
  process.exit(1);
}
function warn(message) {
  process.stderr.write(`kbd-inject-agent-rules: warn: ${message}\n`);
}

function parseArgs(argv) {
  const args = { target: 'both', path: '.', pack: 'agent-rules', refresh: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') args.target = argv[++i];
    else if (arg === '--path') args.path = argv[++i];
    else if (arg === '--pack') args.pack = argv[++i];
    else if (arg === '--refresh') args.refresh = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '-h' || arg === '--help') {
      process.stdout.write(
        'Usage: node scripts/kbd-inject-agent-rules.mjs [--target CLAUDE.md|AGENTS.md|both] ' +
          '[--path <root>] [--pack agent-rules|uiux-routing] [--refresh] [--dry-run]\n'
      );
      process.exit(0);
    } else die(`unknown flag: ${arg}`);
  }
  return args;
}

function resolvePack(pack, projectPath) {
  if (pack === 'agent-rules') {
    return {
      markerPrefix: 'agent-rules',
      templateFile: path.join(SKILL_REFERENCES, 'template-agent-rules.md'),
      cacheFile: path.join(SKILL_REFERENCES, 'cache-agent-rules.md'),
    };
  }
  if (pack === 'uiux-routing') {
    const projectRoster = path.join(projectPath, '.kbd-orchestrator', 'references', 'uiux-skill-roster.md');
    return {
      markerPrefix: 'uiux-routing',
      templateFile: path.join(SKILL_REFERENCES, 'template-uiux-routing.md'),
      cacheFile: existsSync(projectRoster) ? projectRoster : path.join(SKILL_REFERENCES, 'cache-uiux-routing.md'),
    };
  }
  die(`--pack must be agent-rules or uiux-routing (got: ${pack})`);
  return undefined;
}

async function refreshCache(cacheFile) {
  if (!existsSync(cacheFile)) return;
  const text = readFileSync(cacheFile, 'utf8');
  const lines = text.split('\n');
  for (const line of lines) {
    const urlMatch = line.match(/^- (https\S*)/);
    const anchorMatch = line.match(/anchor: `(.*)`/);
    if (!urlMatch || !anchorMatch) continue;
    const [, url] = urlMatch;
    const [, anchor] = anchorMatch;
    let body = '';
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      body = response.ok ? await response.text() : '';
    } catch {
      body = '';
    }
    if (!body) {
      warn(`refresh: ${url} unreachable; cache not updated for this source`);
      continue;
    }
    if (!body.includes(anchor)) {
      warn(`refresh: ${url} no longer contains anchor '${anchor}' — review the cache file`);
    }
  }
  const now = new Date().toISOString().slice(0, 10);
  const stamped = text.replace(/^Last fetched: .*$/m, `Last fetched: ${now}`);
  if (stamped !== text) atomicWrite(cacheFile, stamped);
}

function countOccurrences(text, marker) {
  if (!text) return 0;
  return text.split('\n').filter((line) => line === marker).length;
}

function spliceBlock(sourceText, startMark, endMark, block) {
  const lines = sourceText.split('\n');
  const startIndex = lines.indexOf(startMark);
  const endIndex = lines.indexOf(endMark, startIndex);
  const blockLines = block.split('\n');
  return [...lines.slice(0, startIndex), ...blockLines, ...lines.slice(endIndex + 1)].join('\n');
}

function appendBlock(sourceText, block) {
  let out = sourceText;
  if (out.length > 0 && !out.endsWith('\n')) out += '\n';
  if (out.length > 0) out += '\n';
  out += `${block}\n`;
  return out;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.target !== 'CLAUDE.md' && args.target !== 'AGENTS.md' && args.target !== 'both') {
    die(`--target must be CLAUDE.md, AGENTS.md, or both (got: ${args.target})`);
  }
  if (!existsSync(args.path)) die(`--path is not a directory: ${args.path}`);

  const { markerPrefix, templateFile, cacheFile } = resolvePack(args.pack, args.path);
  if (!existsSync(templateFile)) die(`template missing: ${templateFile}`);
  if (!existsSync(cacheFile)) die(`cache missing: ${cacheFile}`);

  const startMark = `<!-- ${markerPrefix}:start v1 -->`;
  const endMark = `<!-- ${markerPrefix}:end -->`;

  const targets =
    args.target === 'both'
      ? [path.join(args.path, 'CLAUDE.md'), path.join(args.path, 'AGENTS.md')]
      : [path.join(args.path, args.target)];

  if (args.refresh) await refreshCache(cacheFile);

  const newBlock = readFileSync(templateFile, 'utf8').replace(/\n$/, '');
  if (!newBlock.includes(startMark)) die('template missing start marker');
  if (!newBlock.includes(endMark)) die('template missing end marker');

  let updated = 0;
  let unchanged = 0;

  process.stdout.write(`Starting kbd-inject-agent-rules — pack=${args.pack} target=${args.target}\n`);

  for (const target of targets) {
    const exists = existsSync(target);
    const sourceText = exists ? readFileSync(target, 'utf8') : '';

    const starts = countOccurrences(sourceText, startMark);
    const ends = countOccurrences(sourceText, endMark);
    if (starts > 1) die(`${target} contains ${starts} start markers — refuse to write; dedupe by hand`);
    if (starts === 1 && ends === 0) die(`${target} contains a start marker without an end marker — refuse to write; repair by hand`);
    if (starts === 0 && ends > 0) die(`${target} contains end marker(s) without a matching start — refuse`);

    const next = starts === 1 ? spliceBlock(sourceText, startMark, endMark, newBlock) : appendBlock(sourceText, newBlock);

    if (args.dryRun) {
      if (sourceText === next) {
        process.stdout.write(`${target}: no change\n`);
      } else {
        process.stdout.write(`--- ${target} (current)\n+++ ${target} (proposed)\n`);
        process.stdout.write(`${next}\n`);
      }
      continue;
    }

    if (exists && sourceText === next) {
      unchanged += 1;
      process.stdout.write(`${target}: unchanged\n`);
    } else {
      writeFileSync(target, next);
      updated += 1;
      process.stdout.write(`${target}: updated\n`);
    }
  }

  process.stdout.write(`Completed kbd-inject-agent-rules — ${updated} file(s) updated, ${unchanged} unchanged\n`);
}

main(process.argv.slice(2)).catch((error) => die(error?.message ?? String(error)));
