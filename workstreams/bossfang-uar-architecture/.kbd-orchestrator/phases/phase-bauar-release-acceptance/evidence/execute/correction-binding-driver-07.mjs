import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';
const b="/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance",e=b+'/evidence/execute';
const sha=async p=>{if(/(?:bauar_session_owner|mcp_server)\.rs$/.test(p))throw Error('excluded');const h=createHash('sha256');for await(const x of createReadStream(p))h.update(x);return h.digest('hex')};
const ordered=x=>Array.isArray(x)?x.map(ordered):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordered(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(ordered(x))).digest('hex');
const cp=b+'/acceptance/candidate-inputs.json',raw=await fs.readFile(cp),c=JSON.parse(raw);
const desktop=JSON.parse(await fs.readFile(b+'/dispatch/desktop-task3-sources-03.json')),harness=JSON.parse(await fs.readFile(b+'/dispatch/harness-diagnostics-readiness-01.json'));
const allowed=new Set([...desktop.map(x=>x.path),...harness.changes.map(x=>x.path)]),changes=[];
for(const r of [...c.sourceFiles,...c.gateFiles,...c.manifests,c.profile,c.approvedPlan,c.commandContract]){const actual=await sha(r.path);if(actual!==r.sha256){if(!allowed.has(r.path))throw Error('unexpected selected drift '+r.path);changes.push({path:r.path,old:r.sha256,actual});r.sha256=actual}}
for(const r of [...desktop,...harness.changes])if(await sha(r.path)!==r.sha256)throw Error('readiness changed');
const additions={desktop:[b+'/dispatch/desktop-task3-report-03.md',b+'/dispatch/desktop-task3-sources-03.json'],harness:[b+'/dispatch/harness-diagnostics-readiness-01.json'],'uar-regression':[e+'/compiler-diagnostic-amendment-01.json',e+'/compiler-environment-correction-01.json',e+'/compiler-environment-correction-02.json']};
for(const [id,paths]of Object.entries(additions)){const component=c.components.find(x=>x.id===id);component.sourcePaths=[...new Set([...component.sourcePaths,...paths])];for(const path of paths)if(!c.manifests.some(r=>r.path===path))c.manifests.push({path,sha256:await sha(path)})}
const u=c.components.find(x=>x.id==='uar-regression');u.command.args=['--config','env.SCCACHE_DISABLE=\"1\"',...u.command.args];u.environment.PATH=u.environment.PATH.replace(':/usr/bin',':/opt/homebrew/bin:/usr/bin');
const prior=c.production.declarationPath,barrier=JSON.parse(await fs.readFile(prior)),sourceSha256=digest([...c.sourceFiles,...c.gateFiles,...c.manifests,c.profile,c.approvedPlan,c.commandContract]);
c.production.declarationPath=e+'/production-barrier-07.json';c.runtimeSealPath=e+'/attempts/runtime-seal-02.json';
const next={...barrier,sourceSha256,completedAt:new Date().toISOString(),supersedes:await sha(prior),reason:'Bounded actual first-batch failures: desktop and harness sanitized startup diagnostics; installed build-tool PATH restoration. Production package and exact hosts unchanged.'};delete next.amendment;
await fs.writeFile(e+'/candidate-inputs-before-correction-07.json',raw,{flag:'wx',mode:0o600});
await fs.writeFile(c.production.declarationPath,JSON.stringify(next,null,2)+'\n',{flag:'wx',mode:0o600});await fs.writeFile(cp,JSON.stringify(c,null,2)+'\n');
const receipt={schemaVersion:1,recordedAt:new Date().toISOString(),changes,additions,config:{path:cp,sha256:await sha(cp)},barrier:{path:c.production.declarationPath,sha256:await sha(c.production.declarationPath)},sourceSha256,runtimeExecuted:false};
await fs.writeFile(e+'/correction-input-binding-07.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(receipt));
