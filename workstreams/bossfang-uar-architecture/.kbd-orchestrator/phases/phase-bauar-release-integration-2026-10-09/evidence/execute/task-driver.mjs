import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const project="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture";
const root="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini";
const phaseDir="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-integration-2026-10-09";
const [operation,change,id]=process.argv.slice(2);
const fixture=JSON.parse(fs.readFileSync(path.join(phaseDir,'evidence','plan',change+'-instructions.json'),'utf8'));
const task=fixture.tasks.find(t=>t.id===id);
if(!task||!['begin-task','end-task','verify','archive'].includes(operation))throw Error('Use an actual scoped backend task and supported boundary');
const argv=[path.join(root,'scripts','kbd-apply.mjs'),operation,change,...(['verify','archive'].includes(operation)?[]:[id,id,String(fixture.tasks.length),task.description])];
const result=spawnSync(process.execPath,argv,{cwd:project,shell:false,encoding:'utf8',maxBuffer:8000000,env:{...process.env,PROMETHEUS_OPENSPEC_VERSION:'1.14.1',KBD_ORCHESTRATOR_ROOT:'/Users/gqadonis/.codex/skills/kbd-process-orchestrator'}});
fs.mkdirSync(path.join(phaseDir,'evidence','execute','boundaries'),{recursive:true});
fs.writeFileSync(path.join(phaseDir,'evidence','execute','boundaries',change+'-'+id+'-'+operation+'.json'),JSON.stringify({schemaVersion:1,at:new Date().toISOString(),change,id,operation,program:process.execPath,args:argv,cwd:project,exitCode:result.status,stdout:result.stdout,stderr:result.stderr},null,2)+'\n');
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exitCode=result.status??1;

