import fs from 'node:fs';import cp from 'node:child_process';
const [root,...changes]=process.argv.slice(2),w="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini",phase='bossfang-uar-authorization-and-execution',env={...process.env,PATH:'/opt/homebrew/opt/node@24/bin:'+process.env.PATH};
const cli=(a)=>cp.execFileSync('/Users/gqadonis/.local/bin/prometheus',['kbd','--path',root,...a],{encoding:'utf8',env});
let state=JSON.parse(cli(['status','--json']));
if(!state.phases?.[phase]){
cli(['phase','create','--command-id','bauar-child-phase-create','--id',phase,'--title','Repository execution child of approved Bossfang UAR phase']);
}
state=JSON.parse(cli(['status','--json']));
if(state.activePath?.phaseId!==phase) cli(['phase','activate','--command-id','bauar-child-phase-activate','--id',phase]);
if(state.phases[phase].status==='pending') {
cli(['phase','transition','--command-id','bauar-child-phase-start','--id',phase,'--status','in-progress']);
}
state=JSON.parse(cli(['status','--json']));
if(!state.phases[phase].stages.execute) {
cli(['stage','enter','--command-id','bauar-child-execute-enter','--phase',phase,'--id','execute','--title','Execute repository child from approved parent plan','--sequence','5']);
}
const rows=[];for(let i=0;i<changes.length;i++){const change=changes[i];state=JSON.parse(cli(['status','--json']));if(!state.phases[phase].changes[change])cli(['change','register','--command-id','bauar-child-register-'+change,'--phase',phase,'--id',change,'--title',change,'--sequence',String(i+1)]);
const text=fs.readFileSync(root+'/openspec/changes/'+change+'/tasks.md','utf8'),tasks=[...text.matchAll(/^- \[ \] (.+)$/gm)].map(x=>x[1]);for(let k=0;k<tasks.length;k++){state=JSON.parse(cli(['status','--json']));if(!state.phases[phase].changes[change].tasks[String(k+1)])cli(['task','register','--command-id','bauar-child-task-'+change+'-'+(k+1),'--phase',phase,'--change',change,'--id',String(k+1),'--title',tasks[k],'--sequence',String(k+1)]);}
rows.push({change,tasks:tasks.map((title,k)=>({id:String(k+1),title}))});}
state=JSON.parse(cli(['status','--json']));fs.mkdirSync(root+'/.kbd-orchestrator/phases/'+phase,{recursive:true});fs.writeFileSync(root+'/.kbd-orchestrator/phases/'+phase+'/parent-binding.json',JSON.stringify({schemaVersion:1,parentProjectId:'7041aa63-d951-4b19-a59c-b963d65b3b83',parentRoot:"/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture",parentPhase:phase,approvedStagesInheritedFromParent:['assess','analyze','spec','plan'],executionApproval:'Approved. Use the agent team to execute.',childProjectId:state.projectId,scope:'Repository-local task state only; source exact claims are owned by parent execution receipt.',rows},null,2)+'\n');console.log(JSON.stringify({root,projectId:state.projectId,revision:state.revision,changes:rows.map(x=>({id:x.change,total:x.tasks.length}))}));
