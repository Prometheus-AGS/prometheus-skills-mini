// Integration scenarios for the certifier, driven through its real entry point.
// The tests live outside the skill so they are not copied into installed skills.
//
//   node skills/skill-certification/scripts/certify.mjs <skill-dir> --out <dir> ...
// against skill directories on disk and recorded `claude plugin eval` results.
// No model is called: the trigger and outcome levels are computed from result
// files built here in the shape the eval runner writes.
//
// Production failures caught: a skill carrying a shell script certified on a
// pack that cannot run one; a Windows checkout (CRLF) or a multi-line plain
// description read as a broken skill; a near-miss case counted as a hit; a
// level reported as passed on too few runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const certify = path.join(repoRoot, 'skills', 'skill-certification', 'scripts', 'certify.mjs');
// Built from parts: scripts/carried-mjs.test.mjs forbids a shell-script path literal in this tree.
const SHELL_SCRIPT = ['scripts/setup', 'sh'].join('.');
const PYTHON_SCRIPT = ['evals/a-case/build', 'py'].join('.');

const withScratch = (work) => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'certify-'));
  try {
    return work(scratch);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
};

const FRONTMATTER = [
  '---',
  'name: sample-skill',
  'description: Formats a release note from a list of changes. Use when asked to write release notes.',
  'license: MIT',
  'metadata:',
  "  version: '1.0.0'",
  "  tags: 'release, notes'",
  '---',
  '',
  '# Sample skill',
  '',
  'Write the note.',
  '',
];

const writeSkill = (scratch, { lines = FRONTMATTER, eol = '\n', files = {} } = {}) => {
  const dir = path.join(scratch, 'sample-skill');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), lines.join(eol));
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(dir, ...relative.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return dir;
};

// `--skip-external` keeps the run offline: the reference validator is fetched by uvx.
const run = (skillDir, scratch, extra = [], { external = false, env = process.env } = {}) => {
  const out = path.join(scratch, 'out');
  const result = spawnSync(process.execPath, [certify, skillDir, '--out', out, ...(external ? [] : ['--skip-external']), ...extra], {
    encoding: 'utf8',
    timeout: 60000,
    env,
  });
  const file = path.join(out, 'certificate.json');
  return { ...result, certificate: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null, out };
};

const level = (certificate, id) => certificate.levels.find((entry) => entry.level === id);
const checks = (entry) => entry.findings.map((one) => one.check);

test('a well-formed skill passes the static level and gets a certificate and a report', () => {
  withScratch((scratch) => {
    const result = run(writeSkill(scratch), scratch);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(level(result.certificate, 'C1').result, 'PASS');
    assert.equal(result.certificate.skill, 'sample-skill');
    assert.match(result.certificate.contentHash, /^[0-9a-f]{64}$/);
    assert.ok(fs.existsSync(path.join(result.out, 'report.md')));
    // Outside a repository only the built-in validator runs, and one validator is not a pass.
    assert.equal(level(result.certificate, 'C0').result, 'INCOMPLETE');
    assert.equal(level(result.certificate, 'C2').result, 'NOT_EXERCISED');
    assert.equal(result.certificate.otherHarnesses, 'NOT_EXERCISED');
  });
});

test('a shell or Python script anywhere in the skill fails the static level', () => {
  withScratch((scratch) => {
    const dir = writeSkill(scratch, { files: { [SHELL_SCRIPT]: 'echo hi\n', [PYTHON_SCRIPT]: 'print(1)\n' } });

    const result = run(dir, scratch);

    const c1 = level(result.certificate, 'C1');
    assert.equal(c1.result, 'FAIL');
    const flagged = c1.findings.filter((one) => one.check === 'non-node-script').map((one) => one.detail);
    assert.equal(flagged.length, 2, JSON.stringify(c1.findings));
    assert.ok(flagged.some((detail) => detail.startsWith(SHELL_SCRIPT)));
    assert.ok(flagged.some((detail) => detail.startsWith(PYTHON_SCRIPT)));
  });
});

test('a Node script with no executable bit and no shebang is accepted', () => {
  withScratch((scratch) => {
    const dir = writeSkill(scratch, { files: { 'scripts/run.mjs': 'console.log(1);\n' } });
    fs.chmodSync(path.join(dir, 'scripts', 'run.mjs'), 0o644);

    const result = run(dir, scratch);

    assert.equal(level(result.certificate, 'C1').result, 'PASS', JSON.stringify(level(result.certificate, 'C1').findings));
  });
});

test('a CRLF checkout is read the same as an LF one', () => {
  withScratch((scratch) => {
    const result = run(writeSkill(scratch, { eol: '\r\n' }), scratch);

    assert.deepEqual(checks(level(result.certificate, 'C0')), []);
    assert.equal(level(result.certificate, 'C1').result, 'PASS');
  });
});

test('a description continued on indented lines is one scalar, not a broken field', () => {
  withScratch((scratch) => {
    const lines = [...FRONTMATTER];
    lines.splice(2, 1, 'description:', '  Formats a release note from a list of changes.', '  Use when asked to write release notes.');

    const result = run(writeSkill(scratch, { lines }), scratch);

    assert.deepEqual(checks(level(result.certificate, 'C0')), []);
  });
});

test('a top-level field outside the specification fails the specification level', () => {
  withScratch((scratch) => {
    const lines = [...FRONTMATTER];
    lines.splice(3, 0, "version: '1.0.0'");

    const result = run(writeSkill(scratch, { lines }), scratch);

    assert.equal(level(result.certificate, 'C0').result, 'FAIL');
    assert.ok(checks(level(result.certificate, 'C0')).includes('top-level-fields'));
  });
});

test('--require exits 2 when the level held is below the one asked for', () => {
  withScratch((scratch) => {
    const result = run(writeSkill(scratch), scratch, ['--require', 'C2']);

    assert.equal(result.status, 2);
  });
});

test('inside this repository the strict validator is the second validator, so C0 passes when uvx is not installed', () => {
  withScratch((scratch) => {
    // A PATH holding only this Node binary: uvx and claude are not found.
    const bin = path.dirname(process.execPath);
    const env = { ...process.env, PATH: bin, Path: bin };
    const result = run(path.join(repoRoot, 'skills', 'skill-certification'), scratch, [], { external: true, env });

    assert.equal(result.status, 0, result.stderr);
    const c0 = level(result.certificate, 'C0');
    assert.equal(c0.result, 'PASS', JSON.stringify(c0));
    assert.equal(c0.validators.find((entry) => entry.name.startsWith('repository validator')).result, 'PASS');
    const reference = c0.validators.find((entry) => entry.name.startsWith('skills-ref'));
    assert.equal(reference.result, 'NOT_EXERCISED');
    assert.match(reference.note, /uvx is not on PATH/);
    assert.equal(result.certificate.level, 'C1');
  });
});

// A recorded result in the shape `claude plugin eval --json` writes.
const graded = (name, passed) => ({ name, passed, weight: 1 });
const armRun = ({ fired, score, promise }) => ({
  score,
  passed: score >= 0.5,
  graders: [graded('00-skill-fired', fired), graded('01-keeps-the-promise', promise)],
});
const recorded = ({ runs, positiveFired, nearMissCalled }) => ({
  claudeVersion: '2.1.326',
  costUsd: 1.5,
  suite: { plugins: [{ name: 'prometheus-skills-mini' }] },
  cases: [
    {
      name: 'writes-a-release-note',
      dir: 'evals/sample-skill/writes-a-release-note',
      arms: {
        with: Array.from({ length: runs }, (_, index) => armRun({ fired: index < positiveFired, score: 1, promise: true })),
        without: Array.from({ length: runs }, () => armRun({ fired: false, score: 0, promise: false })),
      },
    },
    {
      name: 'near-miss-changelog-lint',
      dir: 'evals/sample-skill/near-miss-changelog-lint',
      // On a near-miss case the 00- grader passes when the skill stayed quiet.
      arms: {
        with: Array.from({ length: runs }, (_, index) => armRun({ fired: !(index < nearMissCalled), score: 1, promise: true })),
        without: [],
      },
    },
  ],
});

const withResults = (scratch, shape) => {
  const file = path.join(scratch, 'result.json');
  fs.writeFileSync(file, JSON.stringify(recorded(shape)));
  return run(writeSkill(scratch), scratch, ['--results', `pack=${file}`, '--results', `isolated=${file}`]);
};

test('recorded runs: five of five positives fired and a quiet near-miss pass the trigger and outcome levels', () => {
  withScratch((scratch) => {
    const result = withResults(scratch, { runs: 5, positiveFired: 5, nearMissCalled: 0 });

    assert.equal(level(result.certificate, 'C2').result, 'PASS', JSON.stringify(level(result.certificate, 'C2')));
    assert.equal(level(result.certificate, 'C3').result, 'PASS', JSON.stringify(level(result.certificate, 'C3')));
    assert.equal(result.certificate.evalCostUsd, 3);
  });
});

test('recorded runs: a near-miss case that called the skill fails the trigger level', () => {
  withScratch((scratch) => {
    const result = withResults(scratch, { runs: 5, positiveFired: 5, nearMissCalled: 1 });

    assert.equal(level(result.certificate, 'C2').result, 'FAIL');
    assert.ok(checks(level(result.certificate, 'C2')).includes('near-miss-fired'));
  });
});

test('recorded runs: positives firing on two of five runs fail the fired-rate rule', () => {
  withScratch((scratch) => {
    const result = withResults(scratch, { runs: 5, positiveFired: 2, nearMissCalled: 0 });

    assert.equal(level(result.certificate, 'C2').result, 'FAIL');
    assert.ok(checks(level(result.certificate, 'C2')).includes('fired-rate'));
    assert.ok(result.certificate.decisions.some((entry) => entry.level === 'C2' && entry.options.accept && entry.options.fix));
  });
});

test('recorded runs: three clean runs are incomplete, never rounded up to a pass', () => {
  withScratch((scratch) => {
    const result = withResults(scratch, { runs: 3, positiveFired: 3, nearMissCalled: 0 });

    assert.equal(level(result.certificate, 'C2').result, 'INCOMPLETE');
  });
});
