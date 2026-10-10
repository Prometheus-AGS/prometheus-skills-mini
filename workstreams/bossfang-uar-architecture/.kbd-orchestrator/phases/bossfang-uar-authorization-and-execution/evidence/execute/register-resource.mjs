import fs from 'node:fs';
import cp from 'node:child_process';
const root='/Users/gqadonis/.claude/worktrees/bauar-uar/workstreams/bauar';
const phase='bossfang-uar-authorization-and-execution';
const change='uar-bauar-resource-boundary';
const cli=(args)=>cp.execFileSync('/Users/gqadonis/.local/bin/prometheus',['kbd','--path',root,...args],{encoding:'utf8',env:{...process.env,PATH:'/opt/homebrew/opt/node@24/bin:'+process.env.PATH}});
const status=()=>JSON.parse(cli(['status','--json']));
let state=status();
if(!state.phases[phase]?.changes[change]) cli(['change','register','--command-id','bauar-resource-register','--phase',phase,'--id',change,'--title',change,'--sequence','4']);
const text=fs.readFileSync(root+'/openspec/changes/'+change+'/tasks.md','utf8');
const tasks=[...text.matchAll(/^- \[(?: |x)\] (.+)$/gm)].map(x=>x[1]);
for(let i=0;i<tasks.length;i++){
  state=status();
  const existing=state.phases[phase].changes[change].tasks[String(i+1)];
  if(existing&&existing.title!==tasks[i]) throw Error('Historical task title mismatch; revise explicitly, never renumber');
  if(!existing) cli(['task','register','--command-id','bauar-resource-task-'+(i+1),'--phase',phase,'--change',change,'--id',String(i+1),'--title',tasks[i],'--sequence',String(i+1)]);
}
state=status();
const receipt={at:new Date().toISOString(),root,projectId:state.projectId,revision:state.revision,change,tasks:tasks.map((title,i)=>({id:String(i+1),title})),scope:'Draft source inventory binding only; exact production claims pending driver acceptance; no runtime evidence'};
fs.writeFileSync(root+'/.kbd-orchestrator/phases/'+phase+'/resource-binding.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
