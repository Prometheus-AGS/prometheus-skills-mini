// Evidence packet for the spec-stage review. It carries EVERY change in the set - two here and one
// in the pk repository - because the failures worth catching are between changes, not inside one.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const P = '.kbd-orchestrator/phases/karpathy-logs-node';
const OUT = process.argv[2] || `${P}/review/spec/packet.json`;
const UP = '../prometheus-skill-pack';
const PK = '../prometheus-knowledge';
const RECORDER = `${UP}/skills/process/karpathy-progress-memory/scripts/record-progress.py`;

const read = (f) => fs.readFileSync(f, 'utf8');
const lines = (f, a, b) => read(f).split('\n').slice(a - 1, b).map((l, i) => `${a + i}\t${l}`).join('\n');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: false });
  return `$ ${cmd} ${args.join(' ')}\n${(r.stdout || '') + (r.stderr || '')}`.trim();
};
const tree = (dir) => {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = read(full);
    }
  };
  walk(dir);
  return out;
};
const okf = read(`${P}/review/spec/okf-spec-v0.2.md`).split('\n');
const okfLines = (a, b) => okf.slice(a - 1, b).map((l, i) => `${a + i}\t${l}`).join('\n');

const ROUND1 = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
const packet = {
  mode: 'artifact',
  ...(ROUND1 ? { round_1: ROUND1 } : {}),
  stage: 'spec',
  phase: 'karpathy-logs-node',
  changes: {
    'mini:karpathy-progress-recorder': tree('openspec/changes/karpathy-progress-recorder'),
    'mini:okf-v02-via-pk': tree('openspec/changes/okf-v02-via-pk'),
    'pk-repo:okf-v02-writer': tree(`${PK}/openspec/changes/okf-v02-writer`),
  },
  context: {
    'goals.md': read(`${P}/goals.md`),
    'analysis.md': read(`${P}/analysis.md`),
    'operator ruling 2026-09-21': 'Asked how to resolve config.yaml (OKF v0.2, Node writer) against the pk decision (pk writes v0.1). Answer: "Keep v0.2, fix pk first" - config.yaml keeps write-0.2; moving pk to OKF v0.2 becomes a prerequisite change in the pk repository (pushing there needs the operator go-ahead).',
    'openspec/config.yaml': read('openspec/config.yaml'),
  },
  evidence: {
    'recorder:22-30 constants': lines(RECORDER, 22, 30),
    'recorder:59-62 receipt_path': lines(RECORDER, 59, 62),
    'recorder:135-187 event_from_hook': lines(RECORDER, 135, 187),
    'recorder:188-282 load_event + validate_event': lines(RECORDER, 188, 282),
    'recorder:283-313 canonical_validate': lines(RECORDER, 283, 313),
    'recorder:315-358 markdown_record + append_session_log': lines(RECORDER, 315, 358),
    'recorder:399-478 memory_write': lines(RECORDER, 399, 478),
    'recorder:479-540 hashes + write_receipt': lines(RECORDER, 479, 540),
    'recorder:541-671 main': lines(RECORDER, 541, 671),
    'upstream karpathy-progress-memory dir': run('ls', ['-R', `${UP}/skills/process/karpathy-progress-memory`]),
    'golden receipt': read('.prometheus/progress-memory-receipts/dea375631f620b20970cb0d952d42dcb74503eceeaabc07482278b8f6a073676.json'),
    'hash observation (command output)': read(`${P}/review/analyze/evidence-hash.txt`),
    'eventId reproduction (command output)': read(`${P}/review/spec/evidence-eventid.txt`),
    'this pack: skills carried': run('ls', ['skills']),
    'this pack: lib tree': run('ls', ['lib', 'lib/platform', 'lib/hooks', 'lib/refiner']),
    'this pack: hooks/hooks.json': read('hooks/hooks.json'),
    'this pack: lib/platform/spawn.mjs:100-120': lines('lib/platform/spawn.mjs', 100, 120),
    'this pack: lib/platform/lock.mjs': read('lib/platform/lock.mjs'),
    'this pack: .github/workflows/ci.yml': read('.github/workflows/ci.yml'),
    'this pack: .prometheus/index.md': read('.prometheus/index.md'),
    'this pack: package.json': read('package.json'),
    'OKF v0.2 SPEC 161-208 (s4.1 frontmatter)': okfLines(161, 208),
    'OKF v0.2 SPEC 287-400 (s5.1 sources, s5.2 generated/verified)': okfLines(287, 400),
    'OKF v0.2 SPEC 489-555 (s7 actors, s8 index, s9 log)': okfLines(489, 555),
    'OKF v0.2 SPEC 736-833 (s11 conformance, s12 versioning, s13 changes from v0.1)': okfLines(736, 833),
    'pk: pk-store/src/markdown.rs:20-135 (Frontmatter, writer, reader)': lines(`${PK}/pk-store/src/markdown.rs`, 20, 135),
    'pk: pk-core/src/types.rs:100-185 (WikiEntry, with_sources)': lines(`${PK}/pk-core/src/types.rs`, 100, 185),
    'pk: pk-librarian/src/prompts.rs:1-44': lines(`${PK}/pk-librarian/src/prompts.rs`, 1, 44),
    'pk: pk-librarian/src/librarian.rs:285-310': lines(`${PK}/pk-librarian/src/librarian.rs`, 285, 310),
    'pk: pk-store/src/bundle.rs:40-95 (render_index)': lines(`${PK}/pk-store/src/bundle.rs`, 40, 95),
    'pk: pk-store/src/store.rs:220-245 (index + log writers)': lines(`${PK}/pk-store/src/store.rs`, 220, 245),
    'pk: files touching sources (command output)': run('grep', ['-rln', '--include=*.rs', 'with_sources\\|\\.sources', `${PK}/pk-core/src`, `${PK}/pk-store/src`, `${PK}/pk-librarian/src`, `${PK}/pk-cli/src`, `${PK}/pk-mcp/src`, `${PK}/pk-learning-worker/src`]),
    'openspec validate (command output)': run('npx', ['--no-install', 'openspec', 'validate', '--all', '--no-interactive']),
  },
};

// The source pack's FULL pattern (record-progress.py:22-27), all seven top-level alternatives.
const SECRET = /(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+|bearer\s+[A-Za-z0-9._~+/=-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{16,}/i;
const KEY_PREFIX = /sk-kbd-|sk-[A-Za-z0-9]{20,}/;
// Exempt from the GENERIC pattern only, each for a stated reason; all are still scanned for key prefixes.
const GENERIC_EXEMPT = new Map([
  ['recorder:22-30 constants', 'quotes the recorder line `SECRET = re.compile(`'],
  ['mini:karpathy-progress-recorder', 'the spec quotes the pattern and a planted example `password = hunter2example`'],
]);
const hits = [];
const scan = (label, value, generic) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 1);
  for (const line of text.split('\n')) {
    if (KEY_PREFIX.test(line) || (generic && SECRET.test(line))) hits.push(`${label}: ${line.trim().slice(0, 110)}`);
  }
};
for (const [group, entries] of Object.entries({ changes: packet.changes, context: packet.context, evidence: packet.evidence })) {
  for (const [key, value] of Object.entries(entries)) scan(`${group}/${key}`, value, !GENERIC_EXEMPT.has(key));
}
if (hits.length) {
  console.error(`REFUSING to write the packet: ${hits.length} line(s) look like a secret`);
  hits.slice(0, 8).forEach((h) => console.error('  ' + h));
  process.exit(2);
}
for (const [k, why] of GENERIC_EXEMPT) console.log(`generic-pattern exemption: ${k} - ${why}`);
const text = JSON.stringify(packet, null, 1);
fs.writeFileSync(OUT, text);
console.log(`packet: ${OUT} | ${text.length} chars | changes: ${Object.keys(packet.changes).length} | evidence keys: ${Object.keys(packet.evidence).length} | secret hits: 0`);
