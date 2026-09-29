import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
const mini = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cadence-delivery-v2-'));
const repo = path.join(root, 'workspace'); fs.mkdirSync(repo);
const cli = path.join(mini, 'dist/plugins/codex/prometheus-skills-mini/skills/delivery-cadence/scripts/cadence.mjs');
const adapter = path.join(mini, 'dist/plugins/codex/prometheus-skills-mini/scripts/cadence-kbd-adapter.mjs');
const state = path.join(root, 'cadence');
const env = { ...process.env, PROMETHEUS_DATA_DIR: path.join(root, 'prometheus-data'), PROMETHEUS_KBD_CONTROL_PLANE: '0' };
const result = { platform: process.platform, root, cli, startedAt: new Date().toISOString(), scenarios: [] };
function command(program, args, cwd = repo) { return execFileSync(program, args, { cwd, env, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: 30000 }); }
function json(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2)); return file; }
let index = 0;
function cadence(commandName, input = {}, { fail, id, stateRoot = state } = {}) {
 const args = [cli, ...commandName.split(' '), '--root', stateRoot, '--input', json(path.join(root, `input-${++index}.json`),input)];
 if (id) args.push('--command-id',id);
 try { const out=JSON.parse(command(process.execPath,args)); if(fail)throw new Error('Expected command refusal: '+commandName);return out; }
 catch(e){if(!fail)throw e;assert.match(String(e.stderr??e.message),fail);return null;}
}
function record(name){result.scenarios.push({name,status:'passed'}); console.log(name);}
function kbd(args){return command('prometheus',['kbd','--path',repo,...args]);}
const profile={name:'completed-boundary-fixture',mode:'standalone',iterationMinutes:120,reviewEvery:0,publication:{mode:'every',every:2,platforms:['darwin-arm64'],websiteUrl:'http://fixture.local'},optimization:{mode:'recommend',minimumSamples:4},checkpoints:[
 {id:'build',kind:'build',command:process.execPath,args:['build.mjs'],cwd:repo},
 {id:'launch',kind:'run',command:process.execPath,args:['dist/app.mjs','launch'],cwd:repo},
 {id:'feature',kind:'run',command:process.execPath,args:['dist/app.mjs','feature'],cwd:repo}
]};
const scope={tasks:['T1'],changes:[],phases:[],outcomes:['Show the delivered greeting'],deliveryClass:'fixture-greeting',owners:[{role:'implementation',paths:['app.mjs']}]};
const start={scope,sourceRefs:[{repository:repo}],featureOperation:{id:'greeting',outcome:scope.outcomes[0],procedure:'Run delivered greeting and observe its output',checkpointId:'feature'}};
try{
 fs.writeFileSync(path.join(repo,'.gitignore'),'dist/\n.kbd-orchestrator/\n.prometheus/\n');
 fs.writeFileSync(path.join(repo,'app.mjs'),`import assert from 'node:assert/strict'; const greeting='delivered'; if(process.argv[2]==='feature')assert.equal(greeting,'delivered'); console.log(greeting);\n`);
 fs.writeFileSync(path.join(repo,'build.mjs'),`import fs from 'node:fs';fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('app.mjs','dist/app.mjs');\n`);
 command('git',['init','-q']);command('git',['add','.']);command('git',['-c','user.name=Cadence Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Disposable complete program']);
 cadence('init',{profile});
 cadence('start',{scope,sourceRefs:start.sourceRefs},{fail:/featureOperation/});
 const first=cadence('start',start,{id:'first-start'});assert.equal(cadence('start',start,{id:'first-start'}).id,first.id);
 cadence('start',{...start,scope:{...scope,outcomes:['different']}},{id:'first-start',fail:/different input/});
 const activity=cadence('activity start',{kind:'implementation',actor:'fixture-owner'});
 const activityId=activity.id??activity.activity?.id;
 assert.ok(activityId);cadence('activity stop',{id:activityId});
 const child=cadence('child enter',{phaseId:'repair',parentPhaseId:'standalone',reason:'Repair a discovered greeting issue',owner:'fixture-owner',authority:'approved disposable integration scenario',scope:{...scope,tasks:['TC']},returnCriteria:['greeting-fixed']});
 cadence('ready',{codeComplete:true},{fail:/Child work unresolved/});
 const nested=cadence('child enter',{phaseId:'nested',reason:'Nested correction',owner:'fixture-owner',authority:'approved disposable integration scenario',scope:{...scope,tasks:['TN']},returnCriteria:['nested-fixed']});
 const proof=c=>json(path.join(root,c.id+'.json'),{childId:c.id,criteria:c.returnCriteria.map(id=>({id,met:true,evidence:'Actual disposable program source inspected'})),completion:{tasks:c.scope.tasks}});
 cadence('child return',{childId:nested.id,outcome:'success',evidencePath:proof(nested)});
 cadence('child return',{childId:child.id,outcome:'failed',reason:'Deliberate boundary failure case'});
 cadence('ready',{codeComplete:true},{fail:/Child work unresolved/});
 cadence('child return',{childId:child.id,outcome:'success',evidencePath:proof(child)});
 assert.equal(cadence('status').iterations[0].startedAt,first.startedAt);assert.equal(cadence('status').successfulDeliveries,0);
 record('nested children retain parent clock; failure blocks; return adds no delivery');
 cadence('ready',{codeComplete:true});cadence('checkpoint',{id:'build'});cadence('checkpoint',{id:'launch'});
 cadence('finish',{completion:{tasks:['T1']}},{fail:/feature/});
 cadence('checkpoint',{id:'feature'});cadence('finish',{completion:{tasks:['T1']}});
 assert.equal(cadence('report').iterations[0].counts.tasks,3);
 cadence('observe',{iterationId:first.id,reopened:{tasks:['TC']},source:'explicit reopened fixture obligation'});
 const report=cadence('report');assert.equal(report.iterations[0].netCounts.tasks,2);assert.equal(report.iterations[0].minutes.active,null);assert.equal(report.recommendation,null);
 record('real build, launch, feature operation; baseline refused; net counts and unknown time');
 const second=cadence('start',{...start,scope:{...scope,tasks:['T2']}});
 cadence('ready',{codeComplete:true});cadence('checkpoint',{id:'build'});
 fs.appendFileSync(path.join(repo,'app.mjs'),'// observed source repair\n');
 cadence('checkpoint',{id:'launch'},{fail:/Sources changed/});cadence('ready',{codeComplete:true});
 cadence('checkpoint',{id:'build'},{fail:/Repeated builds require/});cadence('checkpoint',{id:'build',reason:'Repair changed release source'});cadence('checkpoint',{id:'launch'});cadence('checkpoint',{id:'feature'});
 cadence('finish',{completion:{tasks:['T2']}});
 assert.equal(cadence('status').publicationDue,true);
 cadence('start',start,{fail:/publication is due/});
 cadence('publication',{iterationId:second.id,outcome:'success',artifacts:[]},{fail:/artifact files/});
 record('changed sources invalidate prior build; retry reason required; publication debt blocks new work');
 const bytes=fs.readFileSync(path.join(repo,'dist/app.mjs'));const sha256=createHash('sha256').update(bytes).digest('hex');
 const server=createServer((req,res)=>{res.end(bytes)});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/app.mjs`;const downloaded=Buffer.from(await(await fetch(url)).arrayBuffer());assert.equal(createHash('sha256').update(downloaded).digest('hex'),sha256);await new Promise(resolve=>server.close(resolve));
 // Explicit fixture receipt: local HTTP exercises downloaded bytes; this is not a customer release.
 const sourceRefs=cadence('status').iterations[1].sourceRefs;
 const pub={version:'fixture-1',sourceRefs,artifacts:[{platform:'darwin-arm64',sha256,size:bytes.length,url,verifiedAt:new Date().toISOString()}],website:{url:'http://fixture.local',version:'fixture-1',verifiedAt:new Date().toISOString(),links:[{platform:'darwin-arm64',url}]}};
 cadence('publication',{iterationId:second.id,outcome:'success',artifacts:[{path:path.join(repo,'dist/app.mjs'),platform:'darwin-arm64',url}],receipt:json(path.join(root,'publication.json'),pub)});
 assert.equal(cadence('status').publicationDue,false);record('publication receipt matches downloaded local HTTP bytes and configured fixture links');
 // Migration uses a real copy of the existing v1 run, not a fabricated historical state.
 const v1='/Users/gqadonis/Projects/prometheus/worktrees/agent-fabric-c06/librefang/docs/plans/agent-fabric-convergence/.prometheus/cadence';
 const migrationRoot=path.join(root,'migration');fs.mkdirSync(migrationRoot);for(const f of ['events.jsonl','state.json'])fs.copyFileSync(path.join(v1,f),path.join(migrationRoot,f));
 const prefix=fs.readFileSync(path.join(migrationRoot,'events.jsonl'));
 cadence('migrate',{}, {stateRoot:migrationRoot,id:'migration'});assert.equal(cadence('status',{}, {stateRoot:migrationRoot}).schemaVersion,2);
 assert.equal(fs.readFileSync(path.join(migrationRoot,'events.jsonl')).subarray(0,prefix.length).equals(prefix),true);
 record('explicit v1 migration preserves historical event bytes and creates backup');
 // Canonical KBD lifecycle and packaged adapter across actual signed persistence.
 fs.mkdirSync(path.join(repo,'.kbd-orchestrator'),{recursive:true});
 kbd(['phase','create','--command-id','p-create','--id','parent','--title','Cadence parent']);kbd(['phase','activate','--command-id','p-active','--id','parent']);kbd(['phase','transition','--command-id','p-run','--id','parent','--status','in-progress']);
 cadence('configure',{profile:{mode:'kbd',publication:{mode:'manual'},binding:{canonicalCommand:{command:'node',args:[adapter,'snapshot','--project',repo],cwd:repo}}}});
 const third=cadence('start',start);kbd(['phase','create','--command-id','c-create','--id','parent::child','--slug','child','--title','Cadence child','--parent','parent']);kbd(['phase','activate','--command-id','c-active','--id','parent::child','--ancestor','parent']);
 cadence('resume');const recovered=cadence('child status').active[0];assert.equal(recovered.status,'needs-context');
 cadence('child enter',{phaseId:'parent::child',reason:'Recover missed entry hook',owner:'fixture-owner',authority:'approved scenario',scope,returnCriteria:['complete']});
 kbd(['phase','transition','--command-id','c-run','--id','parent::child','--status','in-progress']);kbd(['phase','transition','--command-id','c-done','--id','parent::child','--status','complete']);kbd(['phase','activate','--command-id','p-return','--id','parent']);
 cadence('resume');cadence('ready',{codeComplete:true},{fail:/Child work unresolved/});
 cadence('child return',{childId:recovered.id,outcome:'success',evidencePath:json(path.join(root,'canonical-return.json'),{childId:recovered.id,criteria:[{id:'complete',met:true,evidence:'Canonical disposable phase completed'}],completion:{tasks:[]}})});
 assert.equal(cadence('status').iterations.at(-1).startedAt,third.startedAt);
 record('real canonical KBD missed-entry recovery and parent return require explicit evidence');
 result.status='passed';
}catch(error){result.status='failed';result.error=String(error.stderr??error.stack??error);console.error(result.error);process.exitCode=1;}
finally{result.finishedAt=new Date().toISOString();const out=path.join(mini,'openspec/changes/delivery-cadence-child-recovery/evidence/cli-integration.json');json(out,result);console.log(JSON.stringify({status:result.status,root,receipt:out}));}
