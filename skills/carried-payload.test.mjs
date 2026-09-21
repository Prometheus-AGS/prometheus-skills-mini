import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const markdownUnder = (dir) => {
  const root = path.join(repoRoot, dir);
  if (!existsSync(root)) return [];
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith('.md')) out.push(full);
    }
  };
  walk(root);
  return out;
};

const carried = () => [...markdownUnder('skills'), ...markdownUnder('agents')];

// Every script path a carried file tells an agent to run, of ANY extension.
// A .sh-only scan would pass a skill that names a missing .mjs while being just
// as broken on invocation — which is why the requirement is extension-agnostic.
const scriptRefs = (text) =>
  [
    ...text.matchAll(
      /(?:^|[\s`"'(])((?:scripts|assets|references)\/[\w./-]+\.(?:sh|mjs|json|py|js|ts))/g,
    ),
  ].map((m) => m[1]);

const declaresUnavailable = (text) => text.includes('UNAVAILABLE IN THIS PROJECT');

// A skill that is otherwise usable may instead document one absent asset. It still
// has to say so — the point is that nothing looks functional while being broken.
const documentsAbsentAsset = (text) => text.includes('one referenced asset is absent');

test('the payload was actually carried', () => {
  assert.ok(carried().length > 0, 'no carried skills or agents found');
});

test('every script a carried file names resolves, unless that file declares itself unavailable', () => {
  const offenders = [];

  for (const file of carried()) {
    const text = readFileSync(file, 'utf8');
    if (declaresUnavailable(text) || documentsAbsentAsset(text)) continue;
    for (const ref of new Set(scriptRefs(text))) {
      if (!existsSync(path.join(repoRoot, ref))) {
        offenders.push(`${path.relative(repoRoot, file)} names ${ref}, which does not exist here`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test('a skill that declares itself unavailable names the follow-up', () => {
  const unavailable = carried().filter((f) => declaresUnavailable(readFileSync(f, 'utf8')));

  assert.ok(unavailable.length > 0, 'expected at least one unavailable skill');
  for (const file of unavailable) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /decisions\.md|follow-up/i, `${file} must name where the follow-up is tracked`);
  }
});

// The python3 dependency is what C4 forbids. A naive grep flags prose describing
// what was replaced, so the scan reads CODE: fenced blocks, minus shell comments.
const fencedCode = (text) => {
  const out = [];
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence && !/^\s*#/.test(line)) out.push(line);
  }
  return out;
};

test('no carried file invokes python3 in a code block', () => {
  const offenders = [];

  for (const file of carried()) {
    for (const line of fencedCode(readFileSync(file, 'utf8'))) {
      if (/\bpython3?\s+(-c|-m|<<|[-\w./]+\.py)/.test(line)) {
        offenders.push(`${path.relative(repoRoot, file)}: ${line.trim().slice(0, 60)}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test('the scan distinguishes a code invocation from prose describing one', () => {
  // Proves the check above is not vacuous: it must match the fenced invocation
  // and ignore both the narrative line and the shell comment.
  const fixture = [
    'This skill used to call python3 -c to validate the manifest.',
    '```bash',
    '# replaced the python3 -c heredoc with Node',
    'python3 -c "import json"',
    '```',
  ].join('\n');

  const found = fencedCode(fixture).filter((l) => /\bpython3?\s+(-c|-m|<<)/.test(l));

  assert.equal(found.length, 1, 'must match the invocation only, not the prose or the comment');
});

test('no carried file is empty', () => {
  const empty = carried().filter((f) => statSync(f).size === 0);

  assert.deepEqual(empty, []);
});
