import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HEADER,
  ROUTING_MARK,
  parseConf,
  splitFrontmatter,
  routingLayer0,
  render,
  budgetErrors,
} from '../lib/render.mjs';

const RULES = Array.from({ length: 17 }, (_, i) => `- **A-${i + 1} · Rule.** Text.`).join('\n');
const CONSTITUTION = `# Test\n${RULES}\n## §F\n${ROUTING_MARK}\n`;
const ROUTING = [
  '# Skill routing',
  '## Process',
  '| When | Invoke | Status | Install / notes |',
  '|---|---|---|---|',
  '| plan work | `superpowers` | present | npx x |',
  '| crate work | `rust-ws` | **absent** | house |',
  '## Discovery protocol',
  '1. no table here',
].join('\n');
const RULE = "---\npaths: ['**/*.rs', '**/Cargo.toml']\n---\n\n# Rust\nBody.\n";

const sources = (overrides = {}) => ({
  constitution: CONSTITUTION,
  routing: ROUTING,
  rules: { 'tech/rust': RULE },
  ...overrides,
});
const conf = (overrides = {}) => ({ stacks: 'rust', mirrors: 'AGENTS.md', nested: '', cursor: 'no', ...overrides });

test('parseConf reads quoted values and ignores comments and blank lines', () => {
  const parsed = parseConf('# note\n\nstacks="rust go"\ncursor="yes"\n');
  assert.deepEqual(parsed, { stacks: 'rust go', cursor: 'yes' });
});

// Every parser must survive a Windows checkout or a bundle cloned from another repository.
// readText normalises, but these functions are exported and callable without it, so each is
// asserted directly against CRLF input rather than trusting the caller.
const toCrlf = (text) => text.replace(/\n/g, '\r\n');

test('splitFrontmatter tolerates CRLF line endings', () => {
  const { front, body } = splitFrontmatter(toCrlf(RULE), 'tech/rust');

  // The CRLF input yields CRLF output; what matters is that it PARSED — the same
  // frontmatter and body are found, rather than the function throwing "has no paths:".
  const lf = splitFrontmatter(RULE, 'tech/rust');
  assert.equal(front.replace(/\r/g, ''), lf.front);
  assert.equal(body.replace(/\r/g, ''), lf.body);
});

test('routingLayer0 tolerates CRLF line endings', () => {
  const actual = routingLayer0(toCrlf(ROUTING));

  assert.equal(actual, routingLayer0(ROUTING));
});

test('budgetErrors counts CRLF lines the same as LF lines', () => {
  const crlf = render(sources({ constitution: toCrlf(CONSTITUTION) }), conf(), { existingDirs: [] });
  const lf = render(sources(), conf(), { existingDirs: [] });

  assert.deepEqual(budgetErrors(crlf.files), budgetErrors(lf.files));
});

test('parseConf tolerates CRLF line endings', () => {
  assert.deepEqual(parseConf('stacks="rust"\r\nmirrors="AGENTS.md"\r\n'), { stacks: 'rust', mirrors: 'AGENTS.md' });
});

test('splitFrontmatter separates paths frontmatter from the body', () => {
  const { front, body } = splitFrontmatter(RULE, 'tech/rust');
  assert.equal(front, "paths: ['**/*.rs', '**/Cargo.toml']");
  assert.ok(body.startsWith('\n# Rust'));
});

test('splitFrontmatter rejects a rule without paths because it would load unconditionally', () => {
  assert.throws(() => splitFrontmatter('# No frontmatter\n', 'tech/bad'), /tech\/bad has no `paths:`/);
});

test('routingLayer0 renders one line per table group and flags absent skills', () => {
  const out = routingLayer0(ROUTING);
  assert.match(out, /^- \*\*Process:\*\* plan work → `superpowers` · crate work → `rust-ws` _\(absent\)_$/m);
});

test('routingLayer0 skips groups without a table and ends with the no-match line', () => {
  const lines = routingLayer0(ROUTING).split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^- \*\*No row matches:\*\* `find-skills`/);
});

test('render replaces the routing marker and prefixes the generated header', () => {
  const { files } = render(sources(), conf(), { existingDirs: [] });
  assert.ok(files['CLAUDE.md'].startsWith(HEADER));
  assert.ok(!files['CLAUDE.md'].includes(ROUTING_MARK));
  assert.ok(files['CLAUDE.md'].includes('plan work → `superpowers`'));
});

test('render makes every mirror a byte-identical copy of CLAUDE.md', () => {
  const { files } = render(sources(), conf({ mirrors: 'AGENTS.md GEMINI.md' }), { existingDirs: [] });
  assert.equal(files['AGENTS.md'], files['CLAUDE.md']);
  assert.equal(files['GEMINI.md'], files['CLAUDE.md']);
});

test('render keeps paths frontmatter first in a Layer 1 rule so the harness still scopes it', () => {
  const { files } = render(sources(), conf(), { existingDirs: [] });
  assert.ok(files['.claude/rules/rust.md'].startsWith("---\npaths: ['**/*.rs', '**/Cargo.toml']\n---\n" + HEADER));
});

test('render skips tech rules whose stack is not listed in the conf', () => {
  const { files } = render(sources(), conf({ stacks: '' }), { existingDirs: [] });
  assert.equal(files['.claude/rules/rust.md'], undefined);
});

test('render fails when the conf lists a stack with no source file', () => {
  assert.throws(() => render(sources(), conf({ stacks: 'rust go' }), { existingDirs: [] }), /no rules\/src\/tech\/<name>\.md: go/);
});

test('render emits cursor rules with globs when cursor is enabled', () => {
  const { files } = render(sources(), conf({ cursor: 'yes' }), { existingDirs: [] });
  assert.ok(files['.cursor/rules/rust.mdc'].startsWith('---\nglobs: **/*.rs,**/Cargo.toml\nalwaysApply: false\n---\n'));
});

test('render writes a nested AGENTS.md only for directories that exist', () => {
  const nested = 'crates:tech/rust missing:tech/rust';
  const { files } = render(sources(), conf({ nested }), { existingDirs: ['crates'] });
  assert.ok(files['crates/AGENTS.md'].includes('# Rust'));
  assert.ok(!files['crates/AGENTS.md'].includes('paths:'));
  assert.equal(files['missing/AGENTS.md'], undefined);
});

test('render fails when the constitution has no routing marker', () => {
  assert.throws(() => render(sources({ constitution: '# none\n' }), conf(), { existingDirs: [] }), /routing marker/);
});

test('budgetErrors passes a constitution carrying A-1 to A-17 once each within budget', () => {
  const { files } = render(sources(), conf(), { existingDirs: [] });
  assert.deepEqual(budgetErrors(files), []);
});

test('budgetErrors reports a missing constitution rule', () => {
  const constitution = CONSTITUTION.replace('- **A-9 · Rule.** Text.\n', '');
  const { files } = render(sources({ constitution }), conf(), { existingDirs: [] });
  assert.match(budgetErrors(files).join('\n'), /A-1…A-17 exactly once each/);
});

test('budgetErrors reports a Layer 0 over 120 lines', () => {
  const constitution = CONSTITUTION + 'x\n'.repeat(130);
  const { files } = render(sources({ constitution }), conf(), { existingDirs: [] });
  assert.match(budgetErrors(files).join('\n'), /CLAUDE\.md is \d+ lines \(limit 120\)/);
});

test('budgetErrors reports a Layer 1 rule over 80 lines', () => {
  const long = RULE + 'line\n'.repeat(90);
  const { files } = render(sources({ rules: { 'tech/rust': long } }), conf(), { existingDirs: [] });
  assert.match(budgetErrors(files).join('\n'), /\.claude\/rules\/rust\.md is \d+ lines \(limit 80\)/);
});

test('budgetErrors reports a Layer 1 rule that repeats a constitution rule id', () => {
  const dup = RULE + '- **A-2 · Observed.** Copy.\n';
  const { files } = render(sources({ rules: { 'tech/rust': dup } }), conf(), { existingDirs: [] });
  assert.match(budgetErrors(files).join('\n'), /duplicate constitution/);
});

test('budgetErrors does not flag the mirrors as duplicate constitutions', () => {
  const { files } = render(sources(), conf({ mirrors: 'AGENTS.md GEMINI.md' }), { existingDirs: [] });
  assert.deepEqual(budgetErrors(files), []);
});
