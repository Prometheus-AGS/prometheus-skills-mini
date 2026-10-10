import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {hooksFire} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hooks.mjs';
import {runHookCommand} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hook-command.mjs';
import {stageHandoffWrite} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/stage-gate.mjs';
const p="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture", b="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-integration-2026-10-09", phase='phase-bauar-release-integration-2026-10-09';
const e=path.join(b,'evidence','execute');
const write=(name,value)=>fs.writeFileSync(path.join(e,name),JSON.stringify(value,null,2)+'\n');
const read=name=>JSON.parse(fs.readFileSync(path.join(e,name),'utf8'));
const receipt=read('local-delivery.json'), validation=read('local-delivery-validation.json');
if(!validation.valid)throw Error('Delivery receipt is not valid');
const progress=JSON.parse(fs.readFileSync(path.join(b,'progress.json'),'utf8'));
if(progress.changes_completed!==2||progress.changes.some(c=>c.tasks_done!==c.tasks_total))throw Error('Actual tasks incomplete');
const backend=[];
for(const change of ['bauar-int-01-scoped-source-intake','bauar-int-02-local-current-uar-payload']){
 for(const operation of ['verify','archive']){
 const r=read('boundaries/'+change+'-1-'+operation+'.json');
 if(r.exitCode!==0)throw Error('Backend boundary failed: '+change+'/'+operation);
 backend.push({change,operation,exitCode:r.exitCode,receiptPath:'boundaries/'+change+'-1-'+operation+'.json'});
 }}
const args=['kbd','--path',p,'stage','transition','--command-id','bauar-release-execute-complete-20261009','--phase',phase,'--id','execute','--status','complete'];
const result=spawnSync('prometheus',args,{cwd:p,shell:false,encoding:'utf8',maxBuffer:8000000});
write('stage-complete.json',{schemaVersion:1,at:new Date().toISOString(),program:'prometheus',args,cwd:p,exitCode:result.status,stdout:result.stdout,stderr:result.stderr});
if(result.status!==0)throw Error('Canonical stage transition failed: '+result.stderr);
const outcomes=[];
await hooksFire('execute','after',phase,1,1,{orchestratorRoot:'/Users/gqadonis/.codex/skills/kbd-process-orchestrator',cwd:p,phasePath:phase,sourceTool:'codex',runCommand:async(command,env,ctx)=>{
const outcome=await runHookCommand(command,env,ctx);
outcomes.push({status:outcome.status,disposition:outcome.stderr.includes('requires shell semantics and was not run')?'skipped-unsupported':'executed',stdout:outcome.stdout,stderr:outcome.stderr});
return outcome;
}});
const at=new Date().toISOString();
write('closeout.json',{schemaVersion:1,phase,at,production:'complete',tasks:{complete:11,total:11},changes:{complete:2,total:2},backend,executeAfter:outcomes,runtime:'operator-deferred',certification:'operator-deferred',publication:'not-authorized',F6:'cancelled',nextStage:'reflect',nextStageStarted:false,scopeSelfCheck:{unrequestedProductCode:false,newSecurityHardening:false,additionalTestsOrReview:false,sourcePreservation:'Finite boundaries recorded by actual intake/build/package receipts; no whole-original-UAR scan',unrelatedIndex:'Preserved by scoped commit'}});
const dispatch=read('native-dispatch.json');
for(const t of dispatch.tasks) {t.status='complete';if(t.taskId===5&&t.change.includes('02-'))t.result='Actual unsigned darwin-arm64 app assembled; boss-delivery.json';if(t.taskId===6)t.result='Schema-valid local-delivery.json, validation and handoff; ownership released';}
dispatch.updatedAt=at;write('native-dispatch.json',dispatch);
let md=fs.readFileSync(path.join(b,'execution.md'),'utf8');
md=md.replace('Current work: change01 source intake is complete (5/5). Change02 input binding, source pin, actual UAR build/archive and actual Boss bundle are complete (5/6). Final linked delivery receipt/handoff is active. Dispatch is not completion.','Current work: Execute complete. Both changes and all 11 tasks are complete. Actual build, archive, unsigned local Boss app and schema-valid delivery receipt are recorded below. Reflect has not started.');
md+='\n## Final Execute completion\n\nAll 11 tasks across both changes completed through the actual task driver (task/change completion revision419). Both changes passed actual structural OpenSpec validation and archive operations. Canonical Execute is complete; execute:after outcomes are recorded in evidence/execute/closeout.json, including unsupported legacy shell hooks as skipped. No memory or certification success is inferred.\n\nActual unsigned local app: '+receipt.app.path+'. UAR checkpoint '+receipt.uarCommit+'; Boss pin checkpoint '+receipt.bossCommit+'; built/archive/bundled binary SHA256 '+receipt.binary.sha256+'. Actual Cargo, sidecar package, DSH build, Boss application build and Electron directory assembly exited0; beforePack and afterPack passed. Existing afterPack invalid-launch-token rejection is inseparable packaging evidence only. Strict delivery receipt schema validation passed once. See evidence/execute/local-delivery-handoff.md for commands, hashes, earlier failures, source boundaries and rollback inputs.\n\nThe copied dependency graph was the observed packaging blocker. Candidate-only frozen-lockfile materialization resolved it under direct finish authorization, retaining original copied inputs; exact pinned acquisitions were required after an observed offline cache miss. No product source repair or dependency upgrade was needed after the one approved local UAR pin. Existing Node24 was required for Boss children; Node22 retained orchestration. Existing warnings and failed attempts remain recorded.\n\nRuntime acceptance, negative controls, broad tests, cumulative independent review, global formatting and certification remain operator-deferred and unpassed. F6 remains cancelled/excluded. No new security hardening, service change, public release, push, shared merge or shipping/C05 gate mutation was performed. Stop after Execute; next command /kbd-reflect '+phase+'.\n';
fs.writeFileSync(path.join(b,'execution.md'),md);
stageHandoffWrite('execute','All11tasks/2changes complete. Actual current-source server-full UAR build/archive and unsigned local darwin-arm64 Boss.app delivered. Build/package hooks and strict receipt schema passed; both OpenSpec changes structurally validated and archived. See local-delivery-handoff.md and closeout.json. Runtime/tests/review/certification remain operator-deferred and UNPASSED; F6 cancelled; publication unauthorized. No shipping/C05 advancement. Stop for Execute review before /kbd-reflect '+phase+'.',[path.join(e,'local-delivery-handoff.md'),path.join(e,'local-delivery.json'),path.join(e,'local-delivery-validation.json'),path.join(e,'closeout.json'),receipt.app.path,receipt.archive.path],{cwd:p,phaseDir:b});
console.log(JSON.stringify({stage:'execute',status:'complete',tasks:'11/11',changes:'2/2',backend,hookOutcomes:outcomes.map(o=>({status:o.status,disposition:o.disposition})),app:receipt.app.path,next:'reflect',reflectStarted:false}));

