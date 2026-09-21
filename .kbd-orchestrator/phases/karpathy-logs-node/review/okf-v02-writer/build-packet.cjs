// Evidence packet for the DIFF review of change okf-v02-writer. It carries EVERY change in the set - two here and one
// in the pk repository - because the failures worth catching are between changes, not inside one.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const P = '.kbd-orchestrator/phases/karpathy-logs-node';
const OUT = process.argv[2] || `${P}/review/okf-v02-writer/packet.json`;
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
const okf = read(`${P}/review/okf-v02-writer/okf-spec-v0.2.md`).split('\n');
const okfLines = (a, b) => okf.slice(a - 1, b).map((l, i) => `${a + i}\t${l}`).join('\n');

const ROUND1 = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
const C = `${PK}/openspec/changes/okf-v02-writer`;
const AUDIT = `${P}/review/okf-v02-writer/auditor-report.md`;
const packet = {
  mode: 'diff',
  ...(ROUND1 ? { round_1: ROUND1 } : {}),
  stage: 'execute',
  phase: 'karpathy-logs-node',
  change: 'okf-v02-writer (pk repository, branch feat/okf-v02-writer)',
  changes: {
    'git diff main..HEAD (code, tests, Cargo; openspec excluded)': run('git', ['-C', PK, 'diff', 'main..HEAD', '--', '.', ':!openspec', ':!Cargo.lock']),
    'git log main..HEAD': run('git', ['-C', PK, 'log', '--format=%h %s', 'main..HEAD']),
  },
  context: {
    'spec.md (the contract)': read(`${C}/specs/okf-v02-writer/spec.md`),
    'design.md': read(`${C}/design.md`),
    'tasks.md': read(`${C}/tasks.md`),
    'proposal.md': read(`${C}/proposal.md`),
    'evidence.md (author-reported)': read(`${C}/evidence.md`),
    'rust-auditor report (independent agent, report-only)': fs.existsSync(AUDIT) ? read(AUDIT) : 'NOT AVAILABLE',
  },
  evidence: {
    'OKF v0.2 SPEC 161-208 (s4.1 frontmatter)': okfLines(161, 208),
    'OKF v0.2 SPEC 287-400 (s5.1 sources, s5.2 generated/verified)': okfLines(287, 400),
    'OKF v0.2 SPEC 489-555 (s7 actors, s8 index, s9 log)': okfLines(489, 555),
    'OKF v0.2 SPEC 736-833 (s11 conformance, s12 versioning, s13 changes from v0.1)': okfLines(736, 833),
    'full file: pk-core/src/types.rs': read(`${PK}/pk-core/src/types.rs`),
    'full file: pk-store/src/markdown.rs': read(`${PK}/pk-store/src/markdown.rs`),
    'pk-librarian/src/librarian.rs:280-400 (with_unique_ids, parse_compile_response)': lines(`${PK}/pk-librarian/src/librarian.rs`, 280, 400),
    'pk-store/src/bundle.rs:40-100 (render_index)': lines(`${PK}/pk-store/src/bundle.rs`, 40, 100),
    'pk-store/src/bundle.rs:300-330 (okf_index_reports)': lines(`${PK}/pk-store/src/bundle.rs`, 300, 330),
    'callers of render_index (command output)': run('grep', ['-rn', '--include=*.rs', 'render_index(', `${PK}/pk-store/src`, `${PK}/pk-cli/src`, `${PK}/pk-librarian/src`]),
    'what an MCP consumer receives: pk-mcp/src/tools.rs:270-290': lines(`${PK}/pk-mcp/src/tools.rs`, 270, 290),
  },
};

// The source pack's FULL pattern (record-progress.py:22-27), all seven top-level alternatives.
const SECRET = /(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+|bearer\s+[A-Za-z0-9._~+/=-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{16,}/i;
const KEY_PREFIX = /sk-kbd-|sk-[A-Za-z0-9]{20,}/;
// Exempt from the GENERIC pattern only, each for a stated reason; all are still scanned for key prefixes.
const GENERIC_EXEMPT = new Map();
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
