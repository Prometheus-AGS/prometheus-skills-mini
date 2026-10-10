import fs from 'node:fs';import cp from 'node:child_process';import crypto from 'node:crypto';
import {stageGate} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/stage-gate.mjs';
import {hooksFire} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hooks.mjs';
import {runHookCommand} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hook-command.mjs';
const p="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture",s="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance",phase='bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance',id='bauar-05-native-discovery-admission',e=s+'/evidence/reflect';
fs.mkdirSync(e,{recursive:true});const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');
const run=args=>{let r=cp.spawnSync('prometheus',['kbd','--path',p,...args],{encoding:'utf8',maxBuffer:20000000});if(r.status!==0)throw Error('Canonical command failed: '+args[0]);return JSON.parse(r.stdout);};
const before=run(['status','--json']),change=before.phases[phase].changes[id];
const backend=fs.readFileSync(p+'/openspec/changes/archive/2026-10-08-'+id+'/tasks.md','utf8').split('\n').filter(l=>/^- \[[x ]\]/.test(l));
const tasks=Object.values(change.tasks).sort((a,b)=>a.sequence-b.sequence);
const comparisons=tasks.map((t,i)=>({id:t.id,canonicalComplete:t.status==='complete',backendComplete:backend[i]?.startsWith('- [x] '),titleMatches:backend[i]?.slice(6)===t.title}));
if(backend.length!==10||tasks.length!==10||comparisons.some(t=>!t.canonicalComplete||!t.backendComplete||!t.titleMatches))throw Error('Task drift: STOP');
const rec={time:new Date().toISOString(),canonicalRevision:before.revision,phase,method:'Node read-only archive/canonical task identity reconciliation; installed reconcile command is shell-only and mini port has no reconcile command. No shell adapter or repair executed.',backendCount:backend.length,canonicalCount:tasks.length,comparisons,drift:[],status:'passed'};
write(e+'/reconciliation.json',rec);
const progress=read(s+'/progress.json');write(e+'/progress-entry.json',progress);
const gate=stageGate('reflect',{phaseDir:s,cwd:p});write(e+'/stage-gate.json',gate);if(gate.status!==0)throw Error('Reflect gate failed');
for(const f of ['backend-verify-2026-10-08.json','backend-archive-2026-10-08.json'])if(read(s+'/evidence/execute/'+f).exitCode!==0)throw Error('Prerequisite not complete');
if(read(s+'/evidence/execute/qa-resume-2026-10-08/validation-result.json').overall!=='passed')throw Error('QA not passed');
const ap=read(s+'/approval-policy.json');if(!ap.authorizedStages.includes('reflect'))ap.authorizedStages.push('reflect');ap.approvals.push({stage:'reflect',at:new Date().toISOString(),source:'Operator: Approved, responding to explicit Execute-to-Reflect handover request.'});ap.pendingApprovalFor=null;write(s+'/approval-policy.json',ap);
const entered=run(['stage','enter','--command-id','bauar05-reflect-enter-20261008','--phase',phase,'--id','reflect','--title','Reflect on native admission and desktop discovery delivery','--sequence','6']);
write(e+'/stage-enter.json',{time:new Date().toISOString(),exitCode:0,outputSha256:crypto.createHash('sha256').update(JSON.stringify(entered)).digest('hex')});
const hookRuns=[];await hooksFire('reflect','before',phase,1,1,{orchestratorRoot:'/Users/gqadonis/.codex/skills/kbd-process-orchestrator',cwd:p,phasePath:phase,childPath:'desktop-mcp-projection-acceptance',sourceTool:'kbd-reflect',runCommand:async(command,env,ctx)=>{let r=await runHookCommand(command,env,ctx);hookRuns.push({status:r.status,skippedUnsupportedShell:String(r.stderr).includes('requires shell semantics')});return r;}});
write(e+'/before-hooks.json',{time:new Date().toISOString(),runs:hookRuns,memoryRecallRefreshed:false,limitation:'Legacy shell hooks unsupported; existing prior-context retained without claiming refresh.'});
const candidates=[];for(const kind of ['promotion','skill']){let r=cp.spawnSync('pk',['candidates','list','--kind',kind],{cwd:p,encoding:'utf8',maxBuffer:1000000,timeout:20000});candidates.push({kind,exitCode:r.status,errorCode:r.error?.code??null,output:r.stdout,diagnostic:r.stderr});}
write(e+'/candidates.json',{time:new Date().toISOString(),lists:candidates,mutations:[]});
console.log(JSON.stringify({reconciliation:rec.status,tasks:tasks.length,progressKeys:Object.keys(progress),changes:progress.changes,hookRuns,candidates}));

