const fs=require('fs'),{execSync}=require('child_process');
const P='.kbd-orchestrator/phases/karpathy-logs-node';
const BOSS='/Users/gqadonis/Projects/prometheus/the-boss';
const FS='/Users/gqadonis/Projects/references/rust-mcp-filesystem';
const CP='/Users/gqadonis/Projects/references/compass';
const UP='/Users/gqadonis/Projects/prometheus/prometheus-skill-pack/skills/process/karpathy-progress-memory/scripts/record-progress.py';
const read=f=>fs.readFileSync(f,'utf8');
const lines=(f,a,b)=>read(f).split('\n').slice(a-1,b).join('\n');
const sh=(c,cwd)=>{try{return execSync(c,{cwd,encoding:'utf8',maxBuffer:8e6}).trim()}catch(e){return ((e.stdout||'')+(e.stderr||'')).trim()||'(exit '+e.status+', no output)'}};
const d='.prometheus/progress-memory-receipts';
const r1=JSON.parse(read(`${P}/review/assess/judge-output.txt`).replace(/^[^{]*/,'').replace(/[^}]*$/,''));
const packet={
  mode:'artifact', stage:'assess', phase:'karpathy-logs-node', round:2,
  producer:'claude (Anthropic)', generated_at:new Date().toISOString(),
  goals: read(`${P}/goals.md`),
  artifact_under_review:{'assessment.md': read(`${P}/assessment.md`)},
  round_1:{
    verdict:r1.verdict,
    findings:r1.findings.map(f=>({severity:f.severity,location:f.location,finding:f.finding})),
    dispositions:[
      'CRITICAL Gap 5 unsupported — ACCEPTED. The claim was verified by the producer but no evidence was embedded. Evidence now embedded below (directory listing, tools listing, wc output).',
      'CRITICAL CLAUDE_PLUGIN_ROOT omitted — ACCEPTED as a genuine miss. Verified: git grep -c in The Boss returns 0 files. Added as GAP 7.',
      'WARNING raw command output absent — ACCEPTED. Raw outputs now embedded under raw_command_output.',
      'WARNING content-hash claim — ACCEPTED as a packet omission; the claim is true and SkillService.ts syncBuiltinSkill is now embedded.',
      'WARNING namespace claim — PARTLY ACCEPTED. The parameter exists (signature embedded) but the call site omits it, so using it needs a call-site change; the assessment now says so instead of "without schema work".',
      'WARNING Gap 2 overstated — ACCEPTED, and verifying it OVERTURNED the gap: BinaryManager declares RUNTIME_DEPS npm: node@22 resolved through mise. Gap 2 rewritten and marked [corrected].',
      'WARNING hooks.ts unsupported — ACCEPTED as a packet omission; excerpt embedded.',
      'WARNING rust-mcp-filesystem claims unsupported — ACCEPTED as a packet omission; Cargo.toml dependency block and cli.rs embedded.',
      'WARNING compass overclaims — PARTLY ACCEPTED. transport.rs and CI excerpts embedded; the assessment now says it did NOT verify that compass starts no background process in every mode.',
      'SUGGESTION skills vs agents — ACCEPTED. Verifying it found the builtin-agent plugin seam, now in "WHAT THE BOSS ALREADY PROVIDES".',
    ],
  },
  raw_command_output:{
    'node --version': sh('node --version'),
    'npm test (summary lines)': sh("npm test 2>&1 | grep -E '^ℹ (tests|pass|fail|skipped)'"),
    'node rules/build.mjs --check': sh('node rules/build.mjs --check'),
    'node scripts/spec-validate.mjs (last line)': sh('node scripts/spec-validate.mjs | tail -1'),
    'find openspec/specs -name spec.md': sh('find openspec/specs -name spec.md'),
    "git ls-files '.prometheus/*'": sh("git ls-files '.prometheus/*'"),
    'existsSync lib/karpathy lib/okf lib/memory': sh(`node -e "for(const p of ['lib/karpathy','lib/okf','lib/memory'])console.log(p,require('fs').existsSync(p))"`),
    'hash probe output': sh('node /private/tmp/claude-501/-Users-gqadonis-Projects-prometheus-prometheus-skills-mini/a77634b1-5d5e-41f1-b8cc-090d1e90daf4/scratchpad/hashprobe2.cjs'),
    'upstream: grep -c import lines': sh(`grep -c -E '^(import|from) ' ${UP}`),
    'The Boss: git grep -c CLAUDE_PLUGIN_ROOT (files)': sh("git grep -c 'CLAUDE_PLUGIN_ROOT' -- src packages resources | wc -l",BOSS),
    'The Boss: ls -d resources/skills/*/': sh('ls -d resources/skills/*/',BOSS),
    'The Boss: ls resources/builtin-agents': sh('ls resources/builtin-agents',BOSS),
    'The Boss: ls src/main/ai/mcp/servers/filesystem': sh('ls src/main/ai/mcp/servers/filesystem',BOSS),
    'The Boss: ls src/main/ai/mcp/servers/filesystem/tools': sh('ls src/main/ai/mcp/servers/filesystem/tools',BOSS),
    'The Boss: wc -l over non-test filesystem server files': sh("git ls-files 'src/main/ai/mcp/servers/filesystem/*' | grep -v test | xargs wc -l | tail -1",BOSS),
    'The Boss: platform keys in download-binaries.js': sh(`grep -o -E "'(win32|darwin|linux)-(x64|arm64)'" scripts/download-binaries.js | sort | uniq -c`,BOSS),
    'The Boss: electron + sdk versions': sh(`node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};console.log('electron',d.electron,'| claude-agent-sdk',d['@anthropic-ai/claude-agent-sdk'])"`,BOSS),
    'this pack: .claude-plugin/plugin.json present?': sh(`node -e "console.log(require('fs').existsSync('.claude-plugin/plugin.json'))"`),
  },
  evidence:{
    'README 5.3': (()=>{const t=read('README.md');const i=t.indexOf('### 5.3');return t.slice(i,t.indexOf('### 5.4',i));})(),
    'golden receipt, verbatim': read(d+'/'+fs.readdirSync(d)[0]),
    'events.jsonl, verbatim': read('.prometheus/events.jsonl'),
    'upstream record-progress.py 22-31': lines(UP,22,31),
    'upstream record-progress.py 270-281': lines(UP,270,281),
    'upstream record-progress.py 479-507': lines(UP,479,507),
    'upstream record-progress.py 565-580': lines(UP,565,580),
    'Boss builtinSkills.ts': read(`${BOSS}/src/main/utils/builtinSkills.ts`),
    'Boss SkillService.ts 1119-1170 (syncBuiltinSkill: signature, namespace, content hash)': lines(`${BOSS}/src/main/ai/skills/SkillService.ts`,1119,1170),
    'Boss SkillService.ts 716-742 (copy vs symlink)': lines(`${BOSS}/src/main/ai/skills/SkillService.ts`,716,742),
    'Boss hooks.ts 1-20 and 80-90 (HookCallback assembly)': lines(`${BOSS}/src/main/ai/runtime/claudeCode/hooks.ts`,1,20)+'\n…\n'+lines(`${BOSS}/src/main/ai/runtime/claudeCode/hooks.ts`,80,90),
    'Boss environment.ts 148-200': lines(`${BOSS}/src/main/ai/runtime/claudeCode/environment.ts`,148,200),
    'Boss settingsBuilder.ts 168-204 (SDK local plugins, skipMcpDiscovery)': lines(`${BOSS}/src/main/ai/runtime/claudeCode/settingsBuilder.ts`,168,204),
    'Boss settingsBuilder.ts 672-679 (getSettingSources)': lines(`${BOSS}/src/main/ai/runtime/claudeCode/settingsBuilder.ts`,672,679),
    'Boss BuiltinAgentProvisioner.ts 45-62 (pluginDirectory)': lines(`${BOSS}/src/main/ai/agents/builtin/BuiltinAgentProvisioner.ts`,45,62),
    'Boss BinaryManager.ts 84-88 (RUNTIME_DEPS node@22)': lines(`${BOSS}/src/main/services/binaryManager/BinaryManager.ts`,84,88),
    'Boss BinaryManager.ts 196-215 (BUNDLED_TOOLS)': lines(`${BOSS}/src/main/services/binaryManager/BinaryManager.ts`,196,215),
    'Boss BinaryManager.ts 1240-1252 (node resolved through mise)': lines(`${BOSS}/src/main/services/binaryManager/BinaryManager.ts`,1240,1252),
    'Boss binaryEnv.ts 1-30 and 60-70 (shims ahead of PATH)': lines(`${BOSS}/src/main/utils/binaryEnv.ts`,1,30)+'\n…\n'+lines(`${BOSS}/src/main/utils/binaryEnv.ts`,60,70),
    'Boss download-binaries.js 383-428 (one full entry incl. win32-arm64)': lines(`${BOSS}/scripts/download-binaries.js`,383,428),
    'Boss electron-builder.yml 80-122': lines(`${BOSS}/electron-builder.yml`,80,122),
    'Boss build scripts': Object.fromEntries(Object.entries(require(`${BOSS}/package.json`).scripts).filter(([k])=>/^build:(win|mac|linux)(:x64|:arm64)?$/.test(k))),
    'rust-mcp-filesystem Cargo.toml 28-34 (sdk features)': lines(`${FS}/Cargo.toml`,28,34),
    'rust-mcp-filesystem src/cli.rs 8-40': lines(`${FS}/src/cli.rs`,8,40),
    'rust-mcp-filesystem dist-workspace.toml': read(`${FS}/dist-workspace.toml`),
    'compass .mcp.json': read(`${CP}/.mcp.json`),
    'compass compass-mcp/src/transport.rs 170-206': lines(`${CP}/crates/compass-mcp/src/transport.rs`,170,206),
    'compass compass-ci.yml 213-232': lines(`${CP}/.github/workflows/compass-ci.yml`,213,232),
    'this pack: script invocations in skills and agents': sh("git grep -n -E 'node scripts/[a-z-]+\\.mjs' -- skills agents"),
    'this pack: hooks/hooks.json': read('hooks/hooks.json'),
  },
};
const out=JSON.stringify(packet,null,2);
const SECRET=/(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+|bearer\s+[A-Za-z0-9._~+\/=-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{16,}/gi;
const hits=[...out.matchAll(SECRET)].map(m=>m[0].slice(0,48));
fs.writeFileSync(`${P}/review/assess/packet-r2.json`,out+'\n');
console.log('packet:',(out.length/1024).toFixed(1),'KB | secret-pattern hits:',hits.length);
hits.forEach(h=>console.log('   '+JSON.stringify(h)));
