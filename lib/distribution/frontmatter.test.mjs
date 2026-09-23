import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '../platform/paths.mjs';
import { parseSkillFrontmatter } from './frontmatter.mjs';

const withSkillMd = (content, run) => {
  const dir = mkdtempSync(path.join(tempDir(), 'frontmatter-'));
  try {
    const file = path.join(dir, 'SKILL.md');
    writeFileSync(file, content, 'utf8');
    return run(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('an inline scalar name and description are read as-is', () => {
  withSkillMd('---\nname: doctor\ndescription: Checks environment health.\n---\n\n# Doctor\n', (file) => {
    const result = parseSkillFrontmatter(file);

    assert.equal(result.name, 'doctor');
    assert.equal(result.description, 'Checks environment health.');
  });
});

test('a folded (">") block-scalar description is joined into one line with single spaces', () => {
  const content =
    '---\nname: kbd-analyze\ndescription: >\n  Use to run the Analyze stage of the KBD lifecycle\n  between Assess and Spec.\n---\n\nbody\n';
  withSkillMd(content, (file) => {
    const result = parseSkillFrontmatter(file);

    assert.equal(result.name, 'kbd-analyze');
    assert.equal(result.description, 'Use to run the Analyze stage of the KBD lifecycle between Assess and Spec.');
  });
});

test('a quoted inline scalar has its surrounding quotes stripped', () => {
  withSkillMd('---\nname: sample\nversion: \'1.0.0\'\ndescription: "Quoted description"\n---\n', (file) => {
    const result = parseSkillFrontmatter(file);

    assert.equal(result.description, 'Quoted description');
  });
});

test('a file with no frontmatter block returns null for both fields', () => {
  withSkillMd('# Just a heading\n\nNo frontmatter here.\n', (file) => {
    const result = parseSkillFrontmatter(file);

    assert.equal(result.name, null);
    assert.equal(result.description, null);
  });
});

test('a missing description key returns null for that field while name still resolves', () => {
  withSkillMd('---\nname: partial\n---\n\nbody\n', (file) => {
    const result = parseSkillFrontmatter(file);

    assert.equal(result.name, 'partial');
    assert.equal(result.description, null);
  });
});

test('CRLF line endings in the frontmatter are tolerated', () => {
  const content = '---\r\nname: crlf-skill\r\ndescription: >\r\n  line one\r\n  line two\r\n---\r\n\r\nbody\r\n';
  withSkillMd(content, (file) => {
    const result = parseSkillFrontmatter(file);

    assert.equal(result.name, 'crlf-skill');
    assert.equal(result.description, 'line one line two');
  });
});
