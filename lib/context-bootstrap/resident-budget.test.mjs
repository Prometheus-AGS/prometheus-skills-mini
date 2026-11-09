import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../platform/paths.mjs';
import { RESIDENT_CEILING, measureResident } from './resident-budget.mjs';

const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = path.join(PACK_ROOT, 'scripts', 'prometheus-context-bootstrap.mjs');
const TEMPLATE = path.join(PACK_ROOT, 'skills', 'prometheus-context-bootstrap', 'references', 'AGENTS.base.md');
const START = '<!-- prometheus-mini-context:start v1 -->';
const END = '<!-- prometheus-mini-context:end -->';

const run = (root, ...args) => spawnSync(process.execPath, [SCRIPT, '--path', root, '--stacks', 'typescript', ...args], {
  cwd: PACK_ROOT, encoding: 'utf8', shell: false,
});

function withProject(prefix, body) {
  const root = fs.mkdtempSync(path.join(tempDir(), prefix));
  try { body(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

// 1,200 words: alone it exceeds the ceiling, so charging it to the region would fail.
const operatorProse = (newline) => `# Project rules${newline}${newline}` +
  Array.from({ length: 120 }, () => 'one two three four five six seven eight nine ten').join(newline) + newline;

test('only the managed region counts against the ceiling, for LF and CRLF alike', () => {
  const region = `${START}\nalpha beta gamma\n${END}`;
  const lf = measureResident(`intro words here\n\n${region}\ntrailing prose\n`, START, END);
  const crlf = measureResident(`intro words here\r\n\r\n${region.replaceAll('\n', '\r\n')}\r\ntrailing prose\r\n`, START, END);
  assert.deepEqual(lf, crlf);
  assert.equal(lf.managed, 10); // 3 words inside plus the 7 marker words
  assert.equal(lf.project, 5);
  assert.equal(measureResident(`${START}\n${'w '.repeat(RESIDENT_CEILING + 1)}\n${END}`, START, END).withinCeiling, false);
});

test('the shipped resident template fits the ceiling', () => {
  const { managed } = measureResident(fs.readFileSync(TEMPLATE, 'utf8'), START, END);
  assert.ok(managed > 0 && managed <= RESIDENT_CEILING, `template is ${managed} words`);
});

test('a CRLF project with long operator prose passes --check and reports prose separately', () => {
  withProject('mini-resident-budget-', (root) => {
    fs.writeFileSync(path.join(root, 'AGENTS.md'), operatorProse('\r\n'));
    fs.writeFileSync(path.join(root, 'package.json'), '{"private":true}\n');
    const applied = run(root);
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    const checked = run(root, '--check');
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const line = checked.stdout.split(/\r?\n/).find((entry) => entry.startsWith('RESIDENT'));
    // Operator prose plus the UI pointer the installer writes outside the region.
    const [, managed, project] = line.match(/AGENTS\.md: (\d+) managed words \(ceiling 900\) \+ (\d+) project words/);
    assert.ok(Number(managed) <= 900, line);
    assert.ok(Number(project) >= 1203, line);
  });
});

test('CLAUDE.md symlinked to AGENTS.md receives one region and stays a link', (t) => {
  withProject('mini-resident-link-', (root) => {
    fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Rules\n');
    fs.writeFileSync(path.join(root, 'package.json'), '{"private":true}\n');
    try {
      fs.symlinkSync('AGENTS.md', path.join(root, 'CLAUDE.md'), 'file');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') return t.skip('symlink creation not permitted on this host');
      throw error;
    }
    const applied = run(root);
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.equal(fs.lstatSync(path.join(root, 'CLAUDE.md')).isSymbolicLink(), true);
    const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert.equal(agents.split(START).length - 1, 1);
    const checked = run(root, '--check');
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  });
});
