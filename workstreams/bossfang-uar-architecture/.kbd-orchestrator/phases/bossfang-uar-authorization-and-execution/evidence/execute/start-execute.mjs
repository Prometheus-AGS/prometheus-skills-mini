import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {stageGate} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/stage-gate.mjs';
import {hooksFire} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hooks.mjs';
import {runHookCommand} from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hook-command.mjs';
const cwd="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture",phaseDir="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution", phase='bossfang-uar-authorization-and-execution';
const env={...process.env,PATH:'/opt/homebrew/opt/node@24/bin:'+process.env.PATH};
const gate=stageGate('execute',{cwd,phaseDir}); if(gate.status!==0)throw new Error(JSON.stringify(gate));
const policy=JSON.parse(fs.readFileSync(phaseDir+'/approval-policy.json'));
if(!policy.authorizedStages.includes('execute'))policy.authorizedStages.push('execute');
policy.pendingApprovalFor=null;policy.approvals.push({stage:'execute',at:new Date().toISOString(),source:'User: Approved. Use the agent team to execute. Product recovery/remote/cutover inputs remain open.'});
fs.writeFileSync(phaseDir+'/approval-policy.json',JSON.stringify(policy,null,2)+'\n');
const commands=[['resume','--plan-revision','1'],['stage','enter','--command-id','bossfang-uar-execute-enter-20261006','--phase',phase,'--id','execute','--title','Execute approved authorization and harness changes with agent teams','--sequence','5']];
fs.mkdirSync(phaseDir+'/evidence/execute',{recursive:true});
for(let i=0;i<commands.length;i++){const out=execFileSync('/Users/gqadonis/.local/bin/prometheus',['kbd','--path',cwd,...commands[i]],{env,encoding:'utf8'});fs.writeFileSync(phaseDir+'/evidence/execute/start-'+i+'.json',out);}
let invoked=0;const hook=await hooksFire('execute','before',phase,1,1,{orchestratorRoot:"/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini",cwd,runCommand:async(...args)=>{invoked++;return runHookCommand(...args)},phasePath:phase,sourceTool:'codex'});
fs.writeFileSync(phaseDir+'/evidence/execute/before-hook.json',JSON.stringify({at:new Date().toISOString(),invoked,result:hook??null},null,2)+'\n');
console.log(JSON.stringify({gate,entered:'execute',invoked}));

