// Evidence packet for the plan-stage review. It carries EVERY change in the set - two here and one
// in the pk repository - because the failures worth catching are between changes, not inside one.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const P = '.kbd-orchestrator/phases/karpathy-logs-node';
const OUT = process.argv[2] || `${P}/review/plan/packet.json`;
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
const okf = ''.split('\n');
const okfLines = (a, b) => okf.slice(a - 1, b).map((l, i) => `${a + i}\t${l}`).join('\n');

const ROUND1 = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
const packet = {
  mode: 'artifact',
  ...(ROUND1 ? { round_1: ROUND1 } : {}),
  stage: 'plan',
  phase: 'karpathy-logs-node',
  changes: {
    'plan.md': read(`${P}/plan.md`),
  },
  context: {
    'goals.md': read(`${P}/goals.md`),
    'spec.handoff.summaryForNext': JSON.parse(read(`${P}/handoffs/spec.handoff.json`)).summaryForNext,
    'library-candidates.json': read(`${P}/library-candidates.json`),
    'tasks: pk-repo okf-v02-writer': read(`${PK}/openspec/changes/okf-v02-writer/tasks.md`),
    'tasks: mini karpathy-progress-recorder': read('openspec/changes/karpathy-progress-recorder/tasks.md'),
    'tasks: mini okf-v02-via-pk': read('openspec/changes/okf-v02-via-pk/tasks.md'),
    'proposal: pk-repo okf-v02-writer': read(`${PK}/openspec/changes/okf-v02-writer/proposal.md`),
    'proposal: mini okf-v02-via-pk': read('openspec/changes/okf-v02-via-pk/proposal.md'),
    'CLAUDE.md (constitution: A-9 tiers, A-10 single writer, A-12 human gates, A-15, section F routing)': read('CLAUDE.md'),
    'rules/src/tech/rust.md': read('rules/src/tech/rust.md'),
    'hook-entry-node-only/plan.md (the previous plan, for the binding per-task rules)': read('.kbd-orchestrator/phases/hook-entry-node-only/plan.md'),
  },
  evidence: {
    'task counts (command output)': ['openspec/changes/karpathy-progress-recorder/tasks.md', 'openspec/changes/okf-v02-via-pk/tasks.md', `${PK}/openspec/changes/okf-v02-writer/tasks.md`].map((f) => `${f}: ${(read(f).match(/^- \[ \]/gm) || []).length}`).join('\n'),
    'pk: files touching sources, non-test (command output)': run('grep', ['-rln', '--include=*.rs', 'with_sources\\|\\.sources', `${PK}/pk-core/src`, `${PK}/pk-store/src`, `${PK}/pk-librarian/src`, `${PK}/pk-cli/src`, `${PK}/pk-mcp/src`, `${PK}/pk-learning-worker/src`]),
    'pk: pk-mcp/src/tools.rs:270-290 (what an MCP consumer receives)': lines(`${PK}/pk-mcp/src/tools.rs`, 270, 290),
    'pk: pk-core/src/event.rs:1-60 (events carry ids, not entries)': lines(`${PK}/pk-core/src/event.rs`, 1, 60),
    'pk: git state': run('git', ['-C', PK, 'log', '--oneline', '-3']) + '\n' + run('git', ['-C', PK, 'status', '-sb']),
    'mini: git state': run('git', ['log', '--oneline', '-4']) + '\n' + run('git', ['submodule', 'status']),
    'mini: scripts/refine-validate.mjs:1-30': lines('scripts/refine-validate.mjs', 1, 30),
    'mini: skills present for Rust work': run('ls', ['.agents/skills']),
    'mini: docs/skill-routing.md:30-45': lines('docs/skill-routing.md', 30, 45),
    'mini: versions.toml': fs.existsSync('versions.toml') ? 'present' : 'ABSENT',
    'openspec validate (command output)': run('npx', ['--no-install', 'openspec', 'validate', '--all', '--no-interactive']),
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
