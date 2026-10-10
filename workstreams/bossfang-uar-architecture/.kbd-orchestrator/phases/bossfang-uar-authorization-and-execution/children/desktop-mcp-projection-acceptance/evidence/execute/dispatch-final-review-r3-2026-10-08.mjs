import fs from 'node:fs';import cp from 'node:child_process';
const env={...process.env,ADV_JUDGE_TIMEOUT:'180',ADV_JUDGE_RETRIES:'1'};
const f='/Users/gqadonis/.prometheus/kbd/secrets.env';
if(fs.existsSync(f)){for(const line of fs.readFileSync(f,'utf8').split('\n')){const m=line.match(/^(?:export\s+)?(LITER_LLM_MASTER_KEY|OPENAI_API_KEY)=(.*)$/);if(m&&!env[m[1]])env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}}
const out="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance/evidence/execute/review/adversarial-2026-10-08";
console.log('Dispatching isolated reviewer');
const child=cp.spawn(process.execPath,["/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/scripts/adversarial-review/dispatch-judge.mjs",'--mode','diff','--packet',out+'/packet-r3.json','--out',out+'/findings-r3.json'],{cwd:"/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini",env,stdio:['ignore','pipe','pipe']});
let stderr='';child.stdout.on('data',()=>{});child.stderr.on('data',b=>{stderr+=b;});
child.on('close',code=>{fs.writeFileSync(out+'/dispatch-r3-receipt.json',JSON.stringify({time:new Date().toISOString(),exitCode:code,timeoutSeconds:180,attempts:1,stderr},null,2));console.log(JSON.stringify({exitCode:code,diagnostics:stderr}));process.exitCode=code;});

