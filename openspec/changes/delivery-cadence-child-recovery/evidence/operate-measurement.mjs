import fs from 'node:fs';import path from 'node:path';import {execFileSync,spawn} from 'node:child_process';import assert from 'node:assert/strict';
const file='openspec/changes/delivery-cadence-child-recovery/evidence/cli-integration.json',r=JSON.parse(fs.readFileSync(file)),repo=path.join(r.root,'workspace'),state=path.join(r.root,'measurement');let seq=0;
const cli=(command,input={})=>{const f=path.join(r.root,`measurement-${++seq}.json`);fs.writeFileSync(f,JSON.stringify(input));return JSON.parse(execFileSync(process.execPath,[r.cli,...command.split(' '),'--root',state,'--input',f],{cwd:repo,encoding:'utf8',stdio:['pipe','pipe','pipe']}))};
const profile={name:'measurement-comparable',mode:'standalone',iterationMinutes:120,reviewEvery:0,publication:{mode:'manual'},optimization:{mode:'recommend',minimumSamples:4,bounds:{iterationMinutes:[120,120],publicationEvery:[2,2],maxImplementers:[1,3]}},checkpoints:[{id:'build',kind:'build',command:process.execPath,args:['build.mjs'],cwd:repo},{id:'launch',kind:'run',command:process.execPath,args:['dist/app.mjs','launch'],cwd:repo},{id:'feature',kind:'run',command:process.execPath,args:['dist/app.mjs','feature'],cwd:repo}]};
try{
 cli('init',{profile});
 for(let i=0;i<4;i++){
  const it=cli('start',{scope:{tasks:[],changes:[],phases:[],outcomes:['Greeting delivered'],deliveryClass:'greeting'},sourceRefs:[{repository:repo}],featureOperation:{id:'greet',outcome:'Greeting delivered',procedure:'Read delivered greeting',checkpointId:'feature'}});
  // Observe actual waiting on a separate owned process; do not invent historical timestamps.
  const began=new Date().toISOString();const holder=spawn(process.execPath,['-e','setTimeout(()=>{},800)'],{stdio:'ignore'});await new Promise(resolve=>holder.once('exit',resolve));const ended=new Date().toISOString();
  cli('observe',{kind:'resource-wait',startedAt:began,finishedAt:ended,note:'Waited for owned disposable resource-holder process'});
  cli('ready',{codeComplete:true});cli('checkpoint',{id:'build'});if(i===1)cli('checkpoint',{id:'build',reason:'Explicit duplicate-build attribution scenario'});cli('checkpoint',{id:'launch'});cli('checkpoint',{id:'feature'});const done=cli('finish',{});
  cli('observe',{iterationId:it.id,kind:'coordination',startedAt:it.startedAt,finishedAt:done.iteration.finishedAt,note:'Continuously supervised this complete CLI delivery; overlap union prevents double counting'});
  const report=cli('report');if(i===2)assert.equal(report.recommendation,null,'minimumSamples4 must exclude three samples');if(i===3){assert.equal(report.recommendation.setting,'maxImplementers');assert.equal(report.recommendation.value,2);assert.equal(report.recommendation.basisIterationIds.length,4);assert.equal(report.iterations[1].repeatedBuilds?.length??report.iterations[1].buildAttempts?.length??1,1)}
 }
 r.scenarios.push({name:'four real deliveries honor minimumSamples4, stable retry comparison and observed resource wait',status:'passed'});r.measurementStatus='passed';console.log('measurement scenario passed');
}catch(e){r.measurementStatus='failed';r.measurementError=String(e.stderr??e.stack);console.error(r.measurementError);process.exitCode=1}finally{fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n')}
