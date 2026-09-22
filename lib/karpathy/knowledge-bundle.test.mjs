import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `pk` is the only writer of the knowledge bundle under .prometheus/knowledge/
// (openspec/changes/okf-v02-via-pk/proposal.md). This pack writes receipts and
// session-log.md, both outside that tree — see design.md "What stays out of
// the bundle". A standing guard that no future change quietly grows a second
// writer: karpathy-progress-recorder already proved pk can be invoked as a
// spawned CLI (lib/karpathy/transport.mjs), so the risk is real, not
// theoretical.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

// Comments describe; code executes. Matches scripts/carried-mjs.test.mjs's
// own codeLines() convention, so a doc comment naming the forbidden path (as
// this very file's header does, above) is never mistaken for a write.
const codeLines = (text) =>
  text
    .split('\n')
    .map((line, i) => ({ n: i + 1, line }))
    .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line));

const allMjsUnder = (dir) => {
  const out = [];
  const root = path.join(repoRoot, dir);
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith('.mjs')) out.push(full);
    }
  };
  walk(root);
  return out;
};

const KNOWLEDGE_PATH_PATTERN = /\.prometheus[\\/]knowledge\b/;

const scanForKnowledgeWrites = (files) => {
  const offenders = [];
  for (const file of files) {
    for (const { n, line } of codeLines(readFileSync(file, 'utf8'))) {
      if (KNOWLEDGE_PATH_PATTERN.test(line)) {
        offenders.push(`${path.relative(repoRoot, file)}:${n}: ${line.trim().slice(0, 80)}`);
      }
    }
  }
  return offenders;
};

const SELF = fileURLToPath(import.meta.url);

test('no executable line under lib/ or scripts/ writes beneath .prometheus/knowledge', () => {
  const files = [...allMjsUnder('lib'), ...allMjsUnder('scripts')].filter(
    // This file's own header comment names the forbidden path in prose, and its
    // later tests' own source lines mention the literal path too (test names,
    // assertion messages, the fixture string). codeLines() excludes comment
    // lines, but this file's non-comment lines still need excluding — compared
    // as absolute paths, never a path.relative() string, which is
    // backslash-separated on Windows and would never equal a POSIX literal
    // (first observed failing on real windows-latest CI, run 35705812317).
    (file) => file !== SELF,
  );

  const offenders = scanForKnowledgeWrites(files);

  assert.deepEqual(offenders, [], `these lines reference .prometheus/knowledge: ${offenders.join('; ')}`);
});

// Proves the scan above is not vacuous: a fixture module that DOES write
// beneath .prometheus/knowledge must be caught.
test('the scan actually detects a knowledge-bundle write when one exists', () => {
  const fixtureSource = "writeFileSync(path.join(root, '.prometheus/knowledge/wiki/x.md'), body);\n";

  const offenders = codeLines(fixtureSource).filter(({ line }) => KNOWLEDGE_PATH_PATTERN.test(line));

  assert.equal(offenders.length, 1);
});

// The scan is also platform-symmetric: a Windows-style backslash path must be
// caught exactly as the POSIX form is, since this repo runs on both.
test('the scan catches a Windows-style backslash path too', () => {
  const fixtureSource = "writeFileSync(path.join(root, '.prometheus\\knowledge\\wiki\\x.md'), body);\n";

  const offenders = codeLines(fixtureSource).filter(({ line }) => KNOWLEDGE_PATH_PATTERN.test(line));

  assert.equal(offenders.length, 1);
});

test('.prometheus/index.md has exactly one frontmatter key, okf_version: "0.2"', () => {
  const text = readFileSync(path.join(repoRoot, '.prometheus', 'index.md'), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);

  assert.ok(match, 'index.md must open with a YAML frontmatter block');
  const frontmatterLines = match[1].split('\n').filter((line) => line.trim() !== '');

  assert.deepEqual(frontmatterLines, ['okf_version: "0.2"']);
});

// openspec/config.yaml is loaded into every OpenSpec artifact as binding
// context (design.md "Why a documentation change needs a spec"). Before this
// change it described a Node-side v0.2 writer that was withdrawn in favour of
// pk. config.yaml wraps prose across lines, so every check here collapses
// runs of whitespace before matching — a phrase split across a line break
// must still be found (or correctly found absent).
const configYaml = () => readFileSync(path.join(repoRoot, 'openspec', 'config.yaml'), 'utf8');
const collapsed = (text) => text.replace(/\s+/g, ' ');

test('config.yaml no longer instructs building the withdrawn Node-side OKF writer', () => {
  const text = collapsed(configYaml());

  // The four exact phrases spec.md names (Requirement: "The binding
  // constraints describe what is built" → Scenario: "The withdrawn clauses
  // are gone"), confirmed present verbatim in the pre-amendment text via
  // `git show 921da27:openspec/config.yaml`. None may appear as live,
  // directive text after the amendment.
  for (const phrase of [
    'the Node implementation',
    'log.md is rendered from it',
    'Never append to log.md',
    'events.jsonl is the append-only truth',
  ]) {
    assert.doesNotMatch(text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), phrase);
  }
});

test('config.yaml states pk as the bundle writer, OKF v0.2, and receipt independence', () => {
  const text = collapsed(configYaml());

  assert.match(text, /pk[^.]*is the sole writer of the OKF v0\.2 knowledge bundle/);
  assert.match(text, /Open Knowledge Format v0\.2 bundles/);
  assert.match(text, /receipts and session-log\.md[^.]*are (written independently of it|unaffected either way)/);
});
