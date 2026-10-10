import fs from 'node:fs';import cp from 'node:child_process';import crypto from 'node:crypto';
import {hooksFire} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hooks.mjs';
import {runHookCommand} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hook-command.mjs';
import {stageHandoffWrite} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/stage-gate.mjs';
const p="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture",s="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution/children/desktop-mcp-projection-acceptance",e=s+'/evidence/execute',phase='bossfang-uar-authorization-and-execution::desktop-mcp-projection-acceptance';
const read=f=>JSON.parse(fs.readFileSync(f)),write=(f,j)=>fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');
for(const f of ['backend-verify-2026-10-08.json','backend-archive-2026-10-08.json','task10-completion-2026-10-08.json','team-review-complete-2026-10-08-receipt.json'])if(read(e+'/'+f).exitCode!==0)throw Error('Incomplete boundary '+f);
const final=read(e+'/review/adversarial-2026-10-08/findings-r4-focused.json');
if(final.verdict!=='PASS'||read(e+'/qa-resume-2026-10-08/validation-result.json').overall!=='passed')throw Error('Gate not passed');
const status=cp.spawnSync('prometheus',['kbd','--path',p,'status','--json'],{encoding:'utf8',maxBuffer:20*1024*1024});if(status.status)throw Error('Status failed');const before=JSON.parse(status.stdout),ph=before.phases[phase];
if(Object.values(ph.changes).some(c=>Object.values(c.tasks).some(t=>t.status!=='complete')))throw Error('Incomplete assigned task');
const args=['kbd','--path',p,'stage','transition','--command-id','bauar05-execute-complete-after-kimi-20261008','--phase',phase,'--id','execute','--status','complete'];
const r=cp.spawnSync('prometheus',args,{encoding:'utf8',maxBuffer:20*1024*1024});
write(e+'/execute-stage-complete-2026-10-08.json',{time:new Date().toISOString(),argv:args,exitCode:r.status,stdoutSha256:crypto.createHash('sha256').update(r.stdout??'').digest('hex'),diagnostic:r.status?r.stderr:null});
if(r.status)throw Error('Stage transition failed');
const hookRuns=[];
await hooksFire('execute','after',phase,1,1,{orchestratorRoot:'/Users/gqadonis/.codex/skills/kbd-process-orchestrator',cwd:p,phasePath:phase,childPath:'desktop-mcp-projection-acceptance',sourceTool:'kbd-execute',runCommand:async(command,env,ctx)=>{
 const result=await runHookCommand(command,env,ctx);hookRuns.push({status:result.status,skippedUnsupportedShell:String(result.stderr).includes('requires shell semantics'),stdoutSha256:crypto.createHash('sha256').update(result.stdout??'').digest('hex')});return result;
}});
write(e+'/execute-after-hooks-2026-10-08.json',{time:new Date().toISOString(),node:process.version,runs:hookRuns,limitations:'Unsupported shell hook commands are skips, never memory/publication passes. No forbidden shell/Python hook was executed.'});
stageHandoffWrite('execute','Completed scoped local desktop native admission/discovery acceptance and final review after consuming Kimi mini QA repair. Ten tasks complete, backend verified and archived. Cumulative review plus focused contradiction resolution PASS with one unresolved non-reproduced error-sanitization warning; producer identity unknown. Original G2 aggregate exit1, finite dispositions, source12/13 emission and source17 rebinding retained. Parent D0, formatting, packaging/installed/Windows and cumulative parent certification remain open. Stop for operator approval before Reflect.',[
 'execute-resumption-2026-10-08.md','evidence/execute/qa-resume-2026-10-08/validation-result.json',
 'evidence/execute/review/team-intake-2026-10-08/review.md','evidence/execute/review/adversarial-2026-10-08/findings-r4-focused.json',
 'evidence/execute/backend-verify-2026-10-08.json','evidence/execute/backend-archive-2026-10-08.json',
 'evidence/execute/execute-stage-complete-2026-10-08.json','evidence/execute/execute-after-hooks-2026-10-08.json','progress.json'
],{phaseDir:s,cwd:p});
const approval=read(s+'/approval-policy.json');approval.stageCompleted='execute';approval.pendingApprovalFor='reflect';write(s+'/approval-policy.json',approval);
fs.appendFileSync(s+'/execution.md','\n\n## 2026-10-08 — Execute completed after mini repair intake\n\nAll ten child tasks complete; backend verified and archived. See execute-resumption-2026-10-08.md and handoffs/execute.handoff.json for final evidence, remaining warning and independent parent blockers. Earlier blocked entries above are historical. Stop before Reflect for the operator handover.\n');
const after=cp.spawnSync('prometheus',['kbd','--path',p,'status','--json'],{encoding:'utf8',maxBuffer:20*1024*1024});const state=JSON.parse(after.stdout),current=state.phases[phase];
const result={time:new Date().toISOString(),canonicalRevision:state.revision,phaseId:phase,executeStatus:current.stages.execute.status,tasks:Object.values(current.changes['bauar-05-native-discovery-admission'].tasks).map(t=>({id:t.id,status:t.status})),reflectEntered:false,approvalPending:'reflect',hooks:hookRuns};
write(e+'/execute-completion-summary-2026-10-08.json',result);console.log(JSON.stringify({canonicalRevision:result.canonicalRevision,executeStatus:result.executeStatus,taskCount:result.tasks.length,hooks:hookRuns,approvalPending:'reflect'}));

