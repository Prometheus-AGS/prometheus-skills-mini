import fs from 'node:fs';import cp from 'node:child_process';import crypto from 'node:crypto';
const d="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/bossfang-uar-authorization-and-execution", parent="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture";
const records=[];
for(const id of ['uar','bossfang','boss']){
const product='/Users/gqadonis/.claude/worktrees/bauar-'+id, root=product+'/workstreams/bauar';
if(fs.existsSync(root))throw Error('exists '+root);
fs.mkdirSync(root+'/.prometheus',{recursive:true});fs.mkdirSync(root+'/.kbd-orchestrator',{recursive:true});fs.mkdirSync(root+'/openspec/changes',{recursive:true});
const uuid=crypto.randomUUID(),marker={schemaVersion:'1',projectId:uuid,repositoryFingerprint:'sha256:'+crypto.createHash('sha256').update(root).digest('hex')};
fs.writeFileSync(root+'/.prometheus/project.json',JSON.stringify(marker,null,2)+'\n');
fs.writeFileSync(root+'/.kbd-orchestrator/project.json',JSON.stringify({name:'bauar-'+id,projectId:'bauar-'+id,specBackend:'openspec',focus_project_path:root,parentProjectId:'7041aa63-d951-4b19-a59c-b963d65b3b83',parentRoot:parent,productRoot:product},null,2)+'\n');
fs.writeFileSync(root+'/openspec/config.yaml','schema: spec-driven\n\ncontext: |\n  Repository-local execution child of approved Bossfang-UAR phase.\n  Parent phase plan and scope amendments are authoritative.\n  Product root: '+product+'\n  Parent root: '+parent+'\n  KBD state only at this nested root, never inherited repository root.\n');
const out=cp.execFileSync('/Users/gqadonis/.local/bin/prometheus',['kbd','register',root],{encoding:'utf8'});
fs.writeFileSync(d+'/evidence/execute/register-'+id+'.json',out);records.push({id,root,productRoot:product,projectId:uuid});
console.log(id+' '+uuid+' '+root);
}fs.writeFileSync(d+'/evidence/execute/child-roots.json',JSON.stringify(records,null,2)+'\n');

