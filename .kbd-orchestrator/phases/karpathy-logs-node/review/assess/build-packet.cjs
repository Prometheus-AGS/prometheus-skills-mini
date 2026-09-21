const fs=require('fs');
const P='.kbd-orchestrator/phases/karpathy-logs-node';
const BOSS='/Users/gqadonis/Projects/prometheus/the-boss';
const UP='/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/skills/process/karpathy-progress-memory/scripts/record-progress.py';
const read=f=>fs.readFileSync(f,'utf8');
const lines=(f,a,b)=>read(f).split('\n').slice(a-1,b).join('\n');
const d='.prometheus/progress-memory-receipts';
const packet={
  mode:'artifact', stage:'assess', phase:'karpathy-logs-node', round:1,
  producer:'claude (Anthropic)', generated_at:new Date().toISOString(),
  goals: read(`${P}/goals.md`),
  artifact_under_review:{'assessment.md': read(`${P}/assessment.md`)},
  evidence_the_judge_cannot_fetch_itself:{
    'README section 5.3 (the contract the goals derive from)': (()=>{const t=read('README.md');const i=t.indexOf('### 5.3');const j=t.indexOf('### 5.4',i);return t.slice(i,j);})(),
    'the one golden receipt, verbatim': read(d+'/'+fs.readdirSync(d)[0]),
    'events.jsonl, verbatim': read('.prometheus/events.jsonl'),
    'upstream record-progress.py lines 22-31 (SECRET, enums)': lines(UP,22,31),
    'upstream record-progress.py lines 270-281 (payload bound)': lines(UP,270,281),
    'upstream record-progress.py lines 479-507 (both hash functions)': lines(UP,479,507),
    'upstream record-progress.py lines 565-580 (replay comparison)': lines(UP,565,580),
    'The Boss builtinSkills.ts (whole file)': read(`${BOSS}/src/main/utils/builtinSkills.ts`),
    'The Boss SkillService.ts lines 716-742 (copy vs symlink)': lines(`${BOSS}/src/main/ai/skills/SkillService.ts`,716,742),
    'The Boss environment.ts lines 148-200 (bun, ELECTRON_RUN_AS_NODE)': lines(`${BOSS}/src/main/ai/runtime/claudeCode/environment.ts`,148,200),
    'The Boss settingsBuilder.ts getSettingSources': lines(`${BOSS}/src/main/ai/runtime/claudeCode/settingsBuilder.ts`,672,679),
    'The Boss binaryResolver.ts (whole file)': read(`${BOSS}/src/main/utils/binaryResolver.ts`),
    'The Boss electron-builder.yml lines 80-122': lines(`${BOSS}/electron-builder.yml`,80,122),
    'The Boss package.json build:win / build:mac / build:linux scripts': Object.fromEntries(Object.entries(require(`${BOSS}/package.json`).scripts).filter(([k])=>/^build:(win|mac|linux)(:x64|:arm64)?$/.test(k))),
    'rust-mcp-filesystem dist-workspace.toml': read('/Users/gqadonis/Projects/references/rust-mcp-filesystem/dist-workspace.toml'),
    'compass .mcp.json': read('/Users/gqadonis/Projects/references/compass/.mcp.json'),
    'this pack: script invocations inside carried skills': require('child_process').execSync("git grep -n -E 'node scripts/[a-z-]+\\.mjs' -- skills agents || true",{encoding:'utf8'}),
    'this pack: hooks/hooks.json': read('hooks/hooks.json'),
  },
  known_limitations:[
    'Part 2 was added by the operator mid-stage; it assesses integration and is explicitly not a goal of this phase.',
    'The hash finding rests on ONE receipt. The assessment says so.',
    'compass release matrix was not established.',
    'Whether bun can run this pack\'s .mjs unchanged is untested.',
  ],
};
const out=JSON.stringify(packet,null,2);
// Secret scan BEFORE anything leaves the machine — the upstream recorder's own pattern.
const SECRET=/(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+|bearer\s+[A-Za-z0-9._~+\/=-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{16,}/gi;
const hits=[...out.matchAll(SECRET)].map(m=>m[0].slice(0,40));
fs.writeFileSync(`${P}/review/assess/packet.json`,out+'\n');
console.log('packet:',(out.length/1024).toFixed(1),'KB');
console.log('secret-pattern hits:',hits.length); hits.slice(0,6).forEach(h=>console.log('   '+JSON.stringify(h)));
