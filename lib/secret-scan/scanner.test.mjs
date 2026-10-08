// Proof that the no-hardcoded-secrets checker still discriminates after replacing the git-grep
// one-liner. Positive controls: synthetic credentials are detected. Negative controls: the real
// tree passes, a one-byte mutation re-fails, and an unknown hit fails without leaking content.
//
// Every fixture is generated into a temp directory at test time. Nothing detectable may live in
// this repository — the checker's own scope covers *.mjs and *.json — so credential-shaped
// strings are assembled from components and never written out as literals here.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tempDir } from '../platform/paths.mjs';
import { decideExitCode, formatReport, loadDispositions, scanRepository } from './scanner.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const dispositionsPath = path.join(here, 'dispositions.json');
const entryPoint = path.join(repoRoot, 'scripts', 'check-hardcoded-secrets.mjs');

// The adjudication receipts every disposition derives from live in the remediation phase of the
// planning workstream.
const remediationPhaseRoot = path.join(
  repoRoot,
  'workstreams',
  'bossfang-uar-architecture',
  '.kbd-orchestrator',
  'phases',
  'bossfang-uar-authorization-and-execution',
  'children',
  'mini-pack-qa-remediation',
);

const optionPair = () => ['--' + 'user' + '=synthetic', '--' + 'pass' + '=synthetic'].join(' ');
const syntheticToken = () => 'sk-' + 'Sy7'.repeat(8) + 'Q';
const tokenPattern = /sk-[A-Za-z0-9_-]{20,}/;

function makeTmpRoot(t) {
  const root = fs.mkdtempSync(path.join(tempDir(), 'secret-scan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeFixture(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function dispositionsFor(relativePath) {
  return loadDispositions(dispositionsPath).filter((entry) => entry.file === relativePath);
}

// Append a new top-level property without disturbing existing lines, so adjudicated occurrences
// keep their disposition-bound line numbers. Works whether or not the file ends with a newline.
function appendTopLevelProperty(text, name, value) {
  const edited = text.replace(/\n\}(\n?)$/, `,\n  "${name}": ${JSON.stringify(value)}\n}$1`);
  assert.notEqual(edited, text, 'expected a root-level closing brace to append before');
  return edited;
}

// A real credential pasted into a JSON config value must fail the gate.
test('detects an inline credential option pair inside a JSON string value', (t) => {
  const root = makeTmpRoot(t);
  writeFixture(root, 'config.json', JSON.stringify({ service: { args: optionPair() } }));

  const result = scanRepository({ cwd: root, dispositions: [] });

  assert.equal(result.errors.length, 0);
  assert.equal(result.violations.length, 2);
  assert.ok(result.violations.every((hit) => hit.kind === 'value'));
  assert.ok(!formatReport(result).includes(optionPair()));
});

// A provider-shaped key committed to a source file must fail the gate.
test('detects a standalone provider-shaped token in an .mjs file', (t) => {
  const root = makeTmpRoot(t);
  writeFixture(root, 'tool.mjs', `export const key = "${syntheticToken()}";\n`);

  const result = scanRepository({ cwd: root, dispositions: [] });

  assert.equal(result.errors.length, 0);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'text');
  assert.ok(!formatReport(result).includes(syntheticToken()));
});

// Editing an adjudicated historical packet to add a NEW credential must fail while the two
// originally adjudicated occurrences stay accepted at their bound line and pointer.
test('accepts an adjudicated packet but flags an additional inserted credential', (t) => {
  const relativePath = '.kbd-orchestrator/phases/karpathy-logs-node/children/the-boss-integration-prep/review/analyze/packet.json';
  const text = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const root = makeTmpRoot(t);
  writeFixture(root, relativePath, appendTopLevelProperty(text, 'injectedProbe', syntheticToken()));

  const result = scanRepository({ cwd: root, dispositions: dispositionsFor(relativePath) });

  assert.equal(result.errors.length, 0);
  assert.equal(result.accepted.length, 2);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'value');
  assert.equal(result.staleDispositions.length, 0);
});

// The repository as it stands today must pass: exactly the 24 adjudicated occurrences, no more.
// Locally all dispositioned files exist, so 24 are accepted and none are inert. On a clean CI
// checkout the 11 untracked workstreams evidence files (and the untracked prose .json) do not
// exist, so 13 are accepted and 11 dispositions are inert NOTEs — asserted explicitly in each
// environment. A NEW unparseable candidate or a NEW undispositioned hit fails either way.
const UNTRACKED_EVIDENCE_MARKER = 'workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/reflect/runtime-status.json';
const PROSE_JSON = 'workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/evidence/execute/start-0.json';

test('the real repository scan passes with exactly the dispositioned occurrences', () => {
  const result = scanRepository({ cwd: repoRoot, dispositions: loadDispositions(dispositionsPath) });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.staleDispositions, []);
  assert.equal(decideExitCode(result), 0);

  if (fs.existsSync(path.join(repoRoot, UNTRACKED_EVIDENCE_MARKER))) {
    assert.equal(result.accepted.length, 24);
    assert.deepEqual(result.inertDispositions, []);
  } else {
    // clean CI checkout: the 11 untracked evidence files are absent; their dispositions are inert
    assert.equal(result.accepted.length, 13);
    assert.equal(result.inertDispositions.length, 11);
  }
  assert.deepEqual(
    result.parseNotes,
    fs.existsSync(path.join(repoRoot, PROSE_JSON))
      ? [{ file: PROSE_JSON, hits: 0, referencedByStore: false }]
      : [],
  );
});

// A one-byte change inside a disposition-bound occurrence must re-fail it: the digest no longer
// matches the store, so the hit is undispositioned and the old entry is stale.
test('a one-byte mutation of a disposition-bound file re-fails that occurrence', (t) => {
  const relativePath = '.kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-working-agent/children/integration-administration/children/unified-tool-approval-authority/research/consolidation/inventory.json';
  const text = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const match = tokenPattern.exec(text);
  assert.ok(match, 'expected the adjudicated occurrence to be present');
  const offset = match.index + 5;
  const replacement = text[offset] === 'a' ? 'b' : 'a';
  const root = makeTmpRoot(t);
  writeFixture(root, relativePath, text.slice(0, offset) + replacement + text.slice(offset + 1));

  const result = scanRepository({ cwd: root, dispositions: dispositionsFor(relativePath) });

  assert.equal(result.errors.length, 0);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.violations.length, 1);
  assert.equal(result.staleDispositions.length, 1);
});

// A new unknown hit in an otherwise accepted file must fail, and the failure report must carry
// only file, line, pointer and digest — never the matched content.
test('an unknown hit in an accepted file fails without printing any matched content', (t) => {
  const relativePath = '.kbd-orchestrator/phases/the-boss-shipping-and-settings/children/uar-working-agent/children/integration-administration/children/unified-tool-approval-authority/research/consolidation/inventory.json';
  const text = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const existing = tokenPattern.exec(text);
  assert.ok(existing, 'expected the adjudicated occurrence to be present');
  const root = makeTmpRoot(t);
  writeFixture(root, relativePath, appendTopLevelProperty(text, 'addedProbe', syntheticToken()));

  const result = scanRepository({ cwd: root, dispositions: dispositionsFor(relativePath) });

  assert.equal(result.errors.length, 0);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.violations.length, 1);

  const report = formatReport(result);
  assert.ok(!report.includes(syntheticToken()));
  assert.ok(!report.includes(existing[0]));
  assert.ok(report.includes(relativePath));
  assert.ok(report.includes('kind=value'));
});

// Moving an accepted occurrence within the same file — same content digest, different line and
// pointer — must FAIL: dispositions are bound to location, not just to file and digest.
test('an occurrence moved to a different location within the same file fails', (t) => {
  const relativePath = '.kbd-orchestrator/phases/karpathy-logs-node/children/the-boss-integration-prep/review/analyze/packet.json';
  const document = JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
  const moved = document.external_evidence.content;
  assert.ok(typeof moved === 'string' && moved.length > 0, 'expected the adjudicated value');
  document.external_evidence.content = 'redacted for the move control';
  document.movedProbe = moved;
  const root = makeTmpRoot(t);
  writeFixture(root, relativePath, JSON.stringify(document, null, 2));

  const result = scanRepository({ cwd: root, dispositions: dispositionsFor(relativePath) });

  assert.equal(result.errors.length, 0);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.violations.length, 2);
  assert.ok(result.violations.every((hit) => hit.kind === 'value' && hit.pointer === '/movedProbe'));
  assert.equal(result.staleDispositions.length, 2);
});

// Docker Markdown is inside the scan boundary: the docker/* pathspec has always included it.
// A credential option pair pasted into docker docs must fail the gate. The fixture root is an
// isolated temp directory with its own docker/ tree, exercising the real enumeration path.
test('flags a credential option pair in docker/ Markdown (docker/* includes Markdown)', (t) => {
  const root = makeTmpRoot(t);
  writeFixture(root, 'docker/AGENTS.md', `# Compose rules\n\nNever inline credentials like ${optionPair()} here.\n`);

  const result = scanRepository({ cwd: root, dispositions: [] });

  assert.equal(result.errors.length, 0);
  assert.equal(result.parseNotes.length, 0);
  assert.equal(result.violations.length, 2);
  assert.ok(result.violations.every((hit) => hit.file === 'docker/AGENTS.md' && hit.kind === 'text'));
  assert.ok(!formatReport(result).includes(optionPair()));
});

// A credential-shaped JSON PROPERTY NAME must be a "key" violation even when its value is
// innocuous, and the report must carry the <key> placeholder, never the raw key.
test('detects a credential-shaped JSON property name as a key hit without printing the raw key', (t) => {
  const root = makeTmpRoot(t);
  const key = syntheticToken();
  writeFixture(root, 'state.json', JSON.stringify({ [key]: 'innocuous' }));

  const result = scanRepository({ cwd: root, dispositions: [] });

  assert.equal(result.errors.length, 0);
  assert.equal(result.parseNotes.length, 0);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'key');
  assert.equal(result.violations[0].pointer, '/<key>');

  const report = formatReport(result);
  assert.ok(report.includes('/<key>'));
  assert.ok(!report.includes(key));
});

// A malformed .json candidate is never silent: it is always text-scanned and always reported as
// PARSE-NOTE. (a) With zero hits and no disposition referencing it, the note alone does not fail
// the run. (b) When it also contains a credential-shaped hit, the note AND the violation are
// reported and the run fails with the parse-relevant exit code.
test('a parse-errored file is noted but passes with zero hits and no store reference', (t) => {
  const root = makeTmpRoot(t);
  writeFixture(root, 'broken.json', '{ "broken": ');

  const result = scanRepository({ cwd: root, dispositions: [] });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.parseNotes, [{ file: 'broken.json', hits: 0, referencedByStore: false }]);
  assert.equal(result.violations.length, 0);
  assert.equal(decideExitCode(result), 0);

  const report = formatReport(result);
  assert.ok(report.startsWith('no-hardcoded-secrets: PASS'));
  assert.ok(report.includes('PARSE-NOTE broken.json (not JSON; scanned as text only)'));
});

test('a parse-errored file containing a credential-shaped hit is noted and fails the run', (t) => {
  const root = makeTmpRoot(t);
  writeFixture(root, 'broken.json', `{ "broken": "${syntheticToken()}"`);

  const result = scanRepository({ cwd: root, dispositions: [] });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.parseNotes, [{ file: 'broken.json', hits: 1, referencedByStore: false }]);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'text');
  assert.equal(decideExitCode(result), 2);

  const report = formatReport(result);
  assert.ok(report.startsWith('no-hardcoded-secrets: FAIL'));
  assert.ok(report.includes('PARSE-NOTE broken.json (not JSON; scanned as text only)'));
  assert.ok(!report.includes(syntheticToken()));

  const run = spawnSync(process.execPath, [entryPoint], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.ok(run.stdout.includes('PARSE-NOTE broken.json'));
  assert.ok(!run.stdout.includes(syntheticToken()));
});

// Every disposition must name the adjudication receipt(s) it derives from, and those receipts
// must exist in the remediation phase of the planning workstream.
test('every disposition has provenance and each named receipt exists', () => {
  const dispositions = loadDispositions(dispositionsPath);
  assert.equal(dispositions.length, 24);
  for (const entry of dispositions) {
    assert.ok(
      Array.isArray(entry.source) && entry.source.length > 0,
      `${entry.file}: missing or empty source provenance`,
    );
    for (const receipt of entry.source) {
      assert.ok(
        fs.existsSync(path.join(remediationPhaseRoot, receipt)),
        `${entry.file}: named receipt does not exist: ${receipt}`,
      );
    }
  }
});

// An unreadable candidate must appear in the formatted report as an ERROR line (path and fs
// error code only) and must fail the run — the PASS header never prints over a partial scan.
test('an unreadable candidate is printed as ERROR and fails the run', (t) => {
  const root = makeTmpRoot(t);
  const enumerate = () => ['missing.json'];

  const result = scanRepository({ cwd: root, dispositions: [], enumerate });

  assert.deepEqual(result.errors, [{ file: 'missing.json', code: 'ENOENT' }]);
  assert.equal(decideExitCode(result), 2);

  const report = formatReport(result);
  assert.ok(report.startsWith('no-hardcoded-secrets: FAIL'));
  assert.ok(report.includes('ERROR missing.json (unreadable: ENOENT)'));
});

// Candidate paths are taken verbatim from the git listing: a filename ending in a space must be
// scanned under its exact name, not trimmed into a different (missing) file. Platform limit:
// Windows cannot create trailing-space filenames, so the no-trimming contract is proven on POSIX
// and the test skips with a recorded reason on win32.
test('a candidate whose filename ends with a space is scanned under its exact name', (t) => {
  if (process.platform === 'win32') {
    t.skip('trailing-space filenames are not creatable on Windows; the no-trimming enumeration contract is proven on POSIX');
    return;
  }
  const root = makeTmpRoot(t);
  const spacedName = 'docker/notes.md ';
  writeFixture(root, spacedName, `token: ${syntheticToken()}\n`);

  const result = scanRepository({ cwd: root, dispositions: [] });

  assert.equal(result.errors.length, 0);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].file, spacedName);
  assert.equal(result.violations[0].kind, 'text');
  assert.ok(!formatReport(result).includes(syntheticToken()));
});

// A disposition whose FILE IS ABSENT (e.g. untracked evidence on a clean CI checkout) is inert:
// reported as an explicit NOTE, never silent, and does not fail the run — the replaced git-grep
// gate's verdict on a missing file. Real hits elsewhere still fail via the violation path.
const ABSENT_FILE_DISPOSITION = {
  file: 'evidence/absent.json',
  kind: 'value',
  line: 1,
  pointer: '/x',
  sha256: '0'.repeat(64),
  class: 'test-fixture',
  source: ['none.json'],
};

test('a disposition for an absent file is an inert NOTE and the run passes', (t) => {
  const root = makeTmpRoot(t);
  writeFixture(root, 'config.json', '{}\n');

  const result = scanRepository({ cwd: root, dispositions: [ABSENT_FILE_DISPOSITION] });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.inertDispositions, [
    { file: 'evidence/absent.json', kind: 'value', class: 'test-fixture' },
  ]);
  assert.equal(result.violations.length, 0);
  assert.equal(result.staleDispositions.length, 0);
  assert.equal(decideExitCode(result), 0);

  const report = formatReport(result);
  assert.ok(report.startsWith('no-hardcoded-secrets: PASS'));
  assert.ok(report.includes('NOTE evidence/absent.json (disposition inert: file absent)'));
});

test('inert dispositions do not mask real hits in files that ARE present', (t) => {
  const root = makeTmpRoot(t);
  writeFixture(root, 'config.json', JSON.stringify({ key: syntheticToken() }));

  const result = scanRepository({ cwd: root, dispositions: [ABSENT_FILE_DISPOSITION] });

  assert.equal(result.inertDispositions.length, 1);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'value');
  assert.equal(decideExitCode(result), 1);
  assert.ok(!formatReport(result).includes(syntheticToken()));
});
