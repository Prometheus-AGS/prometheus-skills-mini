// Builds the evidence packet for the analyze-stage review. The judge is a REST endpoint and cannot
// run tools, so every claim in analysis.md must be checkable against text embedded here.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const P = '.kbd-orchestrator/phases/karpathy-logs-node';
const OUT = process.argv[2] || `${P}/review/analyze/packet.json`;
const UP = '../prometheus-skill-pack';
const PK = '../prometheus-knowledge';
const RECORDER = `${UP}/skills/process/karpathy-progress-memory/scripts/record-progress.py`;

const read = (f) => fs.readFileSync(f, 'utf8');
const lines = (f, a, b) =>
  read(f).split('\n').slice(a - 1, b).map((l, i) => `${a + i}\t${l}`).join('\n');
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: false, cwd });
  return `$ ${cmd} ${args.join(' ')}\n${(r.stdout || '') + (r.stderr || '')}`.trim();
};
const grepCount = (dirs, re) => {
  let files = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (full.endsWith('.mjs') && re.test(read(full))) files += 1;
    }
  };
  dirs.forEach(walk);
  return files;
};

const packet = {
  mode: 'artifact',
  stage: 'analyze',
  phase: 'karpathy-logs-node',
  artifacts: {
    'analysis.md': read(`${P}/analysis.md`),
    'library-candidates.json': read(`${P}/library-candidates.json`),
    'decision-log.md': read(`${P}/decision-log.md`),
  },
  context: {
    'goals.md': read(`${P}/goals.md`),
    'assess.handoff.summaryForNext': JSON.parse(read(`${P}/handoffs/assess.handoff.json`)).summaryForNext,
  },
  evidence: {
    recorder_line_count: run('wc', ['-l', RECORDER]),
    'recorder:22-23 SECRET pattern': lines(RECORDER, 22, 24),
    'recorder:135-187 event_from_hook': lines(RECORDER, 135, 187),
    'recorder:207-282 validate_event': lines(RECORDER, 207, 282),
    'recorder:341-358 append_session_log': lines(RECORDER, 341, 358),
    'recorder:399-478 memory_write': lines(RECORDER, 399, 478),
    'recorder:479-507 hash functions': lines(RECORDER, 479, 507),
    'recorder:541-660 main (replay, retry, result states)': lines(RECORDER, 541, 660),
    'upstream kbd hooks.json:38-75': lines(`${UP}/skills/process/kbd-process-orchestrator/hooks/hooks.json`, 38, 75),
    'pk --help': run(`${PK}/target/debug/pk`, ['--help']),
    'pk ingest --help': run(`${PK}/target/debug/pk`, ['ingest', '--help']),
    'pk-librarian/src/librarian.rs:36-56': lines(`${PK}/pk-librarian/src/librarian.rs`, 36, 56),
    'pk-event-store/src/fallback.rs:8-20': lines(`${PK}/pk-event-store/src/fallback.rs`, 8, 20),
    'pk-store/src/bundle.rs okf_index_reports': lines(`${PK}/pk-store/src/bundle.rs`, 298, 322),
    'this pack package.json': read('package.json'),
    'this pack lib/': run('ls', ['lib', 'lib/platform', 'lib/hooks']),
    'lib/platform/spawn.mjs spawnExecutable': lines('lib/platform/spawn.mjs', 100, 120),
    'lib/hooks/taskcompleted-kbd-receipt.mjs': read('lib/hooks/taskcompleted-kbd-receipt.mjs'),
    'mjs files in lib+scripts mentioning task:after or kbd_hooks_fire': String(
      grepCount(['lib', 'scripts'], /task:after|kbd_hooks_fire/),
    ),
    'golden receipt': read('.prometheus/progress-memory-receipts/dea375631f620b20970cb0d952d42dcb74503eceeaabc07482278b8f6a073676.json'),
    'hash observation (command output, this session)': read(`${P}/review/analyze/evidence-hash.txt`),
    'registry + search output (command output, this session)': read(`${P}/review/analyze/evidence-research.txt`),
    'pk PR #12 CI (command output, this session)': read(`${P}/review/analyze/evidence-ci.txt`),
  },
};

const text = JSON.stringify(packet, null, 1);
// The upstream recorder's own pattern, plus this gateway's key prefix. One evidence key is exempt from
// the GENERIC pattern only: it quotes the recorder line `SECRET = re.compile(`, which the pattern
// matches as "secret = <value>". It is still scanned for key prefixes, and the exemption is printed.
const SECRET = /(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+/i;
const KEY_PREFIX = /sk-kbd-|sk-[A-Za-z0-9]{20,}/;
const GENERIC_EXEMPT = new Set(['recorder:22-23 SECRET pattern']);
const hits = [];
const scan = (label, value, generic) => {
  for (const line of String(value).split('\n')) {
    if (KEY_PREFIX.test(line) || (generic && SECRET.test(line))) hits.push(`${label}: ${line.trim().slice(0, 100)}`);
  }
};
for (const [group, entries] of Object.entries({ artifacts: packet.artifacts, context: packet.context, evidence: packet.evidence })) {
  for (const [key, value] of Object.entries(entries)) scan(`${group}/${key}`, value, !GENERIC_EXEMPT.has(key));
}
if (hits.length) {
  console.error(`REFUSING to write the packet: ${hits.length} line(s) look like a secret`);
  hits.slice(0, 5).forEach((h) => console.error('  ' + h));
  process.exit(2);
}
console.log(`generic-pattern exemptions: ${[...GENERIC_EXEMPT].join(', ')}`);
fs.writeFileSync(OUT, text);
console.log(`packet: ${OUT} | ${text.length} chars | evidence keys: ${Object.keys(packet.evidence).length} | secret hits: 0`);
